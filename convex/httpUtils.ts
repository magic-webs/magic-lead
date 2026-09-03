import { internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";

export const getWorkspaceByToken = internalQuery({
  args: { webhookToken: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workspaces")
      .withIndex("by_token", (q) => q.eq("webhookToken", args.webhookToken))
      .first();
  },
});

export const triggerWebhookAction = internalAction({
  args: {
    url: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(args.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args.payload),
      });

      if (!response.ok) {
        console.error("Webhook trigger failed with status:", response.status);
      }
    } catch (error) {
      console.error("Failed to trigger webhook", error);
    }
  },
});
