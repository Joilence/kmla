export interface LogEntry {
  timestamp: string
  macroName: string
  trigger: string
  raw: string
}

export interface AnalysisOptions {
  deduplicate: boolean
  deduplicationWindow: number // milliseconds
  dateRange: {
    start: Date | null
    end: Date | null
  }
}

function preprocessContent(content: string): string {
  // Replace smart quotes with straight quotes
  return content
    .replace(/\u201C/g, '"') // Left double quotation mark (8220)
    .replace(/\u201D/g, '"') // Right double quotation mark (8221)
}

export function parseLogData(content: string): LogEntry[] {
  console.log("Starting to parse log data...")
  
  // Preprocess content to replace smart quotes with straight quotes
  const preprocessedContent = preprocessContent(content)
  
  const lines = preprocessedContent.split(/\r?\n/).filter((line) => line.trim())
  console.log("Total non-empty lines:", lines.length)

  const entries: LogEntry[] = []
  let matchedLines = 0
  const sampleUnmatched: string[] = []

  // Debug first line
  if (lines.length > 0) {
    const firstLine = lines[0]
    console.log("🔍 First line analysis:")
    console.log("Raw line:", firstLine)
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines
    if (!line) continue

    // Only process lines that contain "Execute macro"
    if (!line.includes("Execute macro")) {
      continue
    }

    try {
      // Extract timestamp
      const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/)
      if (!timestampMatch) {
        if (sampleUnmatched.length < 3) {
          sampleUnmatched.push(`Line ${i + 1}: No timestamp`)
        }
        continue
      }
      const timestamp = timestampMatch[1]

      // Extract macro name using simple straight quotes (after preprocessing)
      const macroMatch = line.match(/Execute macro "([^"]*)"/)
      if (!macroMatch) {
        if (sampleUnmatched.length < 3) {
          sampleUnmatched.push(`Line ${i + 1}: No macro name`)
        }
        continue
      }
      const macroName = macroMatch[1]

      // Find "from trigger" and extract everything after it
      const triggerMatch = line.match(/from trigger (.+)$/)
      if (!triggerMatch) {
        if (sampleUnmatched.length < 3) {
          sampleUnmatched.push(`Line ${i + 1}: No trigger`)
        }
        continue
      }
      const trigger = triggerMatch[1]

      // Successfully parsed
      matchedLines++
      entries.push({
        timestamp: timestamp.trim(),
        macroName: macroName.trim(),
        trigger: trigger.trim(),
        raw: line,
      })

      // Log first few successful matches
      if (matchedLines <= 3) {
        console.log(`✅ Match ${matchedLines}:`, { timestamp, macroName, trigger })
      }
    } catch (error) {
      console.error(`Error parsing line ${i + 1}:`, error)
    }
  }

  console.log("Matched lines:", matchedLines)
  console.log("Total entries parsed:", entries.length)

  if (sampleUnmatched.length > 0) {
    console.log("Sample unmatched lines:", sampleUnmatched)
  }

  if (entries.length > 0) {
    console.log("First entry:", entries[0])
    console.log("Last entry:", entries[entries.length - 1])
  }

  return entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export function getDateRange(entries: LogEntry[]): { start: Date | null; end: Date | null } {
  if (entries.length === 0) return { start: null, end: null }

  const timestamps = entries.map((entry) => new Date(entry.timestamp).getTime())
  return {
    start: new Date(Math.min(...timestamps)),
    end: new Date(Math.max(...timestamps)),
  }
}

export function deduplicateEntries(entries: LogEntry[], windowMs = 1000): LogEntry[] {
  if (entries.length === 0) return entries

  const deduplicated: LogEntry[] = [entries[0]]

  for (let i = 1; i < entries.length; i++) {
    const current = entries[i]
    const previous = deduplicated[deduplicated.length - 1]

    const timeDiff = new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()

    // Keep entry if it's a different macro or outside the deduplication window
    if (current.macroName !== previous.macroName || timeDiff >= windowMs) {
      deduplicated.push(current)
    }
  }

  return deduplicated
}
