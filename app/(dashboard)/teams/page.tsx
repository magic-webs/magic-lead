"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, RotateCcw, Users } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { TeamFormDialog } from "@/components/dashboard/team-form-dialog";
import { TeamsTable } from "@/components/dashboard/teams-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const ALL = "all";

export default function AllTeamsPage() {
  const teams = useQuery(api.teams.getAllTeams, {});
  const workspaces = useQuery(api.workspaces.getWorkspaces);
  const resetWorkspaceCounts = useMutation(api.teams.resetWorkspaceCounts);

  const [workspaceFilter, setWorkspaceFilter] = useState(ALL);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const filteredTeams = useMemo(() => {
    if (!teams) return undefined;

    const term = search.trim().toLowerCase();

    return teams.filter((team) => {
      if (workspaceFilter !== ALL && team.workspaceId !== workspaceFilter) {
        return false;
      }
      if (!term) return true;
      return [team.name, team.mobileNumber, team.workspaceName]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [teams, workspaceFilter, search]);

  // Adding a team and resetting a cycle both need one specific workspace,
  // so they only appear once the list is narrowed to one.
  const selectedWorkspaceId =
    workspaceFilter === ALL ? null : (workspaceFilter as Id<"workspaces">);

  const hasUsedCapacity = filteredTeams?.some(
    (team) => team.currentAssignedCount > 0
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="All teams"
        description="Every team across every workspace, in the order each workspace hands out its leads."
        actions={
          <>
            {teams ? (
              <Badge variant="secondary" className="tabular-nums">
                {filteredTeams?.length ?? 0} of {teams.length}
              </Badge>
            ) : null}
            {selectedWorkspaceId && hasUsedCapacity ? (
              <Button variant="outline" onClick={() => setResetOpen(true)}>
                <RotateCcw />
                Reset cycle
              </Button>
            ) : null}
            {selectedWorkspaceId ? (
              <TeamFormDialog
                workspaceId={selectedWorkspaceId}
                open={addOpen}
                onOpenChange={setAddOpen}
                trigger={
                  <Button>
                    <Plus />
                    Add team
                  </Button>
                }
              />
            ) : null}
          </>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Search teams, numbers, workspaces…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={workspaceFilter}
          onValueChange={(value) => setWorkspaceFilter(value ?? ALL)}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Filter by workspace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All workspaces</SelectItem>
            {workspaces?.map((workspace) => (
              <SelectItem key={workspace._id} value={workspace._id}>
                {workspace.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredTeams === undefined ? (
        <Card>
          <CardContent className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filteredTeams.length === 0 ? (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>
              {search || workspaceFilter !== ALL
                ? "No teams match these filters"
                : "No teams yet"}
            </EmptyTitle>
            <EmptyDescription>
              {search || workspaceFilter !== ALL
                ? "Try a broader search or clear the workspace filter."
                : "Open a workspace and add the teams that should share its incoming leads."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <CardContent className="px-0">
            <TeamsTable teams={filteredTeams} showWorkspace />
          </CardContent>
        </Card>
      )}

      {selectedWorkspaceId ? (
        <ConfirmDialog
          open={resetOpen}
          onOpenChange={setResetOpen}
          title="Reset the round-robin cycle?"
          description="Every team's cycle counter in this workspace goes back to zero and the next lead starts from the top of the order. Existing lead assignments are unchanged."
          confirmLabel="Reset cycle"
          onConfirm={() =>
            resetWorkspaceCounts({ workspaceId: selectedWorkspaceId })
          }
        />
      ) : null}
    </div>
  );
}
