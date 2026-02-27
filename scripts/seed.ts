import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import { db } from "../db/index.ts";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";

const BATCH_SIZE = 2000;

interface RawAccount {
  id: string;
  username: string;
  full_name: string;
  description: string;
  is_verified: string;
  restricted: string;
  _id: string;
  _status: string;
  id_alt: string;
}

interface RawFollower {
  _id: string;
  followers_count: string;
}

interface RawPost {
  id: string;
  created_time: string;
  profile_id: string;
  text_original: string;
  comments_count: string;
}

const stgAccounts = pgTable("stg_accounts", {
  id: text("id"),
  username: text("username"),
  fullName: text("full_name"),
  description: text("description"),
  isVerified: text("is_verified"),
  restricted: text("restricted"),
  _id: text("_id"),
  _status: text("_status"),
  idAlt: text("id_alt"),
});

const stgFollowers = pgTable("stg_followers", {
  _id: text("_id"),
  followersCount: text("followers_count"),
});

const stgPosts = pgTable("stg_posts", {
  id: text("id"),
  createdTime: text("created_time"),
  profileId: text("profile_id"),
  textOriginal: text("text_original"),
  commentsCount: text("comments_count"),
});

const readCSVStream = <T>(
  filePath: string,
  onRow: (row: T) => Promise<void> | void,
) => {
  return new Promise<void>((resolve, reject) => {
    const parser = parse({
      columns: (headers: string[]) =>
        headers.map((h) => h.replace(/^\uFEFF/, "").trim()),
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });

    fs.createReadStream(filePath)
      .pipe(parser)
      .on("data", async (row: T) => {
        parser.pause();
        try {
          await onRow(row);
        } catch (err) {
          reject(err);
        }
        parser.resume();
      })
      .on("end", () => resolve())
      .on("error", (err) => reject(err));
  });
};

async function seed() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dataDir = path.join(__dirname, "../data");

  // only for task. Not best practice.
  console.log("Starting database reset...");
  await db.execute(sql`TRUNCATE TABLE posts, followers, accounts CASCADE;`);
  await db.execute(
    sql`DROP TABLE IF EXISTS stg_accounts, stg_followers, stg_posts CASCADE;`,
  );

  await db.execute(sql`
    CREATE UNLOGGED TABLE stg_accounts (
      id TEXT, username TEXT, full_name TEXT, description TEXT, 
      is_verified TEXT, restricted TEXT, _id TEXT, _status TEXT, id_alt TEXT
    );
    CREATE UNLOGGED TABLE stg_followers (_id TEXT, followers_count TEXT);
    CREATE UNLOGGED TABLE stg_posts (
      id TEXT, created_time TEXT, profile_id TEXT, text_original TEXT, comments_count TEXT
    );
  `);

  console.log("Loading raw data into staging...");

  let accBuffer: (typeof stgAccounts.$inferInsert)[] = [];
  await readCSVStream<RawAccount>(
    path.join(dataDir, "accounts.csv"),
    async (row) => {
      if (!row.id) return;
      accBuffer.push({
        id: row.id,
        username: row.username,
        fullName: row.full_name,
        description: row.description,
        isVerified: row.is_verified,
        restricted: row.restricted,
        _id: row._id,
        _status: row._status,
        idAlt: row.id_alt,
      });
      if (accBuffer.length >= BATCH_SIZE) {
        await db.insert(stgAccounts).values(accBuffer);
        accBuffer = [];
      }
    },
  );
  if (accBuffer.length > 0) await db.insert(stgAccounts).values(accBuffer);

  let folBuffer: (typeof stgFollowers.$inferInsert)[] = [];
  await readCSVStream<RawFollower>(
    path.join(dataDir, "sources_for_followers.csv"),
    async (row) => {
      if (!row._id) return;
      folBuffer.push({ _id: row._id, followersCount: row.followers_count });
      if (folBuffer.length >= BATCH_SIZE) {
        await db.insert(stgFollowers).values(folBuffer);
        folBuffer = [];
      }
    },
  );
  if (folBuffer.length > 0) await db.insert(stgFollowers).values(folBuffer);

  let postBuffer: (typeof stgPosts.$inferInsert)[] = [];
  await readCSVStream<RawPost>(path.join(dataDir, "posts.csv"), async (row) => {
    if (!row.id || !row.profile_id) return;
    postBuffer.push({
      id: row.id,
      createdTime: row.created_time,
      profileId: row.profile_id,
      textOriginal: row.text_original,
      commentsCount: row.comments_count,
    });
    if (postBuffer.length >= BATCH_SIZE) {
      await db.insert(stgPosts).values(postBuffer);
      postBuffer = [];
    }
  });
  if (postBuffer.length > 0) await db.insert(stgPosts).values(postBuffer);

  console.log("Indexing staging tables...");
  await db.execute(sql`
    CREATE INDEX idx_stg_acc_id ON stg_accounts(id);
    CREATE INDEX idx_stg_acc_id_alt ON stg_accounts(id_alt);
    CREATE INDEX idx_stg_acc_internal_id ON stg_accounts(_id);
    CREATE INDEX idx_stg_fol_id ON stg_followers(_id);
    CREATE INDEX idx_stg_posts_pid ON stg_posts(profile_id);
  `);

  console.log("Running data transformation...");
  await db.execute(sql`
    INSERT INTO accounts (id, username, full_name, description, is_verified, restricted, _status)
    SELECT id, NULLIF(username, 'NULL'), NULLIF(full_name, 'NULL'), NULLIF(description, 'NULL'), 
           (LOWER(is_verified) = 'true'), (LOWER(restricted) = 'true'), NULLIF(_status, 'NULL')
    FROM stg_accounts ON CONFLICT (id) DO NOTHING;
  `);

  await db.execute(sql`
    INSERT INTO followers (profile_id, followers_count)
    SELECT sa.id, COALESCE(CAST(NULLIF(NULLIF(f.followers_count, ''), 'NULL') AS INTEGER), 0)
    FROM stg_followers f
    JOIN stg_accounts sa ON sa._id = f._id
    ON CONFLICT DO NOTHING;
  `);

  await db.execute(sql`
    INSERT INTO posts (id, profile_id, text_original, comments_count, created_time)
    SELECT p.id, sa.id, NULLIF(p.text_original, 'NULL'), 
           COALESCE(CAST(NULLIF(NULLIF(p.comments_count, ''), 'NULL') AS INTEGER), 0),
           CAST(NULLIF(NULLIF(p.created_time, ''), 'NULL') AS TIMESTAMPTZ)
    FROM stg_posts p
    JOIN stg_accounts sa ON (p.profile_id = sa.id OR p.profile_id = sa.id_alt)
    ON CONFLICT DO NOTHING;
  `);

  await db.execute(sql`DROP TABLE stg_accounts, stg_followers, stg_posts;`);
  console.log("Database seed completed successfully.");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed error:", error);
  process.exit(1);
});
