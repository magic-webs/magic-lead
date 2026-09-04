"use client";

import { OctagonAlert, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  // `retry` replaced `reset` as the recommended recovery prop in Next 16.3.
  retry: () => void;
}) {
  return (
    <Empty className="border py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <OctagonAlert className="text-destructive" />
        </EmptyMedia>
        <EmptyTitle>Something went wrong</EmptyTitle>
        <EmptyDescription>
          {error.message || "This section failed to load."}
          {error.digest ? (
            <span className="mt-1 block font-mono text-xs">
              {error.digest}
            </span>
          ) : null}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => retry()}>
          <RotateCcw />
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}
