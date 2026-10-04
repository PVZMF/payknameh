CREATE TYPE "public"."audit_actor_type" AS ENUM('HOST', 'GUEST', 'STAFF', 'SYSTEM');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"event_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_action_format" CHECK ("audit_logs"."action" ~ '^[a-z]+\.[a-z][a-z-]*$'),
	CONSTRAINT "audit_logs_staff_reason" CHECK ("audit_logs"."actor_type" <> 'STAFF' OR btrim(coalesce("audit_logs"."reason", '')) <> '')
);
--> statement-breakpoint
CREATE INDEX "audit_logs_event_id_created_at_idx" ON "audit_logs" USING btree ("event_id","created_at");--> statement-breakpoint
-- Tech §8: AuditLog is append-only. A trigger instead of REVOKE, because the app role's name
-- differs per environment; it also holds for the migrator unless the trigger is dropped.
CREATE FUNCTION audit_logs_reject_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only (% refused)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_update_delete
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_reject_change();
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_reject_change();
