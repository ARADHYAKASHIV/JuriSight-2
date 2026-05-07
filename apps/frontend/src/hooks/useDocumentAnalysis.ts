import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { documentApi } from '@/services/api'
import type { Document, DocumentAnalysisResult } from '@/shared'
import { useErrorHandler } from './useErrorHandler'

export interface UseDocumentAnalysisOptions {
  documentId: string
}

export interface AnalysisState {
  document: Document | null
  analysis: DocumentAnalysisResult | null
  isLoading: boolean
  isAnalyzing: boolean
  error: string | null
}



export const useDocumentAnalysis = (options: UseDocumentAnalysisOptions) => {
  const { documentId } = options
  const queryClient = useQueryClient()
  const { handleApiError } = useErrorHandler()
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null)

  // Fetch document details
  const {
    data: documentResponse,
    isLoading: isLoadingDocument,
    error: documentError,
  } = useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const response = await documentApi.getDocument(documentId)
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch document')
      }
      return response
    },
    enabled: !!documentId,
    retry: 2,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })

  // Analyze document
  const analyzeDocumentMutation = useMutation({
    mutationFn: async () => {
      const response = await documentApi.analyzeDocument(documentId)
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to analyze document')
      }
      return response.data
    },
    onSuccess: (analysis) => {
      setAnalysisResult(analysis)
      // Update the document in cache with analysis results
      queryClient.setQueryData(['document', documentId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          data: {
            ...old.data,
            metadata: {
              ...old.data.metadata,
              lastAnalysis: analysis,
              lastAnalyzed: new Date().toISOString()
            }
          }
        }
      })
    },
    onError: (error) => {
      handleApiError(error)
    },
  })

  // Download document
  const downloadDocumentMutation = useMutation({
    mutationFn: async () => {
      const blob = await documentApi.downloadDocument(documentId)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = documentResponse?.data?.originalName || 'document.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    onError: (error) => {
      handleApiError(error)
    },
  })

  // Utility functions
  const analyzeDocument = useCallback(async () => {
    return analyzeDocumentMutation.mutateAsync()
  }, [analyzeDocumentMutation])

  const downloadDocument = useCallback(async () => {
    return downloadDocumentMutation.mutateAsync()
  }, [downloadDocumentMutation])

  const refreshDocument = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['document', documentId]
    })
  }, [queryClient, documentId])

  // Handle errors
  if (documentError) {
    handleApiError(documentError)
  }

  const state: AnalysisState = {
    document: documentResponse?.data || null,
    analysis: analysisResult || documentResponse?.data?.metadata?.lastAnalysis || null,
    isLoading: isLoadingDocument,
    isAnalyzing: analyzeDocumentMutation.isPending,
    error: null, // Errors are handled by useErrorHandler
  }

  return {
    ...state,
    analyzeDocument,
    downloadDocument,
    refreshDocument,
    isDownloading: downloadDocumentMutation.isPending,
  }
}

export default useDocumentAnalysis