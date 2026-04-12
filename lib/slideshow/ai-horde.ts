const HORDE_BASE = 'https://aihorde.net/api/v2';
const ANON_KEY = '0000000000';
const AGENT = 'ai-expand-video:1.0:contact@example.com';

const OPENCODE_KEY = process.env.OPENCODE_API_KEY;
const OPENCODE_ENDPOINT = 'https://opencode.ai/zen/v1/chat/completions';
const TRANSLATE_CACHE: Record<string, string> = {};

export interface HordeGenerateRequest {
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
}

export interface HordeGeneration {
  img: string;
  state: string;
}

export interface HordeResponse {
  id: string;
  generations?: HordeGeneration[];
  done?: boolean;
  faulted?: boolean;
  message?: string;
}

async function translateToEnglish(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';

  if (TRANSLATE_CACHE[trimmed]) {
    return TRANSLATE_CACHE[trimmed];
  }

  const basicKeywords = extractKeywords(trimmed);
  
  if (!OPENCODE_KEY) {
    return basicKeywords;
  }

  try {
    const response = await fetch(OPENCODE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCODE_KEY}`,
      },
      body: JSON.stringify({
        model: 'big-pickle',
        messages: [
          {
            role: 'user',
            content: `Translate to English (just the translation, no explanation): ${trimmed}`,
          },
        ],
        max_tokens: 100,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.warn('[translate] API failed:', response.status);
      return basicKeywords;
    }

    const data = await response.json();
    let english = data.choices?.[0]?.message?.content?.trim();
    
    if (!english && data.choices?.[0]?.message?.reasoning) {
      const reasoning = data.choices[0].message.reasoning;
      const match = reasoning.match(/[""]([^""]+)[""]/);
      english = match ? match[1] : reasoning.slice(0, 100);
    }
    
    if (!english) {
      return basicKeywords;
    }

    TRANSLATE_CACHE[trimmed] = english;
    return english;
  } catch (err) {
    console.warn('[translate] Error:', err);
    return basicKeywords;
  }
}

function extractKeywords(text: string): string {
  const keywords: Record<string, string> = {
    '阳光': 'sunny', '月亮': 'moon', '星星': 'stars', '天空': 'sky',
    '草地': 'grass', '花园': 'garden', '花': 'flower', '树': 'tree',
    '猫': 'cat', '狗': 'dog', '鸟': 'bird', '蝴蝶': 'butterfly',
    '人物': 'person', '女人': 'woman', '男人': 'man', '孩子': 'child',
    '笑': 'smile', '快乐': 'happy', '美丽': 'beautiful', '可爱': 'cute',
    '水': 'water', '海': 'sea', '山': 'mountain', '河': 'river',
    '日出': 'sunrise', '日落': 'sunset', '森林': 'forest', '田野': 'field',
  };
  
  let result = text;
  for (const [cn, en] of Object.entries(keywords)) {
    result = result.replace(new RegExp(cn, 'g'), en);
  }
  
  result = result.replace(/[\u4e00-\u9fff]/g, ' ').replace(/\s+/g, ' ').trim();
  
  return result || text;
}

/** 提交异步生成任务到 AI Horde */
async function submitJob(prompt: string): Promise<string> {
  const body = {
    prompt,
      params: {
      width: 512,
      height: 512,
      steps: 25,
      n: 1,
      sampler_name: 'k_euler',
    },
  };

  const res = await fetch(`${HORDE_BASE}/generate/async`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Client-Agent': AGENT,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Horde submit failed ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { id: string };
  return json.id;
}

/** 轮询任务状态，最长 180 秒（匿名用户需要排队） */
async function pollJob(jobId: string): Promise<HordeResponse> {
  const start = Date.now();
  const timeout = 180_000;

  while (Date.now() - start < timeout) {
    const res = await fetch(`${HORDE_BASE}/generate/status/${jobId}`, {
      headers: {
        'apikey': ANON_KEY,
        'Client-Agent': AGENT,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Horde status failed ${res.status}: ${text}`);
    }

    const json = (await res.json()) as HordeResponse;
    if (json.done || json.faulted) return json;

    // 等待 2 秒再轮询
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error('Horde poll timeout after 60s');
}

/** 下载图片并返回 Buffer */
async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * 使用 AI Horde 生成图片，返回 Buffer（失败返回 null）
 */
export async function generateImageBuffer(
  prompt: string,
  signal?: AbortSignal
): Promise<Buffer | null> {
  try {
    const chinesePrompt = prompt.slice(0, 100);
    const englishPrompt = await translateToEnglish(chinesePrompt);
    console.log('[ai-horde] Original:', chinesePrompt);
    console.log('[ai-horde] English:', englishPrompt);

    const jobId = await submitJob(englishPrompt);
    console.log('[ai-horde] Job submitted, id:', jobId, '- polling...');
    const result = await pollJob(jobId);
    console.log('[ai-horde] Job done, result:', result.done, result.faulted);

    if (!result.done || !result.generations?.length) {
      console.warn(`[ai-horde] Job ${jobId} faulted: ${result.message}`);
      return null;
    }

    const imgUrl = result.generations[0].img;
    console.log('[ai-horde] Downloading image, URL length:', imgUrl.length);
    const buffer = await downloadImage(imgUrl);
    console.log('[ai-horde] Downloaded image, size:', buffer.length, 'bytes');
    return buffer;
  } catch (err) {
    console.warn('[ai-horde] Image generation failed, will use text-only slide:', err);
    return null;
  }
}
