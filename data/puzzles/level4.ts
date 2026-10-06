/**
 * LEVEL 4 — NCC CORE VAULT (Final Mission)
 * The participant must derive a 6-character "Master Access Key" using
 * information gathered in earlier levels. To keep things deterministic
 * (yet varied) we generate the key from a per-attempt seed.
 *
 * The seed is derived server-side when the attempt is created so the
 * player sees a stable key that matches what the server expects.
 */
export interface VaultChallenge {
  id: string;
  title: string;
  briefing: string;
  // The seed determines the key.
  seedHint: string; // short human-friendly hint about how to derive the key
}

export const LEVEL4_PUZZLES: VaultChallenge[] = [
  {
    id: "l4-core-vault",
    title: "NCC Core Vault",
    briefing:
      "All previous levels have prepared you for this moment. Combine the digits you discovered with the boot sequence to form the Master Access Key.",
    seedHint:
      "Take the access code from Level 1 and append the position (in the boot sequence) of the KERNEL step.",
  },
];