"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { KeyRound, Pencil, Share2, Trash2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ChannelRuleForm } from "@/components/dashboard/channel-rule-form";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { CopyButton } from "@/components/dashboard/copy-button";
import { OutgoingWebhookForm } from "@/components/dashboard/outgoing-webhook-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { WorkspaceFormDialog } from "@/components/dashboard/workspace-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Convex serves HTTP actions from the `.site` twin of the deployment's
 * `.cloud` URL.
 */
function buildIncomingWebhookUrl(token: string) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return "";
  return `${convexUrl.replace(".cloud", ".site")}/webhook/${token}`;
}

const EXAMPLE_PAYLOAD = `{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "source": "Website"
}`;

const OUTGOING_PAYLOAD = `{
  "teamMobileNumber": "+1234567890",
  "leadPayload": { ... }
}`;

export default function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ id: Id<"workspaces"> }>;
}) {
  const { id: workspaceId } = use(params);
  const router = useRouter();

  const workspace = useQuery(api.workspaces.getWorkspace, { id: workspaceId });
  const regenerateWebhookToken = useMutation(
    api.workspaces.regenerateWebhookToken
  );
  const deleteWorkspace = useMutation(api.workspaces.deleteWorkspace);

  const [renameOpen, setRenameOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (workspace === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (workspace === null) {
    return null;
  }

  const incomingWebhookUrl = buildIncomingWebhookUrl(workspace.webhookToken);
  const storedWebhook = workspace.triggerWebhookUrl ?? "";
  const isChannel = workspace.kind === "channel";
  const storedMatchField = workspace.matchField ?? "";
  const storedMatchValues = workspace.matchValues ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description={
          isChannel
            ? "Adjust which leads this channel claims, wire up its outgoing webhook, or remove it."
            : "Rename the workspace, wire up its webhooks, or remove it entirely."
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Workspace name</CardTitle>
          <CardDescription>
            Shown in the sidebar, the workspace list, and every report.
          </CardDescription>
          <CardAction>
            <Button variant="outline" onClick={() => setRenameOpen(true)}>
              <Pencil />
              Rename
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <p className="font-heading text-lg font-medium">{workspace.name}</p>
          {isChannel ? (
            <Badge variant="secondary">
              <Share2 />
              Channel partner
            </Badge>
          ) : null}
        </CardContent>
      </Card>

      {isChannel ? (
        <Card>
          <CardHeader>
            <CardTitle>Routing rule</CardTitle>
            <CardDescription>
              This workspace has no incoming webhook. It watches the leads
              arriving at every standard workspace and claims the ones matching
              this rule, then distributes them across its own teams.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChannelRuleForm
              key={`${storedMatchField}|${storedMatchValues.join(",")}`}
              workspaceId={workspaceId}
              storedField={storedMatchField}
              storedValues={storedMatchValues}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Incoming webhook</CardTitle>
            <CardDescription>
              POST a JSON body to this URL to create a lead in this workspace.
              Keys are stripped of non-alphanumeric characters before they are
              stored.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="incoming-webhook">Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  id="incoming-webhook"
                  readOnly
                  value={incomingWebhookUrl}
                  placeholder="NEXT_PUBLIC_CONVEX_URL is not set"
                  className="bg-muted font-mono text-sm"
                />
                <CopyButton value={incomingWebhookUrl} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Example request body</Label>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground">
                {EXAMPLE_PAYLOAD}
              </pre>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Rotate the token</p>
                <p className="text-xs text-muted-foreground">
                  Issues a new URL and immediately invalidates the current one.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setRegenerateOpen(true)}
                className="shrink-0"
              >
                <KeyRound />
                Regenerate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Outgoing webhook</CardTitle>
          <CardDescription>
            Called once a lead has been assigned to a team. Clear the field to
            disable forwarding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <OutgoingWebhookForm
            key={storedWebhook}
            workspaceId={workspaceId}
            storedUrl={storedWebhook}
          />

          <div className="space-y-1.5 border-t pt-4">
            <Label>Payload we send</Label>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground">
              {OUTGOING_PAYLOAD}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Deleting a workspace also deletes its teams and every lead it has
            received. This cannot be undone.
          </CardDescription>
          <CardAction>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 />
              Delete workspace
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      <WorkspaceFormDialog
        workspace={workspace}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />

      <ConfirmDialog
        open={regenerateOpen}
        onOpenChange={setRegenerateOpen}
        title="Regenerate the incoming webhook token?"
        description="The current URL stops accepting leads right away. Anything still posting to it will start getting 404s until you update it."
        confirmLabel="Regenerate token"
        onConfirm={() => regenerateWebhookToken({ id: workspaceId })}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${workspace.name}"?`}
        description="The workspace, its teams, and all of its leads are permanently removed."
        confirmLabel="Delete workspace"
        onConfirm={async () => {
          // Navigate first so the workspace layout is not left querying a row
          // that is about to disappear.
          router.push("/workspaces");
          await deleteWorkspace({ id: workspaceId });
        }}
      />
    </div>
  );
}
