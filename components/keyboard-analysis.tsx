"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule, themeQuartz } from "ag-grid-community"
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  SelectionChangedEvent,
} from "ag-grid-community"
import type { LogEntry } from "@/lib/log-parser"

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

interface KeyboardAnalysisProps {
  data: LogEntry[]
}

const KEYBOARD_LAYOUT = [
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
  ["Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"],
  ["Caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter"],
  ["Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Shift"],
  ["Ctrl", "Option", "Cmd", "Space", "Cmd", "Option", "Ctrl"],
]

const MODIFIER_SYMBOLS: Record<string, string> = {
  "⌘": "Cmd",
  "⌥": "Option",
  "⌃": "Ctrl",
  "⇧": "Shift",
}

export default function KeyboardAnalysis({ data }: KeyboardAnalysisProps) {
  const hotKeyCombinationGridApiRef = useRef<GridApi | null>(null);
  const [isHotKeyCombinationGridReady, setIsHotKeyCombinationGridReady] = useState(false);
  const [selectedCombinations, setSelectedCombinations] = useState<Set<string>>(new Set());

  const hotKeyData = useMemo(() => {
    const hotKeys = data.filter((entry) => entry.trigger.includes("Hot Key"))

    const keyStats = new Map<string, number>()
    const modifierStats = new Map<string, number>()
    const combinationStats = new Map<string, number>()

    hotKeys.forEach((entry) => {
      const match = entry.trigger.match(/Hot Key (.+) is pressed/)
      if (match) {
        const combination = match[1]
        combinationStats.set(combination, (combinationStats.get(combination) || 0) + 1)

        // Parse modifiers and key
        let key = combination
        Object.entries(MODIFIER_SYMBOLS).forEach(([symbol, name]) => {
          if (combination.includes(symbol)) {
            modifierStats.set(name, (modifierStats.get(name) || 0) + 1)
            key = key.replace(symbol, "")
          }
        })

        if (key) {
          keyStats.set(key.toUpperCase(), (keyStats.get(key.toUpperCase()) || 0) + 1)
        }
      }
    })

    return {
      keyStats: Array.from(keyStats.entries()).sort((a, b) => b[1] - a[1]),
      modifierStats: Array.from(modifierStats.entries()).sort((a, b) => b[1] - a[1]),
      combinationStats: Array.from(combinationStats.entries()).sort((a, b) => b[1] - a[1]),
    }
  }, [data])

  // Effect to initialize selection to all combinations when data changes
  useEffect(() => {
    if (hotKeyData.combinationStats.length > 0) {
      setSelectedCombinations(new Set(hotKeyData.combinationStats.map(([combo]) => combo)));
    } else {
      setSelectedCombinations(new Set());
    }
  }, [hotKeyData.combinationStats]);

  const hotKeyGridRowData = useMemo(() => {
    return hotKeyData.combinationStats.map(([combination, count], index) => ({
      rank: index + 1,
      combination,
      count
    }));
  }, [hotKeyData.combinationStats]);

  // Effect to synchronize AG Grid's visual selection with selectedCombinations state
  useEffect(() => {
    if (isHotKeyCombinationGridReady && hotKeyCombinationGridApiRef.current) {
      hotKeyCombinationGridApiRef.current.forEachNode(node => {
        if (node.data && node.data.combination) {
          const shouldBeSelected = selectedCombinations.has(node.data.combination);
          if (node.isSelected() !== shouldBeSelected) {
            node.setSelected(shouldBeSelected, false, 'api');
          }
        }
      });
    }
  }, [selectedCombinations, hotKeyGridRowData, isHotKeyCombinationGridReady]);

  const onHotKeyGridReady = (params: GridReadyEvent) => {
    hotKeyCombinationGridApiRef.current = params.api;
    setIsHotKeyCombinationGridReady(true);
  };

  const onHotKeySelectionChanged = (event: SelectionChangedEvent) => {
    if (event.api) {
      const currentGridSelectedCombinations = new Set(
        event.api.getSelectedNodes().map(node => node.data.combination as string)
      );
      
      setSelectedCombinations(prevOverallSelected => {
        const newOverallSelected = new Set(prevOverallSelected);
        event.api.forEachNode(node => {
          if (node.data && node.data.combination) {
            const comboName = node.data.combination as string;
            if (currentGridSelectedCombinations.has(comboName)) {
              newOverallSelected.add(comboName);
            } else {
              newOverallSelected.delete(comboName);
            }
          }
        });
        return newOverallSelected;
      });
    }
  };

  const getKeyIntensity = (key: string) => {
    const count = hotKeyData.keyStats.find(([k]) => k === key.toUpperCase())?.[1] || 0
    if (count === 0) return 0
    
    const maxCount = Math.max(...hotKeyData.keyStats.map(([, count]) => count), 1)
    
    const logCount = Math.log(count + 1)
    const logMaxCount = Math.log(maxCount + 1)
    
    return logCount / logMaxCount
  }

  const getKeyColor = (intensity: number) => {
    if (intensity === 0) return "bg-card border text-muted-foreground"
    if (intensity < 0.25) return "bg-muted/30 border-2 text-foreground shadow-sm"
    if (intensity < 0.5) return "bg-muted/50 border-2 text-foreground shadow-md"
    if (intensity < 0.75) return "bg-muted/70 border-4 text-foreground shadow-lg"
    return "bg-muted/80 border-4 text-foreground shadow-xl font-semibold"
  }

  // Show empty state if no data
  if (data.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-2xl font-semibold text-muted-foreground mb-2">Insufficient Data</p>
              <p className="text-muted-foreground">Load log data to view keyboard analysis</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hotkeyColumnDefs: ColDef[] = [
    {
      headerName: "",
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: 'left',
      resizable: false,
      sortable: false,
      filter: false,
    },
    {
      headerName: "Rank",
      field: "rank",
      sortable: true,
      filter: "agNumberColumnFilter",
      flex: 1
    },
    {
      headerName: "Hotkey Combination",
      field: "combination",
      sortable: true,
      filter: true,
      flex: 3
    },
    {
      headerName: "Usage Count",
      field: "count",
      sortable: true,
      filter: "agNumberColumnFilter",
      flex: 2
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{hotKeyData.combinationStats.length}</p>
              <p className="text-sm text-muted-foreground">Unique Hotkey Combinations</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {hotKeyData.keyStats.reduce((sum, [, count]) => sum + count, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Hotkey Presses</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{hotKeyData.keyStats.length}</p>
              <p className="text-sm text-muted-foreground">Keys Used</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Virtual Keyboard */}
      <Card>
        <CardHeader>
          <CardTitle>Keyboard Heatmap</CardTitle>
          <CardDescription>Visualization of which keys you use most frequently in hotkey combinations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Keyboard Layout */}
            <div>
              <div className="space-y-2 p-4 rounded-lg overflow-auto">
                {KEYBOARD_LAYOUT.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex justify-center space-x-1">
                    {row.map((key, keyIndex) => {
                      const intensity = getKeyIntensity(key)
                      const colorClass = getKeyColor(intensity)
                      const count = hotKeyData.keyStats.find(([k]) => k === key.toUpperCase())?.[1] || 0

                      return (
                        <div
                          key={`${rowIndex}-${keyIndex}`}
                          className={`
                            px-2 py-2 rounded text-xs font-medium min-w-[2rem] text-center
                            ${colorClass}
                            ${key === "Space" ? "min-w-[8rem]" : ""}
                            ${key === "Tab" || key === "Caps" || key === "Enter" || key === "Shift" ? "min-w-[3rem]" : ""}
                            transition-all hover:scale-105
                          `}
                          title={count > 0 ? `${key}: ${count} uses` : key}
                        >
                          {key}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-card border rounded"></div>
                  <span>Unused</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-muted/30 border-2 shadow-sm rounded"></div>
                  <span>Low</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-muted/50 border-2 shadow-md rounded"></div>
                  <span>Medium</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-muted/80 border-4 shadow-xl rounded"></div>
                  <span>High</span>
                </div>
              </div>
            </div>

            {/* Most Used Modifier Keys Row */}
            <div>
              <h4 className="text-center text-sm font-medium text-muted-foreground mb-3">Most Used Modifier Keys</h4>
              <div className="flex items-center justify-center gap-3">
                {hotKeyData.modifierStats.map(([modifier, count]) => {
                  // Find the symbol for this modifier
                  const symbol = Object.keys(MODIFIER_SYMBOLS).find(
                    (sym) => MODIFIER_SYMBOLS[sym] === modifier
                  ) || ""
                  
                  return (
                    <div key={modifier} className="text-center p-2 bg-accent rounded text-xs min-w-[80px]">
                      <p className="text-lg font-bold">{count}</p>
                      <div className="flex items-center justify-center font-medium">
                        {symbol && <span className="text-sm mr-1">{symbol}</span>}
                        <span>{modifier}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Hotkey Combinations */}
      <Card>
        <CardHeader>
          <CardTitle>Most Used Hotkey Combinations</CardTitle>
          <CardDescription>{hotKeyData.combinationStats.length} hotkey combinations found</CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            style={{
              height: '600px', 
              width: '100%',
              '--ag-checkbox-checked-color': 'black',
              '--ag-accent-color': 'black',
            } as React.CSSProperties}
          >
            <AgGridReact
              theme={themeQuartz}
              rowData={hotKeyGridRowData}
              columnDefs={hotkeyColumnDefs} 
              defaultColDef={{
                resizable: true,
                sortable: true,
                filter: true,
              }}
              pagination={true}
              paginationPageSize={20}
              rowSelection="multiple"
              rowMultiSelectWithClick={true}
              suppressRowClickSelection={false}
              onGridReady={onHotKeyGridReady}
              onSelectionChanged={onHotKeySelectionChanged}
              animateRows={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
