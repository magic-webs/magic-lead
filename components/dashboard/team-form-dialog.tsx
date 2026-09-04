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

type Team = {
  _id: Id<"teams">;
  name: string;
  mobileNumber: string;
  maxSize: number;
};

/**
 * Add or edit a team. Pass `team` to edit, omit it to add.
 * Works either with a `trigger` or driven by `open`/`onOpenChange`.
 */
export function TeamFormDialog({
  workspaceId,
  team,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  workspaceId: Id<"workspaces">;
  team?: Team;
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
          <TeamForm
            workspaceId={workspaceId}
            team={team}
            onDone={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TeamForm({
  workspaceId,
  team,
  onDone,
}: {
  workspaceId: Id<"workspaces">;
  team?: Team;
  onDone: () => void;
}) {
  const isEdit = Boolean(team);
  const createTeam = useMutation(api.teams.createTeam);
  const updateTeam = useMutation(api.teams.updateTeam);

  const [name, setName] = useState(team?.name ?? "");
  const [mobileNumber, setMobileNumber] = useState(team?.mobileNumber ?? "");
  const [maxSize, setMaxSize] = useState(String(team?.maxSize ?? 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedMaxSize = Number.parseInt(maxSize, 10);
  const maxSizeIsValid = Number.isFinite(parsedMaxSize) && parsedMaxSize >= 1;
  const canSubmit =
    name.trim() !== "" && mobileNumber.trim() !== "" && maxSizeIsValid;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      if (team) {
        await updateTeam({
          id: team._id,
          name,
          mobileNumber,
          maxSize: parsedMaxSize,
        });
      } else {
        await createTeam({
          workspaceId,
          name,
          mobileNumber,
          maxSize: parsedMaxSize,
        });
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
        <DialogTitle>{isEdit ? "Edit team" : "Add team"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update this team's contact details and per-cycle capacity."
            : "Teams receive leads round-robin until each one reaches its max size."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-6">
        <div className="grid gap-2">
          <Label htmlFor="team-name">Team name</Label>
          <Input
            id="team-name"
            autoFocus
            placeholder="e.g. Sales Alpha"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="team-mobile">Mobile number</Label>
          <Input
            id="team-mobile"
            placeholder="e.g. +1234567890"
            value={mobileNumber}
            onChange={(event) => setMobileNumber(event.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Sent to your outgoing webhook as{" "}
            <code className="font-mono">teamMobileNumber</code>.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="team-max-size">Max size</Label>
          <Input
            id="team-max-size"
            type="number"
            min={1}
            value={maxSize}
            onChange={(event) => setMaxSize(event.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Leads this team takes before the rotation moves on. When every team
            is full, the cycle resets.
          </p>
        </div>

        {error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : null}
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !canSubmit}>
          {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add team"}
        </Button>
      </DialogFooter>
    </form>
  );
}
