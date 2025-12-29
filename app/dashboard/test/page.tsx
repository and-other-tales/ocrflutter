"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { TestTube, Play } from "lucide-react"

export default function TestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [formData, setFormData] = useState({
    line1_1: "",
    line1_2: "",
    line1_3: "",
    line2_1: "",
    line2_2: "",
    line2_3: "",
    line3_1: "",
    line3_2: "",
    line3_3: "",
  })

  const handleTest = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/test-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line1: [formData.line1_1, formData.line1_2, formData.line1_3],
          line2: [formData.line2_1, formData.line2_2, formData.line2_3],
          line3: [formData.line3_1, formData.line3_2, formData.line3_3],
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.data)
        if (data.data.match) {
          toast.success("Match found!")
        } else {
          toast.error("No match found")
        }
      } else {
        toast.error(data.error || "Test failed")
      }
    } catch (error) {
      toast.error("Failed to test lookup")
    } finally {
      setLoading(false)
    }
  }

  const loadSample = () => {
    setFormData({
      line1_1: "the",
      line1_2: "storm",
      line1_3: "was",
      line2_1: "unlike",
      line2_2: "any",
      line2_3: "other",
      line3_1: "felix",
      line3_2: "had",
      line3_3: "seen",
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <TestTube className="mr-3 h-8 w-8" />
          Lookup Testing
        </h1>
        <p className="text-muted-foreground">
          Test the OCR lookup API with custom input
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Test Input</CardTitle>
            <CardDescription>
              Enter the first 3 words from each of the first 3 lines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Line 1 (First 3 Words)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="the"
                  value={formData.line1_1}
                  onChange={(e) => setFormData({ ...formData, line1_1: e.target.value })}
                />
                <Input
                  placeholder="storm"
                  value={formData.line1_2}
                  onChange={(e) => setFormData({ ...formData, line1_2: e.target.value })}
                />
                <Input
                  placeholder="was"
                  value={formData.line1_3}
                  onChange={(e) => setFormData({ ...formData, line1_3: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Line 2 (First 3 Words)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="unlike"
                  value={formData.line2_1}
                  onChange={(e) => setFormData({ ...formData, line2_1: e.target.value })}
                />
                <Input
                  placeholder="any"
                  value={formData.line2_2}
                  onChange={(e) => setFormData({ ...formData, line2_2: e.target.value })}
                />
                <Input
                  placeholder="other"
                  value={formData.line2_3}
                  onChange={(e) => setFormData({ ...formData, line2_3: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Line 3 (First 3 Words)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="felix"
                  value={formData.line3_1}
                  onChange={(e) => setFormData({ ...formData, line3_1: e.target.value })}
                />
                <Input
                  placeholder="had"
                  value={formData.line3_2}
                  onChange={(e) => setFormData({ ...formData, line3_2: e.target.value })}
                />
                <Input
                  placeholder="seen"
                  value={formData.line3_3}
                  onChange={(e) => setFormData({ ...formData, line3_3: e.target.value })}
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleTest} disabled={loading} className="flex-1">
                <Play className="mr-2 h-4 w-4" />
                {loading ? "Testing..." : "Test Lookup"}
              </Button>
              <Button variant="outline" onClick={loadSample}>
                Load Sample
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              API response and debug information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="text-center py-12 text-muted-foreground">
                Run a test to see results
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Match Status:</span>
                  <Badge variant={result.match ? "success" : "destructive"}>
                    {result.match ? "MATCH FOUND" : "NO MATCH"}
                  </Badge>
                </div>

                {result.match && result.novel && (
                  <div className="space-y-2 p-4 bg-muted rounded-lg">
                    <div>
                      <div className="text-sm text-muted-foreground">Title</div>
                      <div className="font-medium">{result.novel.title}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">URL</div>
                      <div className="font-mono text-sm break-all">{result.novel.url}</div>
                    </div>
                  </div>
                )}

                {result.debugInfo && (
                  <div className="space-y-2 p-4 bg-muted rounded-lg">
                    <div className="font-medium">Debug Info</div>
                    <div className="text-sm space-y-1">
                      <div>Line 1 matches: {result.debugInfo.line1Matches}</div>
                      <div>Line 2 matches: {result.debugInfo.line2Matches}</div>
                      <div>Line 3 matches: {result.debugInfo.line3Matches}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Response Time:</span>
                  <span className="font-mono">{result.responseTimeMs}ms</span>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Full Response:</div>
                  <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
