'use client';
import { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export default function ChartClient({ data /* [{time, open, high, low, close}] */ }) {
  // console.log('data', data);

  const ref = useRef();
  useEffect(() => {
    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: 350, // Initial height
      layout: {
        background: { color: 'transparent' },
        textColor: '#E0E0E0', // Lighter text color
        fontFamily: 'Arial, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(70, 70, 70, 0.5)' }, // More subtle grid lines
        horzLines: { color: 'rgba(70, 70, 70, 0.5)' },
      },
      timeScale: {
        borderColor: '#5A5A5A', // Slightly lighter border
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time, tickMarkType, locale) => {
          const date = new Date(time * 1000); // Convert back to milliseconds for Date object
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        },
      },
      rightPriceScale: {
        borderColor: '#5A5A5A',
      },
    });

    chart.applyOptions({
      crosshair: {
        vertLine: {
          color: '#C3BCDB',
          labelBackgroundColor: '#C3BCDB',
        },
        horzLine: {
          color: '#C3BCDB',
          labelBackgroundColor: '#C3BCDB',
        },
      },
    });
    
    const series = chart.addLineSeries({ color: '#22c55e' }); // Changed to addLineSeries and set a color
    series.setData(data);

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });

    resizeObserver.observe(ref.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data]);
  return <div ref={ref} className="w-full h-[350px]" />;
}
