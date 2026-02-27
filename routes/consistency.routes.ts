import { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { ConsistencyController } from "../controllers/consistency.controller.js";
import {
  ConsistencyParamsSchema,
  ConsistencyQuerySchema,
} from "../schemas/consistency.schema.ts";

export const consistencyRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/profiles/:profileId/consistency",
    {
      schema: {
        tags: ["Analytics"],
        description:
          "Get consistency score and post gap metrics for a specific profile.",
        params: ConsistencyParamsSchema,
        querystring: ConsistencyQuerySchema,
      },
    },
    ConsistencyController.getConsistency,
  );
};
