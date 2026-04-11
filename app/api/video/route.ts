import { NextResponse } from 'next/server';
import {
  pollDashScopeTask,
  submitDashScopeVideoTask,
} from '@/lib/video/dashscope';
import {
  createSlideshowJob,
  getSlideshowJob,
} from '@/lib/slideshow/jobs';
import { formatSlideshowTaskId, parseVideoTaskId } from '@/lib/slideshow/task-id';

export const runtime = 'nodejs';

const API_KEY = process.env.DASHSCOPE_API_KEY;

function getVideoProvider(): 'dashscope' | 'slideshow' {
  const p = (process.env.VIDEO_PROVIDER || 'dashscope').toLowerCase();
  return p === 'slideshow' ? 'slideshow' : 'dashscope';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, storyboard } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid text input' },
        { status: 400 }
      );
    }

    const provider = getVideoProvider();

    if (provider === 'slideshow') {
      const id = createSlideshowJob();
      const taskId = formatSlideshowTaskId(id);
      setImmediate(() => {
        void import('@/lib/slideshow/generate').then(({ runSlideshowGeneration }) =>
          runSlideshowGeneration(id, text, storyboard)
        );
      });
      return NextResponse.json({
        success: true,
        taskId,
        message: 'Video generation started',
      });
    }

    if (!API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            'DASHSCOPE_API_KEY is not set. Add it in .env.local, or set VIDEO_PROVIDER=slideshow for local slideshow (requires ffmpeg).',
        },
        { status: 503 }
      );
    }

    const taskId = await submitDashScopeVideoTask(API_KEY, text);

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Video generation started',
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to start video generation';
    console.error('Video API error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskIdParam = searchParams.get('taskId');

  if (!taskIdParam) {
    return NextResponse.json(
      { success: false, error: 'Missing taskId' },
      { status: 400 }
    );
  }

  const parsed = parseVideoTaskId(taskIdParam);

  if (parsed.mode === 'slideshow') {
    try {
      const job = getSlideshowJob(parsed.id);
      if (!job) {
        return NextResponse.json(
          {
            success: false,
            status: 'FAILED',
            error:
              'Unknown or expired task (dev server may have restarted — try generating again).',
          },
          { status: 200 }
        );
      }
      if (job.status === 'done') {
        return NextResponse.json({
          success: true,
          videoUrl: job.videoUrl,
          status: 'SUCCEEDED',
        });
      }
      if (job.status === 'failed') {
        return NextResponse.json(
          {
            success: false,
            status: 'FAILED',
            error: job.error,
          },
          { status: 200 }
        );
      }
      const elapsedSec = Math.max(
        0,
        Math.floor((Date.now() - job.startedAt) / 1000)
      );
      return NextResponse.json({
        success: false,
        status: 'PENDING',
        message: job.progress.label,
        progress: job.progress,
        elapsedSec,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to check task status';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  }

  if (!API_KEY) {
    return NextResponse.json(
      {
        success: false,
        status: 'FAILED',
        error:
          'DASHSCOPE_API_KEY is not set. Set VIDEO_PROVIDER=slideshow for local slideshow.',
      },
      { status: 200 }
    );
  }

  try {
    const result = await pollDashScopeTask(API_KEY, parsed.id);

    if (result.kind === 'succeeded') {
      return NextResponse.json({
        success: true,
        videoUrl: result.videoUrl,
        status: 'SUCCEEDED',
      });
    }
    if (result.kind === 'failed') {
      return NextResponse.json(
        {
          success: false,
          status: 'FAILED',
          error: result.message,
        },
        { status: 200 }
      );
    }
    return NextResponse.json({
      success: false,
      status: result.taskStatus || 'PENDING',
      message: '云端处理中…',
      progress: {
        phase: 'cloud',
        label:
          '云端排队/生成中（可灵常见约 1～5 分钟，视队列与内容而定）',
        percent: null,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to check task status';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
