import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("workspaces").order("desc").collect();
  },
});

export const getWorkspace = query({
  args: { id: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createWorkspace = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const webhookToken = crypto.randomUUID();
    return await ctx.db.insert("workspaces", {
      name: args.name,
      webhookToken,
    });
  },
});

export const updateTriggerWebhookUrl = mutation({
  args: {
    id: v.id("workspaces"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      triggerWebhookUrl: args.url,
    });
  },
});
