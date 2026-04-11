'use client';

import { ExpandRecord } from '@/lib/storage';
import Link from 'next/link';

interface HistoryListProps {
  records: ExpandRecord[];
  onDelete: (id: string) => void;
}

export default function HistoryList({ records, onDelete }: HistoryListProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>暂无历史记录</p>
        <Link href="/" className="text-blue-600 hover:underline mt-2 inline-block">
          前往首页创建
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record) => (
        <div 
          key={record.id} 
          className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <span>📝</span>
                <span>{new Date(record.createdAt).toLocaleString('zh-CN')}</span>
              </div>
              <p className="text-gray-700 line-clamp-2">
                {record.originalText}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                  扩写
                </span>
                {record.videoUrl && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    视频
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => onDelete(record.id)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}