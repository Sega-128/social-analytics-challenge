import { z } from "zod";

export const LeaderboardQuerySchema = z.object({
  startDate: z
    .string()
    .date()
    .optional()
    .describe("Analysis start date in YYYY-MM-DD format (e.g., 2024-01-01)"),
  endDate: z
    .string()
    .date()
    .optional()
    .describe("Analysis end date in YYYY-MM-DD format (e.g., 2024-12-31)"),
  isVerified: z
    .preprocess((val) => val === "true", z.boolean())
    .optional()
    .describe("Filter by verified status"),
  restricted: z
    .preprocess((val) => val === "true", z.boolean())
    .optional()
    .describe("Filter by account restrictions"),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .default(50)
    .describe("Number of records to return (default: 50)"),
});

export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;
