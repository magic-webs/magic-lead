import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getTeams = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teams")
      .withIndex("by_workspace_and_order", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .collect();
  },
});

export const createTeam = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    mobileNumber: v.string(),
    maxSize: v.number(),
  },
  handler: async (ctx, args) => {
    // Determine the next orderIndex
    const existingTeams = await ctx.db
      .query("teams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const maxOrderIndex = existingTeams.reduce(
      (max, team) => Math.max(max, team.orderIndex),
      -1
    );

    return await ctx.db.insert("teams", {
      workspaceId: args.workspaceId,
      name: args.name,
      mobileNumber: args.mobileNumber,
      maxSize: args.maxSize,
      currentAssignedCount: 0,
      orderIndex: maxOrderIndex + 1,
    });
  },
});

export const deleteTeam = mutation({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
