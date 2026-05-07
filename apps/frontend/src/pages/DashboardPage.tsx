import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileUploadDropzone, UploadedFile } from "@/components/ui/file-upload-dropzone"
import { 
  DocumentTextIcon, 
  ChatBubbleLeftRightIcon, 
  ChartBarIcon, 
  ScaleIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline"

export default function DashboardPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])

  const handleFilesChange = (newFiles: File[]) => {
    const newUploadedFiles: UploadedFile[] = newFiles.map((file) => ({
      id: `${file.name}-${Date.now()}`,
      file,
      progress: 0,
      status: "uploading",
    }))
    setFiles((prev) => [...prev, ...newUploadedFiles])
  }

  const handleFileRemove = (id: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id))
  }

  // Simulate file upload progress
  useEffect(() => {
    const uploadingFile = files.find((f) => f.status === "uploading")
    if (!uploadingFile) return

    const timeout = setTimeout(() => {
      setFiles((prevFiles) =>
        prevFiles.map((f) => {
          if (f.id === uploadingFile.id) {
            const newProgress = Math.min(f.progress + 15, 100)
            return {
              ...f,
              progress: newProgress,
              status: newProgress === 100 ? "completed" : "uploading",
            }
          }
          return f
        })
      )
    }, 300)

    return () => clearTimeout(timeout)
  }, [files])

  const stats = [
    {
      title: "Documents Processed",
      value: "247",
      change: "+12%",
      trend: "positive",
      icon: DocumentTextIcon,
    },
    {
      title: "Active Chats", 
      value: "89",
      change: "+23%",
      trend: "positive",
      icon: ChatBubbleLeftRightIcon,
    },
    {
      title: "Analyses Generated",
      value: "156",
      change: "+8%",
      trend: "positive",
      icon: ChartBarIcon,
    },
    {
      title: "Comparisons",
      value: "34",
      change: "+15%",
      trend: "positive",
      icon: ScaleIcon,
    }
  ]

  const recentActivity = [
    {
      id: 1,
      type: "document",
      title: "Contract Analysis Complete",
      description: "Employment_Agreement_2024.pdf",
      time: "2 mins ago",
      icon: DocumentTextIcon,
    },
    {
      id: 2,
      type: "chat",
      title: "New Chat Session Started",
      description: "Discussion about liability clauses",
      time: "15 mins ago",
      icon: ChatBubbleLeftRightIcon,
    },
    {
      id: 3,
      type: "comparison",
      title: "Document Comparison",
      description: "Comparing 2 lease agreements", 
      time: "1 hr ago",
      icon: ScaleIcon,
    },
    {
      id: 4,
      type: "analysis",
      title: "Risk Assessment Generated",
      description: "High-risk clauses identified in contract",
      time: "2 hrs ago",
      icon: ChartBarIcon,
    }
  ]

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header section with sophisticated typography */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-gradient">
            Welcome to JuriSight
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg">
            Review your activity overview and manage legal documents with AI-powered insights.
          </p>
        </div>
      </div>

      {/* Metrics Row with subtle Framer Motion stagger */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <Card className="hover-lift border-border bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-gradient-legal text-white shadow-md">
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-3">
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">{stat.value}</h2>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 px-2 py-0.5">
                    <ArrowTrendingUpIcon className="h-3 w-3" />
                    {stat.change}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area - File Upload spanning 2 columns */}
        <motion.div 
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <FileUploadDropzone
            files={files}
            onFilesChange={handleFilesChange}
            onFileRemove={handleFileRemove}
            maxSize={50}
          />
        </motion.div>

        {/* Sidebar widgets */}
        <motion.div 
          className="lg:col-span-1 space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-muted-foreground" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your latest actions across workspaces</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] w-full">
                <div className="divide-y divide-border/50">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-muted/50 transition-colors group cursor-pointer flex gap-4">
                      <div className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <activity.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium text-foreground leading-none">{activity.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                        <p className="text-xs text-muted-foreground/60">{activity.time}</p>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 self-center" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-border/50 bg-muted/10">
                <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground">
                  View All Activity
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}