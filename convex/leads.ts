import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { matchesRule } from "./matching";

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

    const workspace = await ctx.db.get(args.workspaceId);

    return await Promise.all(
      leads.map(async (lead) => {
        const team = lead.teamId ? await ctx.db.get(lead.teamId) : null;
        const source = lead.sourceWorkspaceId
          ? await ctx.db.get(lead.sourceWorkspaceId)
          : null;
        return {
          ...lead,
          team,
          outgoingWebhookUrl: workspace?.triggerWebhookUrl ?? null,
          sourceWorkspaceName: source?.name ?? null,
        };
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
        const source = lead.sourceWorkspaceId
          ? await ctx.db.get(lead.sourceWorkspaceId)
          : null;
        return {
          ...lead,
          team,
          workspaceName: workspace?.name ?? "Unknown workspace",
          outgoingWebhookUrl: workspace?.triggerWebhookUrl ?? null,
          sourceWorkspaceName: source?.name ?? null,
        };
      })
    );
  },
});

/**
 * Everything the re-trigger action needs in one read, since actions have no
 * direct database access.
 */
export const getLeadWebhookContext = internalQuery({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) return null;

    const workspace = await ctx.db.get(lead.workspaceId);
    const team = lead.teamId ? await ctx.db.get(lead.teamId) : null;

    return {
      payload: lead.payload,
      workspaceName: workspace?.name ?? null,
      triggerWebhookUrl: workspace?.triggerWebhookUrl ?? null,
      teamName: team?.name ?? null,
      teamMobileNumber: team?.mobileNumber ?? null,
    };
  },
});

/**
 * Re-send an already-stored lead to the workspace's outgoing webhook, using
 * the same body shape as the automatic assignment does.
 *
 * Unlike the fire-and-forget internal action used during ingestion, this
 * reports failures back to the caller so the UI can show what went wrong.
 */
export const retriggerWebhook = action({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args): Promise<{ status: number; url: string }> => {
    const context = await ctx.runQuery(internal.leads.getLeadWebhookContext, {
      leadId: args.leadId,
    });

    if (!context) {
      throw new ConvexError("This lead no longer exists.");
    }
    if (!context.triggerWebhookUrl) {
      throw new ConvexError(
        "This workspace has no outgoing webhook configured. Add one in the workspace settings first."
      );
    }
    if (!context.teamMobileNumber) {
      throw new ConvexError(
        "This lead is not assigned to a team, so there is no mobile number to send. Assign it to a team first."
      );
    }

    let response: Response;
    try {
      response = await fetch(context.triggerWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamMobileNumber: context.teamMobileNumber,
          leadPayload: context.payload,
        }),
      });
    } catch (error) {
      throw new ConvexError(
        `Could not reach ${context.triggerWebhookUrl}: ${
          error instanceof Error ? error.message : "network error"
        }`
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new ConvexError(
        `The webhook responded with ${response.status} ${response.statusText}${
          body ? `: ${body.slice(0, 200)}` : ""
        }`
      );
    }

    return { status: response.status, url: context.triggerWebhookUrl };
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
    const originWorkspace = await ctx.db.get(args.workspaceId);
    if (!originWorkspace) {
      throw new Error("Workspace not found");
    }

    // 0. Before the normal rotation, let a channel workspace claim the lead.
    //    Channel workspaces watch every standard workspace's incoming leads
    //    and take the ones matching their rule. If several match, the
    //    oldest channel workspace wins, so the outcome is deterministic.
    const channelWorkspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_kind", (q) => q.eq("kind", "channel"))
      .collect();

    const claimingWorkspace =
      channelWorkspaces
        .sort((a, b) => a._creationTime - b._creationTime)
        .find(
          (candidate) =>
            candidate._id !== args.workspaceId &&
            matchesRule(
              args.payload,
              candidate.matchField,
              candidate.matchValues
            )
        ) ?? null;

    // 1. Route into the claiming channel if there is one, otherwise stay put.
    const workspace = claimingWorkspace ?? originWorkspace;
    const workspaceId = workspace._id;
    const sourceWorkspaceId = claimingWorkspace ? args.workspaceId : undefined;

    // 2. Get all teams for the target workspace, ordered by orderIndex
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_workspace_and_order", (q) =>
        q.eq("workspaceId", workspaceId)
      )
      .collect();

    if (teams.length === 0) {
      // If no teams, just save the lead without a teamId
      const leadId = await ctx.db.insert("leads", {
        workspaceId,
        payload: args.payload,
        sourceWorkspaceId,
      });
      return { leadId, assignedTeam: null, workspace };
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
      workspaceId,
      teamId: teamToAssign._id,
      payload: args.payload,
      sourceWorkspaceId,
    });

    await ctx.db.patch(teamToAssign._id, {
      currentAssignedCount: teamToAssign.currentAssignedCount + 1,
    });

    // 6. Advance the rotation cursor on whichever workspace took the lead
    await ctx.db.patch(workspaceId, {
      lastAssignedOrderIndex: teamToAssign.orderIndex,
    });

    // The caller fires the outgoing webhook of the workspace that actually
    // took the lead, not necessarily the one the request arrived at.
    return { leadId, assignedTeam: teamToAssign, workspace };
  },
});
