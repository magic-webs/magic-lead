"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import Link from "next/link";
import { Plus, ArrowRight, LogOut } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const workspaces = useQuery(api.workspaces.getWorkspaces);
  const createWorkspace = useMutation(api.workspaces.createWorkspace);

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await createWorkspace({ name });
      setIsOpen(false);
      setName("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground mt-2">
            Manage your workspaces and lead distribution.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => logoutAction()}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            New Workspace
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Workspace</DialogTitle>
                <DialogDescription>
                  A workspace represents a specific business or project where you manage teams and lead routing.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <div className="grid gap-2">
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    autoFocus
                    placeholder="e.g. Acme Corp"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !name.trim()}>
                  {isSubmitting ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {workspaces === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-20 border rounded-lg border-dashed bg-muted/30">
          <h3 className="text-lg font-medium">No workspaces yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Create your first workspace to get started.
          </p>
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Workspace
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <Card key={workspace._id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>{workspace.name}</CardTitle>
                <CardDescription>
                  Manage teams and webhooks for {workspace.name}
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto pt-6">
                <Link href={`/workspaces/${workspace._id}`} className="w-full">
                  <Button className="w-full" variant="secondary">
                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
