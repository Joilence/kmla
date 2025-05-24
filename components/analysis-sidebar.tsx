"use client"

import { useState, useCallback } from "react"
import { Upload, Database, Settings, ChevronDown, Info, FileText, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { parseLogData, getDateRange, type LogEntry, type AnalysisOptions } from "@/lib/log-parser"
import { loadSampleData } from "@/lib/sample-data"

interface AnalysisSidebarProps {
  logData: LogEntry[]
  analysisOptions: AnalysisOptions
  sidebarOpen: boolean
  onLogDataChange: (data: LogEntry[]) => void
  onAnalysisOptionsChange: (options: AnalysisOptions) => void
  uniqueMacros: number
  totalExecutions: number
  effectiveDateRange: { start: Date; end: Date } | null
}

export default function AnalysisSidebar({ 
  logData, 
  analysisOptions, 
  sidebarOpen, 
  onLogDataChange, 
  onAnalysisOptionsChange,
  uniqueMacros,
  totalExecutions,
  effectiveDateRange
}: AnalysisSidebarProps) {
  // Local state for sidebar-specific functionality
  const [loadDataOpen, setLoadDataOpen] = useState(true)
  const [analysisOptionsOpen, setAnalysisOptionsOpen] = useState(true)
  const [truncateLines, setTruncateLines] = useState(true)
  const [maxLines, setMaxLines] = useState(10000)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(
    (file: File) => {
      setError(null)
      console.log("🚀 File upload started")
      console.log("📁 File details:", {
        name: file.name,
        size: file.size,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2) + " MB",
        type: file.type
      })
      console.log("⚙️ Current settings:", {
        truncateLines,
        maxLines,
        maxLinesFormatted: maxLines.toLocaleString()
      })

      if (!file.name.endsWith(".log") && !file.name.endsWith(".txt")) {
        console.log("❌ Invalid file type")
        setError("Please upload a .log or .txt file")
        return
      }

      console.log("📖 Starting FileReader...")
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          console.log("📄 FileReader completed, processing content...")
          let content = e.target?.result as string
          console.log("📏 Raw content stats:", {
            lengthChars: content.length.toLocaleString(),
            lengthCharsMB: (content.length / 1024 / 1024).toFixed(2) + " MB"
          })

          // Count lines before any processing
          const originalLines = content.split("\n")
          console.log("📊 Original line count:", originalLines.length.toLocaleString())

          // Apply truncation if enabled
          if (truncateLines) {
            console.log("✂️ Truncation enabled, processing...")
            console.log("🎯 Target max lines:", maxLines.toLocaleString())
            
            if (originalLines.length > maxLines) {
              console.log("⚠️ File exceeds max lines, truncating...")
              console.log("📉 Truncating from", originalLines.length.toLocaleString(), "to", maxLines.toLocaleString(), "lines")
              
              const startTime = performance.now()
              content = originalLines.slice(-maxLines).join("\n")
              const endTime = performance.now()
              
              console.log("✅ Truncation completed in", (endTime - startTime).toFixed(2), "ms")
              console.log("📏 Truncated content length:", content.length.toLocaleString(), "characters")
            } else {
              console.log("✅ File is within limits, no truncation needed")
            }
          } else {
            console.log("ℹ️ Truncation disabled, processing full file")
          }

          console.log("🔄 Starting log data parsing...")
          const parseStartTime = performance.now()
          const parsed = parseLogData(content)
          const parseEndTime = performance.now()
          
          console.log("📈 Parsing completed in", (parseEndTime - parseStartTime).toFixed(2), "ms")
          console.log("📋 Parse results:", {
            entriesFound: parsed.length.toLocaleString(),
            firstEntry: parsed[0] || "None",
            lastEntry: parsed[parsed.length - 1] || "None"
          })

          if (parsed.length === 0) {
            console.log("⚠️ No entries found, showing alert")
            alert(
              "No macro execution entries found in the log file. Please check the console for debugging information, or try the sample data button below.",
            )
            return
          }

          console.log("🎉 Setting log data...")
          onLogDataChange(parsed)
          console.log("✅ File upload process completed successfully")
        } catch (err) {
          console.error("💥 Error processing file:", err)
          console.error("📊 Error details:", {
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            name: err instanceof Error ? err.name : typeof err
          })
          setError("Error reading file. Please try again.")
        }
      }
      reader.onerror = () => {
        console.error("💥 FileReader error occurred")
        setError("Error reading file. Please try again.")
      }
      reader.readAsText(file)
    },
    [truncateLines, maxLines, onLogDataChange],
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0])
      }
    },
    [handleFile],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0])
      }
    },
    [handleFile],
  )

  const handleLoadSampleData = () => {
    const testResult = loadSampleData()
    if (testResult.success) {
      onLogDataChange(testResult.entries)
      console.log("Sample data loaded:", testResult.details)
    } else {
      alert("Failed to load sample data")
    }
  }

  return (
    <div className={`${sidebarOpen ? 'w-96 border' : 'w-0'} transition-all duration-300 overflow-hidden bg-card rounded-lg flex-shrink-0`}>
      <div className="h-full overflow-y-auto p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Data & Analysis Settings</h2>
            <p className="text-sm text-muted-foreground">Load your data and configure analysis options</p>
          </div>

          {/* Load Data Section */}
          <Collapsible open={loadDataOpen} onOpenChange={setLoadDataOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-accent py-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4" />
                      <span>Load Data</span>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground">
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-2">
                            <p className="font-medium">File Format</p>
                            <p className="text-xs">
                              Expected format: "YYYY-MM-DD HH:MM:SS Execute macro "Macro Name" from trigger Trigger Type"
                            </p>
                            <p className="font-medium">Troubleshooting</p>
                            <p className="text-xs">
                              If file upload isn't working, check the browser console (F12) for debugging information.
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <ChevronDown className={`h-3 w-3 transition-transform ${loadDataOpen ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="py-3">
              <div className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Truncate Options */}
                <div className="space-y-2 p-3 bg-accent rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="truncate" 
                      checked={truncateLines} 
                      onCheckedChange={setTruncateLines}
                      className="scale-75"
                    />
                    <Label htmlFor="truncate" className="text-xs">Truncate large files</Label>
                  </div>
                  {truncateLines && (
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="maxLines" className="text-xs whitespace-nowrap">Max lines:</Label>
                      <Input
                        id="maxLines"
                        type="number"
                        value={maxLines}
                        onChange={(e) => setMaxLines(parseInt(e.target.value) || 10000)}
                        min={100}
                        max={100000}
                        step={1000}
                        className="flex-1 h-8 text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* File Upload */}
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    dragActive ? "border-primary bg-accent" : "border-border hover:border-muted-foreground"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <FileText className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
                  <p className="text-xs font-medium mb-2">Drop your log file here, or click to browse</p>
                  <p className="text-xs text-muted-foreground mb-3">Supports .log and .txt files</p>

                  <input
                    type="file"
                    accept=".log,.txt"
                    onChange={handleInputChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById("file-upload") as HTMLInputElement
                        if (input) {
                          input.click()
                        }
                      }}
                      className="w-full text-xs"
                    >
                      Choose File
                    </Button>
                    <Button 
                      onClick={handleLoadSampleData} 
                      variant="outline" 
                      size="sm"
                      className="w-full text-xs"
                    >
                      <Database className="h-3 w-3 mr-2" />
                      Load Sample Data
                    </Button>
                  </div>
                </div>

                {/* Statistics */}
                <div className="space-y-2">
                  {logData.length > 0 ? (
                    <div className="space-y-2 bg-accent rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Total Executions:</span>
                        <span className="text-xs font-semibold">{logData.length.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Unique Macros:</span>
                        <span className="text-xs font-semibold">
                          {new Set(logData.map((entry) => entry.macroName)).size}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Date Range:</span>
                        <span className="text-xs font-semibold">
                          {(() => {
                            const { start, end } = getDateRange(logData)
                            if (start && end) {
                              const startDate = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              const endDate = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              return start.toDateString() === end.toDateString() ? startDate : `${startDate} - ${endDate}`
                            }
                            return 'N/A'
                          })()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-accent rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">No data loaded</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

          {/* Analysis Options Section */}
          <Collapsible open={analysisOptionsOpen} onOpenChange={setAnalysisOptionsOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-accent py-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span>Analysis Options</span>
                    </div>
                    <ChevronDown className={`h-3 w-3 transition-transform ${analysisOptionsOpen ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 py-3">
                  {/* Date Range Picker */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Date Range</h4>
                    <div className="space-y-2">
                      <DateRangePicker
                        dateRange={{
                          from: analysisOptions.dateRange.start || undefined,
                          to: analysisOptions.dateRange.end || undefined,
                        }}
                        onDateRangeChange={(range) => 
                          onAnalysisOptionsChange({
                            ...analysisOptions,
                            dateRange: {
                              start: range?.from || null,
                              end: range?.to || null
                            }
                          })
                        }
                        placeholder="Select date range"
                        className="w-full h-8 text-xs"
                      />
                      {(analysisOptions.dateRange.start || analysisOptions.dateRange.end) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onAnalysisOptionsChange({
                            ...analysisOptions,
                            dateRange: { start: null, end: null }
                          })}
                          className="w-full h-8 text-xs"
                        >
                          Clear Date Range
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Deduplication Toggle */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Deduplication</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="deduplication"
                          checked={analysisOptions.deduplicate}
                          onCheckedChange={(checked) => 
                            onAnalysisOptionsChange({
                              ...analysisOptions,
                              deduplicate: checked
                            })
                          }
                          className="scale-75"
                        />
                        <Label htmlFor="deduplication" className="text-xs">Remove duplicates</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="dedup-window" className="text-xs whitespace-nowrap">Window (ms):</Label>
                        <Input
                          id="dedup-window"
                          type="number"
                          min="0"
                          max="10000"
                          step="100"
                          value={analysisOptions.deduplicationWindow}
                          onChange={(e) => 
                            onAnalysisOptionsChange({
                              ...analysisOptions,
                              deduplicationWindow: parseInt(e.target.value) || 0
                            })
                          }
                          disabled={!analysisOptions.deduplicate}
                          className="flex-1 h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>
    </div>
  )
} 