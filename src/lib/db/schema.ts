import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

// --- Enums ---

export const roleEnum = pgEnum("role", ["mentor", "mentee"]);

export const sessionStatusEnum = pgEnum("session_status", [
  "requested",
  "confirmed",
  "completed",
  "cancelled",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "completed",
  "paused",
]);

// --- Core: Users & Profiles ---

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull(),
  slug: text("slug").notNull().unique(),
  headline: text("headline"),
  bio: text("bio"),
  expertise: text("expertise").array(),
  links: text("links").array(),
  experienceYears: integer("experience_years"),
  available: boolean("available").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Core: Sessions ---

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  mentorId: text("mentor_id")
    .notNull()
    .references(() => users.id),
  menteeId: text("mentee_id")
    .notNull()
    .references(() => users.id),
  status: sessionStatusEnum("status").notNull().default("requested"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Core: Availability ---

export const availability = pgTable("availability", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 6=Saturday
  startTime: text("start_time").notNull(), // "HH:mm"
  endTime: text("end_time").notNull(), // "HH:mm"
  timezone: text("timezone").notNull().default("UTC"),
  sessionDuration: integer("session_duration").notNull().default(30), // minutes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Module: Notes ---

export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Core: Session Feedback ---

export const sessionFeedback = pgTable("session_feedback", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Module: Goals ---

export const goals = pgTable("goals", {
  id: text("id").primaryKey(),
  menteeId: text("mentee_id")
    .notNull()
    .references(() => users.id),
  mentorId: text("mentor_id").references(() => users.id), // mentor who helped with this goal
  title: text("title").notNull(),
  description: text("description"),
  status: goalStatusEnum("status").notNull().default("active"),
  targetDate: timestamp("target_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Join: Session ↔ Goals ---

export const sessionGoals = pgTable("session_goals", {
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
}, (t) => [{ pk: { columns: [t.sessionId, t.goalId] } }]);

// --- Core: Notifications ---

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  message: text("message").notNull(),
  resourceId: text("resource_id"), // session ID or other entity
  priority: text("priority").notNull().default("info"), // "action" | "info"
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Better Auth tables (managed by better-auth, defined here for Drizzle awareness) ---

export const authSessions = pgTable("auth_sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const passkeys = pgTable("passkey", {
  id: text("id").primaryKey(),
  name: text("name"),
  publicKey: text("public_key").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  credentialID: text("credential_id").notNull(),
  counter: integer("counter").notNull(),
  deviceType: text("device_type").notNull(),
  backedUp: boolean("backed_up").notNull(),
  transports: text("transports"),
  aaguid: text("aaguid"),
  createdAt: timestamp("created_at").defaultNow(),
});
