import { FastifyReply, FastifyRequest } from "fastify";
import { LeaderboardService } from "../services/leaderboard.service.js";
import { LeaderboardQuery } from "../schemas/leaderboard.schema.ts";

export const LeaderboardController = {
  async getLeaderboard(
    request: FastifyRequest<{ Querystring: LeaderboardQuery }>,
    reply: FastifyReply,
  ) {
    try {
      const filters = request.query;
      const data = await LeaderboardService.getLeaderboard(filters);

      return reply.code(200).send({
        success: true,
        meta: { filters },
        data,
      });
    } catch (error) {
      request.log.error(error);
      return reply
        .code(500)
        .send({ success: false, error: "Internal Server Error" });
    }
  },
};
