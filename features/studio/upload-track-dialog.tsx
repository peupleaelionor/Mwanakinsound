'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Music2, ImageIcon, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadCover, uploadAudioPreview, readAudioDuration, UploadError } from '@/lib/upload';
import { slugify } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

type Step = 'idle' | 'uploading' | 'saving';

/**
 * Artist upload flow: cover + audio preview → Supabase Storage, then create the
 * track row (published). Client-side validation matches the Storage policies,
 * so bad files are rejected before any network call.
 */
export function UploadTrackDialog({
  artistId,
  autoOpen = false,
}: {
  artistId: string;
  /** Ouvre le dialogue dès le montage — utilisé par le lanceur paresseux. */
  autoOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen);
  const [title, setTitle] = useState('');
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);

  const busy = step !== 'idle';

  function reset() {
    setTitle('');
    setAudio(null);
    setCover(null);
    setStep('idle');
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    if (title.trim().length < 2) return setError('Le titre est requis.');
    if (!audio) return setError('Ajoutez un fichier audio (extrait).');

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login?next=/studio');
      return;
    }

    try {
      setStep('uploading');
      const durationMs = await readAudioDuration(audio);
      const audioPath = await uploadAudioPreview(supabase, user.id, audio);
      const coverUrl = cover ? await uploadCover(supabase, user.id, cover) : null;

      setStep('saving');
      const { error: insertError } = await supabase.from('tracks').insert({
        artist_id: artistId,
        title: title.trim(),
        slug: `${slugify(title)}-${crypto.randomUUID().slice(0, 6)}`,
        audio_preview_path: audioPath,
        cover_url: coverUrl,
        duration_ms: durationMs,
        status: 'published',
        published_at: new Date().toISOString(),
      });
      if (insertError) throw new UploadError(insertError.message);

      toast({ title: 'Titre publié 🎉', description: title.trim(), variant: 'success' });
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      const message = err instanceof UploadError ? err.message : 'Échec de la publication.';
      setError(message);
      setStep('idle');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Upload className="size-4" /> Importer un titre
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importer un titre</DialogTitle>
          <DialogDescription>
            Extrait audio (MP3/AAC/OGG, 10 Mo max) + pochette optionnelle. Publication immédiate.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du morceau"
            disabled={busy}
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <FilePicker
            label={audio ? audio.name : 'Choisir le fichier audio (extrait)'}
            icon={Music2}
            accept="audio/mpeg,audio/aac,audio/ogg"
            disabled={busy}
            onChange={setAudio}
          />

          <FilePicker
            label={cover ? cover.name : 'Pochette (optionnelle)'}
            icon={ImageIcon}
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={setCover}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleSubmit} disabled={busy} size="lg">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {step === 'uploading'
              ? 'Téléversement…'
              : step === 'saving'
                ? 'Publication…'
                : 'Publier'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilePicker({
  label,
  icon: Icon,
  accept,
  disabled,
  onChange,
}: {
  label: string;
  icon: typeof Music2;
  accept: string;
  disabled: boolean;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3 text-sm transition-colors hover:border-primary/50">
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span>
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
