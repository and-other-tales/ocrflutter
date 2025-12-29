"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

export default function NewNovelPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

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

      const response = await fetch("/api/admin/novels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Novel created successfully")
        router.push("/dashboard/novels")
      } else {
        toast.error(data.error || "Failed to create novel")
      }
    } catch (error) {
      toast.error("Failed to create novel")
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Add New Novel</h1>
          <p className="text-muted-foreground">
            Create a new novel entry with OCR fingerprint
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Enter the novel's title and identification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Fortunes Told"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="isbn">ISBN</Label>
                    <Input
                      id="isbn"
                      value={formData.isbn}
                      onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                      placeholder="979-8218374495"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language *</Label>
                    <Input
                      id="language"
                      required
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      placeholder="en"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>OCR Fingerprint</CardTitle>
                <CardDescription>
                  First 3 words from the first 3 lines (will be auto-lowercased)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="line1">Line 1 (First 3 Words) *</Label>
                  <Input
                    id="line1"
                    required
                    value={formData.line1}
                    onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                    placeholder="the storm was"
                  />
                  <Input
                    placeholder="Full line 1 (optional, for reference)"
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
                    placeholder="unlike any other"
                  />
                  <Input
                    placeholder="Full line 2 (optional, for reference)"
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
                    placeholder="felix had seen"
                  />
                  <Input
                    placeholder="Full line 3 (optional, for reference)"
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
                    placeholder="https://app.example.com/novel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chapter">Chapter</Label>
                  <Input
                    id="chapter"
                    value={formData.chapter}
                    onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                    placeholder="Chapter 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pageNumber">Page Number</Label>
                  <Input
                    id="pageNumber"
                    type="number"
                    value={formData.pageNumber}
                    onChange={(e) => setFormData({ ...formData, pageNumber: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unlockContent">Unlock Content ID</Label>
                  <Input
                    id="unlockContent"
                    value={formData.unlockContent}
                    onChange={(e) => setFormData({ ...formData, unlockContent: e.target.value })}
                    placeholder="tarot_reading_1"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex space-x-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Creating..." : "Create Novel"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
