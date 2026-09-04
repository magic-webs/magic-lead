"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Gauge,
  Inbox,
  Plus,
  Target,
  Users,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  DistributionList,
  LeadsTrend,
} from "@/components/dashboard/leads-trend";
import { StatCard, StatCardSkeleton } from "@/components/dashboard/stat-card";
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
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceOverviewPage({
  params,
}: {
  params: Promise<{ id: Id<"workspaces"> }>;
}) {
  const { id: workspaceId } = use(params);
  const stats = useQuery(api.stats.getWorkspaceStats, { workspaceId });

  if (stats === undefined) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (stats === null) {
    return null;
  }

  const lastLeadLabel =
    stats.lastLeadAt === null
      ? "No leads yet"
      : new Date(stats.lastLeadAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total leads"
          value={stats.totalLeads.toLocaleString()}
          icon={Inbox}
          hint={lastLeadLabel}
        />
        <StatCard
          label="Today"
          value={stats.leadsToday.toLocaleString()}
          icon={CalendarDays}
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
          value={
            stats.totalLeads === 0
              ? "—"
              : `${Math.round((stats.assignedLeads / stats.totalLeads) * 100)}%`
          }
          icon={Target}
          hint={
            stats.unassignedLeads > 0
              ? `${stats.unassignedLeads} unassigned`
              : "every lead routed"
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Teams"
          value={stats.totalTeams}
          icon={Users}
          hint={
            stats.totalTeams === 0
              ? "add a team to start routing"
              : `${stats.totalCapacity} slots per cycle`
          }
        />
        <StatCard
          label="Cycle capacity used"
          value={`${stats.capacityUsedRate}%`}
          icon={Gauge}
          hint={`${stats.usedCapacity} of ${stats.totalCapacity} slots`}
        />
        <Card className="gap-0">
          <CardContent className="space-y-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Next in rotation
            </span>
            <div className="font-heading truncate text-2xl font-semibold">
              {stats.nextTeamName ?? "—"}
            </div>
            <div className="min-h-5 text-xs text-muted-foreground">
              {stats.nextTeamName
                ? "Receives the next incoming lead"
                : "No teams configured yet"}
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.totalTeams === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Add your first team</CardTitle>
            <CardDescription>
              Until this workspace has at least one team, incoming leads are
              stored but never assigned or forwarded.
            </CardDescription>
            <CardAction>
              <Button
                render={<Link href={`/workspaces/${workspaceId}/teams`} />}
              >
                <Plus />
                Add team
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Lead volume</CardTitle>
          <CardDescription>Daily totals over the last 14 days</CardDescription>
          <CardAction>
            {stats.hasOutgoingWebhook ? (
              <Badge variant="secondary">Forwarding on</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                No outgoing webhook
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardContent>
          <LeadsTrend data={stats.leadsByDay} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribution across teams</CardTitle>
          <CardDescription>
            Leads received per team, with this cycle&apos;s usage
          </CardDescription>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href={`/workspaces/${workspaceId}/teams`} />}
            >
              Manage
              <ArrowRight />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <DistributionList
            emptyLabel="No teams yet — add one to start distributing leads."
            items={stats.leadsByTeam.map((team) => ({
              id: team.teamId,
              label: team.teamName,
              sublabel: `#${team.orderIndex + 1} · ${team.currentAssignedCount}/${team.maxSize} this cycle`,
              count: team.count,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
