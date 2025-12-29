'use client';

import { use, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Novel, NovelStats } from '@/types/novel';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ViewNovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [stats, setStats] = useState<NovelStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNovel();
  }, [id]);

  const fetchNovel = async () => {
    try {
      const response = await fetch(`/api/admin/novels/${id}`);
      const data = await response.json();

      if (data.success) {
        setNovel(data.data.novel);
        setStats(data.data.stats);
      } else {
        toast.error('Novel not found');
        router.push('/dashboard/novels');
      }
    } catch (error) {
      toast.error('Failed to fetch novel');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${novel?.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/novels/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Novel deleted successfully');
        router.push('/dashboard/novels');
      } else {
        toast.error(data.error || 'Failed to delete novel');
      }
    } catch (error) {
      toast.error('Failed to delete novel');
    }
  };

  if (loading) {
    return <Skeleton className="h-96" />;
  }

  if (!novel) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/novels">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{novel.title}</h1>
            <p className="text-muted-foreground">
              {novel.isbn && `ISBN: ${novel.isbn}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/novels/${id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Title</p>
              <p className="text-base">{novel.title}</p>
            </div>
            {novel.isbn && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">ISBN</p>
                <p className="text-base">{novel.isbn}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Language</p>
              <Badge>{novel.language.toUpperCase()}</Badge>
            </div>
            {novel.chapter && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Chapter</p>
                <p className="text-base">{novel.chapter}</p>
              </div>
            )}
            {novel.page_number && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Page Number</p>
                <p className="text-base">{novel.page_number}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Target URL</p>
              <a
                href={novel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base text-blue-600 hover:underline"
              >
                {novel.url}
              </a>
            </div>
            {novel.unlock_content && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unlock Content ID</p>
                <p className="text-base font-mono">{novel.unlock_content}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Scans</p>
              <p className="text-2xl font-bold">{stats?.total_scans || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Successful Scans</p>
              <p className="text-2xl font-bold">{stats?.successful_scans || 0}</p>
            </div>
            {stats?.last_scanned && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Scanned</p>
                <p className="text-base">
                  {new Date(stats.last_scanned).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Text Fingerprint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Line 1</p>
            <p className="font-mono text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
              {novel.line1}
            </p>
            {novel.line1_raw && (
              <p className="text-sm text-muted-foreground mt-1">
                Full: {novel.line1_raw}
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Line 2</p>
            <p className="font-mono text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
              {novel.line2}
            </p>
            {novel.line2_raw && (
              <p className="text-sm text-muted-foreground mt-1">
                Full: {novel.line2_raw}
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Line 3</p>
            <p className="font-mono text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
              {novel.line3}
            </p>
            {novel.line3_raw && (
              <p className="text-sm text-muted-foreground mt-1">
                Full: {novel.line3_raw}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
