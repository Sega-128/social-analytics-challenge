import { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { LeaderboardController } from "../controllers/leaderboard.controller.js";
import { LeaderboardQuerySchema } from "../schemas/leaderboard.schema.ts";

export const leaderboardRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/leaderboard",
    {
      schema: {
        tags: ["Analytics"],
        description:
          "Get leaderboard of profiles ranked by engagement per 1k followers.",
        querystring: LeaderboardQuerySchema,
      },
    },
    LeaderboardController.getLeaderboard,
  );
};
