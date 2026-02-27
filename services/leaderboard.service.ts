import { sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { LeaderboardQuery } from "../schemas/leaderboard.schema.ts";

export const LeaderboardService = {
  async getLeaderboard(filters: LeaderboardQuery) {
    const { startDate, endDate, isVerified, restricted, limit = 50 } = filters;

    const dateCondition =
      startDate && endDate
        ? sql`p.created_time >= ${startDate}::timestamp AND p.created_time < (${endDate}::date + interval '1 day')::timestamp`
        : sql`1=1`;

    const verifiedCondition =
      isVerified !== undefined ? sql`a.is_verified = ${isVerified}` : sql`1=1`;

    const restrictedCondition =
      restricted !== undefined ? sql`a.restricted = ${restricted}` : sql`1=1`;

    const query = sql`
      WITH profile_stats AS (
        SELECT
          a.id AS profile_id,
          a.username,
          a.full_name,
          a.is_verified,
          a.restricted,
          COUNT(p.id) AS num_posts,
          COALESCE(SUM(p.comments_count), 0) AS total_comments,
          COALESCE(
            ROUND(
              (CASE WHEN COUNT(p.id) > 0 THEN SUM(p.comments_count)::numeric / COUNT(p.id) ELSE 0 END), 
              2
            )::float, 
            0
          ) AS avg_comments_per_post
        FROM accounts a
        LEFT JOIN posts p ON p.profile_id = a.id AND ${dateCondition}
        WHERE ${verifiedCondition} AND ${restrictedCondition}
        GROUP BY a.id, a.username, a.full_name, a.is_verified, a.restricted
      )
      SELECT
        ps.*,
        COALESCE(f.followers_count, 0) AS followers_count,
        COALESCE(
          CAST(
            (ps.total_comments::numeric * 1000) / NULLIF(f.followers_count, 0)
          AS INTEGER),
          0
        ) AS engagement_per_1k_followers
      FROM profile_stats ps
      LEFT JOIN followers f ON f.profile_id = ps.profile_id
      ORDER BY 
        CASE WHEN f.followers_count = 0 THEN NULL ELSE (ps.total_comments::numeric * 1000) / NULLIF(f.followers_count, 0) END DESC
        NULLS LAST
      LIMIT ${limit};
    `;

    const rows = await db.execute(query);
    return rows;
  },
};
