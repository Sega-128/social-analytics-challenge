import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  ConsistencyParams,
  ConsistencyQuery,
} from "../schemas/consistency.schema.ts";

type ConsistencyFilters = ConsistencyParams & ConsistencyQuery;

export const ConsistencyService = {
  async getConsistency(filters: ConsistencyFilters) {
    const { profileId, startDate, endDate } = filters;

    const dateFilter =
      startDate && endDate
        ? sql`AND p.created_time >= ${startDate}::timestamp AND p.created_time < (${endDate}::date + interval '1 day')::timestamp`
        : sql``;

    const query = sql`
      WITH profile_posts AS (
        SELECT
          p.id AS post_id,
          p.created_time::date AS post_date,
          p.created_time
        FROM posts p
        WHERE p.profile_id = ${profileId}
        ${dateFilter}
      ),
      daily_activity AS (
        SELECT
          COUNT(DISTINCT post_date) AS active_days,
          MIN(post_date) AS first_post_day,
          MAX(post_date) AS last_post_day,
          COUNT(*) AS total_posts
        FROM profile_posts
      ),
      post_gaps AS (
        SELECT
          p1.created_time AS current_post,
          LEAD(p1.created_time) OVER (ORDER BY p1.created_time) AS next_post
        FROM profile_posts p1
      ),
      gap_metrics AS (
        SELECT
          EXTRACT(EPOCH FROM (next_post - current_post)) / 3600 AS hours_between_posts
        FROM post_gaps
        WHERE next_post IS NOT NULL
      ),
      gap_stats AS (
        SELECT
          COALESCE(AVG(hours_between_posts),0) AS avg_gap_hours,
          COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hours_between_posts),0) AS median_gap_hours,
          COALESCE(STDDEV(hours_between_posts),0) AS gap_stddev_hours,
          COUNT(*) AS num_gaps
        FROM gap_metrics
      )
      SELECT
        a.id AS profile_id,
        a.username,
        a.full_name,
        da.total_posts::int,
        da.active_days::int,
        ROUND(
          (CASE 
            WHEN da.active_days > 0 THEN (da.active_days::float / GREATEST(da.last_post_day - da.first_post_day + 1, 1)) 
            ELSE 0 
          END)::numeric, 4
        )::float AS activity_ratio,
        ROUND(gs.avg_gap_hours::numeric, 2)::float AS avg_gap_hours,
        ROUND(gs.median_gap_hours::numeric, 2)::float AS median_gap_hours,
        ROUND(gs.gap_stddev_hours::numeric, 2)::float AS gap_stddev_hours,
        ROUND(
          (CASE
            WHEN gs.avg_gap_hours > 0 THEN da.active_days / GREATEST(gs.avg_gap_hours, 1)
            ELSE 0
          END)::numeric, 4
        )::float AS consistency_score
      FROM daily_activity da
      CROSS JOIN gap_stats gs
      JOIN accounts a ON a.id = ${profileId};
    `;

    const rows = await db.execute(query);

    if (!rows || rows.length === 0 || rows[0].total_posts === 0) return [];

    return rows;
  },
};
