/**
 * EXTERNAL — owned by Evergreen Core. DO NOT migrate from LifeOS.
 *
 * Exact mirror of ~/evergreen-core/lib/db/schema/auth.ts as of Phase 1.
 * If EC's auth schema changes, update this file by hand.
 *
 * drizzle-kit's tablesFilter (in drizzle.config.ts) restricts migration
 * generation to tables matching `lifeos_*`, so this file's tables are
 * never proposed for migration.
 */
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const authUsers = pgTable(
  "user",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("emailVerified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("createdAt", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_email_key").on(table.email),
    index("user_created_at_idx").on(table.createdAt),
  ],
);

export const authSessions = pgTable(
  "session",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    expiresAt: timestamp("expiresAt", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("createdAt", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: uuid("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_key").on(table.token),
    index("session_user_id_idx").on(table.userId),
    index("session_expires_at_idx").on(table.expiresAt),
  ],
);

export const authAccounts = pgTable(
  "account",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
      withTimezone: true,
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
      withTimezone: true,
      mode: "date",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_key").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const authVerifications = pgTable(
  "verification",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    createdAt: timestamp("createdAt", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("verification_identifier_idx").on(table.identifier),
    index("verification_expires_at_idx").on(table.expiresAt),
  ],
);

export type AuthUser = typeof authUsers.$inferSelect;
