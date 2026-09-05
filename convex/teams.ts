import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Rewrite orderIndex on the given teams so they are contiguous 0..n-1 in the
 * order they are passed in, and keep the workspace's round-robin cursor
 * pointing at the same team it pointed at before.
 */
async function reindexTeams(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  orderedTeams: Doc<"teams">[]
) {
  const workspace = await ctx.db.get(workspaceId);
  const previousCursor = workspace?.lastAssignedOrderIndex;

  // Which team did the cursor point at, before we renumber anything?
  const cursorTeamId =
    previousCursor === undefined
      ? undefined
      : orderedTeams.find((team) => team.orderIndex === previousCursor)?._id;

  let nextCursor: number | undefined = undefined;

  for (let i = 0; i < orderedTeams.length; i++) {
    const team = orderedTeams[i];
    if (team.orderIndex !== i) {
      await ctx.db.patch(team._id, { orderIndex: i });
    }
    if (cursorTeamId && team._id === cursorTeamId) {
      nextCursor = i;
    }
  }

  if (previousCursor !== nextCursor) {
    await ctx.db.patch(workspaceId, { lastAssignedOrderIndex: nextCursor });
  }
}

export const getTeams = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_workspace_and_order", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .collect();

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    return teams.map((team) => ({
      ...team,
      // Lifetime lead count, as opposed to currentAssignedCount which resets
      // every round-robin cycle.
      totalLeadCount: leads.filter((lead) => lead.teamId === team._id).length,
    }));
  },
});

/**
 * Every team across every workspace, for the global /teams view. Ordered by
 * workspace name, then by position in that workspace's rotation.
 */
export const getAllTeams = query({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();
    const leads = await ctx.db.query("leads").collect();
    const workspaces = await ctx.db.query("workspaces").collect();

    const workspacesById = new Map(workspaces.map((w) => [w._id, w]));

    return teams
      .map((team) => {
        const workspace = workspacesById.get(team.workspaceId);
        return {
          ...team,
          totalLeadCount: leads.filter((lead) => lead.teamId === team._id)
            .length,
          workspaceName: workspace?.name ?? "Unknown workspace",
          workspaceKind: workspace?.kind ?? "standard",
        };
      })
      .sort(
        (a, b) =>
          a.workspaceName.localeCompare(b.workspaceName) ||
          a.orderIndex - b.orderIndex
      );
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
    const name = args.name.trim();
    const mobileNumber = args.mobileNumber.trim();
    if (!name) throw new Error("Team name is required");
    if (!mobileNumber) throw new Error("Mobile number is required");
    if (args.maxSize < 1) throw new Error("Max size must be at least 1");

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
      name,
      mobileNumber,
      maxSize: args.maxSize,
      currentAssignedCount: 0,
      orderIndex: maxOrderIndex + 1,
    });
  },
});

/**
 * Edit a team. Only the fields passed in are patched.
 */
export const updateTeam = mutation({
  args: {
    id: v.id("teams"),
    name: v.optional(v.string()),
    mobileNumber: v.optional(v.string()),
    maxSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.id);
    if (!team) {
      throw new Error("Team not found");
    }

    const patch: {
      name?: string;
      mobileNumber?: string;
      maxSize?: number;
    } = {};

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("Team name cannot be empty");
      patch.name = name;
    }

    if (args.mobileNumber !== undefined) {
      const mobileNumber = args.mobileNumber.trim();
      if (!mobileNumber) throw new Error("Mobile number cannot be empty");
      patch.mobileNumber = mobileNumber;
    }

    if (args.maxSize !== undefined) {
      if (args.maxSize < 1) throw new Error("Max size must be at least 1");
      patch.maxSize = args.maxSize;
    }

    await ctx.db.patch(args.id, patch);
  },
});

/**
 * Move a team one slot up or down in the round-robin order.
 */
export const moveTeam = mutation({
  args: {
    id: v.id("teams"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.id);
    if (!team) {
      throw new Error("Team not found");
    }

    const teams = await ctx.db
      .query("teams")
      .withIndex("by_workspace_and_order", (q) =>
        q.eq("workspaceId", team.workspaceId)
      )
      .collect();

    const currentPosition = teams.findIndex((t) => t._id === args.id);
    const targetPosition =
      args.direction === "up" ? currentPosition - 1 : currentPosition + 1;

    if (targetPosition < 0 || targetPosition >= teams.length) {
      // Already at the edge — nothing to do.
      return;
    }

    const reordered = [...teams];
    [reordered[currentPosition], reordered[targetPosition]] = [
      reordered[targetPosition],
      reordered[currentPosition],
    ];

    await reindexTeams(ctx, team.workspaceId, reordered);
  },
});

/**
 * Clear a single team's cycle counter so it starts receiving leads again.
 */
export const resetTeamCount = mutation({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.id);
    if (!team) {
      throw new Error("Team not found");
    }
    await ctx.db.patch(args.id, { currentAssignedCount: 0 });
  },
});

/**
 * Start a fresh round-robin cycle: clear every team's counter for a workspace
 * and reset the assignment cursor.
 */
export const resetWorkspaceCounts = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    for (const team of teams) {
      if (team.currentAssignedCount !== 0) {
        await ctx.db.patch(team._id, { currentAssignedCount: 0 });
      }
    }

    await ctx.db.patch(args.workspaceId, {
      lastAssignedOrderIndex: undefined,
    });
  },
});

export const deleteTeam = mutation({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.id);
    if (!team) {
      return;
    }

    // Clear the reference on any lead that pointed at this team, so no lead
    // is left holding an id that no longer resolves.
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", team.workspaceId))
      .collect();
    for (const lead of leads) {
      if (lead.teamId === args.id) {
        await ctx.db.patch(lead._id, { teamId: undefined });
      }
    }

    await ctx.db.delete(args.id);

    // Keep the remaining teams numbered 0..n-1 so the displayed order and the
    // round-robin cursor stay in sync.
    const remaining = await ctx.db
      .query("teams")
      .withIndex("by_workspace_and_order", (q) =>
        q.eq("workspaceId", team.workspaceId)
      )
      .collect();

    await reindexTeams(ctx, team.workspaceId, remaining);
  },
});
