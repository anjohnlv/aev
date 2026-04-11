'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <Link href="/" className="text-xl font-bold text-gray-800">
        ✨ AI扩写视频
      </Link>
      <nav className="flex gap-4">
        <Link 
          href="/" 
          className={`px-3 py-1 rounded transition-colors ${
            pathname === '/' 
              ? 'bg-gray-900 text-white' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          首页
        </Link>
        <Link 
          href="/history" 
          className={`px-3 py-1 rounded transition-colors ${
            pathname === '/history' 
              ? 'bg-gray-900 text-white' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          历史记录
        </Link>
      </nav>
    </header>
  );
}