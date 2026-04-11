/**
 * In-memory job store (single-instance). Survives Next.js dev HMR via globalThis;
 * still lost on full process restart; not for multi-replica.
 */

export type SlideshowProgress = {
  phase: 'queued' | 'slides' | 'ffmpeg';
  /** Short Chinese label for UI */
  label: string;
  /** 0–100, or omit when unknown */
  percent: number;
  currentSlide?: number;
  totalSlides?: number;
};

export type SlideshowJobState =
  | { status: 'pending'; progress: SlideshowProgress; startedAt: number }
  | { status: 'done'; videoUrl: string }
  | { status: 'failed'; error: string };

const g = globalThis as typeof globalThis & {
  __aiExpandVideoSlideshowJobs?: Map<string, SlideshowJobState>;
};

const jobs =
  g.__aiExpandVideoSlideshowJobs ??
  (g.__aiExpandVideoSlideshowJobs = new Map<string, SlideshowJobState>());

export function createSlideshowJob(): string {
  const id = crypto.randomUUID();
  const now = Date.now();
  jobs.set(id, {
    status: 'pending',
    startedAt: now,
    progress: {
      phase: 'queued',
      label: '已排队，准备生成幻灯片…',
      percent: 2,
    },
  });
  return id;
}

export function getSlideshowJob(id: string): SlideshowJobState | undefined {
  return jobs.get(id);
}

export function updateSlideshowJobProgress(id: string, progress: SlideshowProgress) {
  const j = jobs.get(id);
  if (j?.status === 'pending') {
    jobs.set(id, { ...j, progress });
  }
}

export function setSlideshowJobDone(id: string, videoUrl: string) {
  jobs.set(id, { status: 'done', videoUrl });
}

export function setSlideshowJobFailed(id: string, error: string) {
  jobs.set(id, { status: 'failed', error });
}
