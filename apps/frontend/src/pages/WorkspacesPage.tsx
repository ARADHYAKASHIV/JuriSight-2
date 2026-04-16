import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { workspaceApi } from '@/services/api'
import { useErrorHandler } from '@/hooks/useErrorHandler'

interface WorkspaceItem {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  _count?: { documents: number; members: number }
  members?: Array<{ user: { id: string; email: string }; role: string }>
}

export const WorkspacesPage: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const { handleApiError } = useErrorHandler()

  useEffect(() => {
    const fetch = async () => {
      try {
        setIsLoading(true)
        const res = await workspaceApi.getWorkspaces()
        if (res.success && res.data) setWorkspaces(res.data as unknown as WorkspaceItem[])
      } catch (e) { handleApiError(e) }
      finally { setIsLoading(false) }
    }
    fetch()
  }, [])

  const handleCreate = async () => {
    if (!workspaceName.trim()) return
    try {
      setIsCreating(true)
      const res = await workspaceApi.createWorkspace({ name: workspaceName })
      if (res.success && res.data) {
        setWorkspaces(prev => [res.data as unknown as WorkspaceItem, ...prev])
        setWorkspaceName('')
        setCreateDialogOpen(false)
      }
    } catch (e) { handleApiError(e) }
    finally { setIsCreating(false) }
  }

  const colors = ['legal-blue', 'legal-gold', 'legal-navy']
  const getColor = (i: number) => colors[i % colors.length]
  const initials = (email: string) => email.split('@')[0].slice(0, 2).toUpperCase()
  const relTime = (d: string) => {
    const ms = Date.now() - new Date(d).getTime()
    const m = Math.floor(ms / 60000)
    if (m < 1) return 'Just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Workspaces</h1>
          <p className="text-muted-foreground text-lg">Organize your documents into secure categorized spaces</p>
        </div>
        <Button variant="legal" onClick={() => setCreateDialogOpen(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Create Workspace
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {workspaces.map((ws, idx) => {
            const c = getColor(idx), docs = ws._count?.documents ?? 0, mem = ws._count?.members ?? 1
            return (
              <Card key={ws.id} className="hover:shadow-lg transition-shadow border-border bg-card/60 backdrop-blur-sm group">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-3 h-3 rounded-full ${c === 'legal-blue' ? 'bg-legal-blue' : c === 'legal-gold' ? 'bg-legal-gold' : 'bg-legal-navy'}`}></div>
                    <Badge variant="outline" className="text-xs font-normal">{docs} documents</Badge>
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors cursor-pointer">{ws.name}</CardTitle>
                  <CardDescription>Last active {relTime(ws.updatedAt)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {ws.members?.slice(0, 3).map((m, i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">{initials(m.user.email)}</div>
                      ))}
                      {mem > 3 && <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">+{mem - 3}</div>}
                    </div>
                    <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary">Enter</Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          <div className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-8 hover:bg-muted/10 transition-colors cursor-pointer" onClick={() => setCreateDialogOpen(true)}>
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </div>
            <h3 className="font-semibold text-lg">New Workspace</h3>
            <p className="text-xs text-muted-foreground mt-1">Start a new project or category</p>
          </div>
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>Create a new workspace to organize your related documents.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Workspace Name</label>
              <Input id="name" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="e.g. Acme Corp Merger" onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!workspaceName.trim() || isCreating}>
              {isCreating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
