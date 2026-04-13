import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const tenantTable = sqliteTable("tenant", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  githubOwner: text("github_owner").notNull(),
  githubRepo: text("github_repo").notNull(),
  githubBranch: text("github_branch").notNull().default("main"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`)
});

export const userTable = sqliteTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  image: text("image"),
  githubUsername: text("github_username"),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  tenantId: text("tenant_id").references(() => tenantTable.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`)
});

export const sessionTable = sqliteTable("session", {
  id: text("id").notNull().primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => userTable.id, { onDelete: "cascade" })
});

export const accountTable = sqliteTable("account", {
  id: text("id").notNull().primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => userTable.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`)
});

export const verificationTable = sqliteTable("verification", {
  id: text("id").notNull().primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`)
});

export const githubInstallationTokenTable = sqliteTable("github_installation_token", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  installationId: integer("installation_id").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull()
});

export const collaboratorTable = sqliteTable("collaborator", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  installationId: integer("installation_id").notNull(),
  ownerId: integer("owner_id").notNull(),
  repoId: integer("repo_id"),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  branch: text("branch"),
  email: text("email").notNull(),
  userId: text("user_id").references(() => userTable.id),
  invitedBy: text("invited_by").references(() => userTable.id)
});

export const configTable = sqliteTable("config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  branch: text("branch").notNull(),
  sha: text("sha").notNull(),
  version: text("version").notNull(),
  object: text("object").notNull(),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`)
});

export const cacheFileTable = sqliteTable("cache_file", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  context: text("context").notNull().default('collection'),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  branch: text("branch").notNull(),
  parentPath: text("parent_path").notNull(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  type: text("type").notNull(),
  content: text("content"),
  sha: text("sha"),
  size: integer("size"),
  downloadUrl: text("download_url"),
  commitSha: text('commit_sha'),
  commitTimestamp: integer('commit_timestamp', { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const cacheFileMetaTable = sqliteTable("cache_file_meta", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  branch: text("branch").notNull(),
  path: text("path").notNull().default(""),
  context: text("context").notNull().default("branch"),
  commitSha: text("commit_sha"),
  commitTimestamp: integer("commit_timestamp", { mode: "timestamp" }),
  status: text("status").notNull().default("ok"),
  error: text("error"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const cachePermissionTable = sqliteTable("cache_permission", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  githubId: integer("github_id").notNull(),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  lastUpdated: integer("last_updated", { mode: "timestamp" }).notNull()
});

export const actionRunTable = sqliteTable("action_run", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  ref: text("ref").notNull(),
  workflowRef: text("workflow_ref").notNull(),
  sha: text("sha").notNull(),
  actionName: text("action_name").notNull(),
  contextType: text("context_type").notNull(),
  contextName: text("context_name"),
  contextPath: text("context_path"),
  workflow: text("workflow").notNull(),
  workflowRunId: integer("workflow_run_id"),
  status: text("status").notNull(),
  conclusion: text("conclusion"),
  htmlUrl: text("html_url"),
  triggeredBy: text("triggered_by").notNull(), // JSON as text in SQLite
  failure: text("failure"),
  payload: text("payload").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});
