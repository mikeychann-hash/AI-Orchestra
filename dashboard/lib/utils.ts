import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function formatRelativeTime(date: Date | string) {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'running':
    case 'active':
    case 'in_progress':
      return 'text-blue-500';
    case 'success':
    case 'completed':
    case 'done':
      return 'text-green-500';
    case 'error':
    case 'failed':
      return 'text-red-500';
    case 'warning':
    case 'pending':
      return 'text-yellow-500';
    case 'idle':
    case 'stopped':
      return 'text-gray-500';
    default:
      return 'text-gray-400';
  }
}

export function getStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status.toLowerCase()) {
    case 'running':
    case 'active':
      return 'default';
    case 'success':
    case 'completed':
      return 'secondary';
    case 'error':
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}
