'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MetricCard } from '@/components/common/MetricCard';
import { BookOpen, TrendingUp, Activity, Clock } from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewRes, timelineRes, topNovelsRes] = await Promise.all([
          fetch('/api/admin/analytics/overview'),
          fetch('/api/admin/analytics/timeline'),
          fetch('/api/admin/analytics/top-novels'),
        ]);

        const overview = await overviewRes.json();
        const timeline = await timelineRes.json();
        const topNovels = await topNovelsRes.json();

        setData({
          metrics: overview.data.metrics,
          trends: overview.data.trends,
          timeline: timeline.data.timeline,
          topNovels: topNovels.data.novels,
        });
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Detailed insights into your novel lookup performance
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Novels"
          value={data.metrics.total_novels}
          icon={BookOpen}
        />
        <MetricCard
          title="Total Lookups"
          value={data.metrics.total_lookups}
          icon={Activity}
          trend={{
            value: data.trends.lookups_change_percent,
            label: 'from last period',
          }}
        />
        <MetricCard
          title="Success Rate"
          value={`${data.metrics.success_rate.toFixed(1)}%`}
          icon={TrendingUp}
          trend={{
            value: data.trends.success_rate_change_percent,
            label: 'from last period',
          }}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${data.metrics.avg_response_time_ms}ms`}
          icon={Clock}
          trend={{
            value: data.trends.response_time_change_percent,
            label: 'from last period',
          }}
        />
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Lookup Activity Over Time</CardTitle>
          <CardDescription>Daily lookup statistics for the past week</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                }
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) =>
                  new Date(value).toLocaleDateString()
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="lookups"
                stroke="#3b82f6"
                name="Total Lookups"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="successful"
                stroke="#10b981"
                name="Successful"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="failed"
                stroke="#ef4444"
                name="Failed"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Novels Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Most Scanned Novels</CardTitle>
          <CardDescription>Top 10 novels by scan count</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.topNovels}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="title"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="scan_count" fill="#3b82f6" name="Total Scans" />
              <Bar dataKey="success_count" fill="#10b981" name="Successful Scans" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Response Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time Trends</CardTitle>
          <CardDescription>Average response time over the past week</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                }
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) =>
                  new Date(value).toLocaleDateString()
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="avg_response_time"
                stroke="#f59e0b"
                name="Avg Response Time (ms)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
