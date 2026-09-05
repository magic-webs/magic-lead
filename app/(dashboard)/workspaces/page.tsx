"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Building2,
  Inbox,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Share2,
  Trash2,
  Users,
  Webhook,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { WorkspaceFormDialog } from "@/components/dashboard/workspace-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

type WorkspaceCardData = {
  _id: Id<"workspaces">;
  name: string;
  teamCount: number;
  leadCount: number;
  lastLeadAt: number | null;
  triggerWebhookUrl?: string;
  kind?: "standard" | "channel";
  matchField?: string;
  matchValues?: string[];
};

function formatLastLead(ts: number | null) {
  if (ts === null) return "No leads yet";
  const diff = Date.now() - ts;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "Last lead just now";
  if (minutes < 60) return `Last lead ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Last lead ${hours}h ago`;
  return `Last lead ${Math.round(hours / 24)}d ago`;
}

export default function WorkspacesPage() {
  const workspaces = useQuery(api.workspaces.getWorkspaces);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspaces"
        description="Each workspace has its own incoming webhook, teams, and round-robin rotation."
        actions={
          <WorkspaceFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            trigger={
              <Button>
                <Plus />
                New workspace
              </Button>
            }
          />
        }
      />

      {workspaces === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>No workspaces yet</EmptyTitle>
            <EmptyDescription>
              A workspace is where you define the teams that share incoming
              leads and the webhooks that carry them in and out.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              Create workspace
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <WorkspaceCard key={workspace._id} workspace={workspace} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkspaceCard({ workspace }: { workspace: WorkspaceCardData }) {
  const deleteWorkspace = useMutation(api.workspaces.deleteWorkspace);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const needsTeams = workspace.teamCount === 0;
  const isChannel = workspace.kind === "channel";

  return (
    <>
      <Card className="flex flex-col transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="truncate">
            <Link
              href={`/workspaces/${workspace._id}`}
              className="hover:underline"
            >
              {workspace.name}
            </Link>
          </CardTitle>
          <CardDescription>
            {isChannel && workspace.matchField ? (
              <span className="block">
                Claims leads where{" "}
                <code className="font-mono">{workspace.matchField}</code> is{" "}
                {(workspace.matchValues ?? []).join(" or ")}
              </span>
            ) : null}
            {formatLastLead(workspace.lastLeadAt)}
          </CardDescription>
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Actions for ${workspace.name}`}
                  />
                }
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                  <Pencil />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <Link href={`/workspaces/${workspace._id}/teams`} />
                  }
                >
                  <Users />
                  Manage teams
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <Link href={`/workspaces/${workspace._id}/settings`} />
                  }
                >
                  <Settings />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>

        <CardContent className="flex-1">
          <div className="grid grid-cols-2 gap-3">
            <Metric
              icon={Inbox}
              label="Leads"
              value={workspace.leadCount.toLocaleString()}
            />
            <Metric
              icon={Users}
              label="Teams"
              value={workspace.teamCount.toLocaleString()}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {isChannel ? (
              <Badge variant="outline">
                <Share2 />
                Channel partner
              </Badge>
            ) : null}
            {needsTeams ? (
              <Badge variant="destructive">Needs teams</Badge>
            ) : (
              <Badge variant="secondary">Routing active</Badge>
            )}
            {workspace.triggerWebhookUrl ? (
              <Badge variant="outline">
                <Webhook />
                Webhook set
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                No outgoing webhook
              </Badge>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button
            variant="secondary"
            className="w-full"
            nativeButton={false}
            render={<Link href={`/workspaces/${workspace._id}`} />}
          >
            Open workspace
            <ArrowRight />
          </Button>
        </CardFooter>
      </Card>

      <WorkspaceFormDialog
        workspace={workspace}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${workspace.name}"?`}
        description={`This permanently removes the workspace along with its ${workspace.teamCount} team${
          workspace.teamCount === 1 ? "" : "s"
        } and ${workspace.leadCount} lead${
          workspace.leadCount === 1 ? "" : "s"
        }. The incoming webhook URL stops working immediately.`}
        confirmLabel="Delete workspace"
        onConfirm={() => deleteWorkspace({ id: workspace._id })}
      />
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="font-heading mt-0.5 text-lg font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}
