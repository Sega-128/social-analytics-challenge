import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../server.js";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { accounts, posts, followers } from "../db/schema/index.js";

describe("Leaderboard API Integration", () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    // 1. Initialize Fastify instance, disable logger to keep console clean during tests
    app = buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    // 2. Close Fastify after all tests complete
    await app.close();
  });

  beforeEach(async () => {
    // 3. Clear tables before EACH test to ensure test isolation
    await db.execute(sql`TRUNCATE TABLE posts, followers, accounts CASCADE;`);

    // 4. Seed clean test data
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
        createdTime: new Date("2023-01-01T10:00:00Z").toISOString(),
        textOriginal: "post 1",
        commentsCount: 10,
      },
      {
        id: "p2",
        profileId: "1",
        createdTime: new Date("2023-01-02T10:00:00Z").toISOString(),
        textOriginal: "post 2",
        commentsCount: 20,
      },
      {
        id: "p3",
        profileId: "2",
        createdTime: new Date("2023-01-01T12:00:00Z").toISOString(),
        textOriginal: "post 3",
        commentsCount: 25,
      },
    ]);
  });

  it("should calculate correct engagement per 1k followers", async () => {
    // 5. Use app.inject() to simulate an HTTP request
    const response = await app.inject({
      method: "GET",
      url: "/leaderboard",
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);

    // Math for user2: 25 comments / 500 followers * 1000 = 50 score
    // Math for user1: 30 comments / 1000 followers * 1000 = 30 score
    // Since sorting is DESC, user2 must be first.

    expect(json.data[0].username).toBe("user2");
    expect(json.data[0].engagement_per_1k_followers).toBe(50);

    expect(json.data[1].username).toBe("user1");
    expect(json.data[1].engagement_per_1k_followers).toBe(30);
  });

  it("should filter by isVerified parameter", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/leaderboard?isVerified=true",
    });

    const json = response.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].username).toBe("user1"); // Only user1 is verified
  });

  it("should handle profiles with missing follower data gracefully", async () => {
    // 1. Create a user WITHOUT an entry in the followers table
    await db.insert(accounts).values({
      id: "user-no-f",
      // Removed _id and idAlt to match updated schema
      username: "lonely_user",
      fullName: "No Followers Test",
      isVerified: false,
    });

    // 2. Add a post with comments for this user
    await db.insert(posts).values({
      id: "p_edge_1",
      profileId: "user-no-f",
      commentsCount: 100,
      createdTime: new Date().toISOString(),
      textOriginal: "Hello world",
    });

    const response = await app.inject({
      method: "GET",
      url: "/leaderboard",
    });

    const json = response.json();
    const user = json.data.find((u: any) => u.username === "lonely_user");

    // Verify the service didn't crash and returned 0 instead of a division by zero error
    expect(user).toBeDefined();
    expect(Number(user.followers_count)).toBe(0);
    expect(Number(user.engagement_per_1k_followers)).toBe(0);
  });
});
