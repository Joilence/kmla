"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, themeQuartz } from "ag-grid-community";
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

export interface MacroStatEntry {
  name: string;
  count: number;
  avgPerDay: string;
  firstSeen: Date;
  lastSeen: Date;
  triggers: string;
  daysDiff: number;
}

interface SharedMacroStatisticsTableProps {
  allMacroStats: MacroStatEntry[];
  selectedMacroNames: Set<string>;
  onSelectionChange: (newSelectedNames: Set<string>) => void;
  title?: string;
  description?: string;
}

// AG Grid column definitions - kept identical to original macro-analysis
const columnDefs: ColDef<MacroStatEntry>[] = [
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
];

export default function SharedMacroStatisticsTable({
  allMacroStats,
  selectedMacroNames,
  onSelectionChange,
  title = "Macro Statistics",
  description
}: SharedMacroStatisticsTableProps) {
  const gridApiRef = useRef<GridApi | null>(null);
  const [isGridReady, setIsGridReady] = useState(false);

  const gridRowData = useMemo(() => {
    // Ensure allMacroStats is treated as an array, defaulting to empty if not provided or invalid
    const stats = Array.isArray(allMacroStats) ? allMacroStats : [];
    return [...stats].sort((a, b) => b.count - a.count);
  }, [allMacroStats]);

  useEffect(() => {
    if (isGridReady && gridApiRef.current) {
      gridApiRef.current.forEachNode(node => {
        if (node.data) {
          const macroName = node.data.name as string;
          const shouldBeSelected = selectedMacroNames.has(macroName);
          if (node.isSelected() !== shouldBeSelected) {
            node.setSelected(shouldBeSelected, false, 'api');
          }
        }
      });
    }
  }, [selectedMacroNames, gridRowData, isGridReady]); // gridRowData dependency to re-sync if data changes

  const onGridReadyHandler = (params: GridReadyEvent) => {
    gridApiRef.current = params.api;
    setIsGridReady(true);
  };

  const onSelectionChangedHandler = (event: SelectionChangedEvent) => {
    if (event.api) {
      // Current selection visible in the grid
      const currentGridSelectedNames = new Set(event.api.getSelectedRows().map(row => row.name as string));
      
      // Create a new set based on the overall selectedMacroNames from props,
      // then update it based on the current grid's state for *visible* rows.
      // This handles cases where the grid might be filtered by its own UI in the future.
      const newOverallSelectedNames = new Set(selectedMacroNames); 

      event.api.forEachNode(node => {
        if (node.data) {
          const macroName = node.data.name as string;
          // If the node is among those currently selected in the grid UI
          if (currentGridSelectedNames.has(macroName)) {
            newOverallSelectedNames.add(macroName);
          } 
          // If the node is *not* among those currently selected in the grid UI,
          // and it *was* in the overall selection, it means it was deselected *via the UI*.
          // However, if it wasn't in currentGridSelectedNames because it's filtered out, we shouldn't deselect it from overall.
          // The most robust way for a shared component is to reflect exactly what the grid API says for the *currently selected rows*
          // and let the parent manage the "overall truth" if parts of the data aren't visible.
          // Given current setup (no internal grid search/filter term), it's simpler:
        }
      });
      // For this version, we directly use what the grid tells us are selected from all its rows.
      const directlySelectedInGrid = new Set(event.api.getSelectedRows().map(row => row.name as string));
      onSelectionChange(directlySelectedInGrid);
    }
  };
  
  const effectiveDescription = description ?? `${gridRowData.length} macros found`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {effectiveDescription && <CardDescription>{effectiveDescription}</CardDescription>}
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
          <AgGridReact<MacroStatEntry>
            theme={themeQuartz}
            rowData={gridRowData}
            columnDefs={columnDefs}
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
            onGridReady={onGridReadyHandler}
            onSelectionChanged={onSelectionChangedHandler}
            animateRows={true}
          />
        </div>
      </CardContent>
    </Card>
  );
} 