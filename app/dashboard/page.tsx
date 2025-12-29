'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/common/MetricCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, TrendingUp, Activity, Clock } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface DashboardData {
  metrics: {
    total_novels: number;
    total_lookups: number;
    total_lookups_today: number;
    successful_lookups: number;
    failed_lookups: number;
    success_rate: number;
    avg_response_time_ms: number;
    unique_novels_scanned: number;
  };
  trends: {
    lookups_change_percent: number;
    success_rate_change_percent: number;
    response_time_change_percent: number;
  };
  timeline: Array<{
    timestamp: string;
    lookups: number;
    successful: number;
    failed: number;
    avg_response_time: number;
  }>;
  topNovels: Array<{
    novel_id: string;
    title: string;
    language: string;
    scan_count: number;
    success_count: number;
    success_rate: number;
  }>;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
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
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to the Novel OCR Admin Panel</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return <div>Failed to load dashboard data</div>;
  }

  const successData = [
    { name: 'Successful', value: data.metrics.successful_lookups },
    { name: 'Failed', value: data.metrics.failed_lookups },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to the Novel OCR Admin Panel
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/novels/new">
            <Button>Add Novel</Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Novels"
          value={data.metrics.total_novels}
          description="Novels in database"
          icon={BookOpen}
        />
        <MetricCard
          title="Lookups Today"
          value={data.metrics.total_lookups_today}
          description={`${data.metrics.total_lookups} total`}
          icon={Activity}
          trend={{
            value: data.trends.lookups_change_percent,
            label: 'from yesterday',
          }}
        />
        <MetricCard
          title="Success Rate"
          value={`${data.metrics.success_rate.toFixed(1)}%`}
          description={`${data.metrics.successful_lookups} successful`}
          icon={TrendingUp}
          trend={{
            value: data.trends.success_rate_change_percent,
            label: 'from last week',
          }}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${data.metrics.avg_response_time_ms}ms`}
          description="Average lookup time"
          icon={Clock}
          trend={{
            value: data.trends.response_time_change_percent,
            label: 'from last week',
          }}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lookups Over Time</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
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
                  dataKey="lookups"
                  stroke="#3b82f6"
                  name="Total Lookups"
                />
                <Line
                  type="monotone"
                  dataKey="successful"
                  stroke="#10b981"
                  name="Successful"
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  stroke="#ef4444"
                  name="Failed"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Success Rate</CardTitle>
            <CardDescription>Overall lookup success vs failures</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={successData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {successData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Novels */}
      <Card>
        <CardHeader>
          <CardTitle>Top Scanned Novels</CardTitle>
          <CardDescription>Most popular novels this month</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topNovels.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="scan_count" fill="#3b82f6" name="Scan Count" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Link href="/dashboard/novels">
            <Button variant="outline" className="w-full h-20">
              <div className="flex flex-col items-center">
                <BookOpen className="h-6 w-6 mb-2" />
                <span>Manage Novels</span>
              </div>
            </Button>
          </Link>
          <Link href="/dashboard/test">
            <Button variant="outline" className="w-full h-20">
              <div className="flex flex-col items-center">
                <Activity className="h-6 w-6 mb-2" />
                <span>Test Lookup</span>
              </div>
            </Button>
          </Link>
          <Link href="/dashboard/logs">
            <Button variant="outline" className="w-full h-20">
              <div className="flex flex-col items-center">
                <TrendingUp className="h-6 w-6 mb-2" />
                <span>View Logs</span>
              </div>
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
