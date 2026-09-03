import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workspaces: defineTable({
    name: v.string(),
    webhookToken: v.string(),
    triggerWebhookUrl: v.optional(v.string()), // The URL to hit when a lead is assigned
    lastAssignedOrderIndex: v.optional(v.number()),
  }).index("by_token", ["webhookToken"]),

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
  }).index("by_workspace", ["workspaceId"]),
});
