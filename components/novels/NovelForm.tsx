'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { novelSchema, type NovelFormData } from '@/lib/validations/novel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface NovelFormProps {
  initialData?: NovelFormData;
  novelId?: string;
  mode: 'create' | 'edit';
}

export function NovelForm({ initialData, novelId, mode }: NovelFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NovelFormData>({
    resolver: zodResolver(novelSchema) as any,
    defaultValues: initialData || {
      language: 'en',
    },
  });

  const language = watch('language');

  const onSubmit = async (data: NovelFormData) => {
    setIsSubmitting(true);

    try {
      const url = mode === 'create'
        ? '/api/admin/novels'
        : `/api/admin/novels/${novelId}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(mode === 'create' ? 'Novel created successfully' : 'Novel updated successfully');
        router.push('/dashboard/novels');
        router.refresh();
      } else {
        if (result.code === 'DUPLICATE_ENTRY') {
          toast.error(result.error, {
            description: `Duplicate of: ${result.existing_novel.title}`,
          });
        } else {
          toast.error(result.error || 'An error occurred');
        }
      }
    } catch (error) {
      toast.error('Failed to save novel');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Enter the basic details about the novel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Fortunes Told"
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input
                id="isbn"
                {...register('isbn')}
                placeholder="979-8218374495"
                disabled={isSubmitting}
              />
              {errors.isbn && (
                <p className="text-sm text-red-500">{errors.isbn.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="language">
                Language <span className="text-red-500">*</span>
              </Label>
              <Select
                value={language}
                onValueChange={(value) => setValue('language', value as 'en' | 'sv' | 'it' | 'other')}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sv">Swedish</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.language && (
                <p className="text-sm text-red-500">{errors.language.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="chapter">Chapter</Label>
              <Input
                id="chapter"
                {...register('chapter')}
                placeholder="Chapter 1"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page_number">Page Number</Label>
              <Input
                id="page_number"
                type="number"
                {...register('page_number')}
                placeholder="1"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">
              Target URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="url"
              {...register('url')}
              placeholder="https://app.example.com/fortunes-told"
              disabled={isSubmitting}
            />
            {errors.url && (
              <p className="text-sm text-red-500">{errors.url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unlock_content">Unlock Content ID</Label>
            <Input
              id="unlock_content"
              {...register('unlock_content')}
              placeholder="tarot_reading_1"
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Text Fingerprint (First 3 Words)</CardTitle>
          <CardDescription>
            Enter the first 3 words from each of the first 3 lines. Text will be automatically lowercased.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="line1">
                Line 1 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="line1"
                {...register('line1')}
                placeholder="the storm was"
                disabled={isSubmitting}
              />
              {errors.line1 && (
                <p className="text-sm text-red-500">{errors.line1.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="line1_raw">Line 1 Full Text (Reference)</Label>
              <Textarea
                id="line1_raw"
                {...register('line1_raw')}
                placeholder="The storm was unlike"
                disabled={isSubmitting}
                rows={2}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="line2">
                Line 2 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="line2"
                {...register('line2')}
                placeholder="unlike any other"
                disabled={isSubmitting}
              />
              {errors.line2 && (
                <p className="text-sm text-red-500">{errors.line2.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="line2_raw">Line 2 Full Text (Reference)</Label>
              <Textarea
                id="line2_raw"
                {...register('line2_raw')}
                placeholder="any other Felix had"
                disabled={isSubmitting}
                rows={2}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="line3">
                Line 3 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="line3"
                {...register('line3')}
                placeholder="felix had seen"
                disabled={isSubmitting}
              />
              {errors.line3 && (
                <p className="text-sm text-red-500">{errors.line3.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="line3_raw">Line 3 Full Text (Reference)</Label>
              <Textarea
                id="line3_raw"
                {...register('line3_raw')}
                placeholder="seen in Blackridge."
                disabled={isSubmitting}
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Novel' : 'Update Novel'}
        </Button>
      </div>
    </form>
  );
}
