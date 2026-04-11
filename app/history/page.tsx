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
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-800">历史记录</h1>
        <p className="text-gray-600">查看和管理您的扩写历史</p>
      </div>

      <HistoryList records={records} onDelete={handleDelete} />
    </div>
  );
}