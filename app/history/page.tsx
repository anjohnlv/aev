'use client';

import { useState, useEffect } from 'react';
import HistoryList from '@/components/HistoryList';
import { getRecords, deleteRecord, ExpandRecord } from '@/lib/storage';

export default function HistoryPage() {
  const [records, setRecords] = useState<ExpandRecord[]>([]);

  useEffect(() => {
    setRecords(getRecords());
  }, []);

  const handleDelete = (id: string) => {
    deleteRecord(id);
    setRecords(getRecords());
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold font-[var(--font-display)]">
          <span className="text-gradient">历史记录</span>
        </h1>
        <p className="text-[var(--text-secondary)]">查看和管理您的扩写历史</p>
      </div>

      <HistoryList records={records} onDelete={handleDelete} />
    </div>
  );
}