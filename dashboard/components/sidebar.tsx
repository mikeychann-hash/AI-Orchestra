'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Play,
  FileText,
  Package,
  Settings,
  Activity,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Overview', href: '/', icon: Home },
  { name: 'Build Pipeline', href: '/build', icon: Play },
  { name: 'Agent Logs', href: '/logs', icon: FileText },
  { name: 'Artifacts', href: '/artifacts', icon: Package },
  { name: 'Agents', href: '/agents', icon: Bot },
  { name: 'System', href: '/system', icon: Activity },
  { name: 'Configuration', href: '/config', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">AO</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold">AI Orchestra</h1>
            <p className="text-xs text-muted-foreground">FusionForge Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          <div>Version 0.7.0</div>
          <div className="mt-1">Phase 7 - Dashboard</div>
        </div>
      </div>
    </div>
  );
}
