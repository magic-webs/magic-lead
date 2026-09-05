import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  pathPrefix: "/webhook/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // 1. Extract webhook token from URL
      const url = new URL(request.url);
      // Expected path: /webhook/<token>
      const pathParts = url.pathname.split("/");
      const webhookToken = pathParts[pathParts.length - 1];

      if (!webhookToken) {
        return new Response("Missing token", { status: 400 });
      }

      // 2. Lookup workspace by token
      const workspace = await ctx.runQuery(internal.httpUtils.getWorkspaceByToken, {
        webhookToken,
      });

      if (!workspace) {
        return new Response("Workspace not found", { status: 404 });
      }

      // Channel workspaces have no incoming webhook of their own — they only
      // receive leads claimed from other workspaces.
      if (workspace.kind === "channel") {
        return new Response(
          "This is a channel workspace and does not accept incoming leads",
          { status: 400 }
        );
      }

      // 3. Get lead payload
      const rawPayload = await request.json().catch(() => ({}));
      
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rawPayload)) {
        // Remove special characters from keys
        const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
        if (cleanKey) {
          payload[cleanKey] = value;
        }
      }

      // 4. Assign lead (this is a mutation, we must run it via ctx.runMutation)
      //    A channel workspace may claim it, in which case `assignedWorkspace`
      //    is the channel rather than the one the request arrived at.
      const { assignedTeam, workspace: assignedWorkspace } =
        await ctx.runMutation(internal.leads.assignLeadInternal, {
          workspaceId: workspace._id,
          payload,
        });

      // 5. Trigger the outgoing webhook of whichever workspace took the lead
      if (assignedTeam && assignedWorkspace.triggerWebhookUrl) {
        try {
          await ctx.runAction(internal.httpUtils.triggerWebhookAction, {
            url: assignedWorkspace.triggerWebhookUrl,
            payload: {
              teamMobileNumber: assignedTeam.mobileNumber,
              leadPayload: payload,
            },
          });
        } catch (err) {
          console.error("Failed to trigger webhook", err);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook processing error", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }),
});

http.route({
  pathPrefix: "/webhook/",
  method: "GET",
  // Health check, so you can confirm a webhook URL is live from a browser.
  handler: httpAction(async () => {
    return new Response("ok", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }),
});

export default http;
