/**
 * LEVEL 2 — LOGIC SEQUENCE
 * Visual / symbolic reasoning puzzles. Each question presents a
 * pattern and four answer choices.
 */
export interface LogicQuestion {
  id: string;
  prompt: string;
  // visual representation
  visualType: "sequence" | "matrix" | "symbols" | "binary";
  // For sequence: sequence of tokens. For matrix:   2D array.  Etc.
  data: any;
  symbols?: string[];
  options: string[];
  answer: number; // index in `options`
  hint?: string;
}

export const LEVEL2_PUZZLES: LogicQuestion[] = [
  {
    id: "l2-seq-1",
    prompt: "Find the next number in the sequence: 2, 6, 18, 54, ?",
    visualType: "sequence",
    data: [2, 6, 18, 54],
    options: ["108", "96", "162", "72"],
    answer: 0,
    hint: "Each term is 3× the previous one.",
  },
  {
    id: "l2-seq-2",
    prompt: "What comes next: 3, 5, 9, 17, 33, ?",
    visualType: "sequence",
    data: [3, 5, 9, 17, 33],
    options: ["49", "65", "57", "41"],
    answer: 1,
    hint: "Double and add 1.",
  },
  {
    id: "l2-seq-3",
    prompt: "Find the missing value: 1, 4, 9, 16, ?, 36",
    visualType: "sequence",
    data: [1, 4, 9, 16, null, 36],
    options: ["20", "25", "30", "32"],
    answer: 1,
    hint: "These are perfect squares.",
  },
  {
    id: "l2-seq-4",
    prompt: "Continue the pattern: 1, 1, 2, 3, 5, 8, ?",
    visualType: "sequence",
    data: [1, 1, 2, 3, 5, 8],
    options: ["10", "11", "13", "15"],
    answer: 2,
    hint: "Fibonacci — add the previous two.",
  },
  {
    id: "l2-matrix-1",
    prompt: "Which symbol completes the grid?",
    visualType: "matrix",
    data: [
      ["▲", "■", "●"],
      ["■", "●", "▲"],
      ["●", "▲", "?"],
    ],
    options: ["▲", "■", "●", "◆"],
    answer: 1,
    hint: "Each row is a permutation of the same three symbols.",
  },
  {
    id: "l2-matrix-2",
    prompt: "What number belongs in the bottom-right?",
    visualType: "matrix",
    data: [
      [2, 4, 6],
      [4, 9, 14],
      [6, 14, "?"],
    ],
    options: ["22", "20", "18", "26"],
    answer: 0,
    hint: "Each cell is (row header + column header) × something.",
  },
  {
    id: "l2-symbols-1",
    prompt: "If ▲ = 3, ● = 5 and ◆ = 7, what is ▲ + ● + ◆?",
    visualType: "symbols",
    symbols: ["▲", "●", "◆"],
  data: { sym1: 3, sym2: 5, sym3: 7 },
    options: ["12", "15", "18", "21"],
    answer: 1,
  },
  {
    id: "l2-binary-1",
    prompt: "What is 1011₂ in decimal?",
    visualType: "binary",
    data: "1011",
    options: ["9", "11", "13", "15"],
    answer: 1,
    hint: "Each digit is a power of two.",
  },
  {
    id: "l2-binary-2",
    prompt: "How many 1-bits are in 11010110₂?",
    visualType: "binary",
    data: "11010110",
    options: ["4", "5", "6", "7"],
    answer: 1,
  },
  {
    id: "l2-seq-5",
    prompt: "Find x: 7, 14, x, 28 — if the rule is ×2.",
    visualType: "sequence",
    data: [7, 14, null, 28],
    options: ["18", "21", "24", "26"],
    answer: 1,
  },
  {
    id: "l2-seq-6",
    prompt: "What is the next term: A, C, F, J, ?",
    visualType: "sequence",
    data: ["A", "C", "F", "J"],
    options: ["M", "N", "O", "P"],
    answer: 2,
    hint: "Gaps between letters: +2, +3, +4, …",
  },
  {
    id: "l2-matrix-3",
    prompt: "Pick the missing piece.",
    visualType: "matrix",
    data: [
      ["◆", "▲", "■"],
      ["■", "◆", "▲"],
      ["▲", "■", "?"],
    ],
    options: ["◆", "▲", "■", "●"],
    answer: 0,
  },
];