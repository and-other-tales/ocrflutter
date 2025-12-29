'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  ArrowLeft,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Edit,
  Save,
  X,
  Trash2,
  ExternalLink,
} from 'lucide-react'

interface Manuscript {
  id: string
  title: string
  author?: string
  language: string
  originalFilename: string
  fileSize: number
  ocrStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'LOW_CONFIDENCE'
  ocrConfidence?: number
  textOrientation?: string
  ocrErrorMessage?: string
  extractedWords?: {
    line1Words: string[]
    line2Words: string[]
    line3Words: string[]
    rawText: string
    confidence: number
    orientation: string
    metadata?: any
  }
  manuallyEdited: boolean
  editedBy?: string
  editedAt?: string
  createdAt: string
  uploadedBy: string
  convertedToNovel?: {
    id: string
    title: string
    url: string
  }
}

export default function ManuscriptDetailPage() {
  const router = useRouter()
  const params = useParams()
  const manuscriptId = params.id as string

  const [manuscript, setManuscript] = useState<Manuscript | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isReprocessing, setIsReprocessing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConvertDialog, setShowConvertDialog] = useState(false)

  const [editedWords, setEditedWords] = useState({
    line1Words: [] as string[],
    line2Words: [] as string[],
    line3Words: [] as string[],
  })

  const [convertForm, setConvertForm] = useState({
    url: '',
    chapter: '',
    pageNumber: '',
    unlockContent: '',
  })

  useEffect(() => {
    fetchManuscript()
    // Poll for status updates if processing
    const interval = setInterval(() => {
      if (manuscript?.ocrStatus === 'PENDING' || manuscript?.ocrStatus === 'PROCESSING') {
        fetchManuscript()
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [manuscriptId])

  const fetchManuscript = async () => {
    try {
      const response = await fetch(`/api/admin/manuscripts/${manuscriptId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch manuscript')
      }

      setManuscript(data.manuscript)

      if (data.manuscript.extractedWords) {
        setEditedWords({
          line1Words: data.manuscript.extractedWords.line1Words || [],
          line2Words: data.manuscript.extractedWords.line2Words || [],
          line3Words: data.manuscript.extractedWords.line3Words || [],
        })
      }
    } catch (error: any) {
      console.error('Fetch error:', error)
      toast.error(error.message || 'Failed to load manuscript')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveWords = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/manuscripts/${manuscriptId}/words`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedWords),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save words')
      }

      toast.success('Words updated successfully')
      setIsEditing(false)
      await fetchManuscript()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save words')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReprocess = async () => {
    setIsReprocessing(true)
    try {
      const response = await fetch(`/api/admin/manuscripts/${manuscriptId}/reprocess`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reprocess')
      }

      toast.success('Manuscript queued for reprocessing')
      await fetchManuscript()
    } catch (error: any) {
      toast.error(error.message || 'Failed to reprocess manuscript')
    } finally {
      setIsReprocessing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this manuscript? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/manuscripts/${manuscriptId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete')
      }

      toast.success('Manuscript deleted successfully')
      router.push('/dashboard/manuscripts')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete manuscript')
      setIsDeleting(false)
    }
  }

  const handleConvert = async () => {
    try {
      const response = await fetch(`/api/admin/manuscripts/${manuscriptId}/convert-to-novel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: convertForm.url,
          chapter: convertForm.chapter || undefined,
          pageNumber: convertForm.pageNumber ? parseInt(convertForm.pageNumber) : undefined,
          unlockContent: convertForm.unlockContent || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert')
      }

      toast.success('Manuscript converted to novel successfully')
      setShowConvertDialog(false)
      await fetchManuscript()
    } catch (error: any) {
      toast.error(error.message || 'Failed to convert to novel')
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!manuscript) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/manuscripts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Manuscripts
          </Link>
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Manuscript not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/manuscripts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Manuscripts
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReprocess}
            disabled={isReprocessing || manuscript.ocrStatus === 'PROCESSING'}
          >
            {isReprocessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Reprocess
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{manuscript.title}</h1>
        {manuscript.author && (
          <p className="text-muted-foreground mt-1">by {manuscript.author}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(manuscript.ocrStatus)}</div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Language</p>
              <p className="mt-1">{manuscript.language.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">File Size</p>
              <p className="mt-1">{formatFileSize(manuscript.fileSize)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Uploaded</p>
              <p className="mt-1">{formatDate(manuscript.createdAt)}</p>
            </div>
            {manuscript.ocrConfidence !== null && manuscript.ocrConfidence !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">OCR Confidence</p>
                <p className="mt-1">{manuscript.ocrConfidence.toFixed(1)}%</p>
              </div>
            )}
            {manuscript.textOrientation && (
              <div>
                <p className="text-sm text-muted-foreground">Text Orientation</p>
                <p className="mt-1">
                  {manuscript.textOrientation === 'VERTICAL_TATEGAKI'
                    ? 'Vertical (Tategaki)'
                    : manuscript.textOrientation.charAt(0) +
                      manuscript.textOrientation.slice(1).toLowerCase()}
                </p>
              </div>
            )}
          </div>

          {manuscript.ocrErrorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-900">Error Message:</p>
              <p className="text-sm text-red-700 mt-1">{manuscript.ocrErrorMessage}</p>
            </div>
          )}

          {manuscript.convertedToNovel && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-900 mb-2">
                Converted to Novel Entry
              </p>
              <Link
                href={`/dashboard/novels/${manuscript.convertedToNovel.id}`}
                className="text-sm text-green-700 hover:underline inline-flex items-center"
              >
                {manuscript.convertedToNovel.title}
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {manuscript.extractedWords && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Extracted Words</CardTitle>
                <CardDescription>
                  First 3 words from the first 3 content lines
                </CardDescription>
              </div>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label>Line 1 Words</Label>
                  <Input
                    value={editedWords.line1Words.join(' ')}
                    onChange={(e) =>
                      setEditedWords({
                        ...editedWords,
                        line1Words: e.target.value.split(/\s+/).filter((w) => w),
                      })
                    }
                    placeholder="word1 word2 word3"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Line 2 Words</Label>
                  <Input
                    value={editedWords.line2Words.join(' ')}
                    onChange={(e) =>
                      setEditedWords({
                        ...editedWords,
                        line2Words: e.target.value.split(/\s+/).filter((w) => w),
                      })
                    }
                    placeholder="word1 word2 word3"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Line 3 Words</Label>
                  <Input
                    value={editedWords.line3Words.join(' ')}
                    onChange={(e) =>
                      setEditedWords({
                        ...editedWords,
                        line3Words: e.target.value.split(/\s+/).filter((w) => w),
                      })
                    }
                    placeholder="word1 word2 word3"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveWords} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setEditedWords({
                        line1Words: manuscript.extractedWords?.line1Words || [],
                        line2Words: manuscript.extractedWords?.line2Words || [],
                        line3Words: manuscript.extractedWords?.line3Words || [],
                      })
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Line 1</p>
                  <p className="mt-1 font-mono">
                    {manuscript.extractedWords.line1Words.join(' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Line 2</p>
                  <p className="mt-1 font-mono">
                    {manuscript.extractedWords.line2Words.join(' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Line 3</p>
                  <p className="mt-1 font-mono">
                    {manuscript.extractedWords.line3Words.join(' ')}
                  </p>
                </div>

                {manuscript.manuallyEdited && (
                  <div className="text-xs text-muted-foreground">
                    Manually edited by {manuscript.editedBy} on{' '}
                    {manuscript.editedAt && formatDate(manuscript.editedAt)}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {manuscript.ocrStatus === 'COMPLETED' && !manuscript.convertedToNovel && (
        <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
          <DialogTrigger asChild>
            <Button className="w-full">Convert to Novel Entry</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convert to Novel Entry</DialogTitle>
              <DialogDescription>
                Create a novel entry from this manuscript for the lookup system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Target URL *</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/novel/chapter-1"
                  value={convertForm.url}
                  onChange={(e) => setConvertForm({ ...convertForm, url: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chapter">Chapter</Label>
                <Input
                  id="chapter"
                  placeholder="Chapter 1"
                  value={convertForm.chapter}
                  onChange={(e) => setConvertForm({ ...convertForm, chapter: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pageNumber">Page Number</Label>
                <Input
                  id="pageNumber"
                  type="number"
                  placeholder="1"
                  value={convertForm.pageNumber}
                  onChange={(e) =>
                    setConvertForm({ ...convertForm, pageNumber: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unlockContent">Unlock Content ID</Label>
                <Input
                  id="unlockContent"
                  placeholder="premium-content-id"
                  value={convertForm.unlockContent}
                  onChange={(e) =>
                    setConvertForm({ ...convertForm, unlockContent: e.target.value })
                  }
                />
              </div>
              <Button onClick={handleConvert} className="w-full">
                Convert to Novel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
