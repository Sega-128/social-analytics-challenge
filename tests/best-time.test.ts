import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../server.ts";
import { db } from "../db/index.ts";
import { sql } from "drizzle-orm";
import { accounts, posts, followers } from "../db/schema/index.ts";

describe("Best Time API Integration", () => {
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
      {
        id: "2",
        username: "user2",
        isVerified: false,
        fullName: "Test 2",
      },
    ]);

    await db.insert(followers).values([
      { profileId: "1", followersCount: 1000 },
      { profileId: "2", followersCount: 500 },
    ]);

    await db.insert(posts).values([
      {
        id: "p1",
        profileId: "1",
        createdTime: "2023-01-01T10:00:00Z",
        textOriginal: "p1",
        commentsCount: 50,
      },
      {
        id: "p2",
        profileId: "1",
        createdTime: "2023-01-01T10:30:00Z",
        textOriginal: "p2",
        commentsCount: 60,
      },
      {
        id: "p3",
        profileId: "1",
        createdTime: "2023-01-02T10:15:00Z",
        textOriginal: "p3",
        commentsCount: 50,
      },
      {
        id: "p4",
        profileId: "1",
        createdTime: "2023-01-01T15:30:00Z",
        textOriginal: "p4",
        commentsCount: 10,
      },

      {
        id: "p5",
        profileId: "2",
        createdTime: "2023-01-03T12:00:00Z",
        textOriginal: "p5",
        commentsCount: 30,
      },
    ]);
  });

  it("should group posts by hour and day and return top performing slots", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/profiles/1/best-time",
    });

    const json = response.json();

    expect(response.statusCode).toBe(200);

    expect(json.data[0].post_hour).toBe(10);
    expect(json.data[0].post_day_of_week).toBe(0); // Sunday
    expect(json.data[0].num_posts).toBe(2);
    expect(json.data[0].total_comments).toBe(110);

    expect(json.data[1].post_hour).toBe(10);
    expect(json.data[1].post_day_of_week).toBe(1); // Monday
    expect(json.data[1].num_posts).toBe(1);
    expect(json.data[1].total_comments).toBe(50);
  });

  it("should return 404 for a non-existent profile", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/profiles/999/best-time",
    });
    expect(response.statusCode).toBe(404);
  });

  it("should return 404 if profile exists but has no posts", async () => {
    await db.execute(sql`TRUNCATE TABLE posts CASCADE;`);

    const response = await app.inject({
      method: "GET",
      url: "/profiles/1/best-time",
    });

    expect(response.statusCode).toBe(404);
  });

  it("should include day of week in best time slots", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/profiles/1/best-time",
    });
    const json = response.json();

    expect(json.data[0]).toHaveProperty("post_day_of_week");
    expect(typeof json.data[0].post_day_of_week).toBe("number");
  });

  it("should calculate higher engagement for profiles with fewer followers but same activity", async () => {
    await db.execute(sql`TRUNCATE TABLE posts, followers, accounts CASCADE;`);

    await db.insert(accounts).values([
      { id: "100", username: "user100", fullName: "user100" },
      { id: "200", username: "user200", fullName: "user200" },
    ]);

    await db.insert(followers).values([
      { profileId: "100", followersCount: 100 },
      { profileId: "200", followersCount: 10000 },
    ]);

    const time = "2023-01-01T10:00:00Z";
    await db.insert(posts).values([
      {
        id: "p111",
        profileId: "100",
        createdTime: time,
        commentsCount: 50,
        textOriginal: "post 1",
      },
      {
        id: "p222",
        profileId: "200",
        createdTime: time,
        commentsCount: 50,
        textOriginal: "post 2",
      },
    ]);

    const resMicro = await app.inject({
      method: "GET",
      url: "/profiles/100/best-time",
    });
    const dataMicro = resMicro.json().data;
    expect(resMicro.statusCode).toBe(200);
    expect(dataMicro[0].engagement_per_1k_followers).toBeCloseTo(500);

    const resMacro = await app.inject({
      method: "GET",
      url: "/profiles/200/best-time",
    });
    const dataMacro = resMacro.json().data;
    expect(resMacro.statusCode).toBe(200);
    expect(dataMacro[0].engagement_per_1k_followers).toBeCloseTo(5);
  });

  it("should respect limit parameter", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/profiles/1/best-time?limit=1",
    });
    const json = response.json();

    expect(response.statusCode).toBe(200);
    expect(json.data.length).toBe(1);
  });

  it("should apply isVerified filter", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/profiles/1/best-time?isVerified=true",
    });
    const json = response.json();

    expect(response.statusCode).toBe(200);
    expect(json.data.every((d: any) => d.profile_id === "1")).toBe(true);
  });

  it("should apply startDate and endDate filters", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/profiles/1/best-time?startDate=2023-01-02&endDate=2023-01-02",
    });
    const json = response.json();

    expect(response.statusCode).toBe(200);
    expect(json.data.every((d: any) => d.post_day_of_week === 1)).toBe(true); // Monday only
  });

  it("should apply restricted filter", async () => {
    await db.insert(accounts).values([
      {
        id: "3",
        username: "restricted",
        fullName: "Restricted",
        restricted: true,
      },
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/profiles/3/best-time?restricted=true",
    });

    expect(response.statusCode).toBe(404); // No posts
  });
});
