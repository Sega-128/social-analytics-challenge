import { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { BestTimeController } from "../controllers/best-time.controller.js";
import {
  BestTimeParamsSchema,
  BestTimeQuerySchema,
} from "../schemas/best-time.schema.ts";

export const bestTimeRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/profiles/:profileId/best-time",
    {
      schema: {
        tags: ["Analytics"],
        params: BestTimeParamsSchema,
        querystring: BestTimeQuerySchema,
      },
    },
    BestTimeController.getBestTime,
  );
};
