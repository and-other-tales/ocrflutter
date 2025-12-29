'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface TestResult {
  match: boolean;
  novel?: {
    id: string;
    title: string;
    url: string;
  };
  message?: string;
  response_time_ms: number;
  debug_info: any;
}

export default function TestPage() {
  const [line1Words, setLine1Words] = useState(['', '', '']);
  const [line2Words, setLine2Words] = useState(['', '', '']);
  const [line3Words, setLine3Words] = useState(['', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleTest = async () => {
    // Validate input
    if (line1Words.some(w => !w.trim()) || line2Words.some(w => !w.trim()) || line3Words.some(w => !w.trim())) {
      toast.error('Please fill in all word fields');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/test-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line1: line1Words,
          line2: line2Words,
          line3: line3Words,
        }),
      });

      const data = await response.json();
      setResult(data.data);

      if (data.data.match) {
        toast.success('Match found!');
      } else {
        toast.error('No match found');
      }
    } catch (error) {
      toast.error('Failed to test lookup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadExample = () => {
    setLine1Words(['the', 'storm', 'was']);
    setLine2Words(['unlike', 'any', 'other']);
    setLine3Words(['felix', 'had', 'seen']);
  };

  const handleClear = () => {
    setLine1Words(['', '', '']);
    setLine2Words(['', '', '']);
    setLine3Words(['', '', '']);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Lookup</h1>
        <p className="text-muted-foreground">
          Test the OCR lookup functionality with sample text
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Input</CardTitle>
              <CardDescription>
                Enter the first 3 words from each of the first 3 lines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Line 1 - First 3 Words</Label>
                <div className="grid grid-cols-3 gap-2">
                  {line1Words.map((word, i) => (
                    <Input
                      key={`line1-${i}`}
                      value={word}
                      onChange={(e) => {
                        const newWords = [...line1Words];
                        newWords[i] = e.target.value;
                        setLine1Words(newWords);
                      }}
                      placeholder={`Word ${i + 1}`}
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Line 2 - First 3 Words</Label>
                <div className="grid grid-cols-3 gap-2">
                  {line2Words.map((word, i) => (
                    <Input
                      key={`line2-${i}`}
                      value={word}
                      onChange={(e) => {
                        const newWords = [...line2Words];
                        newWords[i] = e.target.value;
                        setLine2Words(newWords);
                      }}
                      placeholder={`Word ${i + 1}`}
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Line 3 - First 3 Words</Label>
                <div className="grid grid-cols-3 gap-2">
                  {line3Words.map((word, i) => (
                    <Input
                      key={`line3-${i}`}
                      value={word}
                      onChange={(e) => {
                        const newWords = [...line3Words];
                        newWords[i] = e.target.value;
                        setLine3Words(newWords);
                      }}
                      placeholder={`Word ${i + 1}`}
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleTest}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Testing...' : 'Test Lookup'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLoadExample}
                  disabled={isLoading}
                >
                  Load Example
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={isLoading}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                How your input will be processed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="font-mono text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                Line 1: {line1Words.join(' ').toLowerCase() || '(empty)'}
              </div>
              <div className="font-mono text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                Line 2: {line2Words.join(' ').toLowerCase() || '(empty)'}
              </div>
              <div className="font-mono text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                Line 3: {line3Words.join(' ').toLowerCase() || '(empty)'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                Lookup response and debug information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  Run a test to see results
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    {result.match ? (
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-600" />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold">
                        {result.match ? 'Match Found!' : 'No Match Found'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{result.response_time_ms}ms response time</span>
                      </div>
                    </div>
                  </div>

                  {result.match && result.novel && (
                    <div className="border-l-4 border-green-600 bg-green-50 dark:bg-green-950/20 p-4 rounded-md">
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Matched Novel
                          </p>
                          <p className="font-semibold">{result.novel.title}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Target URL
                          </p>
                          <a
                            href={result.novel.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {result.novel.url}
                          </a>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Novel ID
                          </p>
                          <p className="font-mono text-sm">{result.novel.id}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!result.match && result.message && (
                    <div className="border-l-4 border-red-600 bg-red-50 dark:bg-red-950/20 p-4 rounded-md">
                      <p className="text-sm">{result.message}</p>
                    </div>
                  )}

                  {result.debug_info && (
                    <div>
                      <h4 className="font-medium mb-2">Debug Information</h4>
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md font-mono text-xs overflow-auto">
                        <pre>{JSON.stringify(result.debug_info, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
