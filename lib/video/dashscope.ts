const BASE_URL = 'https://dashscope.aliyuncs.com';

export async function submitDashScopeVideoTask(
  apiKey: string,
  prompt: string
): Promise<string> {
  const response = await fetch(
    `${BASE_URL}/api/v1/services/aigc/video-generation/video-synthesis`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: 'kling/kling-v3-video-generation',
        input: { prompt },
        parameters: {
          mode: 'std',
          aspect_ratio: '16:9',
          duration: 5,
        },
      }),
    }
  );

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error(`DashScope submit: invalid JSON (HTTP ${response.status})`);
  }

  if (!response.ok || data.code) {
    const msg =
      typeof data.message === 'string'
        ? data.message
        : `DashScope submit failed (HTTP ${response.status})`;
    throw new Error(msg);
  }

  const output = data.output as Record<string, unknown> | undefined;
  const taskId = output?.task_id;
  if (typeof taskId !== 'string' || !taskId) {
    throw new Error('DashScope response missing output.task_id');
  }
  return taskId;
}

export type DashScopePollResult =
  | { kind: 'succeeded'; videoUrl: string }
  | { kind: 'failed'; message: string }
  | { kind: 'pending'; taskStatus: string };

export async function pollDashScopeTask(
  apiKey: string,
  taskId: string
): Promise<DashScopePollResult> {
  const response = await fetch(`${BASE_URL}/api/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    return {
      kind: 'failed',
      message: `DashScope poll: invalid JSON (HTTP ${response.status})`,
    };
  }

  if (!response.ok || data.code) {
    const msg =
      typeof data.message === 'string'
        ? data.message
        : `DashScope poll failed (HTTP ${response.status})`;
    return { kind: 'failed', message: msg };
  }

  const taskStatus = data.task_status;
  if (taskStatus === 'SUCCEEDED') {
    const output = data.output as Record<string, unknown> | undefined;
    const videoUrl = output?.video_url;
    if (typeof videoUrl !== 'string' || !videoUrl) {
      return { kind: 'failed', message: 'DashScope succeeded but output.video_url missing' };
    }
    return { kind: 'succeeded', videoUrl };
  }
  if (taskStatus === 'FAILED') {
    const msg =
      typeof data.message === 'string' ? data.message : 'Video generation failed';
    return { kind: 'failed', message: msg };
  }
  return {
    kind: 'pending',
    taskStatus: typeof taskStatus === 'string' ? taskStatus : 'PENDING',
  };
}
