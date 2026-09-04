"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { LeadsTable } from "@/components/dashboard/leads-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";
const UNASSIGNED = "unassigned";

export default function WorkspaceLeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: Id<"workspaces"> }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const { id: workspaceId } = use(params);
  const { team: teamFromUrl } = use(searchParams);
  const router = useRouter();

  const teams = useQuery(api.teams.getTeams, { workspaceId });
  const leads = useQuery(api.leads.getLeads, { workspaceId });

  const [filter, setFilter] = useState(teamFromUrl ?? ALL);

  const handleFilterChange = (value: string | null) => {
    const next = value ?? ALL;
    setFilter(next);
    // Keep the URL shareable without pushing a history entry per change.
    const query = next === ALL ? "" : `?team=${next}`;
    router.replace(`/workspaces/${workspaceId}/leads${query}`, {
      scroll: false,
    });
  };

  const filteredLeads = useMemo(() => {
    if (!leads) return undefined;
    if (filter === ALL) return leads;
    if (filter === UNASSIGNED) return leads.filter((lead) => !lead.teamId);
    return leads.filter((lead) => lead.teamId === filter);
  }, [leads, filter]);

  const unassignedCount = leads?.filter((lead) => !lead.teamId).length ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leads"
        description="Every lead this workspace has received, newest first."
        actions={
          <div className="flex items-center gap-2">
            {leads ? (
              <Badge variant="secondary" className="tabular-nums">
                {filteredLeads?.length ?? 0} of {leads.length}
              </Badge>
            ) : null}
            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All teams</SelectItem>
                {unassignedCount > 0 ? (
                  <SelectItem value={UNASSIGNED}>
                    Unassigned ({unassignedCount})
                  </SelectItem>
                ) : null}
                {teams?.map((team) => (
                  <SelectItem key={team._id} value={team._id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Card>
        <CardContent className="px-0">
          <LeadsTable
            leads={filteredLeads}
            teams={teams}
            emptyTitle={
              filter === ALL ? "No leads yet" : "No leads match this filter"
            }
            emptyDescription={
              filter === ALL
                ? "POST to this workspace's incoming webhook and the lead will show up here immediately."
                : "Try a different team, or clear the filter to see everything."
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
