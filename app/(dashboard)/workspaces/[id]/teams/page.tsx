"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { TeamFormDialog } from "@/components/dashboard/team-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Team = {
  _id: Id<"teams">;
  name: string;
  mobileNumber: string;
  maxSize: number;
  currentAssignedCount: number;
  orderIndex: number;
  totalLeadCount: number;
};

export default function TeamsPage({
  params,
}: {
  params: Promise<{ id: Id<"workspaces"> }>;
}) {
  const { id: workspaceId } = use(params);

  const teams = useQuery(api.teams.getTeams, { workspaceId });
  const resetWorkspaceCounts = useMutation(api.teams.resetWorkspaceCounts);

  const [addOpen, setAddOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const hasUsedCapacity = teams?.some((team) => team.currentAssignedCount > 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Teams"
        description="Leads are handed out in this order. A team stops receiving leads once it hits its max size; when every team is full the cycle resets."
        actions={
          <>
            {hasUsedCapacity ? (
              <Button variant="outline" onClick={() => setResetOpen(true)}>
                <RotateCcw />
                Reset cycle
              </Button>
            ) : null}
            <TeamFormDialog
              workspaceId={workspaceId}
              open={addOpen}
              onOpenChange={setAddOpen}
              trigger={
                <Button>
                  <Plus />
                  Add team
                </Button>
              }
            />
          </>
        }
      />

      {teams === undefined ? (
        <Card>
          <CardContent className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : teams.length === 0 ? (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No teams yet</EmptyTitle>
            <EmptyDescription>
              Add the teams that should share incoming leads. Each one needs a
              mobile number and a per-cycle capacity.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setAddOpen(true)}>
              <Plus />
              Add your first team
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Card>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[1%] pl-4">#</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Mobile number</TableHead>
                    <TableHead>This cycle</TableHead>
                    <TableHead className="text-right">Total leads</TableHead>
                    <TableHead className="w-[1%] pr-4 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team, index) => (
                    <TeamRow
                      key={team._id}
                      team={team}
                      workspaceId={workspaceId}
                      isFirst={index === 0}
                      isLast={index === teams.length - 1}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset the round-robin cycle?"
        description="Every team's cycle counter goes back to zero and the next lead starts from the top of the order. Existing lead assignments are unchanged."
        confirmLabel="Reset cycle"
        onConfirm={() => resetWorkspaceCounts({ workspaceId })}
      />
    </div>
  );
}

function TeamRow({
  team,
  workspaceId,
  isFirst,
  isLast,
}: {
  team: Team;
  workspaceId: Id<"workspaces">;
  isFirst: boolean;
  isLast: boolean;
}) {
  const moveTeam = useMutation(api.teams.moveTeam);
  const deleteTeam = useMutation(api.teams.deleteTeam);
  const resetTeamCount = useMutation(api.teams.resetTeamCount);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const usage = Math.min(
    100,
    Math.round((team.currentAssignedCount / Math.max(1, team.maxSize)) * 100)
  );
  const isFull = team.currentAssignedCount >= team.maxSize;

  return (
    <>
      <TableRow>
        <TableCell className="pl-4">
          <Badge variant="outline" className="tabular-nums">
            {team.orderIndex + 1}
          </Badge>
        </TableCell>

        <TableCell className="font-medium">{team.name}</TableCell>

        <TableCell className="font-mono text-sm">{team.mobileNumber}</TableCell>

        <TableCell>
          <div className="flex items-center gap-2">
            <span className="w-14 text-sm tabular-nums">
              {team.currentAssignedCount} / {team.maxSize}
            </span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isFull ? "bg-muted-foreground" : "bg-primary"
                )}
                style={{ width: `${usage}%` }}
              />
            </div>
            {isFull ? (
              <Badge variant="secondary" className="text-xs">
                Full
              </Badge>
            ) : null}
          </div>
        </TableCell>

        <TableCell className="text-right tabular-nums">
          {team.totalLeadCount.toLocaleString()}
        </TableCell>

        <TableCell className="pr-4 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isFirst}
              aria-label={`Move ${team.name} up`}
              onClick={() => moveTeam({ id: team._id, direction: "up" })}
            >
              <ArrowUp />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isLast}
              aria-label={`Move ${team.name} down`}
              onClick={() => moveTeam({ id: team._id, direction: "down" })}
            >
              <ArrowDown />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Actions for ${team.name}`}
                  />
                }
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil />
                  Edit team
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <Link
                      href={`/workspaces/${workspaceId}/leads?team=${team._id}`}
                    />
                  }
                >
                  <Eye />
                  View its leads
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={team.currentAssignedCount === 0}
                  onClick={() => resetTeamCount({ id: team._id })}
                >
                  <RotateCcw />
                  Reset its counter
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                  Delete team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      <TeamFormDialog
        workspaceId={workspaceId}
        team={team}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${team.name}"?`}
        description={`The team is removed from the rotation and the remaining teams are renumbered. Its ${team.totalLeadCount} existing lead${
          team.totalLeadCount === 1 ? "" : "s"
        } stay in the workspace but become unassigned.`}
        confirmLabel="Delete team"
        onConfirm={() => deleteTeam({ id: team._id })}
      />
    </>
  );
}
