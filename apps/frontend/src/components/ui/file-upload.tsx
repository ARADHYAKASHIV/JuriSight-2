import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent } from './card'
import { Badge } from './badge'
import { LoadingSpinner } from './loading'

interface FileItem {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress?: number
  error?: string
}

interface FileUploadProps {
  onFilesChange?: (files: FileItem[]) => void
  onUpload?: (files: FileItem[]) => Promise<void>
  accept?: Record<string, string[]>
  maxSize?: number
  maxFiles?: number
  multiple?: boolean
  disabled?: boolean
  className?: string
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesChange,
  onUpload,
  accept = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt']
  },
  maxSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 10,
  multiple = true,
  disabled = false,
  className = ''
}) => {
  const [files, setFiles] = useState<FileItem[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    const newFiles: FileItem[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending'
    }))
    
    const updatedFiles = [...files, ...newFiles].slice(0, maxFiles)
    setFiles(updatedFiles)
    onFilesChange?.(updatedFiles)

    // Handle rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      console.warn(`File ${file.name} rejected:`, errors)
    })
  }, [files, maxFiles, onFilesChange])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
    disabled: disabled || isUploading
  })

  const removeFile = (id: string) => {
    const updatedFiles = files.filter(f => f.id !== id)
    setFiles(updatedFiles)
    onFilesChange?.(updatedFiles)
  }

  const handleUpload = async () => {
    if (!onUpload || files.length === 0) return
    
    setIsUploading(true)
    try {
      // Update status to uploading
      const uploadingFiles = files.map(f => ({ ...f, status: 'uploading' as const }))
      setFiles(uploadingFiles)
      
      await onUpload(uploadingFiles)
      
      // Update status to success
      const successFiles = files.map(f => ({ ...f, status: 'success' as const }))
      setFiles(successFiles)
    } catch (error) {
      // Update status to error
      const errorFiles = files.map(f => ({ 
        ...f, 
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Upload failed'
      }))
      setFiles(errorFiles)
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: FileItem['status']) => {
    switch (status) {
      case 'uploading':
        return <LoadingSpinner size="sm" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <File className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: FileItem['status']) => {
    switch (status) {
      case 'uploading':
        return <Badge variant="secondary">Uploading</Badge>
      case 'success':
        return <Badge variant="success">Complete</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Dropzone */}
      <Card className={`border-2 border-dashed transition-colors ${
        isDragActive 
          ? 'border-legal-blue bg-legal-blue/5' 
          : isDragReject 
          ? 'border-red-300 bg-red-50' 
          : 'border-muted-foreground/25 hover:border-legal-blue/50'
      }`}>
        <CardContent className="p-8">
          <div 
            {...getRootProps()} 
            className="text-center cursor-pointer space-y-4"
          >
            <input {...getInputProps()} />
            
            <div className="flex justify-center">
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                isDragActive ? 'bg-legal-blue text-white' : 'bg-legal-blue/10 text-legal-blue'
              }`}>
                <Upload className="w-8 h-8" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {isDragActive ? 'Drop files here' : 'Upload Documents'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop files here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                Supports PDF, DOC, DOCX, TXT • Max {formatFileSize(maxSize)} per file
              </p>
            </div>
            
            {!isDragActive && (
              <Button variant="legal" disabled={disabled || isUploading}>
                Choose Files
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Selected Files ({files.length})</h4>
              {onUpload && files.some(f => f.status === 'pending') && (
                <Button 
                  onClick={handleUpload}
                  disabled={isUploading}
                  variant="legal"
                  size="sm"
                >
                  {isUploading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Uploading...
                    </>
                  ) : (
                    'Upload All'
                  )}
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              {files.map((fileItem) => (
                <div key={fileItem.id} className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/20">
                  <div className="flex-shrink-0">
                    {getStatusIcon(fileItem.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium truncate">
                        {fileItem.file.name}
                      </p>
                      {getStatusBadge(fileItem.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(fileItem.file.size)}
                    </p>
                    {fileItem.error && (
                      <p className="text-xs text-red-500">{fileItem.error}</p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileItem.id)}
                    disabled={fileItem.status === 'uploading'}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export { FileUpload, type FileItem }