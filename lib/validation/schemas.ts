import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(60, "Name is too long."),
  studentId: z
    .string()
    .trim()
    .min(3, "Student ID must be at least 3 characters.")
    .max(30, "Student ID is too long.")
    .regex(/^[A-Za-z0-9._\-/]+$/, "Use letters, numbers, dot, dash, underscore."),
  department: z.string().trim().min(2).max(60),
  batch: z.string().trim().min(2).max(40),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const startAttemptSchema = z.object({
  attemptId: z.string().min(8),
});

export const levelPayloadSchema = z.object({
  attemptId: z.string().min(8),
  level: z.number().int().min(1).max(4),
  payload: z.any(),
});

export const settingsUpdateSchema = z.object({
  gameActive: z.boolean().optional(),
  durationSeconds: z.number().int().min(30).max(600).optional(),
  startingLives: z.number().int().min(1).max(9).optional(),
  retryAllowed: z.boolean().optional(),
  maximumAttempts: z.number().int().min(1).max(10).optional(),
  leaderboardEnabled: z.boolean().optional(),
  prizeMode: z.boolean().optional(),
});

export const adminActionSchema = z.object({
  attemptId: z.string().min(8),
  action: z.enum(["mark_claimed", "mark_unclaimed", "reset", "disqualify", "delete"]),
});