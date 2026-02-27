import { pgTable, text, integer } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";

export const followers = pgTable("followers", {
  profileId: text("profile_id")
    .primaryKey()
    .references(() => accounts.id),
  followersCount: integer("followers_count").notNull().default(0),
});
