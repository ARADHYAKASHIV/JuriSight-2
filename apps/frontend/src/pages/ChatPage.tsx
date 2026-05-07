import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, BarChart3, Loader2 } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { useLocation, useNavigate } from 'react-router-dom'

export const ChatPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(location.search)
  const documentId = searchParams.get('documentId') || undefined

  const {
    sessions,
    messages,
    isLoading,
    isSendingMessage,
    createSession,

    sendMessageToSession,
    switchSession,
    currentSession
  } = useChat({ documentId })

  const [inputValue, setInputValue] = useState('')

  const handleSend = async () => {
    if (!inputValue.trim() || isSendingMessage) return

    let activeSessionId = currentSession?.id

    // If no active session but we have a documentId, create one first
    if (!activeSessionId && documentId) {
      try {
        const newSession = await createSession('New Conversation', documentId)
        activeSessionId = newSession.id
      } catch (error) {
        console.error("Failed to create session", error)
        return
      }
    } else if (!activeSessionId) {
      // No documentId and no active session - we can't send a message
      console.warn("Please select a document to start chatting.")
      return
    }

    const msg = inputValue
    setInputValue('')
    try {
      // Use sendMessageToSession with explicit ID to avoid stale closure
      await sendMessageToSession(msg, activeSessionId)
    } catch (error) {
      console.error("Failed to send message", error)
      setInputValue(msg) // restore input on failure
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = async () => {
    if (!documentId) {
      // Redirect to documents page to select a document if none is selected
      navigate('/documents')
      return
    }
    try {
      await createSession('New Conversation', documentId)
    } catch (error) {
      console.error("Failed to create new chat session", error)
    }
  }

  const loadRecentChat = (sessionId: string) => {
    switchSession(sessionId)
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">AI Chat Assistant</h1>
          <p className="text-muted-foreground text-lg">
            {documentId ? "Ask questions about your selected legal document" : "Select a document to start analyzing"}
          </p>
        </div>
        <Button variant="default" className="shadow-md" onClick={handleNewChat}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {documentId ? "New Chat" : "Select Document"}
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
              {isLoading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground w-6 h-6" /></div>
              ) : sessions && sessions.length > 0 ? (
                sessions.map((session) => (
                  <Button 
                    key={session.id} 
                    variant={currentSession?.id === session.id ? 'secondary' : 'ghost'} 
                    className="w-full justify-start text-left h-auto p-3 hover:bg-muted/50 rounded-lg group" 
                    onClick={() => loadRecentChat(session.id)}
                  >
                    <div className="space-y-1 overflow-hidden w-full">
                      <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {session.title || 'Untitled Session'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(session.updatedAt || session.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center p-4">
                  No recent chats found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Chat Area */}
        <div className="col-span-1 md:col-span-3 flex flex-col h-full">
          <Card className="flex-1 flex flex-col shadow-md border-border bg-card overflow-hidden">
            {/* Messages */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar flex flex-col">
              {messages && messages.length > 0 ? messages.map((message) => (
                <div key={message.id} className={`flex w-full ${message.type === 'USER' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[85%] ${message.type === 'USER' ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    <Avatar className={`h-8 w-8 shrink-0 mt-1 ${message.type === 'ASSISTANT' || message.type === 'SYSTEM' ? 'bg-primary border border-primary/20' : ''}`}>
                      {message.type === 'ASSISTANT' || message.type === 'SYSTEM' ? (
                        <div className="h-full w-full flex items-center justify-center text-primary-foreground bg-primary">
                          <BarChart3 className="h-4 w-4" />
                        </div>
                      ) : (
                        <AvatarFallback className="bg-muted text-muted-foreground">US</AvatarFallback>
                      )}
                    </Avatar>

                    <div className={`flex flex-col gap-1 ${message.type === 'USER' ? 'items-end' : 'items-start'}`}>
                      <div className={`rounded-2xl px-5 py-3 shadow-sm ${
                        message.type === 'USER' 
                          ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                          : 'bg-muted/50 text-foreground border border-border rounded-tl-sm'
                      }`}>
                        <div className="whitespace-pre-wrap text-[15px] leading-relaxed break-words">
                          {message.content}
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium px-1">
                        {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>

                  </div>
                </div>
              )) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50 mb-4" />
                  ) : documentId ? (
                    <>
                      <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
                      <p>Start a conversation about your document.</p>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
                      <p>Please select a document from the Documents page to start chatting.</p>
                    </>
                  )}
                </div>
              )}
              {isSendingMessage && (
                 <div className="flex w-full justify-start">
                   <div className="flex gap-3 max-w-[85%] flex-row">
                     <Avatar className="h-8 w-8 shrink-0 mt-1 bg-primary border border-primary/20">
                       <div className="h-full w-full flex items-center justify-center text-primary-foreground bg-primary">
                         <BarChart3 className="h-4 w-4" />
                       </div>
                     </Avatar>
                     <div className="flex flex-col gap-1 items-start">
                       <div className="rounded-2xl px-5 py-3 shadow-sm bg-muted/50 text-foreground border border-border rounded-tl-sm flex items-center gap-2">
                         <Loader2 className="w-4 h-4 animate-spin text-primary" />
                         <span className="text-[15px] text-muted-foreground">Analyzing document...</span>
                       </div>
                     </div>
                   </div>
                 </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-muted/20 border-t border-border/50">
              <div className="flex space-x-3 items-end bg-background p-2 rounded-xl border border-border shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-primary rounded-full" disabled={!documentId}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </Button>
                <textarea 
                  placeholder={documentId ? "Ask a question about your documents..." : "Select a document first..."}
                  className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:outline-none focus:ring-0 resize-none py-3 text-[15px] disabled:opacity-50"
                  rows={1}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!documentId || isSendingMessage}
                />
                <Button size="icon" className="shrink-0 rounded-full h-10 w-10 mb-0.5" onClick={handleSend} disabled={!documentId || isSendingMessage || !inputValue.trim()}>
                  {isSendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground px-2">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-2 w-2">
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${documentId ? 'animate-ping bg-green-400' : 'bg-muted'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${documentId ? 'bg-green-500' : 'bg-muted'}`}></span>
                  </span>
                  <span className="font-medium">{documentId ? "JuriSight AI is ready" : "Awaiting document selection"}</span>
                </div>
                <div>{documentId ? "Press Enter to send" : ""}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
