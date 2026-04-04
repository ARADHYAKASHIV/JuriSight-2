import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const WorkspacesPage: React.FC = () => {
  const mockWorkspaces = [
    {
      id: 1, 
      name: "Corporate Documents", 
      documents: 45, 
      lastActive: "2 hours ago", 
      color: "legal-blue",
      members: 3
    },
    {
      id: 2, 
      name: "HR Contracts", 
      documents: 12, 
      lastActive: "1 day ago", 
      color: "legal-gold",
      members: 5
    },
    {
      id: 3, 
      name: "Personal Legal", 
      documents: 4, 
      lastActive: "3 days ago", 
      color: "legal-navy",
      members: 1
    }
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Workspaces</h1>
          <p className="text-muted-foreground text-lg">Organize your documents into secure categorized spaces</p>
        </div>
        <Button variant="legal">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Workspace
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {mockWorkspaces.map((workspace) => (
          <Card key={workspace.id} className="hover:shadow-lg transition-shadow border-border bg-card/60 backdrop-blur-sm group">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  workspace.color === 'legal-blue' ? 'bg-legal-blue' : 
                  workspace.color === 'legal-gold' ? 'bg-legal-gold' : 
                  'bg-legal-navy'
                }`}></div>
                <Badge variant="outline" className="text-xs font-normal">{workspace.documents} documents</Badge>
              </div>
              <CardTitle className="text-xl group-hover:text-primary transition-colors cursor-pointer">{workspace.name}</CardTitle>
              <CardDescription>Last active {workspace.lastActive}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[...Array(workspace.members)].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
                       {i === 0 ? 'JD' : i === 1 ? 'AK' : 'JS'}
                    </div>
                  ))}
                  {workspace.members > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
                      +{workspace.members - 3}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary">
                  Enter
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Create Workspace CTA */}
        <div className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-8 hover:bg-muted/10 transition-colors cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg">New Workspace</h3>
          <p className="text-xs text-muted-foreground mt-1">Start a new project or category</p>
        </div>
      </div>
    </div>
  )
}
