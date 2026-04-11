'use client';

export type VideoGenerateProgress = {
  label: string;
  percent: number | null;
  elapsedSec: number;
};

interface VideoPreviewProps {
  videoUrl: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
  disabled: boolean;
  generateProgress?: VideoGenerateProgress | null;
}

export default function VideoPreview({
  videoUrl,
  isGenerating,
  onGenerate,
  disabled,
  generateProgress,
}: VideoPreviewProps) {
  const p = generateProgress;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-gray-700">视频预览</h3>

      {!videoUrl && (
        <button
          onClick={onGenerate}
          disabled={disabled || isGenerating}
          className="w-full py-3 px-6 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? '生成中…' : '生成视频'}
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
            {p.percent == null && (
              <span className="block mt-1">
                云端任务无细粒度进度；若远超 5 分钟仍无结果，请查看浏览器控制台或 API 配置。
              </span>
            )}
          </p>
        </div>
      )}

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center min-h-[200px] flex items-center justify-center">
        {isGenerating ? (
          <div className="text-gray-400 text-sm">
            预览区域：生成完成后将在此播放
          </div>
        ) : videoUrl ? (
          <video src={videoUrl} controls className="max-w-full rounded" />
        ) : (
          <div className="text-gray-400">
            <div className="text-4xl mb-2">🎬</div>
            <p>点击「生成视频」创建您的视频</p>
          </div>
        )}
      </div>
    </div>
  );
}
