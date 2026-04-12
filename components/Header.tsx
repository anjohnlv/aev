'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
      <Link href="/" className="text-lg sm:text-xl font-bold font-[var(--font-display)]">
        <span className="text-gradient">AI 视频</span>
      </Link>
      <nav className="flex gap-2 sm:gap-4">
        <Link 
          href="/" 
          className={`px-3 py-2 rounded-md transition-all text-sm ${
            pathname === '/' 
              ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-medium' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          首页
        </Link>
        <Link 
          href="/history" 
          className={`px-3 py-2 rounded-md transition-all text-sm ${
            pathname === '/history' 
              ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-medium' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          历史
        </Link>
      </nav>
    </header>
  );
}