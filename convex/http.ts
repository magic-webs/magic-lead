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
      const { assignedTeam } = await ctx.runMutation(internal.leads.assignLeadInternal, {
        workspaceId: workspace._id,
        payload,
      });

      // 5. Trigger outgoing webhook if a team was assigned and a webhook is configured
      if (assignedTeam && workspace.triggerWebhookUrl) {
        try {
          await ctx.runAction(internal.httpUtils.triggerWebhookAction, {
            url: workspace.triggerWebhookUrl,
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
