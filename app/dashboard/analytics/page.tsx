import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <BarChart3 className="mr-3 h-8 w-8" />
          Analytics
        </h1>
        <p className="text-muted-foreground">
          View detailed analytics and insights
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
          <CardDescription>Coming Soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page will display comprehensive analytics including lookup trends,
            success rates, top novels, and performance metrics with interactive charts.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
