"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { Braces, Inbox, Trash2, UserCog } from "lucide-react";

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
import { RetriggerWebhookButton } from "@/components/dashboard/retrigger-webhook-button";

const UNASSIGNED = "__unassigned__";

/**
 * The lead fields we surface as columns. Payloads also carry plumbing keys
 * (`_id`, `__v`, `client`, …) that are noise in a table — those stay in the
 * raw-payload dialog.
 */
const LEAD_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "city", label: "City" },
  { key: "full_name", label: "Full name" },
  { key: "phone_number", label: "Phone number" },
  { key: "formName", label: "Form" },
] as const;

export type LeadRow = {
  _id: Id<"leads">;
  _creationTime: number;
  workspaceId: Id<"workspaces">;
  teamId?: Id<"teams">;
  payload: unknown;
  team: { _id: Id<"teams">; name: string } | null;
  outgoingWebhookUrl: string | null;
  workspaceName?: string;
};

/** Read one field off an arbitrary webhook payload as display text. */
function readField(payload: unknown, key: string): string | null {
  if (payload === null || typeof payload !== "object") return null;

  const value = (payload as Record<string, unknown>)[key];
  if (value === null || value === undefined || value === "") return null;

  return typeof value === "object" ? JSON.stringify(value) : String(value);
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
  if (leads === undefined) {
    return (
      <div className="space-y-2 px-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="px-4">
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4 whitespace-nowrap">Received</TableHead>
            {showWorkspace ? <TableHead>Workspace</TableHead> : null}
            {LEAD_COLUMNS.map((column) => (
              <TableHead key={column.key} className="whitespace-nowrap">
                {column.label}
              </TableHead>
            ))}
            <TableHead>Assigned team</TableHead>
            <TableHead className="w-[1%] pr-4 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <LeadTableRow
              key={lead._id}
              lead={lead}
              teams={teams}
              showWorkspace={showWorkspace}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LeadTableRow({
  lead,
  teams,
  showWorkspace,
}: {
  lead: LeadRow;
  teams?: { _id: Id<"teams">; name: string }[];
  showWorkspace: boolean;
}) {
  const deleteLead = useMutation(api.leads.deleteLead);
  const reassignLead = useMutation(api.leads.reassignLead);

  const [rawOpen, setRawOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const json = useMemo(() => JSON.stringify(lead.payload, null, 2), [
    lead.payload,
  ]);

  return (
    <>
      <TableRow>
        <TableCell className="pl-4 text-sm whitespace-nowrap text-muted-foreground">
          {formatTimestamp(lead._creationTime)}
        </TableCell>

        {showWorkspace ? (
          <TableCell>
            <Link
              href={`/workspaces/${lead.workspaceId}`}
              className="text-sm font-medium whitespace-nowrap hover:underline"
            >
              {lead.workspaceName}
            </Link>
          </TableCell>
        ) : null}

        {LEAD_COLUMNS.map((column) => {
          const value = readField(lead.payload, column.key);
          return (
            <TableCell
              key={column.key}
              className={
                column.key === "phone_number"
                  ? "font-mono text-sm whitespace-nowrap"
                  : "text-sm"
              }
            >
              {value ?? <span className="text-muted-foreground">—</span>}
            </TableCell>
          );
        })}

        <TableCell>
          {lead.team ? (
            <Badge variant="secondary">{lead.team.name}</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Unassigned
            </Badge>
          )}
        </TableCell>

        <TableCell className="pr-4 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="View raw payload"
              title="View raw payload"
              onClick={() => setRawOpen(true)}
            >
              <Braces />
            </Button>

            <RetriggerWebhookButton
              leadId={lead._id}
              teamName={lead.team?.name ?? null}
              webhookUrl={lead.outgoingWebhookUrl}
            />

            {teams && teams.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Reassign lead"
                      title="Reassign lead"
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
                      <DropdownMenuRadioItem key={team._id} value={team._id}>
                        {team.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete lead"
              title="Delete lead"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <Dialog open={rawOpen} onOpenChange={setRawOpen}>
        <DialogContent className="sm:max-w-lg">
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

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this lead?"
        description="The lead and its payload are removed permanently. Team counters are not adjusted."
        confirmLabel="Delete lead"
        onConfirm={() => deleteLead({ id: lead._id })}
      />
    </>
  );
}
