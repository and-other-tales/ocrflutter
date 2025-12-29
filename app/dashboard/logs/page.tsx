import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Activity className="mr-3 h-8 w-8" />
          Activity Logs
        </h1>
        <p className="text-muted-foreground">
          Monitor API activity and lookup requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>Coming Soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page will display all API lookup requests with filtering, search,
            and export capabilities.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
