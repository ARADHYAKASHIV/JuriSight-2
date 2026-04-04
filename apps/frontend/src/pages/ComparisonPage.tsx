import React from 'react'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const ComparisonPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Document Comparison</h1>
          <p className="text-muted-foreground">Compare two documents to identify differences and similarities</p>
        </div>
        <Button variant="legal">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Comparison
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Documents to Compare</CardTitle>
            <CardDescription>Choose two documents for side-by-side comparison</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">First Document</label>
              <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-legal-blue transition-colors">
                <div className="w-10 h-10 bg-legal-blue/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-legal-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium">Employment Agreement 2024.pdf</p>
                <p className="text-xs text-muted-foreground">Selected</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium">Second Document</label>
              <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-legal-blue transition-colors">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">Click to select second document</p>
              </div>
            </div>

            <Button variant="legal" className="w-full" disabled>
              Start Comparison
            </Button>
          </CardContent>
        </Card>

        {/* Comparison Results */}
        <Card>
          <CardHeader>
            <CardTitle>Comparison Results</CardTitle>
            <CardDescription>Key differences and similarities will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">No Comparison Yet</h3>
                <p className="text-muted-foreground">Select two documents to start comparing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Comparisons */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Comparisons</CardTitle>
          <CardDescription>Your previous document comparisons</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                id: 1,
                doc1: 'Employment Agreement v1.pdf',
                doc2: 'Employment Agreement v2.pdf', 
                changes: 12,
                date: '2024-01-15',
                status: 'completed'
              },
              {
                id: 2,
                doc1: 'Lease Contract.pdf',
                doc2: 'Updated Lease.pdf',
                changes: 8,
                date: '2024-01-14', 
                status: 'completed'
              }
            ].map((comparison) => (
              <div key={comparison.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <div className="font-medium">
                    {comparison.doc1} vs {comparison.doc2}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {comparison.changes} changes found • {comparison.date}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="success">{comparison.status}</Badge>
                  <Button variant="ghost" size="sm">
                    View Results
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
