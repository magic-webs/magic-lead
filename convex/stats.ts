import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight UTC for the day a timestamp falls in. */
function startOfDayUtc(ts: number) {
  return Math.floor(ts / DAY_MS) * DAY_MS;
}

/** Percentage change from `previous` to `current`, or null when there is no baseline. */
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Bucket leads into one entry per day for the last `days` days, oldest first.
 */
function buildDailySeries(leads: Doc<"leads">[], days: number, now: number) {
  const today = startOfDayUtc(now);
  const counts = new Map<number, number>();

  for (const lead of leads) {
    const day = startOfDayUtc(lead._creationTime);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const series: { date: string; day: number; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = today - i * DAY_MS;
    series.push({
      date: new Date(day).toISOString().slice(0, 10),
      day,
      count: counts.get(day) ?? 0,
    });
  }
  return series;
}

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const workspaces = await ctx.db.query("workspaces").collect();
    const leads = await ctx.db.query("leads").collect();
    const teams = await ctx.db.query("teams").collect();

    const now = Date.now();
    const todayStart = startOfDayUtc(now);
    const sevenDaysAgo = now - 7 * DAY_MS;
    const fourteenDaysAgo = now - 14 * DAY_MS;
    const thirtyDaysAgo = now - 30 * DAY_MS;

    const leadsToday = leads.filter((l) => l._creationTime >= todayStart).length;
    const leadsYesterday = leads.filter(
      (l) =>
        l._creationTime >= todayStart - DAY_MS && l._creationTime < todayStart
    ).length;
    const leads7d = leads.filter((l) => l._creationTime >= sevenDaysAgo).length;
    const leadsPrevious7d = leads.filter(
      (l) => l._creationTime >= fourteenDaysAgo && l._creationTime < sevenDaysAgo
    ).length;
    const leads30d = leads.filter((l) => l._creationTime >= thirtyDaysAgo).length;

    const assignedLeads = leads.filter((l) => l.teamId).length;
    const unassignedLeads = leads.length - assignedLeads;

    const teamsByWorkspace = new Map<string, Doc<"teams">[]>();
    for (const team of teams) {
      const list = teamsByWorkspace.get(team.workspaceId) ?? [];
      list.push(team);
      teamsByWorkspace.set(team.workspaceId, list);
    }

    const leadsByWorkspace = workspaces
      .map((workspace) => {
        const workspaceLeads = leads.filter(
          (l) => l.workspaceId === workspace._id
        );
        return {
          workspaceId: workspace._id,
          workspaceName: workspace.name,
          count: workspaceLeads.length,
          last7d: workspaceLeads.filter((l) => l._creationTime >= sevenDaysAgo)
            .length,
          teamCount: teamsByWorkspace.get(workspace._id)?.length ?? 0,
          share:
            leads.length === 0
              ? 0
              : Math.round((workspaceLeads.length / leads.length) * 100),
        };
      })
      .sort((a, b) => b.count - a.count);

    const workspaceNames = new Map(workspaces.map((w) => [w._id, w.name]));

    const topTeams = teams
      .map((team) => {
        const teamLeads = leads.filter((l) => l.teamId === team._id);
        return {
          teamId: team._id,
          teamName: team.name,
          workspaceId: team.workspaceId,
          workspaceName: workspaceNames.get(team.workspaceId) ?? "Unknown",
          mobileNumber: team.mobileNumber,
          count: teamLeads.length,
          last7d: teamLeads.filter((l) => l._creationTime >= sevenDaysAgo).length,
          currentAssignedCount: team.currentAssignedCount,
          maxSize: team.maxSize,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const recentLeads = [...leads]
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 8)
      .map((lead) => {
        const team = teams.find((t) => t._id === lead.teamId);
        return {
          leadId: lead._id,
          workspaceId: lead.workspaceId,
          workspaceName: workspaceNames.get(lead.workspaceId) ?? "Unknown",
          teamName: team?.name ?? null,
          createdAt: lead._creationTime,
          payload: lead.payload,
        };
      });

    // Teams that can no longer take leads until the cycle resets.
    const fullTeams = teams.filter(
      (t) => t.currentAssignedCount >= t.maxSize
    ).length;
    const totalCapacity = teams.reduce((sum, t) => sum + t.maxSize, 0);
    const usedCapacity = teams.reduce(
      (sum, t) => sum + Math.min(t.currentAssignedCount, t.maxSize),
      0
    );

    return {
      totalLeads: leads.length,
      totalWorkspaces: workspaces.length,
      totalTeams: teams.length,
      assignedLeads,
      unassignedLeads,
      leadsToday,
      leadsYesterday,
      leads7d,
      leads30d,
      todayChange: percentChange(leadsToday, leadsYesterday),
      weekChange: percentChange(leads7d, leadsPrevious7d),
      assignedRate:
        leads.length === 0
          ? 0
          : Math.round((assignedLeads / leads.length) * 100),
      fullTeams,
      totalCapacity,
      usedCapacity,
      capacityUsedRate:
        totalCapacity === 0
          ? 0
          : Math.round((usedCapacity / totalCapacity) * 100),
      workspacesWithoutTeams: workspaces.filter(
        (w) => (teamsByWorkspace.get(w._id)?.length ?? 0) === 0
      ).length,
      workspacesWithoutWebhook: workspaces.filter((w) => !w.triggerWebhookUrl)
        .length,
      channelWorkspaces: workspaces.filter((w) => w.kind === "channel").length,
      claimedLeads: leads.filter((l) => l.sourceWorkspaceId).length,
      leadsByDay: buildDailySeries(leads, 14, now),
      leadsByWorkspace,
      topTeams,
      recentLeads,
    };
  },
});

export const getWorkspaceStats = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      return null;
    }

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const teams = await ctx.db
      .query("teams")
      .withIndex("by_workspace_and_order", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .collect();

    const now = Date.now();
    const todayStart = startOfDayUtc(now);
    const sevenDaysAgo = now - 7 * DAY_MS;
    const fourteenDaysAgo = now - 14 * DAY_MS;

    const leads7d = leads.filter((l) => l._creationTime >= sevenDaysAgo).length;
    const leadsPrevious7d = leads.filter(
      (l) => l._creationTime >= fourteenDaysAgo && l._creationTime < sevenDaysAgo
    ).length;

    const assignedLeads = leads.filter((l) => l.teamId).length;

    const leadsByTeam = teams.map((team) => {
      const teamLeads = leads.filter((l) => l.teamId === team._id);
      return {
        teamId: team._id,
        teamName: team.name,
        mobileNumber: team.mobileNumber,
        orderIndex: team.orderIndex,
        count: teamLeads.length,
        last7d: teamLeads.filter((l) => l._creationTime >= sevenDaysAgo).length,
        currentAssignedCount: team.currentAssignedCount,
        maxSize: team.maxSize,
        share:
          leads.length === 0
            ? 0
            : Math.round((teamLeads.length / leads.length) * 100),
      };
    });

    // Which team is up next in the round-robin?
    let nextTeamName: string | null = null;
    if (teams.length > 0) {
      const lastIndex = teams.findIndex(
        (t) => t.orderIndex === workspace.lastAssignedOrderIndex
      );
      const startIndex = lastIndex !== -1 ? lastIndex + 1 : 0;
      for (let i = 0; i < teams.length; i++) {
        const team = teams[(startIndex + i) % teams.length];
        if (team.currentAssignedCount < team.maxSize) {
          nextTeamName = team.name;
          break;
        }
      }
      // Every team full means the next lead resets the cycle and goes to the top.
      nextTeamName = nextTeamName ?? teams[0].name;
    }

    const totalCapacity = teams.reduce((sum, t) => sum + t.maxSize, 0);
    const usedCapacity = teams.reduce(
      (sum, t) => sum + Math.min(t.currentAssignedCount, t.maxSize),
      0
    );

    // For a channel workspace, where its claimed leads originally arrived.
    const sourceCounts = new Map<string, number>();
    for (const lead of leads) {
      if (!lead.sourceWorkspaceId) continue;
      const key = lead.sourceWorkspaceId as string;
      sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
    }

    const leadsBySource = await Promise.all(
      [...sourceCounts.entries()].map(async ([workspaceId, count]) => {
        const source = await ctx.db.get(workspaceId as Id<"workspaces">);
        return {
          workspaceId,
          workspaceName: source?.name ?? "Deleted workspace",
          count,
        };
      })
    );
    leadsBySource.sort((a, b) => b.count - a.count);

    return {
      kind: workspace.kind ?? "standard",
      matchField: workspace.matchField ?? null,
      matchValues: workspace.matchValues ?? [],
      claimedLeads: leads.filter((l) => l.sourceWorkspaceId).length,
      leadsBySource,
      totalLeads: leads.length,
      totalTeams: teams.length,
      assignedLeads,
      unassignedLeads: leads.length - assignedLeads,
      leadsToday: leads.filter((l) => l._creationTime >= todayStart).length,
      leads7d,
      weekChange: percentChange(leads7d, leadsPrevious7d),
      lastLeadAt: leads.reduce<number | null>(
        (latest, lead) =>
          latest === null || lead._creationTime > latest
            ? lead._creationTime
            : latest,
        null
      ),
      nextTeamName,
      totalCapacity,
      usedCapacity,
      capacityUsedRate:
        totalCapacity === 0
          ? 0
          : Math.round((usedCapacity / totalCapacity) * 100),
      hasOutgoingWebhook: Boolean(workspace.triggerWebhookUrl),
      leadsByDay: buildDailySeries(leads, 14, now),
      leadsByTeam,
    };
  },
});
