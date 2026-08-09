CREATE TYPE "public"."instruction_kind" AS ENUM('ALLOWED', 'FORBIDDEN', 'HABIT', 'IMPORTANT');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('TODO', 'DONE', 'UNAVAILABLE');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('PARENT_ADMIN', 'PARENT', 'NANNY', 'BABYSITTER', 'CAREGIVER');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."program_status" AS ENUM('PLANNED', 'DONE', 'NOT_DONE');--> statement-breakpoint
CREATE TYPE "public"."shift_status" AS ENUM('PLANNED', 'ACTIVE', 'ENDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('TODO', 'IN_PROGRESS', 'DONE', 'NOT_DONE');--> statement-breakpoint
CREATE TYPE "public"."transaction_kind" AS ENUM('FUND', 'PURCHASE', 'REIMBURSEMENT', 'ADJUSTMENT');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'Europe/Paris' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caregiver_advances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_accounts_care_space_id_unique" UNIQUE("care_space_id")
);
--> statement-breakpoint
CREATE TABLE "cash_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cash_account_id" uuid NOT NULL,
	"kind" "transaction_kind" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"expense_id" uuid,
	"member_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"birth_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"note_date" date NOT NULL,
	"member_id" uuid NOT NULL,
	"child_id" uuid,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "day_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"start_time" text,
	"end_time" text,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "day_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text NOT NULL,
	"expense_date" date NOT NULL,
	"receipt_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "handovers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"handover_date" date NOT NULL,
	"from_member_id" uuid NOT NULL,
	"to_member_id" uuid,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instructions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"kind" "instruction_kind" NOT NULL,
	"text" text NOT NULL,
	"valid_on" date,
	"permanent" boolean DEFAULT true NOT NULL,
	"child_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"member_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "member_role" NOT NULL,
	"token_hash" text NOT NULL,
	"status" "invitation_status" DEFAULT 'PENDING' NOT NULL,
	"child_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"invited_by" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "member_children" (
	"member_id" uuid NOT NULL,
	"child_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" NOT NULL,
	"status" "member_status" DEFAULT 'ACTIVE' NOT NULL,
	"label" text,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"care_space_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_assignees" (
	"program_item_id" uuid NOT NULL,
	"member_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_children" (
	"program_item_id" uuid NOT NULL,
	"child_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"program_date" date NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"planned_start" text,
	"planned_end" text,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"status" "program_status" DEFAULT 'PLANNED' NOT NULL,
	"note" text,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reimbursements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"note" text,
	"reimbursed_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"routine_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"shift_date" date NOT NULL,
	"planned_start" text NOT NULL,
	"planned_end" text NOT NULL,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"status" "shift_status" DEFAULT 'PLANNED' NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "shopping_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shopping_list_id" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" text,
	"comment" text,
	"child_id" uuid,
	"program_item_id" uuid,
	"status" "item_status" DEFAULT 'TODO' NOT NULL,
	"purchased_at" timestamp with time zone,
	"purchased_by_member_id" uuid,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"name" text DEFAULT 'Courses' NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_assignees" (
	"task_id" uuid NOT NULL,
	"member_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_children" (
	"task_id" uuid NOT NULL,
	"child_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_space_id" uuid NOT NULL,
	"task_date" date,
	"time" text,
	"title" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'TODO' NOT NULL,
	"note" text,
	"created_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_advances" ADD CONSTRAINT "caregiver_advances_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_advances" ADD CONSTRAINT "caregiver_advances_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_accounts" ADD CONSTRAINT "cash_accounts_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_cash_account_id_cash_accounts_id_fk" FOREIGN KEY ("cash_account_id") REFERENCES "public"."cash_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_notes" ADD CONSTRAINT "daily_notes_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_notes" ADD CONSTRAINT "daily_notes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_notes" ADD CONSTRAINT "daily_notes_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_template_items" ADD CONSTRAINT "day_template_items_template_id_day_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."day_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_templates" ADD CONSTRAINT "day_templates_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_from_member_id_members_id_fk" FOREIGN KEY ("from_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_to_member_id_members_id_fk" FOREIGN KEY ("to_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructions" ADD CONSTRAINT "instructions_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_children" ADD CONSTRAINT "member_children_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_children" ADD CONSTRAINT "member_children_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_assignees" ADD CONSTRAINT "program_assignees_program_item_id_program_items_id_fk" FOREIGN KEY ("program_item_id") REFERENCES "public"."program_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_assignees" ADD CONSTRAINT "program_assignees_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_children" ADD CONSTRAINT "program_children_program_item_id_program_items_id_fk" FOREIGN KEY ("program_item_id") REFERENCES "public"."program_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_children" ADD CONSTRAINT "program_children_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_items" ADD CONSTRAINT "program_items_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_items" ADD CONSTRAINT "routine_items_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_shopping_list_id_shopping_lists_id_fk" FOREIGN KEY ("shopping_list_id") REFERENCES "public"."shopping_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_program_item_id_program_items_id_fk" FOREIGN KEY ("program_item_id") REFERENCES "public"."program_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_purchased_by_member_id_members_id_fk" FOREIGN KEY ("purchased_by_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_children" ADD CONSTRAINT "task_children_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_children" ADD CONSTRAINT "task_children_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_care_space_id_care_spaces_id_fk" FOREIGN KEY ("care_space_id") REFERENCES "public"."care_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_space_created_idx" ON "activity_logs" USING btree ("care_space_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "advance_space_member_unique" ON "caregiver_advances" USING btree ("care_space_id","member_id");--> statement-breakpoint
CREATE INDEX "children_space_idx" ON "children" USING btree ("care_space_id");--> statement-breakpoint
CREATE INDEX "expenses_space_date_idx" ON "expenses" USING btree ("care_space_id","expense_date");--> statement-breakpoint
CREATE INDEX "invitations_space_idx" ON "invitations" USING btree ("care_space_id");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "member_children_unique" ON "member_children" USING btree ("member_id","child_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_space_user_unique" ON "members" USING btree ("care_space_id","user_id");--> statement-breakpoint
CREATE INDEX "members_user_idx" ON "members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "program_assignees_unique" ON "program_assignees" USING btree ("program_item_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_children_unique" ON "program_children" USING btree ("program_item_id","child_id");--> statement-breakpoint
CREATE INDEX "program_space_date_idx" ON "program_items" USING btree ("care_space_id","program_date");--> statement-breakpoint
CREATE INDEX "schedule_rules_member_idx" ON "schedule_rules" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "shifts_space_date_idx" ON "shifts" USING btree ("care_space_id","shift_date");--> statement-breakpoint
CREATE UNIQUE INDEX "shifts_member_date_unique" ON "shifts" USING btree ("member_id","shift_date");--> statement-breakpoint
CREATE UNIQUE INDEX "task_assignees_unique" ON "task_assignees" USING btree ("task_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_children_unique" ON "task_children" USING btree ("task_id","child_id");--> statement-breakpoint
CREATE INDEX "tasks_space_date_idx" ON "tasks" USING btree ("care_space_id","task_date");