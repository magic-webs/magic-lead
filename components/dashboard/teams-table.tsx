"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { TeamFormDialog } from "@/components/dashboard/team-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type TeamRowData = {
  _id: Id<"teams">;
  workspaceId: Id<"workspaces">;
  name: string;
  mobileNumber: string;
  maxSize: number;
  currentAssignedCount: number;
  orderIndex: number;
  totalLeadCount: number;
  workspaceName?: string;
};

/**
 * The teams table, shared by a single workspace's Teams tab and the global
 * All Teams view. Reordering is scoped to a team's own workspace, so the
 * arrows disable at the ends of that workspace's rotation even when several
 * workspaces are listed together.
 */
export function TeamsTable({
  teams,
  showWorkspace = false,
}: {
  teams: TeamRowData[];
  showWorkspace?: boolean;
}) {
  // First and last position within each workspace's own rotation.
  const bounds = new Map<string, { min: number; max: number }>();
  for (const team of teams) {
    const key = team.workspaceId as string;
    const current = bounds.get(key);
    bounds.set(key, {
      min: Math.min(current?.min ?? team.orderIndex, team.orderIndex),
      max: Math.max(current?.max ?? team.orderIndex, team.orderIndex),
    });
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[1%] pl-4">#</TableHead>
            <TableHead>Team</TableHead>
            {showWorkspace ? <TableHead>Workspace</TableHead> : null}
            <TableHead>Mobile number</TableHead>
            <TableHead>This cycle</TableHead>
            <TableHead className="text-right">Total leads</TableHead>
            <TableHead className="w-[1%] pr-4 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => {
            const workspaceBounds = bounds.get(team.workspaceId as string);
            return (
              <TeamRow
                key={team._id}
                team={team}
                showWorkspace={showWorkspace}
                isFirst={team.orderIndex === workspaceBounds?.min}
                isLast={team.orderIndex === workspaceBounds?.max}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function TeamRow({
  team,
  showWorkspace,
  isFirst,
  isLast,
}: {
  team: TeamRowData;
  showWorkspace: boolean;
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

        {showWorkspace ? (
          <TableCell>
            <Link
              href={`/workspaces/${team.workspaceId}/teams`}
              className="text-sm whitespace-nowrap hover:underline"
            >
              {team.workspaceName}
            </Link>
          </TableCell>
        ) : null}

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
              title="Move up in the rotation"
              onClick={() => moveTeam({ id: team._id, direction: "up" })}
            >
              <ArrowUp />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isLast}
              aria-label={`Move ${team.name} down`}
              title="Move down in the rotation"
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
                      href={`/workspaces/${team.workspaceId}/leads?team=${team._id}`}
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
        workspaceId={team.workspaceId}
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
