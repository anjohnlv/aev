export interface ExpandRecord {
  id: string;
  originalText: string;
  expandedText: string;
  storyboard?: {
    summary: string;
    shots: { id: number; scene: string; text: string }[];
  };
  videoUrl?: string;
  createdAt: string;
}

const STORAGE_KEY = 'ai-expand-records';

export function getRecords(): ExpandRecord[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveRecord(record: ExpandRecord): void {
  const records = getRecords();
  records.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function deleteRecord(id: string): void {
  const records = getRecords();
  const filtered = records.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function getRecordById(id: string): ExpandRecord | undefined {
  return getRecords().find(r => r.id === id);
}