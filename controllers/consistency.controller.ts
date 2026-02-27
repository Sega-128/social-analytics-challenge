import { FastifyReply, FastifyRequest } from "fastify";
import { ConsistencyService } from "../services/consistency.service.js";
import {
  ConsistencyParams,
  ConsistencyQuery,
} from "../schemas/consistency.schema.ts";

export const ConsistencyController = {
  async getConsistency(
    request: FastifyRequest<{
      Params: ConsistencyParams;
      Querystring: ConsistencyQuery;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { profileId } = request.params;
      const { startDate, endDate } = request.query;

      const data = await ConsistencyService.getConsistency({
        profileId,
        startDate,
        endDate,
      });

      if (data.length === 0) {
        return reply.code(200).send({
          success: true,
          meta: { profileId, filters: { startDate, endDate } },
          data: [],
        });
      }

      return reply.code(200).send({
        success: true,
        meta: { profileId, filters: { startDate, endDate } },
        data: data[0],
      });
    } catch (error) {
      request.log.error(error);
      return reply
        .code(500)
        .send({ success: false, error: "Internal Server Error" });
    }
  },
};
