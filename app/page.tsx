"use client"

import { useState, useMemo, useEffect } from "react"
import { BarChart3, Keyboard, Calendar, Settings } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import AnalysisSidebar from "@/components/analysis-sidebar"
import MacroAnalysis from "@/components/macro-analysis"
import KeyboardAnalysis from "@/components/keyboard-analysis"
import TimeAnalysis from "@/components/time-analysis"
import type { LogEntry, AnalysisOptions } from "@/lib/log-parser"
import type { MacroStatEntry } from "@/components/shared/macro-statistics-table"

export default function Home() {
  const [logData, setLogData] = useState<LogEntry[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [analysisOptions, setAnalysisOptions] = useState<AnalysisOptions>({
    deduplicate: true,
    deduplicationWindow: 1000, // 1 second
    dateRange: {
      start: null,
      end: null,
    },
  })

  const filteredData = useMemo(() => {
    let filtered = [...logData]

    // Apply date filtering
    if (analysisOptions.dateRange.start || analysisOptions.dateRange.end) {
      filtered = filtered.filter((entry) => {
        const entryDate = new Date(entry.timestamp)
        const start = analysisOptions.dateRange.start
        const end = analysisOptions.dateRange.end

        if (start && entryDate < start) return false
        if (end && entryDate > end) return false
        return true
      })
    }

    // Apply deduplication
    if (analysisOptions.deduplicate) {
      // Ensure consistent sorting for deduplication, typically by timestamp
      // If logData is already sorted by timestamp, this explicit sort might be redundant but safe.
      const sortedForDeduplication = [...filtered].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      filtered = sortedForDeduplication.filter((entry, index, arr) => {
        if (index === 0) return true;      
        const prevEntry = arr[index - 1];
        const timeDiff = new Date(entry.timestamp).getTime() - new Date(prevEntry.timestamp).getTime();
        return !(entry.macroName === prevEntry.macroName && timeDiff < analysisOptions.deduplicationWindow);
      });
    }
    return filtered
  }, [logData, analysisOptions])

  // Centralized macroStats calculation
  const macroStats: MacroStatEntry[] = useMemo(() => {
    const stats = new Map<
      string,
      {
        count: number;
        firstSeen: Date;
        lastSeen: Date;
        triggers: Set<string>;
      }
    >();

    filteredData.forEach((entry) => {
      if (!entry.macroName) return; // Basic guard

      const existing = stats.get(entry.macroName) || {
        count: 0,
        firstSeen: new Date(entry.timestamp),
        lastSeen: new Date(entry.timestamp),
        triggers: new Set<string>(),
      };

      existing.count++;
      existing.lastSeen = new Date(entry.timestamp);
      if (new Date(entry.timestamp) < existing.firstSeen) {
        existing.firstSeen = new Date(entry.timestamp);
      }
      existing.triggers.add(entry.trigger);
      stats.set(entry.macroName, existing);
    });

    return Array.from(stats.entries()).map(([name, stat]) => {
      const daysDiff = Math.max(
        1,
        Math.ceil(
          (stat.lastSeen.getTime() - stat.firstSeen.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      return {
        name,
        count: stat.count,
        avgPerDay: (stat.count / daysDiff).toFixed(1),
        firstSeen: stat.firstSeen,
        lastSeen: stat.lastSeen,
        triggers: Array.from(stat.triggers).join(", "),
        daysDiff,
      };
    });
  }, [filteredData]);

  // Shared state for selected macro names
  const [selectedMacroNames, setSelectedMacroNames] = useState<Set<string>>(new Set());

  // Effect to initialize/reset selection when macroStats change
  useEffect(() => {
    if (macroStats.length > 0) {
      setSelectedMacroNames(new Set(macroStats.map(m => m.name)));
    } else {
      setSelectedMacroNames(new Set());
    }
  }, [macroStats]);

  // General stats for display - can be kept as is
  const generalDisplayStats = useMemo(() => { // Renamed to avoid confusion with macroStats for table
    const uniqueMacros = new Set(filteredData.map((entry) => entry.macroName)).size
    const totalExecutions = filteredData.length
    const dateRange =
      filteredData.length > 0
        ? {
            start: new Date(Math.min(...filteredData.map((entry) => new Date(entry.timestamp).getTime()))),
            end: new Date(Math.max(...filteredData.map((entry) => new Date(entry.timestamp).getTime()))),
          }
        : null

    return {
      uniqueMacros,
      totalExecutions,
      dateRange,
    }
  }, [filteredData])

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
      {/* Full-width Header */}
      <div className="bg-card border-b p-6">
        <div className="container mx-auto flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">kmla</h1>
            <p className="text-muted-foreground text-lg">Analyze your Keyboard Maestro macro usage</p>
          </div>
          <Button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>{sidebarOpen ? 'Hide' : 'Show'} Settings</span>
          </Button>
        </div>
      </div>

      {/* Content Section with Sidebar and Tabs */}
      <div className="container mx-auto p-6">
        <div className="flex gap-6">
          {/* Analysis Sidebar */}
          <AnalysisSidebar
            logData={logData}
            analysisOptions={analysisOptions}
            sidebarOpen={sidebarOpen}
            onLogDataChange={setLogData}
            onAnalysisOptionsChange={setAnalysisOptions}
            uniqueMacros={generalDisplayStats.uniqueMacros}
            totalExecutions={generalDisplayStats.totalExecutions}
            effectiveDateRange={generalDisplayStats.dateRange}
          />

          {/* Analysis Tabs */}
          <div className="flex-1">
            <Tabs defaultValue="macros" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="macros" className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Macro Usage</span>
                </TabsTrigger>
                <TabsTrigger value="keyboard" className="flex items-center space-x-2">
                  <Keyboard className="h-4 w-4" />
                  <span>Keyboard</span>
                </TabsTrigger>
                <TabsTrigger value="time" className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Time Analysis</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="macros" className="mt-6">
                <MacroAnalysis 
                  data={filteredData}
                  allMacroStats={macroStats}
                  selectedMacroNames={selectedMacroNames}
                  onSelectionChange={setSelectedMacroNames}
                />
              </TabsContent>

              <TabsContent value="keyboard" className="mt-6">
                <KeyboardAnalysis data={filteredData} />
              </TabsContent>

              <TabsContent value="time" className="mt-6">
                <TimeAnalysis 
                  data={filteredData}
                  allMacroStats={macroStats}
                  selectedMacroNames={selectedMacroNames}
                  onMacroSelectionChange={setSelectedMacroNames}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  )
}
