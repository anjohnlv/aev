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
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)] mb-4">暂无历史记录</p>
        <Link href="/" className="text-[var(--accent-primary)] hover:underline">
          前往首页创建
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div 
          key={record.id} 
          className="glass-card p-4 hover:border-[var(--border-active)] transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2">
                <span>📝</span>
                <span>{new Date(record.createdAt).toLocaleString('zh-CN')}</span>
              </div>
              <p className="text-[var(--text-primary)] line-clamp-2">
                {record.originalText}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--accent-primary)] rounded">
                  扩写
                </span>
                {record.videoUrl && (
                  <span className="text-xs px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--success)] rounded">
                    视频
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onDelete(record.id)}
              className="text-sm text-red-400 hover:text-red-300 p-2 min-h-[44px]"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}