import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../server.ts";
import { db } from "../db/index.ts";
import { sql } from "drizzle-orm";
import { accounts, posts } from "../db/schema/index.ts";

describe("Consistency API Integration", () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE posts, followers, accounts CASCADE;`);

    await db.insert(accounts).values([
      {
        id: "1",
        username: "user1",
        isVerified: true,
        fullName: "Test 1",
      },
    ]);

    await db.insert(posts).values([
      {
        id: "p1",
        profileId: "1",
        createdTime: new Date("2023-01-01T10:00:00Z").toISOString(),
        commentsCount: 0,
        textOriginal: "Test post 1",
      },
      {
        id: "p2",
        profileId: "1",
        createdTime: new Date("2023-01-02T10:00:00Z").toISOString(),
        commentsCount: 0,
        textOriginal: "Test post 2",
      },
      {
        id: "p3",
        profileId: "1",
        createdTime: new Date("2023-01-03T10:00:00Z").toISOString(),
        commentsCount: 0,
        textOriginal: "Test post 3",
      },
    ]);
  });

  it("should calculate accurate posting gaps and consistency metrics", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/profiles/1/consistency",
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();

    expect(json.success).toBe(true);

    const data = json.data;

    expect(data.total_posts).toBe(3);
    expect(data.active_days).toBe(3);
    expect(data.activity_ratio).toBe(1);

    expect(data.avg_gap_hours).toBe(24);
    expect(data.median_gap_hours).toBe(24);
    expect(data.gap_stddev_hours).toBe(0);

    // Consistency score (1 / 24 * 3 = 0.125)
    expect(data.consistency_score).toBeCloseTo(0.125, 3);
  });

  it("should filter by date range correctly", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/profiles/1/consistency?startDate=2023-01-01&endDate=2023-01-01",
    });

    const json = response.json();

    expect(json.success).toBe(true);
    expect(Number(json.data.total_posts)).toBe(1);
    expect(Number(json.data.avg_gap_hours)).toBe(0);
  });

  it("should calculate accurate metrics for irregular (bursty) posting", async () => {
    await db.execute(sql`TRUNCATE TABLE posts CASCADE;`);

    // Simulating an irregular posting schedule:
    // Post 1: Jan 1
    // Post 2: Jan 2 (24h interval)
    // Post 3: Jan 5 (72h interval)
    await db.insert(posts).values([
      {
        id: "b1",
        profileId: "1",
        commentsCount: 0,
        textOriginal: "1",
        createdTime: new Date("2023-01-01T10:00:00Z").toISOString(),
      },
      {
        id: "b2",
        profileId: "1",
        commentsCount: 0,
        textOriginal: "2",
        createdTime: new Date("2023-01-02T10:00:00Z").toISOString(),
      },
      {
        id: "b3",
        profileId: "1",
        commentsCount: 0,
        textOriginal: "3",
        createdTime: new Date("2023-01-05T10:00:00Z").toISOString(),
      },
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/profiles/1/consistency",
    });

    const { data } = response.json();

    // 1. Activity Ratio: 3 active days / 5 days in period (Jan 1-5) = 0.6
    expect(Number(data.activity_ratio)).toBe(0.6);

    // 2. Average Gap: (24 + 72) / 2 = 48 hours
    expect(Number(data.avg_gap_hours)).toBe(48);

    // 3. Variability (StdDev): must be greater than 0 because gaps are different (24 and 72)
    expect(Number(data.gap_stddev_hours)).toBeGreaterThan(0);
  });

  it("should handle profiles with no posts gracefully", async () => {
    await db.execute(sql`TRUNCATE TABLE posts CASCADE;`);
    const response = await app.inject({
      method: "GET",
      url: "/profiles/1/consistency",
    });
    const { data } = response.json();
    expect(data).toEqual([]);
  });
});
