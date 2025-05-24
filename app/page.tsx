"use client"

import { useState, useMemo } from "react"
import { BarChart3, Keyboard, Calendar, Settings } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import AnalysisSidebar from "@/components/analysis-sidebar"
import MacroAnalysis from "@/components/macro-analysis"
import KeyboardAnalysis from "@/components/keyboard-analysis"
import TimeAnalysis from "@/components/time-analysis"
import { type LogEntry, type AnalysisOptions } from "@/lib/log-parser"

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
      filtered = filtered.filter((entry, index) => {
        if (index === 0) return true

        const prevEntry = filtered[index - 1]
        const timeDiff = new Date(entry.timestamp).getTime() - new Date(prevEntry.timestamp).getTime()

        return !(entry.macroName === prevEntry.macroName && timeDiff < analysisOptions.deduplicationWindow)
      })
    }

    return filtered
  }, [logData, analysisOptions])



  const stats = useMemo(() => {
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
                <MacroAnalysis data={filteredData} />
              </TabsContent>

              <TabsContent value="keyboard" className="mt-6">
                <KeyboardAnalysis data={filteredData} />
              </TabsContent>

              <TabsContent value="time" className="mt-6">
                <TimeAnalysis data={filteredData} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  )
}
