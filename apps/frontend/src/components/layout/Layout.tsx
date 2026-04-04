import React from "react"
import { Outlet, useLocation } from "react-router-dom"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"

const Layout: React.FC = () => {
  const location = useLocation()

  // Simple hardcoded breadcrumb logic based on pathname for aesthetics
  const pathName = location.pathname.split("/")[1] || "Dashboard"
  const title = pathName.charAt(0).toUpperCase() + pathName.slice(1)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card/50 backdrop-blur-sm px-4 lg:px-6 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 sticky top-0 z-10 w-full shadow-sm">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground">{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex-1 flex items-center justify-end">
             <div className="text-sm text-muted-foreground hidden sm:block bg-muted/50 px-3 py-1 rounded-full border border-border">
                AI-powered legal document analysis
             </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 relative">
          {/* Subtle gradient background effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-legal-navy/5 pointer-events-none" />
          
          <div className="max-w-7xl mx-auto relative z-0">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout