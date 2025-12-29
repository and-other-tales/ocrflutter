"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, ArrowLeft, FileText, AlertCircle, CheckCircle, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface ImportPreview {
  valid: any[]
  invalid: any[]
  duplicates: any[]
}

interface ImportResult {
  success: number
  failed: number
  skipped: number
  errors: Array<{ row: number; error: string }>
}

export default function ImportNovelsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(true)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const ext = selectedFile.name.split(".").pop()?.toLowerCase()
    if (ext !== "csv" && ext !== "json") {
      toast.error("Please upload a CSV or JSON file")
      return
    }

    setFile(selectedFile)
    setPreview(null)
    setResult(null)
  }

  const handlePreview = async () => {
    if (!file) return

    try {
      const text = await file.text()
      const data = file.name.endsWith(".json")
        ? JSON.parse(text)
        : parseCSV(text)

      // Validate the data
      const validated = validateImportData(data)
      setPreview(validated)

      if (validated.invalid.length > 0) {
        toast.warning(`Found ${validated.invalid.length} invalid entries`)
      } else {
        toast.success(`Preview loaded: ${validated.valid.length} valid entries`)
      }
    } catch (error: any) {
      toast.error("Failed to parse file: " + error.message)
    }
  }

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split("\n")
    const headers = lines[0].split(",").map((h) => h.trim())

    return lines.slice(1).map((line, index) => {
      const values = line.split(",").map((v) => v.trim())
      const obj: any = { _row: index + 2 }

      headers.forEach((header, i) => {
        obj[header] = values[i] || ""
      })

      return obj
    })
  }

  const validateImportData = (data: any[]): ImportPreview => {
    const valid: any[] = []
    const invalid: any[] = []
    const duplicates: any[] = []

    const requiredFields = ["title", "line1", "line2", "line3", "url"]

    data.forEach((item) => {
      const errors: string[] = []

      // Check required fields
      requiredFields.forEach((field) => {
        if (!item[field] || item[field].trim() === "") {
          errors.push(`Missing ${field}`)
        }
      })

      if (errors.length > 0) {
        invalid.push({ ...item, errors })
      } else {
        // Check for duplicates within the file
        const isDuplicate = valid.some(
          (v) =>
            v.line1.toLowerCase() === item.line1.toLowerCase() &&
            v.line2.toLowerCase() === item.line2.toLowerCase() &&
            v.line3.toLowerCase() === item.line3.toLowerCase()
        )

        if (isDuplicate) {
          duplicates.push(item)
        } else {
          valid.push(item)
        }
      }
    })

    return { valid, invalid, duplicates }
  }

  const handleImport = async () => {
    if (!preview) return

    try {
      setImporting(true)

      const response = await fetch("/api/admin/novels/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novels: preview.valid,
          skipDuplicates,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.data.result)
        toast.success(
          `Import complete: ${data.data.result.success} imported, ${data.data.result.failed} failed, ${data.data.result.skipped} skipped`
        )
      } else {
        toast.error(data.error || "Import failed")
      }
    } catch (error) {
      toast.error("Failed to import novels")
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = `title,isbn,line1,line2,line3,url,language,chapter,pageNumber,unlockContent
Sample Novel,978-1234567890,first,three,words,https://example.com/novel1,en,Chapter 1,1,Sample unlock content
Another Novel,,next,three,words,https://example.com/novel2,en,,,`

    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "novels-import-template.csv"
    a.click()
    URL.revokeObjectURL(url)
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
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Upload className="mr-3 h-8 w-8" />
            Import Novels
          </h1>
          <p className="text-muted-foreground">
            Bulk import novels from CSV or JSON
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Upload a CSV or JSON file containing novel data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  cursor-pointer"
              />
            </div>
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>
          </div>

          {file && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">{file.name}</span>
                <Badge variant="outline">{(file.size / 1024).toFixed(2)} KB</Badge>
              </div>
              <Button onClick={handlePreview} size="sm">
                Preview
              </Button>
            </div>
          )}

          <div className="flex items-center space-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="skipDuplicates"
                checked={skipDuplicates}
                onCheckedChange={setSkipDuplicates}
              />
              <Label htmlFor="skipDuplicates">Skip duplicate novels</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Import Preview</CardTitle>
            <CardDescription>
              Review the data before importing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium">Valid Entries</p>
                  <p className="text-2xl font-bold">{preview.valid.length}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-medium">Invalid Entries</p>
                  <p className="text-2xl font-bold">{preview.invalid.length}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="text-sm font-medium">Duplicates</p>
                  <p className="text-2xl font-bold">{preview.duplicates.length}</p>
                </div>
              </div>
            </div>

            {preview.invalid.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Invalid Entries:</h3>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {preview.invalid.slice(0, 5).map((item, index) => (
                    <div key={index} className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                      <p className="font-medium">Row {item._row}: {item.title || "Unknown"}</p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {item.errors.join(", ")}
                      </p>
                    </div>
                  ))}
                  {preview.invalid.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      ...and {preview.invalid.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {preview.duplicates.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Duplicate Entries in File:</h3>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {preview.duplicates.slice(0, 5).map((item, index) => (
                    <div key={index} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.line1} / {item.line2} / {item.line3}
                      </p>
                    </div>
                  ))}
                  {preview.duplicates.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      ...and {preview.duplicates.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                onClick={handleImport}
                disabled={importing || preview.valid.length === 0}
                className="flex-1"
              >
                {importing ? "Importing..." : `Import ${preview.valid.length} Novels`}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null)
                  setPreview(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>
              Summary of the import operation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Successfully Imported
                </p>
                <p className="text-2xl font-bold">{result.success}</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed</p>
                <p className="text-2xl font-bold">{result.failed}</p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  Skipped
                </p>
                <p className="text-2xl font-bold">{result.skipped}</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Errors:</h3>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {result.errors.map((err, index) => (
                    <div key={index} className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Row {err.row}: {err.error}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  setFile(null)
                  setPreview(null)
                  setResult(null)
                }}
                className="flex-1"
              >
                Import Another File
              </Button>
              <Link href="/dashboard/novels">
                <Button variant="outline">View Novels</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>File Format Guide</CardTitle>
          <CardDescription>
            Required and optional fields for import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Required Fields:</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li><code>title</code> - Novel title</li>
              <li><code>line1</code> - First 3 words (OCR fingerprint line 1)</li>
              <li><code>line2</code> - Second 3 words (OCR fingerprint line 2)</li>
              <li><code>line3</code> - Third 3 words (OCR fingerprint line 3)</li>
              <li><code>url</code> - URL to unlock content</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Optional Fields:</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li><code>isbn</code> - ISBN number</li>
              <li><code>language</code> - Language code (default: en)</li>
              <li><code>chapter</code> - Chapter name</li>
              <li><code>pageNumber</code> - Page number</li>
              <li><code>unlockContent</code> - Content to unlock</li>
            </ul>
          </div>
          <div className="p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> line1, line2, and line3 will be automatically converted
              to lowercase for matching consistency.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
