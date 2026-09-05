"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import {
  Building2,
  ChevronRight,
  Inbox,
  LayoutDashboard,
  LogOut,
  Plus,
  Users,
} from "lucide-react";

import logoMark from "@/public/images/logo-mark.png";

import { api } from "@/convex/_generated/api";
import { logoutAction } from "@/app/login/actions";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/leads", label: "All Leads", icon: Inbox },
  { href: "/teams", label: "All Teams", icon: Users },
];

export function AppSidebar() {
  const pathname = usePathname();
  const workspaces = useQuery(api.workspaces.getWorkspaces);
  const { setOpenMobile } = useSidebar();

  const closeOnMobile = () => setOpenMobile(false);

  const isNavActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" onClick={closeOnMobile} />}
              tooltip="Magic Lead"
            >
              {/* The mark is teal, so it sits on a dark tile rather than the
                  brand-teal one it would disappear into. */}
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-foreground">
                <Image
                  src={logoMark}
                  alt=""
                  aria-hidden
                  className="size-6 object-contain"
                />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="font-heading truncate font-semibold">
                  Magic Lead
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Lead routing
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isNavActive(item.href)}
                    render={<Link href={item.href} onClick={closeOnMobile} />}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {item.href === "/workspaces" && workspaces ? (
                    <SidebarMenuBadge>{workspaces.length}</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Your workspaces</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaces === undefined ? (
                [0, 1, 2].map((i) => (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuSkeleton />
                  </SidebarMenuItem>
                ))
              ) : workspaces.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link href="/workspaces" onClick={closeOnMobile} />
                    }
                    className="text-muted-foreground"
                  >
                    <Plus />
                    <span>Create a workspace</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                workspaces.slice(0, 8).map((workspace) => {
                  const href = `/workspaces/${workspace._id}`;
                  const active = pathname.startsWith(href);
                  return (
                    <SidebarMenuItem key={workspace._id}>
                      <SidebarMenuButton
                        isActive={active}
                        render={<Link href={href} onClick={closeOnMobile} />}
                      >
                        <ChevronRight
                          className={
                            active ? "rotate-90 transition-transform" : "transition-transform"
                          }
                        />
                        <span className="truncate">{workspace.name}</span>
                      </SidebarMenuButton>
                      {active ? (
                        <SidebarMenuSub>
                          {[
                            { slug: "", label: "Overview" },
                            { slug: "/teams", label: "Teams" },
                            { slug: "/leads", label: "Leads" },
                            { slug: "/settings", label: "Settings" },
                          ].map((sub) => {
                            const subHref = `${href}${sub.slug}`;
                            return (
                              <SidebarMenuSubItem key={sub.label}>
                                <SidebarMenuSubButton
                                  isActive={pathname === subHref}
                                  render={
                                    <Link
                                      href={subHref}
                                      onClick={closeOnMobile}
                                    />
                                  }
                                >
                                  <span>{sub.label}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })
              )}

              {workspaces && workspaces.length > 8 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/workspaces" onClick={closeOnMobile} />}
                    className="text-muted-foreground"
                  >
                    <span>View all</span>
                    <Badge variant="secondary" className="ml-auto">
                      {workspaces.length}
                    </Badge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => logoutAction()} tooltip="Log out">
              <LogOut />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
