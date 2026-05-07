import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'

interface DocumentUploadProps {
  workspaceId?: string
  onUploadComplete?: (document: any) => void
  onClose?: () => void
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ 
  onUploadComplete, 
  onClose 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [title, setTitle] = useState('')

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!title) {
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '')
        setTitle(nameWithoutExtension)
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      return
    }

    setIsUploading(true)
    
    try {
      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 2000))
      onUploadComplete?.({ id: 'doc-1', title, filename: selectedFile.name })
      onClose?.()
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Upload Document</CardTitle>
        <CardDescription>
          Upload a legal document for analysis
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Select File</Label>
          <Input
            id="file"
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Document Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter document title"
          />
        </div>

        <div className="flex justify-end space-x-4">
          {onClose && (
            <Button variant="outline" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || !title.trim() || isUploading}
          >
            {isUploading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Uploading...</span>
              </div>
            ) : (
              'Upload'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default DocumentUpload