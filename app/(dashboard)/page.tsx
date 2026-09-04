"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarDays,
  Gauge,
  Inbox,
  Plus,
  Target,
  TriangleAlert,
  Users,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard, StatCardSkeleton } from "@/components/dashboard/stat-card";
import {
  DistributionList,
  LeadsTrend,
} from "@/components/dashboard/leads-trend";
import { WorkspaceFormDialog } from "@/components/dashboard/workspace-form-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function OverviewPage() {
  const stats = useQuery(api.stats.getDashboardStats);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Lead volume, routing health, and team distribution across every workspace."
        actions={
          <>
            <Button variant="outline" render={<Link href="/leads" />}>
              <Inbox />
              All leads
            </Button>
            <WorkspaceFormDialog
              trigger={
                <Button>
                  <Plus />
                  New workspace
                </Button>
              }
            />
          </>
        }
      />

      {stats === undefined ? (
        <OverviewSkeleton />
      ) : stats.totalWorkspaces === 0 ? (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>Nothing to report yet</EmptyTitle>
            <EmptyDescription>
              Create a workspace, add the teams that should receive leads, then
              point your form or CRM at the workspace&apos;s incoming webhook.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <WorkspaceFormDialog
              trigger={
                <Button>
                  <Plus />
                  Create your first workspace
                </Button>
              }
            />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-6">
          <SetupWarnings
            workspacesWithoutTeams={stats.workspacesWithoutTeams}
            unassignedLeads={stats.unassignedLeads}
            workspacesWithoutWebhook={stats.workspacesWithoutWebhook}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total leads"
              value={stats.totalLeads.toLocaleString()}
              icon={Inbox}
              hint={`${stats.leads30d.toLocaleString()} in the last 30 days`}
            />
            <StatCard
              label="Today"
              value={stats.leadsToday.toLocaleString()}
              icon={CalendarDays}
              change={stats.todayChange}
              hint="vs. yesterday"
            />
            <StatCard
              label="Last 7 days"
              value={stats.leads7d.toLocaleString()}
              icon={Activity}
              change={stats.weekChange}
              hint="vs. previous week"
            />
            <StatCard
              label="Assigned"
              value={`${stats.assignedRate}%`}
              icon={Target}
              hint={
                stats.unassignedLeads > 0
                  ? `${stats.unassignedLeads.toLocaleString()} unassigned`
                  : "every lead has a team"
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Workspaces"
              value={stats.totalWorkspaces}
              icon={Building2}
              hint={`${stats.leadsByWorkspace.filter((w) => w.count > 0).length} receiving leads`}
            />
            <StatCard
              label="Teams"
              value={stats.totalTeams}
              icon={Users}
              hint={
                stats.fullTeams > 0
                  ? `${stats.fullTeams} at capacity`
                  : "all accepting leads"
              }
            />
            <StatCard
              label="Cycle capacity used"
              value={`${stats.capacityUsedRate}%`}
              icon={Gauge}
              hint={`${stats.usedCapacity} of ${stats.totalCapacity} slots`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lead volume</CardTitle>
              <CardDescription>Daily totals over the last 14 days</CardDescription>
              <CardAction>
                <Badge variant="secondary">
                  {stats.leadsByDay
                    .reduce((sum, day) => sum + day.count, 0)
                    .toLocaleString()}{" "}
                  leads
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <LeadsTrend data={stats.leadsByDay} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Leads by workspace</CardTitle>
                <CardDescription>
                  Share of total lead volume per workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DistributionList
                  emptyLabel="No leads have been routed yet."
                  items={stats.leadsByWorkspace.map((workspace) => ({
                    id: workspace.workspaceId,
                    label: workspace.workspaceName,
                    sublabel: `${workspace.share}% · ${workspace.teamCount} team${
                      workspace.teamCount === 1 ? "" : "s"
                    }`,
                    count: workspace.count,
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Busiest teams</CardTitle>
                <CardDescription>
                  Leads received per team, all time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DistributionList
                  emptyLabel="Add teams to start distributing leads."
                  items={stats.topTeams.map((team) => ({
                    id: team.teamId,
                    label: team.teamName,
                    sublabel: `${team.workspaceName} · ${team.currentAssignedCount}/${team.maxSize} this cycle`,
                    count: team.count,
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>The last leads to arrive</CardDescription>
              <CardAction>
                <Button variant="ghost" size="sm" render={<Link href="/leads" />}>
                  View all
                  <ArrowRight />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {stats.recentLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No leads have been received yet.
                </p>
              ) : (
                <ul className="divide-y">
                  {stats.recentLeads.map((lead) => (
                    <li
                      key={lead.leadId}
                      className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/workspaces/${lead.workspaceId}/leads`}
                          className="truncate text-sm font-medium hover:underline"
                        >
                          {lead.workspaceName}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {lead.teamName
                            ? `Routed to ${lead.teamName}`
                            : "Not assigned to a team"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                        {formatRelative(lead.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SetupWarnings({
  workspacesWithoutTeams,
  unassignedLeads,
  workspacesWithoutWebhook,
}: {
  workspacesWithoutTeams: number;
  unassignedLeads: number;
  workspacesWithoutWebhook: number;
}) {
  const issues: string[] = [];

  if (workspacesWithoutTeams > 0) {
    issues.push(
      `${workspacesWithoutTeams} workspace${
        workspacesWithoutTeams === 1 ? "" : "s"
      } ${workspacesWithoutTeams === 1 ? "has" : "have"} no teams, so incoming leads are stored unassigned.`
    );
  }
  if (workspacesWithoutWebhook > 0) {
    issues.push(
      `${workspacesWithoutWebhook} workspace${
        workspacesWithoutWebhook === 1 ? "" : "s"
      } ${workspacesWithoutWebhook === 1 ? "has" : "have"} no outgoing webhook, so assignments are not forwarded anywhere.`
    );
  }
  if (unassignedLeads > 0) {
    issues.push(
      `${unassignedLeads.toLocaleString()} lead${
        unassignedLeads === 1 ? "" : "s"
      } arrived before a team was available.`
    );
  }

  if (issues.length === 0) {
    return null;
  }

  return (
    <Alert>
      <TriangleAlert />
      <AlertTitle>Routing needs attention</AlertTitle>
      <AlertDescription>
        <ul className="list-inside list-disc space-y-1">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </div>
  );
}
