import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading'
import { FileUploadDropzone, UploadedFile } from '@/components/ui/file-upload-dropzone'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Eye, MessageSquare, BarChart3, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { documentApi, workspaceApi } from '@/services/api'
import { useErrorHandler } from '@/hooks/useErrorHandler'

interface DocItem {
  id: string
  title: string
  originalName: string
  mimeType: string
  category?: string
  tags?: string[]
  content?: string
  metadata?: any
  confidenceScore?: number
  processingTime?: number
  createdAt: string
  updatedAt: string
  workspace?: { id: string; name: string }
}

export const DocumentsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [documents, setDocuments] = useState<DocItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [workspaces, setWorkspaces] = useState<Array<{id: string; name: string}>>([])
  const navigate = useNavigate()
  const { handleApiError } = useErrorHandler()

  // Fetch documents from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [docRes, wsRes] = await Promise.all([
          documentApi.getDocuments(),
          workspaceApi.getWorkspaces()
        ])
        if (docRes.success && docRes.data) setDocuments(docRes.data as unknown as DocItem[])
        if (wsRes.success && wsRes.data) setWorkspaces(wsRes.data as unknown as Array<{id: string; name: string}>)
      } catch (e) { handleApiError(e) }
      finally { setIsLoading(false) }
    }
    fetchData()
  }, [])

  const handleFilesChange = async (newFiles: File[]) => {
    const formatted: UploadedFile[] = newFiles.map(file => ({
      id: `${file.name}-${Date.now()}`,
      file,
      progress: 0,
      status: "uploading"
    }))
    setUploadedFiles(prev => [...prev, ...formatted])

    // Pick the first workspace as default target (or prompt user)
    const targetWorkspaceId = workspaces[0]?.id
    if (!targetWorkspaceId) {
      setUploadedFiles(prev => prev.map(f => ({...f, progress: 0, status: 'error' as const})))
      return
    }

    for (const f of formatted) {
      try {
        setUploadedFiles(prev => prev.map(x => x.id === f.id ? {...x, progress: 50} : x))
        const res = await documentApi.uploadDocument(targetWorkspaceId, f.file)
        if (res.success && res.data) {
          setDocuments(prev => [res.data as unknown as DocItem, ...prev])
          setUploadedFiles(prev => prev.map(x => x.id === f.id ? {...x, progress: 100, status: 'completed' as const} : x))
        }
      } catch (e) {
        setUploadedFiles(prev => prev.map(x => x.id === f.id ? {...x, progress: 0, status: 'error' as const} : x))
        handleApiError(e)
      }
    }
    setTimeout(() => setUploadDialogOpen(false), 1000)
  }

  const handleFileRemove = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id))
  }

  const getStatus = (doc: DocItem) => {
    if (doc.metadata?.analysis) return 'processed'
    if (doc.content) return 'processed'
    return 'processing'
  }

  const getRiskLevel = (doc: DocItem) => {
    const score = doc.confidenceScore
    if (!score) return 'low'
    if (score >= 0.9) return 'low'
    if (score >= 0.7) return 'medium'
    return 'high'
  }

  const getConfidence = (doc: DocItem) => {
    return doc.confidenceScore ? Math.round(doc.confidenceScore * 100) : 0
  }

  const getFileSize = (doc: DocItem) => {
    const bytes = doc.metadata?.size || doc.metadata?.fileSize
    if (!bytes) return '--'
    if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  const getPages = (doc: DocItem) => doc.metadata?.pages || doc.metadata?.analysis?.pages || '--'

  const filteredDocuments = documents.filter(doc => {
    const status = getStatus(doc)
    const risk = getRiskLevel(doc)
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.category || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = selectedFilter === 'all' || status === selectedFilter || risk === selectedFilter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Documents</h1>
          <p className="text-muted-foreground text-lg">Manage and analyze your legal documents with AI</p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger render={<Button variant="default" className="shadow-md" />}>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Upload Document
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-card border-border shadow-lg">
            <FileUploadDropzone files={uploadedFiles} onFilesChange={handleFilesChange} onFileRemove={handleFileRemove} className="mt-4 border-none shadow-none" />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-sm border-border bg-card/40 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search documents by name or type..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10 w-full md:w-[350px] lg:w-[450px]" />
            </div>
            <div className="flex gap-2">
              {['all','processed','processing','high'].map(f => (
                <Button key={f} variant={selectedFilter === f ? (f === 'high' ? 'destructive' : 'default') : 'outline'} size="sm" onClick={() => setSelectedFilter(f)}>
                  {f === 'all' ? 'All' : f === 'high' ? 'High Risk' : f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Data Table */}
      <Card className="shadow-md border-border overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50 border-b border-border/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Date Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const status = getStatus(doc)
                  const risk = getRiskLevel(doc)
                  const conf = getConfidence(doc)
                  return (
                    <TableRow key={doc.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors cursor-pointer">{doc.title}</span>
                          <span className="text-xs text-muted-foreground">{doc.category || doc.mimeType} • {getPages(doc)} pages • {getFileSize(doc)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {status === 'processing' && <LoadingSpinner size="sm" />}
                          <Badge variant={status === 'processed' ? 'outline' : 'secondary'} className={status === 'processed' ? 'text-green-600 border-green-500/30 bg-green-500/10' : ''}>{status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={risk === 'low' ? 'text-green-600 border-green-500/30' : risk === 'medium' ? 'text-yellow-600 border-yellow-500/30' : 'text-red-600 border-red-500/30'}>{risk}</Badge>
                      </TableCell>
                      <TableCell><span className="font-medium">{conf > 0 ? `${conf}%` : '--'}</span></TableCell>
                      <TableCell className="text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => navigate(`/documents/${doc.id}`)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => navigate(`/chat?documentId=${doc.id}`)}><MessageSquare className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => navigate(`/analytics?documentId=${doc.id}`)}><BarChart3 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredDocuments.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">{isLoading ? 'Loading...' : 'No documents found. Upload your first document above.'}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
      
      {/* Upload CTA */}
      <div onClick={() => setUploadDialogOpen(true)} className="mt-8 border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/10 transition-colors rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
        </div>
        <h3 className="text-lg font-semibold">Ready to analyze more?</h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-sm">Upload another legal document to instantly extract clauses, assess risks, and track compliance.</p>
        <Button className="mt-4" variant="outline">Browse Files</Button>
      </div>
    </div>
  )
}

export const DocumentViewerPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Documents
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Document Viewer</CardTitle>
                  <CardDescription>Select a document to view its contents</CardDescription>
                </div>
                <Badge variant="success">Processed</Badge>
              </div>
            </CardHeader>
            <CardContent className="h-[500px] bg-muted/30 rounded-lg flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-legal-blue/10 rounded-lg flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-legal-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Document Viewer</h3>
                  <p className="text-muted-foreground">PDF viewer will be integrated here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>AI Analysis</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between"><span className="text-sm font-medium">Risk Level</span><Badge variant="success">Low</Badge></div>
                <div className="flex items-center justify-between"><span className="text-sm font-medium">Compliance</span><Badge variant="success">Compliant</Badge></div>
                <div className="flex items-center justify-between"><span className="text-sm font-medium">Key Clauses</span><span className="text-sm">12 identified</span></div>
              </div>
              <Button variant="legal" className="w-full">View Full Analysis</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start"><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>Start Chat Session</Button>
              <Button variant="outline" className="w-full justify-start"><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>Compare Document</Button>
              <Button variant="outline" className="w-full justify-start"><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Export Analysis</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
