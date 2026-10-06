/**
 * LEVEL 3 — SYSTEM REPAIR
 * Interactive tech-themed challenges. We support two kinds:
 *   - "order"   : arrange the given steps in the correct order.
 *   - "match"   : match each item with the correct partner.
 *   - "pick"    : pick the correct component / option.
 */
export type RepairVariant = "order" | "match" | "pick";

export interface RepairPuzzle {
  id: string;
  variant: RepairVariant;
  title: string;
  prompt: string;
  // For variant = "order"
  steps?: { id: string; text: string }[];
  correctOrder?: string[]; // step ids in correct order
  // For variant = "match"
  pairs?: { left: string; right: string }[];
  // For variant = "pick"
  question?: string;
  options?: { id: string; label: string; icon?: string }[];
  answer?: string; // option id
  hint?: string;
}

export const LEVEL3_PUZZLES: RepairPuzzle[] = [
  {
    id: "l3-boot-order",
    variant: "order",
    title: "Reboot Sequence",
    prompt: "Arrange the steps to boot a computer in the correct order.",
    steps: [
      { id: "power", text: "Press the power button" },
      { id: "post", text: "POST — hardware self-test" },
      { id: "bootloader", text: "Bootloader loads the OS" },
      { id: "kernel", text: "Kernel initialises drivers" },
      { id: "login", text: "Login screen appears" },
    ],
    correctOrder: ["power", "post", "bootloader", "kernel", "login"],
    hint: "Power comes first, then hardware test, then OS loads.",
  },
  {
    id: "l3-net-trouble",
    variant: "order",
    title: "Network Troubleshooting",
    prompt: "Arrange the troubleshooting steps in the correct order.",
    steps: [
      { id: "check_cable", text: "Check physical cable / WiFi connection" },
      { id: "restart_router", text: "Restart router / modem" },
      { id: "ping", text: "Ping the gateway" },
      { id: "dns", text: "Test DNS (e.g. nslookup google.com)" },
      { id: "ticket", text: "Open a ticket with ISP" },
    ],
    correctOrder: ["check_cable", "restart_router", "ping", "dns", "ticket"],
  },
  {
    id: "l3-build-pc",
    variant: "order",
    title: "PC Build Order",
    prompt: "Drag the assembly steps into the correct sequence.",
    steps: [
      { id: "cpu", text: "Install CPU into the socket" },
      { id: "ram", text: "Insert RAM into DIMM slots" },
      { id: "psu", text: "Mount PSU into the case" },
      { id: "mb", text: "Fit motherboard into the case" },
      { id: "storage", text: "Connect NVMe / SSD storage" },
    ],
    correctOrder: ["psu", "mb", "cpu", "ram", "storage"],
    hint: "PSU first, then motherboard, then CPU and RAM, then storage.",
  },
  {
    id: "l3-git-workflow",
    variant: "order",
    title: "Git Workflow",
    prompt: "Order the standard Git workflow steps.",
    steps: [
      { id: "status", text: "git status" },
      { id: "add", text: "git add ." },
      { id: "commit", text: "git commit -m \"…\"" },
      { id: "push", text: "git push origin main" },
    ],
    correctOrder: ["status", "add", "commit", "push"],
  },
  {
    id: "l3-pair-components",
    variant: "match",
    title: "Component Pairing",
    prompt: "Tap a card on the left, then tap its match on the right.",
    pairs: [
      { left: "CPU", right: "Socket LGA / AM" },
      { left: "RAM", right: "DIMM" },
      { left: "SSD", right: "M.2 / SATA" },
      { left: "GPU", right: "PCIe x16" },
    ],
  },
  {
    id: "l3-pair-protocol",
    variant: "match",
    title: "Protocol Ports",
    prompt: "Match each protocol to its well-known port.",
    pairs: [
      { left: "HTTPS", right: "443" },
      { left: "HTTP", right: "80" },
      { left: "SSH", right: "22" },
      { left: "DNS", right: "53" },
    ],
  },
  {
    id: "l3-pick-motherboard",
    variant: "pick",
    title: "Pick the correct CPU",
    prompt: "Which component goes in the CPU socket on the motherboard?",
    options: [
      { id: "cpu", label: "Processor", icon: "Cpu" },
      { id: "ram", label: "RAM Stick", icon: "MemoryStick" },
      { id: "fan", label: "Case Fan", icon: "Fan" },
      { id: "psu", label: "Power Supply", icon: "Plug" },
    ],
    answer: "cpu",
  },
  {
    id: "l3-pick-storage",
    variant: "pick",
    title: "Pick the persistent storage",
    prompt: "Which one keeps your data after power-off?",
    options: [
      { id: "ram", label: "RAM", icon: "MemoryStick" },
      { id: "cache", label: "Cache", icon: "Zap" },
      { id: "ssd", label: "SSD", icon: "HardDrive" },
      { id: "register", label: "Register", icon: "Cpu" },
    ],
    answer: "ssd",
  },
  {
    id: "l3-pick-binary",
    variant: "pick",
    title: "Pick the binary",
    prompt: "Which of these is a valid binary number?",
    options: [
      { id: "a", label: "1024₁₀", icon: "Hash" },
      { id: "b", label: "101101₂", icon: "Binary" },
      { id: "c", label: "1F4A₁₆", icon: "Binary" },
      { id: "d", label: "07₈", icon: "Binary" },
    ],
    answer: "b",
  },
];