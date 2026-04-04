import { Link, useLocation } from "react-router-dom"
import { useAuth } from "@/providers/AuthProvider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  BuildingLibraryIcon, 
  DocumentTextIcon, 
  ChatBubbleLeftRightIcon, 
  ChartBarIcon, 
  RectangleGroupIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ScaleIcon
} from "@heroicons/react/24/outline"

export function AppSidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: RectangleGroupIcon },
    { name: "Documents", href: "/documents", icon: DocumentTextIcon },
    { name: "Chat", href: "/chat", icon: ChatBubbleLeftRightIcon },
    { name: "Comparison", href: "/comparison", icon: ScaleIcon },
    { name: "Analytics", href: "/analytics", icon: ChartBarIcon },
    { name: "Workspaces", href: "/workspaces", icon: BuildingLibraryIcon },
  ]

  const settingsItems = [
    { name: "Settings", href: "/settings", icon: Cog6ToothIcon },
  ]

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + "/")
  }

  const userInitials = user?.email?.[0]?.toUpperCase() || "U"

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarHeader className="flex items-center justify-between p-4 h-16 border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-legal-blue to-legal-navy text-primary-foreground shadow-sm group-data-[collapsible=icon]:mx-auto">
            <span className="font-bold">J</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            JuriSight
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-2 hide-scrollbar">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase text-muted-foreground/70 tracking-wider pt-2 group-data-[collapsible=icon]:hidden">
            Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isItemActive = isActive(item.href)
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      isActive={isItemActive}
                      tooltip={item.name}
                      render={
                        <Link to={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.name}</span>
                        </Link>
                      }
                      className={`
                        transition-all duration-200 mt-1
                        ${isItemActive 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-medium shadow-sm" 
                          : "text-sidebar-foreground hover:bg-accent/50 hover:text-foreground"
                        }
                      `}
                    />
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto pt-6">
          <SidebarGroupLabel className="text-xs font-semibold uppercase text-muted-foreground/70 tracking-wider group-data-[collapsible=icon]:hidden">
            Preferences
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                 const isItemActive = isActive(item.href)
                 return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      isActive={isItemActive} 
                      tooltip={item.name} 
                      className="mt-1 transition-all duration-200"
                      render={
                        <Link to={item.href} className="text-sidebar-foreground hover:bg-accent/50">
                          <item.icon className="size-4" />
                          <span>{item.name}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                 )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex items-center gap-3 rounded-lg hover:bg-accent/50 transition-colors p-2"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={(user as any)?.avatar || ""} alt={(user as any)?.name || user?.email || ""} />
                <AvatarFallback className="rounded-lg bg-gradient-to-br from-legal-gold to-orange-400 text-white border border-border">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold text-foreground">{(user as any)?.name || "JuriSight User"}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </SidebarMenuButton>
          } />
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl border border-border shadow-legal"
            side="top"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-legal-gold to-orange-400 text-white">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-foreground">{(user as any)?.name || "Account"}</span>
                  <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem render={
              <Link to="/settings" className="cursor-pointer">
                <Cog6ToothIcon className="mr-2 h-4 w-4" />
                Settings
              </Link>
            } />
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
              <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
