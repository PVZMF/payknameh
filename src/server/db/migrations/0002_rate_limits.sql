CREATE TABLE "rate_limit_hits" (
	"key_hash" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "rate_limit_hits_key_hash_window_start_pk" PRIMARY KEY("key_hash","window_start")
);
--> statement-breakpoint
CREATE INDEX "rate_limit_hits_window_start_idx" ON "rate_limit_hits" USING btree ("window_start");