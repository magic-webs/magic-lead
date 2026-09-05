import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workspaces: defineTable({
    name: v.string(),
    webhookToken: v.string(),
    triggerWebhookUrl: v.optional(v.string()), // The URL to hit when a lead is assigned
    lastAssignedOrderIndex: v.optional(v.number()),

    // "standard" workspaces receive leads on their own incoming webhook.
    // "channel" workspaces have no incoming webhook — they watch the leads
    // arriving at every standard workspace and claim the ones matching their
    // rule, then route those to their own teams round-robin.
    // Undefined means "standard", so existing rows need no migration.
    kind: v.optional(v.union(v.literal("standard"), v.literal("channel"))),

    // Channel routing rule: the payload field to inspect, and the values that
    // count as a match (compared case-insensitively).
    matchField: v.optional(v.string()),
    matchValues: v.optional(v.array(v.string())),
  })
    .index("by_token", ["webhookToken"])
    .index("by_kind", ["kind"]),

  teams: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    mobileNumber: v.string(),
    maxSize: v.number(),
    currentAssignedCount: v.number(),
    orderIndex: v.number(), // Used for round-robin assignment ordering
  }).index("by_workspace", ["workspaceId"])
    .index("by_workspace_and_order", ["workspaceId", "orderIndex"]),

  leads: defineTable({
    workspaceId: v.id("workspaces"),
    teamId: v.optional(v.id("teams")), // Assigned team (optional if no teams exist, or we just don't assign)
    payload: v.any(),
    // Set when a channel workspace claimed this lead from somewhere else, so
    // we can still show where it originally arrived.
    sourceWorkspaceId: v.optional(v.id("workspaces")),
  }).index("by_workspace", ["workspaceId"]),
});
