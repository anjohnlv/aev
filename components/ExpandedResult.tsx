'use client';

interface ExpandedResultProps {
  text: string;
  isLoading: boolean;
}

export default function ExpandedResult({ text, isLoading }: ExpandedResultProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-700">扩写结果</h3>
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center gap-2 text-gray-500">
            <span className="animate-pulse">AI 正在扩写中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!text) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium text-gray-700">扩写结果</h3>
      <div className="p-4 border border-gray-200 rounded-lg bg-white whitespace-pre-wrap">
        {text}
      </div>
    </div>
  );
}