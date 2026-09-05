"use client";

import { useState, use } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, RotateCcw, Users } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { TeamFormDialog } from "@/components/dashboard/team-form-dialog";
import { TeamsTable } from "@/components/dashboard/teams-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

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
            <TeamsTable teams={teams} />
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
