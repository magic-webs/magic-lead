import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  change,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  /** Percent change vs. the previous period. `null` means "no baseline yet". */
  change?: number | null;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0", className)}>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </span>
          {Icon ? (
            <Icon className="size-4 shrink-0 text-muted-foreground" />
          ) : null}
        </div>

        <div className="font-heading text-2xl font-semibold tabular-nums">
          {value}
        </div>

        <div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
          {change !== undefined && change !== null ? (
            <TrendPill change={change} />
          ) : null}
          {hint ? <span className="truncate">{hint}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendPill({ change }: { change: number }) {
  const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : ArrowRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums",
        direction === "up" && "bg-primary/10 text-primary",
        direction === "down" && "bg-destructive/10 text-destructive",
        direction === "flat" && "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="size-3" />
      {change > 0 ? "+" : ""}
      {change}%
    </span>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="gap-0">
      <CardContent className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}
