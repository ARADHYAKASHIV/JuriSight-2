import React from 'react'
import { Button } from '@/components/ui/button'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-fade-in">
      <div className="w-24 h-24 bg-red-500/10 rounded-3xl flex items-center justify-center mb-8">
        <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 14c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      <div className="max-w-md space-y-4 mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Page Not Found</h1>
        <p className="text-muted-foreground text-lg">
          The legal document or resource you are looking for has been moved or doesn't exist.
        </p>
        
        <div className="space-y-3">
          <Button variant="legal" className="w-full" asChild>
            <a href="/dashboard">Return to Dashboard</a>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <a href="/documents">Browse Documents</a>
          </Button>
        </div>
        
        <div className="text-center">
           <p className="text-xs text-muted-foreground">Reference Error ID: JS-404-0xBASE</p>
        </div>
      </div>
    </div>
  )
}
