/**
 * Format a number with K/M/B suffixes
 * 1,200 → "1.2K"
 * 1,200,000 → "1.2M"
 * 1,200,000,000 → "1.2B"
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || !Number.isFinite(num)) {
    return '—';
  }

  const absNum = Math.abs(num);
  
  if (absNum >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B';
  }
  if (absNum >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (absNum >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * Format volume specifically (always use K/M notation)
 */
export function formatVolume(num: number | null | undefined): string {
  if (num === null || num === undefined || !Number.isFinite(num)) {
    return '—';
  }

  return formatNumber(num);
}

/**
 * Format price to 2 decimal places
 */
export function formatPrice(num: number | null | undefined): string {
  if (num === null || num === undefined || !Number.isFinite(num)) {
    return '—';
  }

  return num.toFixed(2);
}

/**
 * Format percentage with + or - prefix
 */
export function formatPercent(num: number | null | undefined): string {
  if (num === null || num === undefined || !Number.isFinite(num)) {
    return '—';
  }

  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

/**
 * Format change with + or - prefix
 */
export function formatChange(num: number | null | undefined): string {
  if (num === null || num === undefined || !Number.isFinite(num)) {
    return '—';
  }

  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}`;
}

/**
 * Get performance color class based on value
 */
export function getPerformanceColorClass(num: number | null | undefined): string {
  if (num === null || num === undefined || !Number.isFinite(num)) {
    return 'text-slate-600 dark:text-slate-400';
  }

  return num >= 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';
}

/**
 * Format timestamp to readable string
 */
export function formatTimestamp(timestamp: number | Date | null | undefined): string {
  if (!timestamp) return '—';

  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}


