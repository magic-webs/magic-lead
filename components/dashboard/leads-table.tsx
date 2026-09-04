"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { Inbox, Trash2, UserCog } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
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
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { CopyButton } from "@/components/dashboard/copy-button";

const UNASSIGNED = "__unassigned__";

export type LeadRow = {
  _id: Id<"leads">;
  _creationTime: number;
  teamId?: Id<"teams">;
  payload: unknown;
  team: { _id: Id<"teams">; name: string } | null;
  workspaceId?: Id<"workspaces">;
  workspaceName?: string;
};

/** Turn an arbitrary webhook payload into a few readable key/value pairs. */
function summarizePayload(payload: unknown) {
  if (payload === null || typeof payload !== "object") {
    return [] as { key: string; value: string }[];
  }

  return Object.entries(payload as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 3)
    .map(([key, value]) => ({
      key,
      value:
        typeof value === "object"
          ? JSON.stringify(value)
          : String(value).slice(0, 60),
    }));
}

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function LeadsTable({
  leads,
  teams,
  showWorkspace = false,
  emptyTitle = "No leads yet",
  emptyDescription = "Leads appear here as soon as your incoming webhook receives its first POST.",
}: {
  leads: LeadRow[] | undefined;
  /** Pass the workspace's teams to enable manual reassignment. */
  teams?: { _id: Id<"teams">; name: string }[];
  showWorkspace?: boolean;
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
}) {
  const deleteLead = useMutation(api.leads.deleteLead);
  const reassignLead = useMutation(api.leads.reassignLead);

  if (leads === undefined) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Received</TableHead>
            {showWorkspace ? <TableHead>Workspace</TableHead> : null}
            <TableHead>Assigned team</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="w-[1%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead._id}>
              <TableCell className="align-top text-sm whitespace-nowrap text-muted-foreground">
                {formatTimestamp(lead._creationTime)}
              </TableCell>

              {showWorkspace ? (
                <TableCell className="align-top">
                  {lead.workspaceId ? (
                    <Link
                      href={`/workspaces/${lead.workspaceId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {lead.workspaceName}
                    </Link>
                  ) : (
                    <span className="text-sm">{lead.workspaceName}</span>
                  )}
                </TableCell>
              ) : null}

              <TableCell className="align-top">
                {lead.team ? (
                  <Badge variant="secondary">{lead.team.name}</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Unassigned
                  </Badge>
                )}
              </TableCell>

              <TableCell className="align-top">
                <PayloadCell payload={lead.payload} />
              </TableCell>

              <TableCell className="align-top text-right">
                <div className="flex items-center justify-end gap-1">
                  {teams && teams.length > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Reassign lead"
                          />
                        }
                      >
                        <UserCog />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={lead.teamId ?? UNASSIGNED}
                          onValueChange={(value) => {
                            void reassignLead({
                              id: lead._id,
                              teamId:
                                value === UNASSIGNED
                                  ? undefined
                                  : (value as Id<"teams">),
                            });
                          }}
                        >
                          <DropdownMenuRadioItem value={UNASSIGNED}>
                            Unassigned
                          </DropdownMenuRadioItem>
                          {teams.map((team) => (
                            <DropdownMenuRadioItem
                              key={team._id}
                              value={team._id}
                            >
                              {team.name}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}

                  <ConfirmDialog
                    title="Delete this lead?"
                    description="The lead and its payload are removed permanently. Team counters are not adjusted."
                    confirmLabel="Delete lead"
                    onConfirm={() => deleteLead({ id: lead._id })}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete lead"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    }
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PayloadCell({ payload }: { payload: unknown }) {
  const [open, setOpen] = useState(false);
  const summary = useMemo(() => summarizePayload(payload), [payload]);
  const json = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {summary.length === 0 ? (
        <span className="text-sm text-muted-foreground">Empty payload</span>
      ) : (
        summary.map((entry) => (
          <span
            key={entry.key}
            className="inline-flex max-w-[220px] items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs"
          >
            <span className="text-muted-foreground">{entry.key}</span>
            <span className="truncate font-medium">{entry.value}</span>
          </span>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={<Button variant="link" size="xs" className="px-1" />}
        >
          View raw
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead payload</DialogTitle>
            <DialogDescription>
              The full JSON body as it was received by the incoming webhook.
            </DialogDescription>
          </DialogHeader>
          <pre className="mt-4 max-h-80 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
            {json}
          </pre>
          <div className="mt-4 flex justify-end">
            <CopyButton
              value={json}
              label="Copy JSON"
              size="default"
              variant="outline"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
