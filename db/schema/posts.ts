import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";

export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    createdTime: timestamp("created_time", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    profileId: text("profile_id")
      .notNull()
      .references(() => accounts.id),
    textOriginal: text("text_original").notNull(),
    commentsCount: integer("comments_count").notNull().default(0),
  },
  (table) => ({
    profileTimeIdx: index("posts_profile_time_idx").on(
      table.profileId,
      table.createdTime,
    ),
    createdTimeIdx: index("posts_created_time_idx").on(table.createdTime),
  }),
);
