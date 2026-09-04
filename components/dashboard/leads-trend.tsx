"use client";

import { cn } from "@/lib/utils";

type DayPoint = { date: string; day: number; count: number };

function formatDay(day: number) {
  return new Date(day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Daily lead volume as a CSS bar chart. Kept dependency-free so it stays
 * light and inherits the theme tokens in both light and dark mode.
 */
export function LeadsTrend({
  data,
  className,
}: {
  data: DayPoint[];
  className?: string;
}) {
  const max = Math.max(1, ...data.map((point) => point.count));
  const total = data.reduce((sum, point) => sum + point.count, 0);

  if (total === 0) {
    return (
      <div
        className={cn(
          "flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground",
          className
        )}
      >
        No leads in the last {data.length} days.
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex h-40 items-end gap-1">
        {data.map((point) => {
          const heightPercent = (point.count / max) * 100;
          return (
            <div
              key={point.date}
              className="group/bar flex h-full flex-1 flex-col justify-end"
              title={`${formatDay(point.day)}: ${point.count} lead${
                point.count === 1 ? "" : "s"
              }`}
            >
              <div className="mb-1 text-center text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover/bar:opacity-100">
                {point.count}
              </div>
              <div
                className={cn(
                  "w-full rounded-sm transition-colors",
                  point.count === 0
                    ? "bg-muted"
                    : "bg-primary/70 group-hover/bar:bg-primary"
                )}
                style={{
                  height: point.count === 0 ? "2px" : `${Math.max(4, heightPercent)}%`,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatDay(data[0].day)}</span>
        <span>{formatDay(data[data.length - 1].day)}</span>
      </div>
    </div>
  );
}

/**
 * Horizontal "leads per X" ranking rows with a proportional bar.
 */
export function DistributionList({
  items,
  emptyLabel = "Nothing to show yet.",
}: {
  items: {
    id: string;
    label: string;
    sublabel?: string;
    count: number;
  }[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-medium">
              {item.label}
              {item.sublabel ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {item.sublabel}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {item.count}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
