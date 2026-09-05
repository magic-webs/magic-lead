"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Building2, Share2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { parseMatchValues } from "@/lib/match-values";

type Workspace = { _id: Id<"workspaces">; name: string };
type Kind = "standard" | "channel";

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
          <WorkspaceForm workspace={workspace} onDone={() => setOpen(false)} />
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
  const [kind, setKind] = useState<Kind>("standard");
  const [matchField, setMatchField] = useState("Interested");
  const [matchValuesText, setMatchValuesText] = useState("Channel Partner");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchValues = parseMatchValues(matchValuesText);

  const unchanged = isEdit && name.trim() === workspace?.name;
  const ruleIncomplete =
    !isEdit &&
    kind === "channel" &&
    (matchField.trim() === "" || matchValues.length === 0);
  const canSubmit = name.trim() !== "" && !unchanged && !ruleIncomplete;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      if (workspace) {
        await updateWorkspace({ id: workspace._id, name });
      } else if (kind === "channel") {
        await createWorkspace({
          name,
          kind,
          matchField: matchField.trim(),
          matchValues,
        });
      } else {
        await createWorkspace({ name, kind });
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
            : "A workspace holds the teams that share incoming leads and the rotation that distributes them."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-6">
        <div className="grid gap-2">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input
            id="workspace-name"
            autoFocus
            placeholder={
              kind === "channel" ? "e.g. Channel Partners" : "e.g. Acme Corp"
            }
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        {/* The type decides whether the workspace has its own incoming
            webhook, so it is fixed once the workspace exists. */}
        {!isEdit ? (
          <>
            <div className="grid gap-2">
              <Label>Type</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <KindOption
                  icon={Building2}
                  title="Standard"
                  description="Has its own incoming webhook. Point a form or CRM at it."
                  selected={kind === "standard"}
                  onSelect={() => setKind("standard")}
                />
                <KindOption
                  icon={Share2}
                  title="Channel partner"
                  description="No incoming webhook. Claims matching leads from every other workspace."
                  selected={kind === "channel"}
                  onSelect={() => setKind("channel")}
                />
              </div>
            </div>

            {kind === "channel" ? (
              <div className="space-y-4 rounded-lg border border-dashed p-3">
                <div className="grid gap-2">
                  <Label htmlFor="match-field">Match field</Label>
                  <Input
                    id="match-field"
                    placeholder="e.g. Interested"
                    value={matchField}
                    onChange={(event) => setMatchField(event.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Looked up at the top level of the payload and inside{" "}
                    <code className="font-mono">fieldData</code>.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="match-values">Match values</Label>
                  <Input
                    id="match-values"
                    placeholder="e.g. Channel Partner, Broker"
                    value={matchValuesText}
                    onChange={(event) => setMatchValuesText(event.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated. Compared exactly, ignoring case.
                  </p>
                  {matchValues.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {matchValues.map((value) => (
                        <Badge key={value} variant="secondary">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : null}
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !canSubmit}>
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

function KindOption({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/50"
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-medium">
        <Icon className="size-4" />
        {title}
      </span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}
