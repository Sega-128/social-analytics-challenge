import { z } from "zod";

export const BestTimeParamsSchema = z.object({
  profileId: z.string().describe("Unique identifier of the profile"),
});

export const BestTimeQuerySchema = z.object({
  startDate: z
    .string()
    .date()
    .optional()
    .describe("Start date for engagement analysis (YYYY-MM-DD)"),
  endDate: z
    .string()
    .date()
    .optional()
    .describe("End date for engagement analysis (YYYY-MM-DD)"),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .default(10)
    .describe('Limit the number of "best time" slots returned (default: 10)'),
});

export type BestTimeParams = z.infer<typeof BestTimeParamsSchema>;
export type BestTimeQuery = z.infer<typeof BestTimeQuerySchema>;
