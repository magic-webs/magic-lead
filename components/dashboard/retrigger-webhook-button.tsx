"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { Check, OctagonX, Send } from "lucide-react";

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
} from "@/components/ui/dialog";

type Result =
  | { kind: "success"; status: number }
  | { kind: "error"; message: string };

/**
 * Re-send a stored lead to its workspace's outgoing webhook. Confirms first,
 * since this POSTs to a third-party endpoint that may act on the lead again.
 */
export function RetriggerWebhookButton({
  leadId,
  teamName,
  webhookUrl,
}: {
  leadId: Id<"leads">;
  teamName: string | null;
  webhookUrl: string | null;
}) {
  const retrigger = useAction(api.leads.retriggerWebhook);

  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // Explain up front why the button is unusable, rather than failing on click.
  const blockedReason = !webhookUrl
    ? "This workspace has no outgoing webhook configured"
    : !teamName
      ? "This lead is not assigned to a team"
      : null;

  const handleSend = async () => {
    setIsSending(true);
    setResult(null);
    try {
      const { status } = await retrigger({ leadId });
      setResult({ kind: "success", status });
    } catch (error) {
      setResult({
        kind: "error",
        message:
          error instanceof ConvexError
            ? String(error.data)
            : error instanceof Error
              ? error.message
              : "The re-trigger failed.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={Boolean(blockedReason)}
        aria-label="Re-trigger outgoing webhook"
        title={blockedReason ?? "Re-trigger outgoing webhook"}
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
      >
        <Send />
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setResult(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-trigger outgoing webhook?</DialogTitle>
            <DialogDescription>
              This sends the lead to your endpoint again. If that endpoint
              creates records or sends messages, it will do so a second time.
            </DialogDescription>
          </DialogHeader>

          <dl className="space-y-2 py-4 text-sm">
            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-muted-foreground">Endpoint</dt>
              <dd className="min-w-0 break-all font-mono text-xs">
                {webhookUrl}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-muted-foreground">Team</dt>
              <dd className="min-w-0">{teamName}</dd>
            </div>
          </dl>

          {result?.kind === "success" ? (
            <p className="flex items-start gap-2 rounded-md bg-primary/10 p-2.5 text-sm text-primary">
              <Check className="mt-0.5 size-4 shrink-0" />
              Delivered — the endpoint responded {result.status}.
            </p>
          ) : null}

          {result?.kind === "error" ? (
            <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-2.5 text-sm text-destructive">
              <OctagonX className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 break-words">{result.message}</span>
            </p>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
            >
              {result?.kind === "success" ? "Done" : "Cancel"}
            </Button>
            <Button type="button" disabled={isSending} onClick={handleSend}>
              <Send />
              {isSending
                ? "Sending…"
                : result
                  ? "Send again"
                  : "Send now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
