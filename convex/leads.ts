import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getLeads = query({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const leadQuery = ctx.db
      .query("leads")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc");

    const leads = args.limit
      ? await leadQuery.take(args.limit)
      : await leadQuery.collect();

    return await Promise.all(
      leads.map(async (lead) => {
        const team = lead.teamId ? await ctx.db.get(lead.teamId) : null;
        return { ...lead, team };
      })
    );
  },
});

/**
 * Every lead across every workspace, newest first — powers the global
 * /leads view.
 */
export const getAllLeads = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const leads = await ctx.db
      .query("leads")
      .order("desc")
      .take(args.limit ?? 200);

    return await Promise.all(
      leads.map(async (lead) => {
        const team = lead.teamId ? await ctx.db.get(lead.teamId) : null;
        const workspace = await ctx.db.get(lead.workspaceId);
        return {
          ...lead,
          team,
          workspaceName: workspace?.name ?? "Unknown workspace",
        };
      })
    );
  },
});

export const deleteLead = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * Hand a lead to a different team (or unassign it). Does not touch the
 * round-robin counters — this is a manual override.
 */
export const reassignLead = mutation({
  args: {
    id: v.id("leads"),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.id);
    if (!lead) {
      throw new Error("Lead not found");
    }

    if (args.teamId) {
      const team = await ctx.db.get(args.teamId);
      if (!team || team.workspaceId !== lead.workspaceId) {
        throw new Error("Team does not belong to this workspace");
      }
    }

    await ctx.db.patch(args.id, { teamId: args.teamId });
  },
});

export const assignLeadInternal = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    // 1. Get workspace to check lastAssignedOrderIndex
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // 2. Get all teams for the workspace, ordered by orderIndex
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_workspace_and_order", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .collect();

    if (teams.length === 0) {
      // If no teams, just save the lead without a teamId
      const leadId = await ctx.db.insert("leads", {
        workspaceId: args.workspaceId,
        payload: args.payload,
      });
      return { leadId, assignedTeam: null };
    }

    // 3. Check if ALL teams are full
    const allFull = teams.every((team) => team.currentAssignedCount >= team.maxSize);

    if (allFull) {
      // Reset all currentAssignedCounts to 0
      for (const team of teams) {
        await ctx.db.patch(team._id, { currentAssignedCount: 0 });
        team.currentAssignedCount = 0; // update locally
      }
    }

    // 4. Find the next team to assign in round-robin fashion
    const lastAssignedIndex = teams.findIndex(
      (t) => t.orderIndex === workspace.lastAssignedOrderIndex
    );

    // If we didn't find the last assigned team (e.g., first run or team deleted), start from 0
    const startIndex = lastAssignedIndex !== -1 ? lastAssignedIndex + 1 : 0;

    let teamToAssign = null;
    for (let i = 0; i < teams.length; i++) {
      const team = teams[(startIndex + i) % teams.length];
      if (team.currentAssignedCount < team.maxSize) {
        teamToAssign = team;
        break;
      }
    }

    // Fallback if maxSizes are 0 or logic failed
    if (!teamToAssign) {
      teamToAssign = teams[0];
    }

    // 5. Assign lead and increment the selected team's count
    const leadId = await ctx.db.insert("leads", {
      workspaceId: args.workspaceId,
      teamId: teamToAssign._id,
      payload: args.payload,
    });

    await ctx.db.patch(teamToAssign._id, {
      currentAssignedCount: teamToAssign.currentAssignedCount + 1,
    });

    // 6. Update workspace's lastAssignedOrderIndex
    await ctx.db.patch(args.workspaceId, {
      lastAssignedOrderIndex: teamToAssign.orderIndex,
    });

    return { leadId, assignedTeam: teamToAssign };
  },
});
