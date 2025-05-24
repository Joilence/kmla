"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule, themeQuartz } from "ag-grid-community"
import type { ColDef } from "ag-grid-community"

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])
import type { LogEntry } from "@/lib/log-parser"

interface MacroAnalysisProps {
  data: LogEntry[]
}

export default function MacroAnalysis({ data }: MacroAnalysisProps) {
  const [topN, setTopN] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")

  const macroStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        count: number
        firstSeen: Date
        lastSeen: Date
        triggers: Set<string>
      }
    >()

    data.forEach((entry) => {
      const existing = stats.get(entry.macroName) || {
        count: 0,
        firstSeen: new Date(entry.timestamp),
        lastSeen: new Date(entry.timestamp),
        triggers: new Set(),
      }

      existing.count++
      existing.lastSeen = new Date(entry.timestamp)
      if (new Date(entry.timestamp) < existing.firstSeen) {
        existing.firstSeen = new Date(entry.timestamp)
      }
      existing.triggers.add(entry.trigger)

      stats.set(entry.macroName, existing)
    })

    return Array.from(stats.entries()).map(([name, stat]) => {
      const daysDiff = Math.max(
        1,
        Math.ceil((stat.lastSeen.getTime() - stat.firstSeen.getTime()) / (1000 * 60 * 60 * 24)),
      )
      return {
        name,
        count: stat.count,
        avgPerDay: (stat.count / daysDiff).toFixed(1),
        firstSeen: stat.firstSeen,
        lastSeen: stat.lastSeen,
        triggers: Array.from(stat.triggers).join(", "),
        daysDiff,
      }
    })
  }, [data])

  const filteredMacros = useMemo(() => {
    let filtered = macroStats

    if (searchTerm) {
      filtered = filtered.filter((macro) => macro.name.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    return filtered.sort((a, b) => b.count - a.count)
  }, [macroStats, searchTerm])

  const topMacros = filteredMacros.slice(0, topN)
  const chartData = topMacros.map((macro) => ({
    name: macro.name.length > 30 ? macro.name.substring(0, 30) + "..." : macro.name,
    count: macro.count,
    fullName: macro.name,
  }))

  // AG Grid column definitions
  const columnDefs: ColDef[] = [
    {
      headerName: "Macro Name",
      field: "name",
      sortable: true,
      filter: true,
      flex: 2
    },
    {
      headerName: "Total Executions",
      field: "count",
      sortable: true,
      filter: "agNumberColumnFilter",
      flex: 1
    },
    {
      headerName: "Avg/Day",
      field: "avgPerDay",
      sortable: true,
      filter: "agNumberColumnFilter",
      flex: 1
    },
    {
      headerName: "Triggers",
      field: "triggers",
      flex: 2,
      sortable: true,
      filter: true
    }
  ]

  // Show empty state if no data
  if (data.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-2xl font-semibold text-muted-foreground mb-2">Insufficient Data</p>
              <p className="text-muted-foreground">Load log data to view macro analysis</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="flex items-center py-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="topN" className="whitespace-nowrap">Show top N macros</Label>
              <Input
                id="topN"
                type="number"
                value={topN}
                onChange={(e) => setTopN(Number.parseInt(e.target.value) || 10)}
                min={5}
                max={50}
                className="w-24"
              />
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Label htmlFor="search" className="whitespace-nowrap">Search macros</Label>
              <Input
                id="search"
                placeholder="Search macro names..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top Macros by Usage Count</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${value?.toLocaleString()} executions`, 
                    'Count'
                  ]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: '14px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  labelStyle={{
                    color: 'hsl(var(--popover-foreground))',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--foreground))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* AG Grid Table */}
      <Card>
        <CardHeader>
          <CardTitle>Macro Statistics</CardTitle>
          <CardDescription>{filteredMacros.length} macros found</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: '600px', width: '100%' }}>
            <AgGridReact
              theme={themeQuartz}
              rowData={filteredMacros}
              columnDefs={columnDefs}
              defaultColDef={{
                resizable: true,
                sortable: true,
                filter: true,
              }}
              pagination={true}
              paginationPageSize={20}
              rowSelection={{
                mode: "singleRow",
                enableClickSelection: false
              }}
              animateRows={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
