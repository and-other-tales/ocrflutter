import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Key } from "lucide-react"

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Key className="mr-3 h-8 w-8" />
          API Keys
        </h1>
        <p className="text-muted-foreground">
          Manage API keys and access control
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Key Management</CardTitle>
          <CardDescription>Coming Soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page will allow you to generate, manage, and monitor API keys
            with rate limiting and usage tracking.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
