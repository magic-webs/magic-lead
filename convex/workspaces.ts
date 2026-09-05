import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const workspaces = await ctx.db.query("workspaces").order("desc").collect();

    return await Promise.all(
      workspaces.map(async (workspace) => {
        const teams = await ctx.db
          .query("teams")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect();

        const leads = await ctx.db
          .query("leads")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect();

        const lastLead = leads.reduce<number | null>(
          (latest, lead) =>
            latest === null || lead._creationTime > latest
              ? lead._creationTime
              : latest,
          null
        );

        return {
          ...workspace,
          teamCount: teams.length,
          leadCount: leads.length,
          lastLeadAt: lastLead,
        };
      })
    );
  },
});

export const getWorkspace = query({
  args: { id: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** Trim, drop blanks, and de-duplicate the accepted values of a channel rule. */
function cleanMatchValues(values: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(value);
  }

  return cleaned;
}

export const createWorkspace = mutation({
  args: {
    name: v.string(),
    kind: v.optional(v.union(v.literal("standard"), v.literal("channel"))),
    matchField: v.optional(v.string()),
    matchValues: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) {
      throw new Error("Workspace name is required");
    }

    const kind = args.kind ?? "standard";

    if (kind === "channel") {
      const matchField = args.matchField?.trim() ?? "";
      const matchValues = cleanMatchValues(args.matchValues ?? []);

      if (!matchField) {
        throw new Error("A channel workspace needs a field to match on");
      }
      if (matchValues.length === 0) {
        throw new Error("A channel workspace needs at least one match value");
      }

      return await ctx.db.insert("workspaces", {
        name,
        // Channel workspaces never accept incoming posts, but the column is
        // required, so give them a token that simply is not exposed anywhere.
        webhookToken: crypto.randomUUID(),
        kind,
        matchField,
        matchValues,
      });
    }

    return await ctx.db.insert("workspaces", {
      name,
      webhookToken: crypto.randomUUID(),
      kind,
    });
  },
});

/**
 * Edit a workspace. Only the fields that are passed in get patched, so this
 * doubles as "rename" and "set outgoing webhook".
 */
export const updateWorkspace = mutation({
  args: {
    id: v.id("workspaces"),
    name: v.optional(v.string()),
    triggerWebhookUrl: v.optional(v.string()),
    matchField: v.optional(v.string()),
    matchValues: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.id);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const patch: {
      name?: string;
      triggerWebhookUrl?: string | undefined;
      matchField?: string;
      matchValues?: string[];
    } = {};

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) {
        throw new Error("Workspace name cannot be empty");
      }
      patch.name = name;
    }

    if (args.triggerWebhookUrl !== undefined) {
      const url = args.triggerWebhookUrl.trim();
      // An empty string clears the webhook rather than storing "".
      patch.triggerWebhookUrl = url === "" ? undefined : url;
    }

    const editingRule =
      args.matchField !== undefined || args.matchValues !== undefined;

    if (editingRule) {
      if (workspace.kind !== "channel") {
        throw new Error(
          "Only channel workspaces have a routing rule. The type is fixed when the workspace is created."
        );
      }

      const matchField = (args.matchField ?? workspace.matchField ?? "").trim();
      const matchValues = cleanMatchValues(
        args.matchValues ?? workspace.matchValues ?? []
      );

      if (!matchField) {
        throw new Error("A channel workspace needs a field to match on");
      }
      if (matchValues.length === 0) {
        throw new Error("A channel workspace needs at least one match value");
      }

      patch.matchField = matchField;
      patch.matchValues = matchValues;
    }

    await ctx.db.patch(args.id, patch);
  },
});

export const updateTriggerWebhookUrl = mutation({
  args: {
    id: v.id("workspaces"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const url = args.url.trim();
    await ctx.db.patch(args.id, {
      triggerWebhookUrl: url === "" ? undefined : url,
    });
  },
});

/**
 * Issue a fresh incoming webhook token. The old URL stops working immediately.
 */
export const regenerateWebhookToken = mutation({
  args: { id: v.id("workspaces") },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.id);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const webhookToken = crypto.randomUUID();
    await ctx.db.patch(args.id, { webhookToken });
    return webhookToken;
  },
});

/**
 * Delete a workspace along with every team and lead that belongs to it,
 * so no orphan rows are left behind.
 */
export const deleteWorkspace = mutation({
  args: { id: v.id("workspaces") },
  handler: async (ctx, args) => {
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.id))
      .collect();
    for (const lead of leads) {
      await ctx.db.delete(lead._id);
    }

    const teams = await ctx.db
      .query("teams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.id))
      .collect();
    for (const team of teams) {
      await ctx.db.delete(team._id);
    }

    // Leads a channel workspace claimed from this one live elsewhere, but
    // still point back at it. Clear the reference rather than leaving an id
    // that no longer resolves.
    const claimedElsewhere = await ctx.db.query("leads").collect();
    for (const lead of claimedElsewhere) {
      if (lead.sourceWorkspaceId === args.id) {
        await ctx.db.patch(lead._id, { sourceWorkspaceId: undefined });
      }
    }

    await ctx.db.delete(args.id);
  },
});
