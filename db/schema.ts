import { pgTable, text, uuid, timestamp, jsonb, numeric, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id, e.g. "user_2abc..."
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  url: text("url"),
  githubRepo: text("github_repo"), // e.g. "owner/repo"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("projects_user_idx").on(t.userId),
}));

export const connectedAccounts = pgTable("connected_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id),
  provider: text("provider").notNull(), // "github" | "stripe" | "plausible" | ...
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  accountData: jsonb("account_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userProviderIdx: index("connected_accounts_user_provider_idx").on(t.userId, t.provider),
}));

export const metricSnapshots = pgTable("metric_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  metric: text("metric").notNull(), // "github_stars" | "stripe_mrr" | ...
  value: numeric("value").notNull(),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
}, (t) => ({
  lookupIdx: index("metric_snapshots_lookup_idx").on(t.projectId, t.metric, t.capturedAt),
}));
