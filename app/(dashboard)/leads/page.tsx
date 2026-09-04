"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { LeadsTable } from "@/components/dashboard/leads-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";
const UNASSIGNED = "unassigned";

export default function AllLeadsPage() {
  const leads = useQuery(api.leads.getAllLeads, {});
  const workspaces = useQuery(api.workspaces.getWorkspaces);

  const [workspaceFilter, setWorkspaceFilter] = useState(ALL);
  const [search, setSearch] = useState("");

  const filteredLeads = useMemo(() => {
    if (!leads) return undefined;

    const term = search.trim().toLowerCase();

    return leads.filter((lead) => {
      if (workspaceFilter === UNASSIGNED && lead.teamId) return false;
      if (
        workspaceFilter !== ALL &&
        workspaceFilter !== UNASSIGNED &&
        lead.workspaceId !== workspaceFilter
      ) {
        return false;
      }

      if (!term) return true;

      // Search the whole payload plus the workspace and team names, so any
      // field a webhook happens to send is findable.
      const haystack = [
        lead.workspaceName,
        lead.team?.name ?? "",
        JSON.stringify(lead.payload ?? {}),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [leads, workspaceFilter, search]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="All leads"
        description="The 200 most recent leads across every workspace."
        actions={
          leads ? (
            <Badge variant="secondary" className="tabular-nums">
              {filteredLeads?.length ?? 0} of {leads.length}
            </Badge>
          ) : null
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Search payloads, workspaces, teams…"
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
            <SelectItem value={UNASSIGNED}>Unassigned only</SelectItem>
            {workspaces?.map((workspace) => (
              <SelectItem key={workspace._id} value={workspace._id}>
                {workspace.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="px-0">
          <LeadsTable
            leads={filteredLeads}
            showWorkspace
            emptyTitle={
              search || workspaceFilter !== ALL
                ? "No leads match these filters"
                : "No leads yet"
            }
            emptyDescription={
              search || workspaceFilter !== ALL
                ? "Try a broader search or clear the workspace filter."
                : "Once a workspace's incoming webhook receives its first POST, leads show up here."
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
