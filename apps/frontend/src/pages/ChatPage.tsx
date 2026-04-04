import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, BarChart3 } from 'lucide-react'

export const ChatPage: React.FC = () => {
  const mockMessages = [
    {
      id: 1,
      type: 'assistant' as const,
      content: 'Hello! I\'m here to help you analyze your legal documents. What would you like to know?',
      timestamp: '10:30 AM'
    },
    {
      id: 2, 
      type: 'user' as const,
      content: 'Can you summarize the key terms in my employment agreement?',
      timestamp: '10:32 AM'
    },
    {
      id: 3,
      type: 'assistant' as const,
      content: 'Based on your employment agreement, here are the key terms:\n\n1. **Position**: Software Engineer\n2. **Salary**: $95,000 annually\n3. **Benefits**: Health insurance, 401k, 15 days PTO\n4. **Termination**: 2 weeks notice required\n5. **Non-compete**: 6 months in same industry\n\nWould you like me to elaborate on any of these points?',
      timestamp: '10:33 AM'
    }
  ]

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">AI Chat Assistant</h1>
          <p className="text-muted-foreground text-lg">Ask questions about your legal documents</p>
        </div>
        <Button variant="default" className="shadow-md">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 h-full min-h-[500px]">
        {/* Chat History Sidebar */}
        <div className="hidden md:block col-span-1 h-full">
          <Card className="h-full border-border bg-card/40 backdrop-blur-sm shadow-sm flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Recent Chats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {[
                'Employment Agreement Analysis',
                'Lease Contract Questions', 
                'Software License Review',
                'Property Purchase Terms'
              ].map((chat, index) => (
                <Button key={index} variant="ghost" className="w-full justify-start text-left h-auto p-3 hover:bg-muted/50 rounded-lg group">
                  <div className="space-y-1 overflow-hidden">
                    <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">{chat}</div>
                    <div className="text-xs text-muted-foreground">2 hours ago</div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Chat Area */}
        <div className="col-span-1 md:col-span-3 flex flex-col h-full">
          <Card className="flex-1 flex flex-col shadow-md border-border bg-card overflow-hidden">
            {/* Messages */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar flex flex-col">
              {mockMessages.map((message) => (
                <div key={message.id} className={`flex w-full ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    <Avatar className={`h-8 w-8 shrink-0 mt-1 ${message.type === 'assistant' ? 'bg-primary border border-primary/20' : ''}`}>
                      {message.type === 'assistant' ? (
                        <div className="h-full w-full flex items-center justify-center text-primary-foreground bg-primary">
                          <BarChart3 className="h-4 w-4" />
                        </div>
                      ) : (
                        <AvatarFallback className="bg-muted text-muted-foreground">US</AvatarFallback>
                      )}
                    </Avatar>

                    <div className={`flex flex-col gap-1 ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`rounded-2xl px-5 py-3 shadow-sm ${
                        message.type === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                          : 'bg-muted/50 text-foreground border border-border rounded-tl-sm'
                      }`}>
                        <div className="whitespace-pre-wrap text-[15px] leading-relaxed break-words">
                          {message.content}
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium px-1">
                        {message.timestamp}
                      </span>
                    </div>

                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-muted/20 border-t border-border/50">
              <div className="flex space-x-3 items-end bg-background p-2 rounded-xl border border-border shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-primary rounded-full">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </Button>
                <textarea 
                  placeholder="Ask a question about your documents..."
                  className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:outline-none focus:ring-0 resize-none py-3 text-[15px]"
                  rows={1}
                />
                <Button size="icon" className="shrink-0 rounded-full h-10 w-10 mb-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </Button>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground px-2">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="font-medium">JuriSight AI is ready</span>
                </div>
                <div>Press Enter to send</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
