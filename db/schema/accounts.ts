import { pgTable, text, boolean, index } from "drizzle-orm/pg-core";

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    username: text("username"),
    fullName: text("full_name"),
    description: text("description"),
    isVerified: boolean("is_verified"),
    restricted: boolean("restricted"),
    _status: text("_status"),
  },
  (table) => ({
    verifiedRestrictedIdx: index("accounts_verified_restricted_idx").on(
      table.isVerified,
      table.restricted,
    ),
  }),
);
