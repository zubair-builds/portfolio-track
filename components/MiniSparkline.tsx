'use client';

import { useMemo } from 'react';

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function MiniSparkline({
  data,
  width = 80,
  height = 24,
  color,
  className = '',
}: MiniSparklineProps) {
  const path = useMemo(() => {
    if (!data || data.length < 2) return '';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; // Avoid division by zero

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [data, width, height]);

  // Determine color based on trend if not provided
  const lineColor = useMemo(() => {
    if (color) return color;
    if (data.length < 2) return '#6366f1'; // indigo-500
    const first = data[0];
    const last = data[data.length - 1];
    return last >= first ? '#10b981' : '#ef4444'; // emerald-500 or rose-500
  }, [data, color]);

  if (!data || data.length < 2) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-xs text-slate-400">N/A</span>
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
