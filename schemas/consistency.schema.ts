import { z } from "zod";

export const ConsistencyParamsSchema = z.object({
  profileId: z.string().describe("Unique identifier of the profile"),
});

export const ConsistencyQuerySchema = z.object({
  startDate: z
    .string()
    .date()
    .optional()
    .describe("Start date for calculating posting intervals (YYYY-MM-DD)"),
  endDate: z
    .string()
    .date()
    .optional()
    .describe("End date for calculating posting intervals (YYYY-MM-DD)"),
});

export type ConsistencyParams = z.infer<typeof ConsistencyParamsSchema>;
export type ConsistencyQuery = z.infer<typeof ConsistencyQuerySchema>;
