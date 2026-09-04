"use client";

import { useState } from "react";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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

type Workspace = { _id: Id<"workspaces">; name: string };

/**
 * Create or rename a workspace. Pass `workspace` to edit, omit it to create.
 * Works either with a `trigger` or driven by `open`/`onOpenChange`.
 */
export function WorkspaceFormDialog({
  workspace,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  workspace?: Workspace;
  trigger?: React.ReactElement<React.ComponentProps<"button">>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent>
        {/* Mounted only while open, so the fields always start from the
            current values instead of being re-synced by an effect. */}
        {open ? (
          <WorkspaceForm
            workspace={workspace}
            onDone={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceForm({
  workspace,
  onDone,
}: {
  workspace?: Workspace;
  onDone: () => void;
}) {
  const isEdit = Boolean(workspace);
  const createWorkspace = useMutation(api.workspaces.createWorkspace);
  const updateWorkspace = useMutation(api.workspaces.updateWorkspace);

  const [name, setName] = useState(workspace?.name ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unchanged = isEdit && name.trim() === workspace?.name;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      if (workspace) {
        await updateWorkspace({ id: workspace._id, name });
      } else {
        await createWorkspace({ name });
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? "Rename workspace" : "Create workspace"}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update the display name for this workspace. Webhooks and routing are unaffected."
            : "A workspace represents a business or project where you manage teams and lead routing."}
        </DialogDescription>
      </DialogHeader>

      <div className="py-6">
        <div className="grid gap-2">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input
            id="workspace-name"
            autoFocus
            placeholder="e.g. Acme Corp"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          {error ? (
            <p className="text-sm font-medium text-destructive">{error}</p>
          ) : null}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !name.trim() || unchanged}
        >
          {isSubmitting
            ? isEdit
              ? "Saving…"
              : "Creating…"
            : isEdit
              ? "Save changes"
              : "Create workspace"}
        </Button>
      </DialogFooter>
    </form>
  );
}
