"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

export default function EditNovelPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    isbn: "",
    line1: "",
    line2: "",
    line3: "",
    line1Raw: "",
    line2Raw: "",
    line3Raw: "",
    url: "",
    language: "en",
    chapter: "",
    pageNumber: "",
    unlockContent: "",
  })

  useEffect(() => {
    fetchNovel()
  }, [params.id])

  const fetchNovel = async () => {
    try {
      const response = await fetch(`/api/admin/novels/${params.id}`)
      const data = await response.json()

      if (data.success) {
        const novel = data.data.novel
        setFormData({
          title: novel.title,
          isbn: novel.isbn || "",
          line1: novel.line1,
          line2: novel.line2,
          line3: novel.line3,
          line1Raw: novel.line1Raw || "",
          line2Raw: novel.line2Raw || "",
          line3Raw: novel.line3Raw || "",
          url: novel.url,
          language: novel.language,
          chapter: novel.chapter || "",
          pageNumber: novel.pageNumber?.toString() || "",
          unlockContent: novel.unlockContent || "",
        })
      } else {
        toast.error("Failed to load novel")
        router.push("/dashboard/novels")
      }
    } catch (error) {
      toast.error("Failed to load novel")
      router.push("/dashboard/novels")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        ...formData,
        isbn: formData.isbn || undefined,
        chapter: formData.chapter || undefined,
        pageNumber: formData.pageNumber ? parseInt(formData.pageNumber) : undefined,
        unlockContent: formData.unlockContent || undefined,
        line1Raw: formData.line1Raw || undefined,
        line2Raw: formData.line2Raw || undefined,
        line3Raw: formData.line3Raw || undefined,
      }

      const response = await fetch(`/api/admin/novels/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Novel updated successfully")
        router.push("/dashboard/novels")
      } else {
        toast.error(data.error || "Failed to update novel")
      }
    } catch (error) {
      toast.error("Failed to update novel")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/novels">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Novel</h1>
          <p className="text-muted-foreground">Update novel information and fingerprint</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="isbn">ISBN</Label>
                    <Input
                      id="isbn"
                      value={formData.isbn}
                      onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language *</Label>
                    <Input
                      id="language"
                      required
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>OCR Fingerprint</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="line1">Line 1 (First 3 Words) *</Label>
                  <Input
                    id="line1"
                    required
                    value={formData.line1}
                    onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                  />
                  <Input
                    placeholder="Full line 1 (optional)"
                    value={formData.line1Raw}
                    onChange={(e) => setFormData({ ...formData, line1Raw: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line2">Line 2 (First 3 Words) *</Label>
                  <Input
                    id="line2"
                    required
                    value={formData.line2}
                    onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                  />
                  <Input
                    placeholder="Full line 2 (optional)"
                    value={formData.line2Raw}
                    onChange={(e) => setFormData({ ...formData, line2Raw: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line3">Line 3 (First 3 Words) *</Label>
                  <Input
                    id="line3"
                    required
                    value={formData.line3}
                    onChange={(e) => setFormData({ ...formData, line3: e.target.value })}
                  />
                  <Input
                    placeholder="Full line 3 (optional)"
                    value={formData.line3Raw}
                    onChange={(e) => setFormData({ ...formData, line3Raw: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Target & Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Target URL *</Label>
                  <Input
                    id="url"
                    type="url"
                    required
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chapter">Chapter</Label>
                  <Input
                    id="chapter"
                    value={formData.chapter}
                    onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pageNumber">Page Number</Label>
                  <Input
                    id="pageNumber"
                    type="number"
                    value={formData.pageNumber}
                    onChange={(e) => setFormData({ ...formData, pageNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unlockContent">Unlock Content ID</Label>
                  <Input
                    id="unlockContent"
                    value={formData.unlockContent}
                    onChange={(e) => setFormData({ ...formData, unlockContent: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
