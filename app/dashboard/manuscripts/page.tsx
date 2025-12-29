'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Upload,
  Search,
  FileText,
  Loader2,
  Eye,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'

interface Manuscript {
  id: string
  title: string
  author?: string
  language: string
  originalFilename: string
  ocrStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'LOW_CONFIDENCE'
  ocrConfidence?: number
  textOrientation?: string
  manuallyEdited: boolean
  createdAt: string
  uploadedBy: string
  convertedToNovel?: {
    id: string
    title: string
    url: string
  }
}

export default function ManuscriptsPage() {
  const router = useRouter()
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    status: '',
    language: '',
    search: '',
  })

  useEffect(() => {
    fetchManuscripts()
  }, [page, filters])

  const fetchManuscripts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.status && { status: filters.status }),
        ...(filters.language && { language: filters.language }),
        ...(filters.search && { search: filters.search }),
      })

      const response = await fetch(`/api/admin/manuscripts?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch manuscripts')
      }

      setManuscripts(data.manuscripts)
      setTotalPages(data.totalPages)
    } catch (error: any) {
      console.error('Fetch error:', error)
      toast.error(error.message || 'Failed to load manuscripts')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case 'PROCESSING':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processing
          </Badge>
        )
      case 'COMPLETED':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        )
      case 'FAILED':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        )
      case 'LOW_CONFIDENCE':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <AlertCircle className="mr-1 h-3 w-3" />
            Low Confidence
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Novel PDFs</h1>
          <p className="text-muted-foreground mt-2">
            Manage uploaded novel PDFs and OCR processing
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/manuscripts/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload PDF
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Input
                placeholder="Search by title, author, or filename..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value })
                  setPage(1)
                }}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Select
                value={filters.status}
                onValueChange={(value) => {
                  setFilters({ ...filters, status: value })
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="LOW_CONFIDENCE">Low Confidence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Select
                value={filters.language}
                onValueChange={(value) => {
                  setFilters({ ...filters, language: value })
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Languages</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="sv">Swedish</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({ status: '', language: '', search: '' })
                setPage(1)
              }}
            >
              Clear Filters
            </Button>
            <Button variant="outline" size="sm" onClick={fetchManuscripts}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : manuscripts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No manuscripts found</p>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your first novel PDF to get started
            </p>
            <Button asChild>
              <Link href="/dashboard/manuscripts/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload PDF
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {manuscripts.map((manuscript) => (
              <Card key={manuscript.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/dashboard/manuscripts/${manuscript.id}`}
                              className="text-lg font-semibold hover:underline"
                            >
                              {manuscript.title}
                            </Link>
                            {manuscript.manuallyEdited && (
                              <Badge variant="secondary" className="text-xs">
                                Edited
                              </Badge>
                            )}
                            {manuscript.convertedToNovel && (
                              <Badge variant="default" className="text-xs">
                                Converted to Novel
                              </Badge>
                            )}
                          </div>
                          {manuscript.author && (
                            <p className="text-sm text-muted-foreground">
                              by {manuscript.author}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {getStatusBadge(manuscript.ocrStatus)}
                        </div>
                        {manuscript.ocrConfidence !== null && manuscript.ocrConfidence !== undefined && (
                          <div>
                            Confidence: {manuscript.ocrConfidence.toFixed(1)}%
                          </div>
                        )}
                        <div>
                          Language: {manuscript.language.toUpperCase()}
                        </div>
                        {manuscript.textOrientation && (
                          <div>
                            {manuscript.textOrientation === 'VERTICAL_TATEGAKI'
                              ? 'Vertical (Tategaki)'
                              : manuscript.textOrientation.charAt(0) +
                                manuscript.textOrientation.slice(1).toLowerCase()}
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Uploaded {formatDate(manuscript.createdAt)} by {manuscript.uploadedBy}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="ml-4"
                    >
                      <Link href={`/dashboard/manuscripts/${manuscript.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
