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

    const expandedText = await expandText(text);

    return NextResponse.json({
      success: true,
      expandedText,
    });
  } catch (error) {
    console.error('Expand API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function expandText(text: string): Promise<string> {
  const systemPrompt = `你是一个专业的文本扩写助手。你的任务是将用户提供的简短文本扩写为更丰富、更详细、更优美的内容。

扩写要求：
1. 保持原文的核心思想和主题
2. 适当增加细节描写和场景描述
3. 使用优美的语言和修辞手法
4. 保持内容的连贯性和逻辑性
5. 扩写后的内容应该有深度、有感染力

请直接输出扩写后的内容，不要添加任何解释或前缀。`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请扩写以下文本：\n\n${text}` }
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
      temperature: 0.8,
      max_tokens: 2000,
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

  return data.choices[0].message.content;
}
