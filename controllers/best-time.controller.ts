import { FastifyReply, FastifyRequest } from "fastify";
import { BestTimeService } from "../services/best-time.service.ts";
import { BestTimeParams, BestTimeQuery } from "../schemas/best-time.schema.ts";

export const BestTimeController = {
  async getBestTime(
    request: FastifyRequest<{
      Params: BestTimeParams;
      Querystring: BestTimeQuery;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { profileId } = request.params;
      const filters = request.query;

      const data = await BestTimeService.getBestTime({ profileId, ...filters });

      if (!data || data.length === 0) {
        return reply.code(404).send({
          success: false,
          error:
            "No posts found for this profile. Try expanding the time window.",
        });
      }

      return reply.code(200).send({
        success: true,
        meta: { profileId, filters },
        data,
      });
    } catch (error) {
      const err = error as Error & { statusCode?: number };

      request.log.error(err);

      return reply.code(err.statusCode || 500).send({
        success: false,
        error: err.message || "Internal Server Error",
      });
    }
  },
};
