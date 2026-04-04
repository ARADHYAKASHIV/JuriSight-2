import React, { useState } from 'react'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading'
import { FileUploadDropzone, UploadedFile } from '@/components/ui/file-upload-dropzone'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Eye, MessageSquare, BarChart3 } from 'lucide-react'

export const DocumentsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const mockDocuments = [
    {
      id: 1,
      name: "Employment Agreement 2024",
      type: "Contract",
      size: "2.4 MB",
      uploadDate: "2024-01-15",
      status: "processed",
      riskLevel: "low",
      pages: 12,
      confidence: 98
    },
    {
      id: 2,
      name: "Software License Terms",
      type: "License", 
      size: "1.8 MB",
      uploadDate: "2024-01-14",
      status: "processing",
      riskLevel: "medium",
      pages: 8,
      confidence: 85
    },
    {
      id: 3,
      name: "Property Lease Agreement",
      type: "Lease",
      size: "3.1 MB",
      uploadDate: "2024-01-13",
      status: "processed",
      riskLevel: "high",
      pages: 15,
      confidence: 92
    },
    {
      id: 4,
      name: "NDA Template 2024",
      type: "NDA",
      size: "1.2 MB",
      uploadDate: "2024-01-12",
      status: "processed",
      riskLevel: "low",
      pages: 5,
      confidence: 96
    }
  ]

  const handleFilesChange = (newFiles: File[]) => {
    const formatted: UploadedFile[] = newFiles.map(file => ({
      id: `${file.name}-${Date.now()}`,
      file,
      progress: 0,
      status: "uploading"
    }))
    setUploadedFiles(prev => [...prev, ...formatted])
    
    // Simulate progression
    setTimeout(() => {
      setUploadedFiles(prev => prev.map(f => ({...f, progress: 100, status: 'completed'})))
      setTimeout(() => {
        setUploadDialogOpen(false)
      }, 1000)
    }, 1500)
  }

  const handleFileRemove = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id))
  }

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = selectedFilter === 'all' || 
                         doc.status === selectedFilter ||
                         doc.riskLevel === selectedFilter
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
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Document
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-card border-border shadow-lg">
            <FileUploadDropzone
              files={uploadedFiles}
              onFilesChange={handleFilesChange}
              onFileRemove={handleFileRemove}
              className="mt-4 border-none shadow-none"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-sm border-border bg-card/40 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents by name or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 w-full md:w-[350px] lg:w-[450px]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('all')}
              >
                All
              </Button>
              <Button
                variant={selectedFilter === 'processed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('processed')}
              >
                Processed
              </Button>
              <Button
                variant={selectedFilter === 'processing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('processing')}
              >
                Processing
              </Button>
              <Button
                variant={selectedFilter === 'high' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('high')}
              >
                High Risk
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Data Table */}
      <Card className="shadow-md border-border overflow-hidden">
        <div className="overflow-x-auto">
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
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors cursor-pointer">{doc.name}</span>
                      <span className="text-xs text-muted-foreground">{doc.type} • {doc.pages} pages • {doc.size}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {doc.status === 'processing' && <LoadingSpinner size="sm" />}
                      <Badge variant={doc.status === 'processed' ? 'outline' : 'secondary'} 
                             className={doc.status === 'processed' ? 'text-green-600 border-green-500/30 bg-green-500/10' : ''}>
                        {doc.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={
                        doc.riskLevel === 'low' ? 'text-green-600 border-green-500/30' : 
                        doc.riskLevel === 'medium' ? 'text-yellow-600 border-yellow-500/30' : 
                        'text-red-600 border-red-500/30'
                      }
                    >
                      {doc.riskLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{doc.confidence}%</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.uploadDate}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary"><Eye className="h-4 w-4" /></Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary"><MessageSquare className="h-4 w-4" /></Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary"><BarChart3 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDocuments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No documents found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {/* Upload Call To Action (Bottom) */}
      <div 
        onClick={() => setUploadDialogOpen(true)}
        className="mt-8 border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/10 transition-colors rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer text-center"
      >
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
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
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Documents
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Employment Agreement 2024.pdf</CardTitle>
                  <CardDescription>Contract • 2.4 MB • Uploaded Jan 15, 2024</CardDescription>
                </div>
                <Badge variant="success">Processed</Badge>
              </div>
            </CardHeader>
            <CardContent className="h-[500px] bg-muted/30 rounded-lg flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-legal-blue/10 rounded-lg flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-legal-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
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
            <CardHeader>
              <CardTitle>AI Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk Level</span>
                  <Badge variant="success">Low</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Compliance</span>
                  <Badge variant="success">Compliant</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Key Clauses</span>
                  <span className="text-sm">12 identified</span>
                </div>
              </div>
              <Button variant="legal" className="w-full">
                View Full Analysis
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Start Chat Session
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Compare Document
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Analysis
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
