"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import type { LogEntry } from "@/lib/log-parser"
import SharedMacroStatisticsTable, { type MacroStatEntry } from "@/components/shared/macro-statistics-table"

interface TimeAnalysisProps {
  data: LogEntry[]
  allMacroStats: MacroStatEntry[]
  selectedMacroNames: Set<string>
  onMacroSelectionChange: (newSelectedNames: Set<string>) => void
}

// Define a more specific type for what peakTime could be
interface PeakTimeInfo {
  count: number;
  // Make all specific time properties optional as they depend on the viewMode
  hour?: string; 
  dayName?: string;
  day?: string;
  // Add a general label for display regardless of type
  label: string;
}

export default function TimeAnalysis({ 
  data, 
  allMacroStats, 
  selectedMacroNames, 
  onMacroSelectionChange 
}: TimeAnalysisProps) {
  const [viewMode, setViewMode] = useState<"hourly" | "daily" | "weekly">("daily")

  const timeData = useMemo(() => {
    let dataForProcessing: LogEntry[];

    if (selectedMacroNames && selectedMacroNames.size > 0) {
      dataForProcessing = data.filter(entry => selectedMacroNames.has(entry.macroName));
    } else {
      // If no macros are selected, treat as no data for these charts.
      dataForProcessing = [];
    }

    if (dataForProcessing.length === 0) return { hourly: [], daily: [], weekly: [] }

    // Hourly analysis
    const hourlyStats = new Map<number, number>()
    for (let i = 0; i < 24; i++) hourlyStats.set(i, 0)

    // Daily analysis
    const dailyStats = new Map<string, number>()

    // Weekly analysis
    const weeklyStats = new Map<string, number>()
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    weekdays.forEach((day) => weeklyStats.set(day, 0))

    dataForProcessing.forEach((entry) => {
      const date = new Date(entry.timestamp)

      // Hour of day (0-23)
      const hour = date.getHours()
      hourlyStats.set(hour, (hourlyStats.get(hour) || 0) + 1)

      // Day of year
      const dayKey = date.toISOString().split("T")[0]
      dailyStats.set(dayKey, (dailyStats.get(dayKey) || 0) + 1)

      // Day of week
      const weekday = weekdays[date.getDay()]
      weeklyStats.set(weekday, (weeklyStats.get(weekday) || 0) + 1)
    })

    return {
      hourly: Array.from(hourlyStats.entries())
        .map(([hour, count]) => ({
          hour: `${hour.toString().padStart(2, "0")}:00`,
          hourNum: hour,
          count,
        }))
        .sort((a, b) => a.hourNum - b.hourNum),

      daily: Array.from(dailyStats.entries())
        .map(([date, count]) => ({
          date,
          count,
          dayName: new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),

      weekly: weekdays.map((day) => ({
        day,
        count: weeklyStats.get(day) || 0,
      })),
    }
  }, [data, selectedMacroNames])

  const currentData = timeData[viewMode]
  const peakTime: PeakTimeInfo = useMemo(() => {
    if (currentData.length === 0) return { count: 0, label: "N/A" };

    const maxItem = currentData.reduce(
      (max, item) => (item.count > max.count ? item : max),
      currentData[0],
    );

    let label = "N/A";
    if ('hour' in maxItem && maxItem.hour) label = maxItem.hour;
    else if ('dayName' in maxItem && maxItem.dayName) label = maxItem.dayName;
    else if ('day' in maxItem && maxItem.day) label = maxItem.day;

    return {
      count: maxItem.count,
      hour: 'hour' in maxItem ? maxItem.hour : undefined,
      dayName: 'dayName' in maxItem ? maxItem.dayName : undefined,
      day: 'day' in maxItem ? maxItem.day : undefined,
      label: label
    };
  }, [currentData]);

  const totalUsage = useMemo(() => {
    if (currentData.length === 0) return 0;
    return currentData.reduce((sum, item) => sum + item.count, 0);
  }, [currentData]);

  const averageUsage = useMemo(() => {
    if (currentData.length === 0 || totalUsage === 0) return 0;
    return totalUsage / currentData.length;
  }, [totalUsage, currentData]);

  const getTimeLabel = () => {
    switch (viewMode) {
      case "hourly":
        return "Hour of Day"
      case "daily":
        return "Date"
      case "weekly":
        return "Day of Week"
    }
  }

  const getXAxisKey = () => {
    switch (viewMode) {
      case "hourly":
        return "hour"
      case "daily":
        return "dayName"
      case "weekly":
        return "day"
    }
  }

  let chartDisplayElement;

  if (data.length === 0) {
    chartDisplayElement = (
      <Card>
        <CardHeader>
          <CardTitle>Usage Pattern</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12 h-96">
          <div className="text-center">
            <p className="text-2xl font-semibold text-muted-foreground mb-2">Insufficient Data for Time Analysis</p>
            <p className="text-muted-foreground">Load log data to view time analysis patterns.</p>
          </div>
        </CardContent>
      </Card>
    );
  } else if (currentData.length === 0) {
    chartDisplayElement = (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Usage Pattern - {getTimeLabel()}</CardTitle>
            <div className="flex space-x-2">
              <Button variant={viewMode === "hourly" ? "default" : "outline"} onClick={() => setViewMode("hourly")} disabled>By Hour</Button>
              <Button variant={viewMode === "daily" ? "default" : "outline"} onClick={() => setViewMode("daily")} disabled>By Day</Button>
              <Button variant={viewMode === "weekly" ? "default" : "outline"} onClick={() => setViewMode("weekly")} disabled>By Weekday</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12 h-96">
          <div className="text-center">
            <p className="text-lg font-semibold text-muted-foreground mb-2">No Data for Chart</p>
            <p className="text-muted-foreground">Select macros or adjust filters to display usage patterns.</p>
          </div>
        </CardContent>
      </Card>
    );
  } else {
    chartDisplayElement = (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Usage Pattern - {getTimeLabel()}</CardTitle>
            <div className="flex space-x-2">
              <Button variant={viewMode === "hourly" ? "default" : "outline"} onClick={() => setViewMode("hourly")}>
                By Hour
              </Button>
              <Button variant={viewMode === "daily" ? "default" : "outline"} onClick={() => setViewMode("daily")}>
                By Day
              </Button>
              <Button variant={viewMode === "weekly" ? "default" : "outline"} onClick={() => setViewMode("weekly")}>
                By Weekday
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === "daily" ? (
                <LineChart data={currentData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={getXAxisKey()} angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value: string) => `Date: ${value}`}
                    formatter={(value: number, name: string) => [`${value} executions`, name]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--foreground))", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={currentData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={getXAxisKey()} />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} executions`, "Count"]} />
                  <Bar dataKey="count" fill="hsl(var(--foreground))" radius={4} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards - Rendered Unconditionally */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{totalUsage}</p>
              <p className="text-sm text-muted-foreground">Total Executions ({viewMode})</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{averageUsage.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Average per {viewMode.slice(0, -2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{peakTime.count}</p>
              <p className="text-sm text-muted-foreground">
                Peak ({viewMode}): {peakTime.label}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Display Area */}
      {chartDisplayElement}

      {/* Shared Macro Statistics Table */}
      {allMacroStats && allMacroStats.length > 0 && (
        <SharedMacroStatisticsTable 
          allMacroStats={allMacroStats} 
          selectedMacroNames={selectedMacroNames} 
          onSelectionChange={onMacroSelectionChange} 
          title={data.length === 0 ? "Available Macros (Shared)" : "Available Macros"}
          description={data.length === 0 ? undefined : ""}
        />
      )}
    </div>
  )
}
