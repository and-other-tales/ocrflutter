import { NovelForm } from '@/components/novels/NovelForm';

export default function NewNovelPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Novel</h1>
        <p className="text-muted-foreground">
          Create a new novel entry with its text fingerprint
        </p>
      </div>

      <NovelForm mode="create" />
    </div>
  );
}
