"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import SharedMacroStatisticsTable, { type MacroStatEntry } from "@/components/shared/macro-statistics-table"

interface MacroAnalysisProps {
  allMacroStats: MacroStatEntry[];
  selectedMacroNames: Set<string>;
  onSelectionChange: (newSelectedNames: Set<string>) => void;
}

const PIE_COLORS = [
  "#1A1A1A", // Near Black
  "#262626",
  "#333333",
  "#404040",
  "#4D4D4D",
  "#595959",
  "#666666",
  "#737373",
  "#808080", // Medium Gray
  "#8C8C8C",
  "#999999",
  "#A6A6A6",
  "#B3B3B3",
  "#BFBFBF",
  "#CCCCCC",
  "#D9D9D9",
  "#E5E5E5",
  "#F0F0F0",
  "#FAFAFA", // Near White
  "#FFFFFF"
];

const RADIAN = Math.PI / 180;

interface CustomizedPieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  percent: number;
  fullName?: string;
  name: string;
}

const renderCustomizedPieLabel = (props: CustomizedPieLabelProps) => {
  const { cx, cy, midAngle, outerRadius, percent, fullName, name } = props;
  const labelRadius = outerRadius + 25;
  const x = cx + labelRadius * Math.cos(-midAngle * RADIAN);
  const y = cy + labelRadius * Math.sin(-midAngle * RADIAN);
  const effectiveName = fullName || name;

  return (
    <text
      x={x}
      y={y}
      fill="hsl(var(--foreground))"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
    >
      {`${effectiveName} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

export default function MacroAnalysis({
  allMacroStats,
  selectedMacroNames,
  onSelectionChange,
}: MacroAnalysisProps) {
  const [topN, setTopN] = useState(10)
  const [chartType, setChartType] = useState<"bar" | "pie">("bar")

  const macrosForAnalysis = useMemo(() => {
    if (!allMacroStats || allMacroStats.length === 0) {
        return [];
    }
    if (selectedMacroNames.size === 0 && allMacroStats.length > 0) {
      return []; 
    }
    const allNamesFromProps = new Set(allMacroStats.map(m => m.name));
    if (selectedMacroNames.size === allNamesFromProps.size || allMacroStats.length === 0) {
      return allMacroStats; 
    }
    return allMacroStats.filter(macro => selectedMacroNames.has(macro.name));
  }, [allMacroStats, selectedMacroNames]);

  const chartDataInput = useMemo(() => {
      return macrosForAnalysis.sort((a, b) => b.count - a.count);
  }, [macrosForAnalysis]);

  const topMacros = chartDataInput.slice(0, topN);

  const chartData = topMacros.map((macro) => ({
    name: macro.name.length > 30 ? macro.name.substring(0, 30) + "..." : macro.name,
    count: macro.count,
    fullName: macro.name,
  }))

  if (!allMacroStats || allMacroStats.length === 0) { 
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
        <SharedMacroStatisticsTable 
          allMacroStats={[]} 
          selectedMacroNames={new Set()} 
          onSelectionChange={() => {}} 
          title="Macro Statistics"
          description="No macro data available."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Top {topN} Macros Visualization</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="topNChart" className="whitespace-nowrap">Top N</Label>
              <Input
                id="topNChart"
                type="number"
                value={topN}
                onChange={(e) => {
                  const parsedValue = Number.parseInt(e.target.value);
                  if (isNaN(parsedValue)) {
                    setTopN(10); 
                  } else {
                    setTopN(Math.max(1, Math.min(parsedValue, 20))); 
                  }
                }}
                min={1}
                max={20} 
                className="w-20"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="chart-type-switch">Bar</Label>
              <Switch
                id="chart-type-switch"
                checked={chartType === "pie"}
                onCheckedChange={(checked) => setChartType(checked ? "pie" : "bar")}
                className="data-[state=checked]:bg-input data-[state=unchecked]:bg-input"
              />
              <Label htmlFor="chart-type-switch">Pie</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-xl font-semibold text-muted-foreground mb-2">Insufficient Data</p>
                  <p className="text-muted-foreground">
                    No macros selected for visualization, or selected macros have no data.
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name, props) => [
                        `${value?.toLocaleString()} executions`, 
                        props.payload?.fullName || name
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
                ) : (
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={renderCustomizedPieLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="fullName"
                      animationDuration={300}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                       formatter={(value, name, props) => [
                         `${value?.toLocaleString()} executions (${(props.payload?.percent * 100).toFixed(1)}%)`, 
                         props.payload?.payload?.fullName || name
                       ]}
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
                  </PieChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <SharedMacroStatisticsTable 
        allMacroStats={allMacroStats} 
        selectedMacroNames={selectedMacroNames} 
        onSelectionChange={onSelectionChange} 
      />
    </div>
  )
}
