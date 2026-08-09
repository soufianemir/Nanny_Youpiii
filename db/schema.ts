import { boolean, date, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const memberRole = pgEnum("member_role", ["PARENT_ADMIN", "PARENT", "NANNY", "BABYSITTER", "CAREGIVER"]);
export const memberStatus = pgEnum("member_status", ["ACTIVE", "SUSPENDED"]);
export const invitationStatus = pgEnum("invitation_status", ["PENDING", "ACCEPTED", "EXPIRED", "CANCELLED"]);
export const taskStatus = pgEnum("task_status", ["TODO", "IN_PROGRESS", "DONE", "NOT_DONE"]);
export const itemStatus = pgEnum("item_status", ["TODO", "DONE", "UNAVAILABLE"]);
export const shiftStatus = pgEnum("shift_status", ["PLANNED", "ACTIVE", "ENDED", "CANCELLED"]);
export const programStatus = pgEnum("program_status", ["PLANNED", "DONE", "NOT_DONE"]);
export const instructionKind = pgEnum("instruction_kind", ["ALLOWED", "FORBIDDEN", "HABIT", "IMPORTANT"]);
export const transactionKind = pgEnum("transaction_kind", ["FUND", "PURCHASE", "REIMBURSEMENT", "ADJUSTMENT"]);

export const careSpaces = pgTable("care_spaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("Europe/Paris"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const members = pgTable("members", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: memberRole("role").notNull(),
  status: memberStatus("status").notNull().default("ACTIVE"),
  label: text("label"),
  permissions: jsonb("permissions").$type<Record<string, boolean>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [uniqueIndex("members_space_user_unique").on(t.careSpaceId, t.userId), index("members_user_idx").on(t.userId)]);

export const children = pgTable("children", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  birthDate: date("birth_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [index("children_space_idx").on(t.careSpaceId)]);

export const memberChildren = pgTable("member_children", {
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  childId: uuid("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
}, t => [uniqueIndex("member_children_unique").on(t.memberId, t.childId)]);

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: memberRole("role").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  status: invitationStatus("status").notNull().default("PENDING"),
  childIds: jsonb("child_ids").$type<string[]>().notNull().default([]),
  invitedBy: text("invited_by").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [index("invitations_space_idx").on(t.careSpaceId), index("invitations_email_idx").on(t.email)]);

export const scheduleRules = pgTable("schedule_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  active: boolean("active").notNull().default(true),
}, t => [index("schedule_rules_member_idx").on(t.memberId)]);

export const shifts = pgTable("shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  shiftDate: date("shift_date").notNull(),
  plannedStart: text("planned_start").notNull(),
  plannedEnd: text("planned_end").notNull(),
  actualStart: timestamp("actual_start", { withTimezone: true }),
  actualEnd: timestamp("actual_end", { withTimezone: true }),
  status: shiftStatus("status").notNull().default("PLANNED"),
  note: text("note"),
}, t => [index("shifts_space_date_idx").on(t.careSpaceId, t.shiftDate), uniqueIndex("shifts_member_date_unique").on(t.memberId, t.shiftDate)]);

export const programItems = pgTable("program_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  programDate: date("program_date").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  plannedStart: text("planned_start"),
  plannedEnd: text("planned_end"),
  actualStart: timestamp("actual_start", { withTimezone: true }),
  actualEnd: timestamp("actual_end", { withTimezone: true }),
  status: programStatus("status").notNull().default("PLANNED"),
  note: text("note"),
  createdBy: text("created_by").notNull(),
}, t => [index("program_space_date_idx").on(t.careSpaceId, t.programDate)]);

export const programChildren = pgTable("program_children", {
  programItemId: uuid("program_item_id").notNull().references(() => programItems.id, { onDelete: "cascade" }),
  childId: uuid("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
}, t => [uniqueIndex("program_children_unique").on(t.programItemId, t.childId)]);

export const programAssignees = pgTable("program_assignees", {
  programItemId: uuid("program_item_id").notNull().references(() => programItems.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
}, t => [uniqueIndex("program_assignees_unique").on(t.programItemId, t.memberId)]);

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  taskDate: date("task_date"),
  time: text("time"),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatus("status").notNull().default("TODO"),
  note: text("note"),
  createdBy: text("created_by").notNull(),
}, t => [index("tasks_space_date_idx").on(t.careSpaceId, t.taskDate)]);

export const taskAssignees = pgTable("task_assignees", {
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
}, t => [uniqueIndex("task_assignees_unique").on(t.taskId, t.memberId)]);

export const taskChildren = pgTable("task_children", {
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  childId: uuid("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
}, t => [uniqueIndex("task_children_unique").on(t.taskId, t.childId)]);

export const routines = pgTable("routines", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: text("created_by").notNull(),
});

export const routineItems = pgTable("routine_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  routineId: uuid("routine_id").notNull().references(() => routines.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  description: text("description"),
});

export const instructions = pgTable("instructions", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  kind: instructionKind("kind").notNull(),
  text: text("text").notNull(),
  validOn: date("valid_on"),
  permanent: boolean("permanent").notNull().default(true),
  childIds: jsonb("child_ids").$type<string[]>().notNull().default([]),
  memberIds: jsonb("member_ids").$type<string[]>().notNull().default([]),
  createdBy: text("created_by").notNull(),
});

export const shoppingLists = pgTable("shopping_lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Courses"),
  active: boolean("active").notNull().default(true),
});

export const shoppingItems = pgTable("shopping_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  shoppingListId: uuid("shopping_list_id").notNull().references(() => shoppingLists.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity"),
  comment: text("comment"),
  childId: uuid("child_id").references(() => children.id, { onDelete: "set null" }),
  programItemId: uuid("program_item_id").references(() => programItems.id, { onDelete: "set null" }),
  status: itemStatus("status").notNull().default("TODO"),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }),
  purchasedByMemberId: uuid("purchased_by_member_id").references(() => members.id, { onDelete: "set null" }),
  createdBy: text("created_by").notNull(),
});

export const cashAccounts = pgTable("cash_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }).unique(),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  expenseDate: date("expense_date").notNull(),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [index("expenses_space_date_idx").on(t.careSpaceId, t.expenseDate)]);

export const cashTransactions = pgTable("cash_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  cashAccountId: uuid("cash_account_id").notNull().references(() => cashAccounts.id, { onDelete: "cascade" }),
  kind: transactionKind("kind").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "set null" }),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const caregiverAdvances = pgTable("caregiver_advances", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "restrict" }),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [uniqueIndex("advance_space_member_unique").on(t.careSpaceId, t.memberId)]);

export const reimbursements = pgTable("reimbursements", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  note: text("note"),
  reimbursedBy: text("reimbursed_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const dailyNotes = pgTable("daily_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  noteDate: date("note_date").notNull(),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  childId: uuid("child_id").references(() => children.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  value: text("value").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const handovers = pgTable("handovers", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  handoverDate: date("handover_date").notNull(),
  fromMemberId: uuid("from_member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  toMemberId: uuid("to_member_id").references(() => members.id, { onDelete: "set null" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [index("notifications_user_created_idx").on(t.userId, t.createdAt)]);

export const dayTemplates = pgTable("day_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdBy: text("created_by").notNull(),
});

export const dayTemplateItems = pgTable("day_template_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id").notNull().references(() => dayTemplates.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  description: text("description"),
  position: integer("position").notNull().default(0),
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  careSpaceId: uuid("care_space_id").notNull().references(() => careSpaces.id, { onDelete: "cascade" }),
  actorUserId: text("actor_user_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [index("activity_space_created_idx").on(t.careSpaceId, t.createdAt)]);
