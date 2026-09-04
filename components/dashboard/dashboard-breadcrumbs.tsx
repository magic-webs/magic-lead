"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SECTION_LABELS: Record<string, string> = {
  workspaces: "Workspaces",
  leads: "Leads",
  teams: "Teams",
  settings: "Settings",
};

type Crumb = { label: string; href?: string };

export function DashboardBreadcrumbs() {
  const pathname = usePathname();
  // Already fetched by the sidebar, so this resolves from cache.
  const workspaces = useQuery(api.workspaces.getWorkspaces);

  const segments = pathname.split("/").filter(Boolean);

  const crumbs: Crumb[] = [{ label: "Overview", href: "/" }];

  if (segments[0] === "leads") {
    crumbs.push({ label: "All Leads" });
  } else if (segments[0] === "workspaces") {
    const workspaceId = segments[1];
    crumbs.push({
      label: "Workspaces",
      href: workspaceId ? "/workspaces" : undefined,
    });

    if (workspaceId) {
      const workspace = workspaces?.find((w) => w._id === workspaceId);
      const subSection = segments[2];
      crumbs.push({
        label: workspace?.name ?? "Workspace",
        href: subSection ? `/workspaces/${workspaceId}` : undefined,
      });

      if (subSection) {
        crumbs.push({ label: SECTION_LABELS[subSection] ?? subSection });
      }
    }
  }

  // On the overview itself the single crumb is the current page.
  if (crumbs.length === 1) {
    crumbs[0] = { label: "Overview" };
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem className="min-w-0">
                {crumb.href && !isLast ? (
                  <BreadcrumbLink render={<Link href={crumb.href} />}>
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="truncate">
                    {crumb.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
