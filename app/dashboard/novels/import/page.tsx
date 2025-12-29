import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ImportNovelsPage() {
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
          <CardTitle>Bulk Import</CardTitle>
          <CardDescription>Coming Soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page will allow you to upload CSV or JSON files to bulk import
            multiple novels at once with validation and duplicate detection.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
