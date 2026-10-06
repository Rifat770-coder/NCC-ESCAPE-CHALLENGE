/**
 * LEVEL 1 — SIGNAL DISCOVERY
 * The participant inspects a futuristic workspace and discovers a hidden
 * 4-digit access code. Each puzzle hides the digits among several
 * decoy objects using themed clues.
 *
 * Puzzles are randomised per attempt based on `seed`.
 */

export interface SignalObject {
  id: string;
  label: string;
  icon: string; // lucide icon name
  // Either the digit this object contributes to the code, or `null` if decoy
  digit: number | null;
  position: { x: number; y: number };
  hint: string; // hint shown on hover/tap
}

export interface SignalScene {
  id: string;
  title: string;
  briefing: string;
  objects: SignalObject[];
  accessCode: string; // 4-digit code the player must assemble
}

export const LEVEL1_PUZZLES: SignalScene[] = [
  {
    id: "l1-core-diagnostic",
    title: "Core Diagnostic Bay",
    briefing:
      "Scan the bay for clues. Four objects hold a digit of the access code. Use the inspector to read each panel.",
    accessCode: "4218",
    objects: [
      { id: "terminal", label: "Terminal", icon: "Terminal", digit: 4, position: { x: 12, y: 32 }, hint: "// uptime: 4 yrs" },
      { id: "badge", label: "NCC Badge", icon: "Shield", digit: 2, position: { x: 70, y: 18 }, hint: "issued batch #2" },
      { id: "sticky", label: "Sticky Note", icon: "StickyNote", digit: 1, position: { x: 28, y: 70 }, hint: "\"1 thing — reboot later\"" },
      { id: "server", label: "Server Rack", icon: "Server", digit: 8, position: { x: 82, y: 64 }, hint: "rack 8 of 12 — ON" },
      { id: "clock", label: "Wall Clock", icon: "Clock", digit: null, position: { x: 50, y: 8 }, hint: "12:34" },
      { id: "coffee", label: "Coffee Mug", icon: "Coffee", digit: null, position: { x: 8, y: 78 }, hint: "drink me?" },
      { id: "plant", label: "Plant Pot", icon: "Leaf", digit: null, position: { x: 60, y: 85 }, hint: "still alive" },
      { id: "keyboard", label: "Keyboard", icon: "Keyboard", digit: null, position: { x: 42, y: 50 }, hint: "RGB ON" },
    ],
  },
  {
    id: "l1-archive-room",
    title: "Encrypted Archive",
    briefing:
      "A locked archive holds the access key. Tap each object to read its whisper. Only four of them tell the truth.",
    accessCode: "7352",
    objects: [
      { id: "archive", label: "Archive Drive", icon: "HardDrive", digit: 7, position: { x: 16, y: 26 }, hint: "vol #7 — sealed" },
      { id: "lcd", label: "LCD Display", icon: "Monitor", digit: 3, position: { x: 78, y: 22 }, hint: "ERR 03" },
      { id: "ledger", label: "Old Ledger", icon: "BookOpen", digit: 5, position: { x: 24, y: 72 }, hint: "page 5" },
      { id: "vial", label: "Coolant Vial", icon: "FlaskConical", digit: 2, position: { x: 84, y: 70 }, hint: "labelled 2" },
      { id: "lanyard", label: "Lanyard", icon: "IdCard", digit: null, position: { x: 6, y: 50 }, hint: "NCC member" },
      { id: "snack", label: "Snack Bar", icon: "Cookie", digit: null, position: { x: 60, y: 86 }, hint: "tasty" },
      { id: "fan", label: "Cooling Fan", icon: "Fan", digit: null, position: { x: 52, y: 12 }, hint: "whirr..." },
      { id: "lamp", label: "Desk Lamp", icon: "Lamp", digit: null, position: { x: 36, y: 42 }, hint: "ON" },
    ],
  },
  {
    id: "l1-satellite-dish",
    title: "Satellite Uplink",
    briefing:
      "Outside the satellite dish array. The signal pulse hides the code. Read each antenna for a hidden digit.",
    accessCode: "9156",
    objects: [
      { id: "dishA", label: "Antenna α", icon: "Radio", digit: 9, position: { x: 10, y: 20 }, hint: "freq 9.0" },
      { id: "dishB", label: "Antenna β", icon: "Radio", digit: 1, position: { x: 72, y: 18 }, hint: "panel 1" },
      { id: "dishC", label: "Antenna γ", icon: "Radio", digit: 5, position: { x: 22, y: 74 }, hint: "channel 5" },
      { id: "dishD", label: "Antenna δ", icon: "Radio", digit: 6, position: { x: 80, y: 68 }, hint: "tag 6" },
      { id: "cable", label: "Cable Spool", icon: "Cable", digit: null, position: { x: 48, y: 10 }, hint: "spare" },
      { id: "toolbox", label: "Toolbox", icon: "Toolbox", digit: null, position: { x: 6, y: 60 }, hint: "wrench" },
      { id: "sign", label: "Warning Sign", icon: "TriangleAlert", digit: null, position: { x: 56, y: 82 }, hint: "danger HV" },
      { id: "drone", label: "Service Drone", icon: "Drone", digit: null, position: { x: 40, y: 44 }, hint: "IDLE" },
    ],
  },
  {
    id: "l1-server-room",
    title: "Server Vault",
    briefing:
      "Deep in the server vault. Read the indicators on each rack — four of them pulse a digit.",
    accessCode: "3084",
    objects: [
      { id: "rackA", label: "Rack 03", icon: "Server", digit: 3, position: { x: 14, y: 30 }, hint: "LED 3" },
      { id: "rackB", label: "Rack 11", icon: "Server", digit: 0, position: { x: 76, y: 24 }, hint: "LED 0" },
      { id: "rackC", label: "Rack 18", icon: "Server", digit: 8, position: { x: 22, y: 72 }, hint: "LED 8" },
      { id: "rackD", label: "Rack 22", icon: "Server", digit: 4, position: { x: 82, y: 70 }, hint: "LED 4" },
      { id: "firewall", label: "Firewall Box", icon: "ShieldAlert", digit: null, position: { x: 50, y: 12 }, hint: "OK" },
      { id: "papers", label: "Printout", icon: "FileText", digit: null, position: { x: 38, y: 88 }, hint: "old logs" },
      { id: "switch", label: "Network Switch", icon: "Network", digit: null, position: { x: 60, y: 50 }, hint: "16-port" },
      { id: "led", label: "Status LED", icon: "Lightbulb", digit: null, position: { x: 6, y: 56 }, hint: "green" },
    ],
  },
  {
    id: "l1-holo-lab",
    title: "Holographic Lab",
    briefing:
      "Floating holograms hover above the workstation. Only four of them are transmitting digits.",
    accessCode: "6741",
    objects: [
      { id: "holoA", label: "Holo α", icon: "Sparkles", digit: 6, position: { x: 16, y: 22 }, hint: "hex 6" },
      { id: "holoB", label: "Holo β", icon: "Sparkles", digit: 7, position: { x: 72, y: 28 }, hint: "7 cycles" },
      { id: "holoC", label: "Holo γ", icon: "Sparkles", digit: 4, position: { x: 26, y: 70 }, hint: "FREQ 4" },
      { id: "holoD", label: "Holo δ", icon: "Sparkles", digit: 1, position: { x: 80, y: 64 }, hint: "band 1" },
      { id: "scope", label: "Oscilloscope", icon: "Activity", digit: null, position: { x: 50, y: 8 }, hint: "sine" },
      { id: "tape", label: "Duct Tape", icon: "Tape", digit: null, position: { x: 8, y: 82 }, hint: "fix it later" },
      { id: "fan2", label: "Vent", icon: "Wind", digit: null, position: { x: 60, y: 86 }, hint: "blowing" },
      { id: "mouse", label: "Mouse", icon: "Mouse", digit: null, position: { x: 40, y: 44 }, hint: "click" },
    ],
  },
];