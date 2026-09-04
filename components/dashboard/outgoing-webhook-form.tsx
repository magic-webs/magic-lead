"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Check } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Edit the URL we POST to once a lead has been assigned. Mount this with a
 * `key` derived from the stored value so it re-seeds when the value changes
 * elsewhere, rather than fighting the user's keystrokes from an effect.
 */
export function OutgoingWebhookForm({
  workspaceId,
  storedUrl,
}: {
  workspaceId: Id<"workspaces">;
  storedUrl: string;
}) {
  const updateWorkspace = useMutation(api.workspaces.updateWorkspace);

  const [url, setUrl] = useState(storedUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    const timeout = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timeout);
  }, [saved]);

  const unchanged = url.trim() === storedUrl;
  const isRemoving = url.trim() === "" && storedUrl !== "";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await updateWorkspace({
        id: workspaceId,
        triggerWebhookUrl: url.trim(),
      });
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the webhook."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="outgoing-webhook">Trigger URL</Label>
        <Input
          id="outgoing-webhook"
          type="url"
          placeholder="https://your-api.com/webhook"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        {error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : storedUrl ? (
          <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3 shrink-0 text-primary" />
            Currently forwarding to
            <span className="truncate font-mono">{storedUrl}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            No outgoing webhook set — assignments are recorded but not
            forwarded.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          variant="secondary"
          disabled={isSaving || unchanged}
        >
          {isSaving ? "Saving…" : isRemoving ? "Remove webhook" : "Save webhook"}
        </Button>
        {saved ? (
          <span className="flex items-center gap-1 text-xs text-primary">
            <Check className="size-3" />
            Saved
          </span>
        ) : null}
      </div>
    </form>
  );
}
