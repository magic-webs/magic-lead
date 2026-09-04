"use client";

import Link from "next/link";
import { notFound, useParams, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { ArrowLeft, Inbox, LayoutDashboard, Settings, Users } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { slug: "", label: "Overview", icon: LayoutDashboard },
  { slug: "teams", label: "Teams", icon: Users },
  { slug: "leads", label: "Leads", icon: Inbox },
  { slug: "settings", label: "Settings", icon: Settings },
];

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: Id<"workspaces"> }>();
  const pathname = usePathname();
  const workspaceId = params.id;

  const workspace = useQuery(api.workspaces.getWorkspace, { id: workspaceId });

  if (workspace === null) {
    notFound();
  }

  const basePath = `/workspaces/${workspaceId}`;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          render={<Link href="/workspaces" />}
        >
          <ArrowLeft />
          All workspaces
        </Button>

        <div className="min-w-0">
          {workspace === undefined ? (
            <Skeleton className="h-8 w-56" />
          ) : (
            <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
              {workspace.name}
            </h1>
          )}
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {workspaceId}
          </p>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-b">
          {SECTIONS.map((section) => {
            const href = section.slug ? `${basePath}/${section.slug}` : basePath;
            const isActive = pathname === href;
            return (
              <Link
                key={section.label}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <section.icon className="size-4" />
                {section.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
