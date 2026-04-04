import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Analytics</h1>
          <p className="text-muted-foreground text-lg">Gain insights into your legal document portfolio</p>
        </div>
        <Button variant="legal">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Analysis
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Risk Overview</CardTitle>
            <CardDescription>Overall risk profile of all processed documents</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 rounded-full border-8 border-legal-blue flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold">78%</span>
              </div>
              <p className="text-sm font-medium">Compliance Rate</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Document Types</CardTitle>
            <CardDescription>Distribution of your legal document portfolio</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 rounded-full border-8 border-legal-gold flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold">12</span>
              </div>
              <p className="text-sm font-medium">Document Types</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Insights</CardTitle>
            <CardDescription>AI-generated insights from your latest uploads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                id: 1,
                title: 'Compliance Check',
                description: '3 documents missing local liability clauses',
                time: '2 hours ago',
                status: 'urgent'
              },
              {
                id: 2,
                title: 'Contract Renewal', 
                description: 'Lease agreement for Office Space A expires in 30 days',
                time: 'Yesterday',
                status: 'normal'
              }
            ].map((insight) => (
              <div key={insight.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{insight.title}</span>
                  <Badge variant={insight.status === 'urgent' ? 'destructive' : 'outline'}>{insight.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{insight.time}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historical Trend</CardTitle>
          <CardDescription>Document processing activity over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-semibold">Chart Visualization</h3>
            <p className="text-muted-foreground">Interactive analytics will be displayed here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
