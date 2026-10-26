CREATE TYPE "public"."calendar_provider" AS ENUM('google');--> statement-breakpoint
CREATE TABLE "calendar_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" "calendar_provider" NOT NULL,
	"provider_account_id" text NOT NULL,
	"email" text,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"access_token_expires_at" timestamp NOT NULL,
	"scope" text NOT NULL,
	"write_target_calendar_id" text DEFAULT 'primary' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_connections_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "calendar_event_links" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"external_event_id" text NOT NULL,
	"etag" text,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_event_links_session_connection_unique" UNIQUE("session_id","connection_id")
);
--> statement-breakpoint
CREATE TABLE "calendar_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_outbox_session_connection_unique" UNIQUE("session_id","connection_id")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_links" ADD CONSTRAINT "calendar_event_links_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_links" ADD CONSTRAINT "calendar_event_links_connection_id_calendar_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_outbox" ADD CONSTRAINT "calendar_outbox_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_outbox" ADD CONSTRAINT "calendar_outbox_connection_id_calendar_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_outbox_next_attempt_at_idx" ON "calendar_outbox" USING btree ("next_attempt_at");