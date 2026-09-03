"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Copy, Check, Trash2, Users, List, Webhook, LogOut, Eye } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Id } from "@/convex/_generated/dataModel";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInset,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: Id<"workspaces"> }>;
}) {
  const unwrappedParams = use(params);
  const workspaceId = unwrappedParams.id;
  
  const workspace = useQuery(api.workspaces.getWorkspace, { id: workspaceId });
  const teams = useQuery(api.teams.getTeams, { workspaceId });
  const leads = useQuery(api.leads.getLeads, { workspaceId });
  
  const createTeam = useMutation(api.teams.createTeam);
  const deleteTeam = useMutation(api.teams.deleteTeam);
  const updateTriggerWebhookUrl = useMutation(api.workspaces.updateTriggerWebhookUrl);

  const [activeView, setActiveView] = useState<"teams" | "leads" | "webhooks">("teams");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("all");

  const filteredLeads = leads?.filter(
    (lead) => selectedTeamFilter === "all" || lead.teamId === selectedTeamFilter
  );

  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [maxSize, setMaxSize] = useState("10");

  const [webhookUrlInput, setWebhookUrlInput] = useState("");
  const [hasCopied, setHasCopied] = useState(false);

  if (workspace === undefined) {
    return <div className="p-10">Loading...</div>;
  }

  if (workspace === null) {
    return <div className="p-10">Workspace not found</div>;
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !mobileNumber.trim()) return;
    try {
      await createTeam({
        workspaceId,
        name: teamName,
        mobileNumber,
        maxSize: parseInt(maxSize) || 1,
      });
      setIsTeamDialogOpen(false);
      setTeamName("");
      setMobileNumber("");
      setMaxSize("10");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateTriggerWebhookUrl({
        id: workspaceId,
        url: webhookUrlInput,
      });
      setWebhookUrlInput("");
    } catch (err) {
      console.error(err);
    }
  };

  const incomingWebhookUrl = typeof window !== "undefined" 
    ? `${process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.cloud', '.site')}/webhook/${workspace.webhookToken}`
    : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(incomingWebhookUrl);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b p-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center w-fit mb-4">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
          <div className="font-semibold text-lg">{workspace.name}</div>
          <div className="text-xs text-muted-foreground truncate font-mono">{workspace._id}</div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={activeView === "teams"} 
                    onClick={() => setActiveView("teams")}
                  >
                    <Users />
                    <span>Teams</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={activeView === "leads"} 
                    onClick={() => setActiveView("leads")}
                  >
                    <List />
                    <span>Leads</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={activeView === "webhooks"} 
                    onClick={() => setActiveView("webhooks")}
                  >
                    <Webhook />
                    <span>Webhooks & Routing</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <Button variant="ghost" onClick={() => logoutAction()} className="w-full justify-start">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold tracking-tight capitalize">
            {activeView}
          </h1>
        </div>

        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full">
          {activeView === "teams" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Teams</CardTitle>
                  <CardDescription>
                    Manage the teams that will receive leads. Leads are assigned round-robin until a team hits its Max Size limit.
                  </CardDescription>
                </div>
                <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                  <DialogTrigger render={<Button />}>
                    <Plus className="mr-2 h-4 w-4" /> Add Team
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleCreateTeam}>
                      <DialogHeader>
                        <DialogTitle>Add New Team</DialogTitle>
                        <DialogDescription>
                          Set up a new team to receive assigned leads.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-6 space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor="teamName">Team Name</Label>
                          <Input
                            id="teamName"
                            placeholder="e.g. Sales Alpha"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="mobileNumber">Mobile Number</Label>
                          <Input
                            id="mobileNumber"
                            placeholder="e.g. +1234567890"
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value)}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="maxSize">Max Size (Leads per cycle)</Label>
                          <Input
                            id="maxSize"
                            type="number"
                            min="1"
                            value={maxSize}
                            onChange={(e) => setMaxSize(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => setIsTeamDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add Team</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {teams === undefined ? (
                  <div className="p-4 text-center text-muted-foreground">Loading teams...</div>
                ) : teams.length === 0 ? (
                  <div className="text-center py-10 border rounded-md border-dashed">
                    <p className="text-muted-foreground mb-4">No teams have been added yet.</p>
                    <Button variant="secondary" onClick={() => setIsTeamDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Add your first team
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Team Name</TableHead>
                        <TableHead>Mobile Number</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teams.map((team) => (
                        <TableRow key={team._id}>
                          <TableCell>
                            <Badge variant="outline">{team.orderIndex + 1}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{team.name}</TableCell>
                          <TableCell className="font-mono text-sm">{team.mobileNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{team.currentAssignedCount} / {team.maxSize}</span>
                              <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary" 
                                  style={{ width: `${Math.min(100, (team.currentAssignedCount / team.maxSize) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-primary hover:bg-primary/10 hover:text-primary mr-2"
                              onClick={() => {
                                setSelectedTeamFilter(team._id);
                                setActiveView("leads");
                              }}
                              title="View Leads"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this team?")) {
                                  deleteTeam({ id: team._id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeView === "leads" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Leads</CardTitle>
                    <CardDescription>
                      View all leads that have been routed through this workspace.
                    </CardDescription>
                  </div>
                  <div className="w-48">
                    <Select value={selectedTeamFilter} onValueChange={(val) => setSelectedTeamFilter(val || "all")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        {teams?.map((team) => (
                          <SelectItem key={team._id} value={team._id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredLeads === undefined ? (
                  <div className="p-4 text-center text-muted-foreground">Loading leads...</div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-center py-10 border rounded-md border-dashed">
                    <p className="text-muted-foreground">No leads have been received for this filter.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time Received</TableHead>
                        <TableHead>Assigned Team</TableHead>
                        <TableHead>Payload</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                        <TableRow key={lead._id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(lead._creationTime).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {lead.team ? (
                              <Badge variant="secondary">{lead.team.name}</Badge>
                            ) : (
                              <Badge variant="outline">Unassigned</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <pre className="bg-muted p-2 rounded text-xs max-w-md overflow-auto max-h-32">
                              {JSON.stringify(lead.payload, null, 2)}
                            </pre>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeView === "webhooks" && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Incoming Webhook</CardTitle>
                  <CardDescription>
                    Send POST requests to this URL to add new leads to this workspace.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={incomingWebhookUrl} className="font-mono text-sm bg-muted" />
                        <Button variant="secondary" size="icon" onClick={copyToClipboard}>
                          {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="bg-muted p-4 rounded-md font-mono text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                      {`// Example Payload\n{\n  "name": "John Doe",\n  "email": "john@example.com",\n  "source": "Website"\n}`}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Outgoing Webhook</CardTitle>
                  <CardDescription>
                    We will trigger this URL when a lead is successfully assigned to a team.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateWebhook} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="triggerWebhookUrl">Trigger Webhook URL</Label>
                      <Input
                        id="triggerWebhookUrl"
                        placeholder="https://your-api.com/webhook"
                        value={webhookUrlInput}
                        onChange={(e) => setWebhookUrlInput(e.target.value)}
                      />
                      {workspace.triggerWebhookUrl && (
                        <p className="text-xs text-muted-foreground flex items-center mt-2">
                          <Check className="h-3 w-3 mr-1 text-green-500" /> Currently set to: <span className="font-mono ml-1 truncate max-w-[200px]">{workspace.triggerWebhookUrl}</span>
                        </p>
                      )}
                    </div>
                    <Button type="submit" variant="secondary" disabled={!webhookUrlInput.trim() || webhookUrlInput === workspace.triggerWebhookUrl}>
                      Update Webhook
                    </Button>
                  </form>
                  
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="text-sm font-medium mb-2">Payload Format</h4>
                    <div className="bg-muted p-4 rounded-md font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                      {`{\n  "teamMobileNumber": "+1234567890",\n  "leadPayload": { ... }\n}`}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
