import { parseLogData, type LogEntry } from "./log-parser"

// Macro names for random generation
const MACRO_NAMES = [
  "Launch Chat",
  "Launch Browser",
  "Center windows",
  "Refresh windows",
  "Cleanup",
  "Launch Email",
  "Launch Terminal",
  "Launch Code Editor",
  "Screenshot",
  "Screen Recording",
  "Toggle Dark Mode",
  "Lock Screen",
  "Sleep Display",
  "Show Desktop",
  "Hide All Windows",
  "Minimize All",
  "Maximize Window",
  "Split View Left",
  "Split View Right",
  "New Tab",
  "Close Tab",
  "Switch Workspace",
  "Open Downloads",
  "Quick Note",
  "Search Files",
  "Toggle Wifi",
  "Volume Up",
  "Volume Down",
  "Mute",
  "Play/Pause",
  "Next Track",
  "Previous Track",
  "Copy URL",
  "Paste Plain Text",
  "Clear Clipboard",
  "Show Calendar",
  "Show Weather",
  "Show System Info",
  "Empty Trash",
  "Force Quit App"
]

// Trigger types for random generation
const TRIGGER_TYPES = [
  "Duplicate Macro Palette",
  "Editor",
  "The Hot Key ⌘Space is pressed",
  "The Hot Key ⌥⌘Space is pressed", 
  "The Hot Key ⌃⌘J is pressed",
  "The Hot Key ⌥N is pressed",
  "The Hot Key ⌃Z is pressed",
  "The Hot Key ⌥S is pressed",
  "The Hot Key ⌃⌘S is pressed",
  "The Hot Key ⌃⌘F is pressed",
  "The Hot Key ⌥⌘T is pressed",
  "The Hot Key ⌃⌥⌘P is pressed",
  "The Hot Key ⌘1 is pressed",
  "The Hot Key ⌘2 is pressed",
  "The Hot Key ⌘3 is pressed",
  "The Hot Key ⌘4 is pressed",
  "The Hot Key ⌘5 is pressed",
  "The Hot Key F1 is pressed",
  "The Hot Key F2 is pressed",
  "The Hot Key F3 is pressed",
  "The Hot Key F4 is pressed",
  "Mouse Button",
  "Typed String Trigger",
  "Application Launch",
  "System Wake"
]

// Helper function to get random element from array
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

// Helper function to generate random timestamp within a date range
function getRandomTimestamp(startDate: Date, endDate: Date): string {
  const start = startDate.getTime()
  const end = endDate.getTime()
  const randomTime = start + Math.random() * (end - start)
  const date = new Date(randomTime)
  
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

// Generate randomized sample data
export function generateRandomSampleData(options: {
  count?: number
  startDate?: Date
  endDate?: Date
  macroWeights?: Record<string, number>
} = {}): string {
  const {
    count = 100,
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    endDate = new Date(),
    macroWeights = {}
  } = options

  const entries: string[] = []
  
  // Create weighted macro list if weights are provided
  const weightedMacros: string[] = []
  if (Object.keys(macroWeights).length > 0) {
    MACRO_NAMES.forEach(macro => {
      const weight = macroWeights[macro] || 1
      for (let i = 0; i < weight; i++) {
        weightedMacros.push(macro)
      }
    })
  }
  
  for (let i = 0; i < count; i++) {
    const timestamp = getRandomTimestamp(startDate, endDate)
    const macroName = weightedMacros.length > 0 
      ? getRandomElement(weightedMacros)
      : getRandomElement(MACRO_NAMES)
    const trigger = getRandomElement(TRIGGER_TYPES)
    
    entries.push(`${timestamp} Execute macro "${macroName}" from trigger ${trigger}`)
  }
  
  // Sort entries by timestamp
  entries.sort((a, b) => {
    const timeA = a.substring(0, 19)
    const timeB = b.substring(0, 19)
    return timeA.localeCompare(timeB)
  })
  
  return entries.join('\n')
}

// Generate sample data for specific scenarios
export function generateRealisticSampleData(): string {
  // Weight certain macros to be more common (like browsers, chat apps)
  const weights = {
    "Launch Chat": 15,
    "Launch Browser": 12,
    "Launch Email": 8,
    "Center windows": 10,
    "New Tab": 8,
    "Screenshot": 5,
    "Quick Note": 6,
    "Show Desktop": 4,
    "Volume Up": 3,
    "Volume Down": 3,
    "Play/Pause": 6
  }
  
  return generateRandomSampleData({
    count: 10000,
    startDate: new Date(Date.now() - 183 * 24 * 60 * 60 * 1000), // 6 months ago
    endDate: new Date(),
    macroWeights: weights
  })
}

/**
 * Load sample data for testing and demonstration purposes
 * @returns Object containing success status, parsed entries, and details
 */
export function loadSampleData(): { success: boolean; entries: LogEntry[]; details: string } {
  console.log("Loading randomized sample data...")
  
  try {
    // Generate realistic randomized sample data
    const randomSampleData = generateRealisticSampleData()
    const result = parseLogData(randomSampleData)
    
    return {
      success: result.length > 0,
      entries: result,
      details: `Generated and parsed ${result.length} randomized entries`,
    }
  } catch (error) {
    console.error("Error loading sample data:", error)
    return {
      success: false,
      entries: [],
      details: "Failed to load sample data",
    }
  }
} 