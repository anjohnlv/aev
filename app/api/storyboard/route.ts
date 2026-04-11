import { NextResponse } from 'next/server';

const API_KEY = process.env.OPENCODE_API_KEY;
const MODEL = 'big-pickle';
const ENDPOINT = 'https://opencode.ai/zen/v1/chat/completions';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid text input' },
        { status: 400 }
      );
    }

    if (!API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    const storyboard = await designStoryboard(text);

    return NextResponse.json({
      success: true,
      storyboard,
    });
  } catch (error) {
    console.error('Storyboard API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface Shot {
  id: number;
  scene: string;
  text: string;
}

interface Storyboard {
  summary: string;
  shots: Shot[];
}

async function designStoryboard(inputText: string): Promise<Storyboard> {
  // 如果文本太短，直接使用
  const text = inputText.trim();
  if (text.length < 10) {
    return {
      summary: text,
      shots: [{
        id: 1,
        scene: text,
        text: text
      }]
    };
  }

  const systemPrompt = `你是一个专业的视频分镜设计师。你的任务是将扩写后的视频脚本拆分成多个分镜头。

请将内容拆分成 4-8 个分镜头，每个分镜头包含：
1. scene: 场景描述（用于 AI 生成图片，20-50字，描述画面内容）
2. text: 该镜头要显示的文字内容

输出格式为 JSON，不要添加任何解释。回复格式如下：
{
  "summary": "视频主题概述（10-20字）",
  "shots": [
    {"id": 1, "scene": "场景描述", "text": "显示文字"},
    {"id": 2, "scene": "场景描述", "text": "显示文字"}
  ]
}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请为以下扩写后的视频脚本设计分镜：\n\n${text}` }
  ];

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error('Invalid API response');
  }

  const content = data.choices[0].message.content;
  
  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse storyboard JSON');
  }

  const storyboard = JSON.parse(jsonMatch[0]) as Storyboard;
  
  // Validate structure
  if (!storyboard.shots || !Array.isArray(storyboard.shots)) {
    throw new Error('Invalid storyboard structure: missing shots array');
  }

  // Ensure each shot has required fields and proper id
  storyboard.shots = storyboard.shots.map((shot, index) => ({
    id: shot.id ?? (index + 1),
    scene: shot.scene || '',
    text: shot.text || '',
  }));

  return storyboard;
}
