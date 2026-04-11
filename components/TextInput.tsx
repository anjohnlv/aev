'use client';

import { useState } from 'react';

interface TextInputProps {
  onExpand: (text: string) => void;
  onDirectStoryboard: (text: string) => void;
  isLoading: boolean;
}

export default function TextInput({ onExpand, onDirectStoryboard, isLoading }: TextInputProps) {
  const [text, setText] = useState('');

  const handleExpand = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onExpand(text.trim());
    }
  };

  const handleDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onDirectStoryboard(text.trim());
    }
  };

  return (
    <form className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="输入主题或故事..."
        className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
        disabled={isLoading}
      />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="submit"
          onClick={handleExpand}
          disabled={!text.trim() || isLoading}
          className="py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '处理中...' : '扩写并分镜'}
        </button>
        <button
          type="button"
          onClick={handleDirect}
          disabled={!text.trim() || isLoading}
          className="py-3 px-6 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '处理中...' : '直接分镜'}
        </button>
      </div>
    </form>
  );
}
