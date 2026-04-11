'use client';

import { type VideoGenerateProgress } from './VideoPreview';

export interface Shot {
  id: number;
  scene: string;
  text: string;
}

export interface Storyboard {
  summary: string;
  shots: Shot[];
}

interface StoryboardViewProps {
  storyboard: Storyboard | null;
  isLoading: boolean;
  isGenerating: boolean;
  onDesign: () => void;
  onConfirm: () => void;
  disabled: boolean;
  generateProgress?: VideoGenerateProgress | null;
}

export function saveStoryboard(
  storyboard: Storyboard,
  onChange: (storyboard: Storyboard) => void
) {
  onChange(storyboard);
}

export default function StoryboardView({
  storyboard,
  isLoading,
  isGenerating,
  onDesign,
  onConfirm,
  disabled,
  generateProgress,
}: StoryboardViewProps) {
  const p = generateProgress;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-700">分镜设计</h3>
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center gap-2 text-gray-500">
            <span className="animate-pulse">AI 正在设计分镜...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-700">分镜设计</h3>
        {!storyboard && (
          <button
            onClick={onDesign}
            disabled={disabled}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            设计分镜
          </button>
        )}
      </div>

      {storyboard && (
        <>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">主题：</span>{storyboard.summary}
            </p>
          </div>

          <div className="space-y-2">
            {storyboard.shots.map((shot) => (
              <div
                key={shot.id}
                className="p-3 border border-gray-200 rounded-lg bg-white"
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-600 text-sm font-medium rounded-full flex items-center justify-center">
                    {shot.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">
                      <span className="font-medium">场景：</span>{shot.scene}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">文字：</span>{shot.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isGenerating && (
            <button
              onClick={onConfirm}
              disabled={disabled}
              className="w-full py-3 px-6 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              确认并生成视频
            </button>
          )}

          {isGenerating && p && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm text-gray-700 space-y-2">
              <p className="font-medium text-gray-800">{p.label}</p>
              {p.percent != null ? (
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-[width] duration-500 ease-out rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, p.percent))}%` }}
                  />
                </div>
              ) : (
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden relative">
                  <div className="absolute inset-y-0 left-0 w-1/3 bg-blue-400 rounded-full animate-pulse motion-reduce:animate-none" />
                </div>
              )}
              <p className="text-xs text-gray-500">
                已等待 {p.elapsedSec} 秒
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
