import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

/**
 * Database access that is safe for hosted deployments:
 * - Nothing connects (or throws) at import time, so `next build` works without DATABASE_URL.
 * - SSL is enabled automatically for remote databases (Neon, Supabase, Render, Railway, RDS…).
 * - The tables are created on first use, so a fresh database needs no manual migration step.
 */

const globalForDb = globalThis as typeof globalThis & {
  __appPgPool?: Pool;
  __appDb?: NodePgDatabase;
  __appSchemaReady?: Promise<void>;
};

function isLocalHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "db" || host === "postgres";
  } catch {
    return false;
  }
}

function buildConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your hosting provider's environment variables (e.g. postgresql://user:password@host:5432/dbname).",
    );
  }

  const sslSetting = (process.env.DATABASE_SSL ?? "").toLowerCase();
  let ssl: PoolConfig["ssl"];
  if (sslSetting === "false" || sslSetting === "0" || sslSetting === "disable") {
    ssl = undefined;
  } else if (sslSetting === "true" || sslSetting === "1" || sslSetting === "require") {
    ssl = { rejectUnauthorized: false };
  } else if (/sslmode=(require|prefer|verify)/i.test(connectionString) || !isLocalHost(connectionString)) {
    ssl = { rejectUnauthorized: false };
  }

  return { connectionString, ssl, max: 5 };
}

export function getPool(): Pool {
  if (!globalForDb.__appPgPool) {
    globalForDb.__appPgPool = new Pool(buildConfig());
  }
  return globalForDb.__appPgPool;
}

/** Drizzle client. Created lazily on first access. */
export const db: NodePgDatabase = new Proxy({} as NodePgDatabase, {
  get(_target, prop, receiver) {
    if (!globalForDb.__appDb) globalForDb.__appDb = drizzle(getPool());
    const value = Reflect.get(globalForDb.__appDb, prop, receiver);
    return typeof value === "function" ? value.bind(globalForDb.__appDb) : value;
  },
});

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "projects" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(120) NOT NULL,
  "prompt" text DEFAULT '' NOT NULL,
  "html" text DEFAULT '' NOT NULL,
  "css" text DEFAULT '' NOT NULL,
  "js" text DEFAULT '' NOT NULL,
  "extra_files" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE IF EXISTS "projects" ADD COLUMN IF NOT EXISTS "extra_files" jsonb DEFAULT '{}'::jsonb NOT NULL;
CREATE TABLE IF NOT EXISTS "sheets" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(120) NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "row_count" integer DEFAULT 100 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "admin_members" (
  "id" serial PRIMARY KEY, "name" varchar(160) NOT NULL, "email" varchar(254) NOT NULL UNIQUE,
  "status" varchar(24) NOT NULL DEFAULT 'active', "notes" text NOT NULL DEFAULT '',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(), "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "admin_announcements" (
  "id" serial PRIMARY KEY, "title" varchar(180) NOT NULL, "body" text NOT NULL,
  "status" varchar(24) NOT NULL DEFAULT 'draft', "created_at" timestamp with time zone NOT NULL DEFAULT now(), "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "admin_referrals" (
  "id" serial PRIMARY KEY, "title" varchar(180) NOT NULL, "body" text NOT NULL DEFAULT '',
  "status" varchar(24) NOT NULL DEFAULT 'pending', "created_at" timestamp with time zone NOT NULL DEFAULT now(), "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "admin_downloads" (
  "id" serial PRIMARY KEY, "title" varchar(180) NOT NULL, "body" text NOT NULL DEFAULT '', "url" text NOT NULL,
  "status" varchar(24) NOT NULL DEFAULT 'published', "created_at" timestamp with time zone NOT NULL DEFAULT now(), "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "admin_videos" (
  "id" serial PRIMARY KEY, "title" varchar(180) NOT NULL, "body" text NOT NULL DEFAULT '', "url" text NOT NULL,
  "status" varchar(24) NOT NULL DEFAULT 'published', "created_at" timestamp with time zone NOT NULL DEFAULT now(), "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "admin_messages" (
  "id" serial PRIMARY KEY, "title" varchar(180) NOT NULL, "body" text NOT NULL DEFAULT '',
  "status" varchar(24) NOT NULL DEFAULT 'unread', "created_at" timestamp with time zone NOT NULL DEFAULT now(), "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "admin_settings" (
  "key" varchar(100) PRIMARY KEY, "value" text NOT NULL DEFAULT '', "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "members" (
  "id" bigserial PRIMARY KEY, "name" varchar(160) NOT NULL, "email" varchar(254) NOT NULL UNIQUE,
  "password_hash" text NOT NULL, "phone" varchar(20) NOT NULL DEFAULT '', "device_token_hash" varchar(64), "is_owner" boolean NOT NULL DEFAULT false, "referral_code" varchar(24) NOT NULL UNIQUE,
  "referred_by" bigint REFERENCES "members"("id"), "status" varchar(24) NOT NULL DEFAULT 'pending',
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "device_token_hash" varchar(64);
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "is_owner" boolean NOT NULL DEFAULT false;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "owner_id" bigint REFERENCES "members"("id");
ALTER TABLE "sheets" ADD COLUMN IF NOT EXISTS "owner_id" bigint REFERENCES "members"("id");
CREATE TABLE IF NOT EXISTS "member_sessions" (
  "token_hash" varchar(64) PRIMARY KEY, "member_id" bigint NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "expires_at" timestamptz NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "payments" (
  "id" bigserial PRIMARY KEY, "member_id" bigint NOT NULL REFERENCES "members"("id"),
  "package_days" integer NOT NULL, "amount" integer NOT NULL, "phone" varchar(20) NOT NULL,
  "merchant_request_id" text, "checkout_request_id" text UNIQUE, "mpesa_receipt" varchar(32) UNIQUE,
  "status" varchar(24) NOT NULL DEFAULT 'initiated', "raw_callback" jsonb,
  "manual_confirmation_message" text NOT NULL DEFAULT '', "manual_verified_by" varchar(254), "manual_verified_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "manual_confirmation_message" text NOT NULL DEFAULT '';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "manual_verified_by" varchar(254);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "manual_verified_at" timestamptz;
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" bigserial PRIMARY KEY, "member_id" bigint NOT NULL REFERENCES "members"("id"),
  "payment_id" bigint NOT NULL UNIQUE REFERENCES "payments"("id"), "package_days" integer NOT NULL,
  "amount" integer NOT NULL, "status" varchar(24) NOT NULL DEFAULT 'active',
  "starts_at" timestamptz NOT NULL, "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "commissions" (
  "id" bigserial PRIMARY KEY, "referrer_id" bigint NOT NULL REFERENCES "members"("id"),
  "referred_member_id" bigint NOT NULL REFERENCES "members"("id"), "payment_id" bigint NOT NULL UNIQUE REFERENCES "payments"("id"),
  "amount" integer NOT NULL, "status" varchar(24) NOT NULL DEFAULT 'pending',
  "withdrawal_id" bigint, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "withdrawal_requests" (
  "id" bigserial PRIMARY KEY, "member_id" bigint NOT NULL REFERENCES "members"("id"),
  "amount" integer NOT NULL, "phone" varchar(20) NOT NULL, "status" varchar(24) NOT NULL DEFAULT 'pending',
  "receipt_code" varchar(32) UNIQUE, "confirmation_message" text NOT NULL DEFAULT '', "admin_notes" text NOT NULL DEFAULT '',
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "paid_at" timestamptz
);
CREATE TABLE IF NOT EXISTS "commission_allocations" (
  "id" bigserial PRIMARY KEY, "commission_id" bigint NOT NULL REFERENCES "commissions"("id"),
  "withdrawal_id" bigint NOT NULL REFERENCES "withdrawal_requests"("id") ON DELETE CASCADE,
  "amount" integer NOT NULL, "status" varchar(24) NOT NULL DEFAULT 'requested',
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "payments_member_created_idx" ON "payments"("member_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "commissions_referrer_status_idx" ON "commissions"("referrer_id", "status");
CREATE INDEX IF NOT EXISTS "withdrawals_member_status_idx" ON "withdrawal_requests"("member_id", "status");
`;

/**
 * Makes sure the tables exist. Runs once per server process and is cheap afterwards.
 * Call this at the start of any request handler that touches the database.
 */
export function ensureSchema(): Promise<void> {
  if (!globalForDb.__appSchemaReady) {
    globalForDb.__appSchemaReady = getPool()
      .query(SCHEMA_SQL)
      .then(() => undefined)
      .catch((err: unknown) => {
        // Allow a retry on the next request instead of caching the failure forever.
        globalForDb.__appSchemaReady = undefined;
        throw err;
      });
  }
  return globalForDb.__appSchemaReady;
}
