import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { accounts, posts, followers } from "../db/schema/index.ts";
import { BestTimeParams, BestTimeQuery } from "../schemas/best-time.schema.ts";

type BestTimeFilters = BestTimeParams & BestTimeQuery;

export const BestTimeService = {
  async getBestTime(filters: BestTimeFilters) {
    const { profileId, startDate, endDate, limit } = filters;

    const dateFilter =
      startDate && endDate
        ? sql`AND p.created_time >= ${startDate}::timestamp
          AND p.created_time < (${endDate}::timestamp + INTERVAL '1 day')`
        : sql``;

    const query = sql`
      WITH post_slots AS (
        SELECT
          a.id AS profile_id,
          a.username,
          EXTRACT(HOUR FROM p.created_time AT TIME ZONE 'UTC')::int AS post_hour,
          EXTRACT(DOW FROM p.created_time AT TIME ZONE 'UTC')::int AS post_day_of_week,
          COUNT(p.id)::int AS num_posts,
          SUM(p.comments_count)::int AS total_comments
        FROM accounts a
        JOIN posts p ON p.profile_id = a.id
        WHERE a.id = ${profileId}
          ${dateFilter}
        GROUP BY
          a.id,
          a.username,
          post_hour,
          post_day_of_week
      )
      SELECT
        ps.profile_id,
        ps.username,
        ps.post_hour,
        ps.post_day_of_week,
        ps.num_posts,
        ps.total_comments,
        ROUND(
          ps.total_comments::numeric / ps.num_posts,
          2
        )::float AS avg_comments,
        COALESCE(f.followers_count, 0)::int AS followers_count,
        ROUND(
          CASE
            WHEN COALESCE(f.followers_count, 0) > 0
            THEN (ps.total_comments::numeric / f.followers_count) * 1000
            ELSE 0
          END,
          2
        )::float AS engagement_per_1k_followers
      FROM post_slots ps
      LEFT JOIN followers f
        ON f.profile_id = ps.profile_id
      ORDER BY
        engagement_per_1k_followers DESC,
        ps.total_comments DESC,
        ps.num_posts DESC
      LIMIT ${limit};
    `;

    const rows = await db.execute(query);

    return rows;
  },
};
