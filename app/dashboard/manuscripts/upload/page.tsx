'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Upload, FileText, Loader2 } from 'lucide-react'

export default function UploadManuscriptPage() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    language: 'en',
    orientationHint: '',
  })

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/pdf') {
        setSelectedFile(file)
        // Auto-fill title from filename if empty
        if (!formData.title) {
          const filename = file.name.replace('.pdf', '')
          setFormData({ ...formData, title: filename })
        }
      } else {
        toast.error('Please upload a PDF file')
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type === 'application/pdf') {
        setSelectedFile(file)
        // Auto-fill title from filename if empty
        if (!formData.title) {
          const filename = file.name.replace('.pdf', '')
          setFormData({ ...formData, title: filename })
        }
      } else {
        toast.error('Please upload a PDF file')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      toast.error('Please select a PDF file')
      return
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a title')
      return
    }

    setIsUploading(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('pdf', selectedFile)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('author', formData.author)
      uploadFormData.append('language', formData.language)
      if (formData.orientationHint) {
        uploadFormData.append('orientationHint', formData.orientationHint)
      }

      const response = await fetch('/api/admin/manuscripts/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      toast.success('PDF uploaded successfully! OCR processing started.')
      router.push(`/dashboard/manuscripts/${data.manuscript.id}`)
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload PDF')
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Novel PDF</h1>
        <p className="text-muted-foreground mt-2">
          Upload a production-ready PDF file of a novel for OCR processing
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>PDF File</CardTitle>
            <CardDescription>
              Upload a production PDF file (max 50MB). Supports both horizontal and Japanese tategaki text.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="pdf-upload"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-4">
                  <FileText className="mx-auto h-12 w-12 text-primary" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">
                      Drag and drop your PDF here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                  >
                    Select PDF File
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Novel Information</CardTitle>
            <CardDescription>
              Provide details about the novel PDF
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter novel title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                placeholder="Enter author name (optional)"
                value={formData.author}
                onChange={(e) =>
                  setFormData({ ...formData, author: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={formData.language}
                onValueChange={(value) =>
                  setFormData({ ...formData, language: value })
                }
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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

            <div className="space-y-2">
              <Label htmlFor="orientation">Text Orientation (Optional)</Label>
              <Select
                value={formData.orientationHint}
                onValueChange={(value) =>
                  setFormData({ ...formData, orientationHint: value })
                }
              >
                <SelectTrigger id="orientation">
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto-detect</SelectItem>
                  <SelectItem value="HORIZONTAL">Horizontal</SelectItem>
                  <SelectItem value="VERTICAL_TATEGAKI">Vertical (Tategaki)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                OCR will automatically detect orientation, but you can provide a hint
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isUploading || !selectedFile}
            className="w-full sm:w-auto"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload and Process
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/manuscripts')}
            disabled={isUploading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
