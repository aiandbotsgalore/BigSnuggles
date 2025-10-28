import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause } from 'lucide-react';

interface ClipTimelineProps {
  duration: number; // Total duration in seconds
  range: { start: number; end: number };
  onChange: (range: { start: number; end: number }) => void;
  waveformData?: number[]; // Optional waveform visualization data
}

export function ClipTimeline({ duration, range, onChange, waveformData }: ClipTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | 'range' | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    drawTimeline();
  }, [range, duration, waveformData]);

  const drawTimeline = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform background
    if (waveformData && waveformData.length > 0) {
      ctx.fillStyle = '#e5e7eb';
      const barWidth = width / waveformData.length;
      
      waveformData.forEach((amplitude, index) => {
        const barHeight = (amplitude / 255) * height * 0.8;
        const x = index * barWidth;
        const y = (height - barHeight) / 2;
        
        ctx.fillRect(x, y, barWidth - 1, barHeight);
      });
    } else {
      // Draw simple background gradient if no waveform data
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#f3f4f6');
      gradient.addColorStop(0.5, '#e5e7eb');
      gradient.addColorStop(1, '#f3f4f6');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Calculate positions
    const startX = (range.start / duration) * width;
    const endX = (range.end / duration) * width;

    // Draw selected range highlight
    ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.fillRect(startX, 0, endX - startX, height);

    // Draw selected range border
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, 0, endX - startX, height);

    // Draw start handle
    drawHandle(ctx, startX, height, '#6366f1');
    
    // Draw end handle
    drawHandle(ctx, endX, height, '#6366f1');

    // Draw time markers
    drawTimeMarkers(ctx, width, height, duration);
  };

  const drawHandle = (ctx: CanvasRenderingContext2D, x: number, height: number, color: string) => {
    // Draw vertical line
    ctx.fillStyle = color;
    ctx.fillRect(x - 2, 0, 4, height);

    // Draw handle circle
    ctx.beginPath();
    ctx.arc(x, height / 2, 8, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawTimeMarkers = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    duration: number
  ) => {
    const markerInterval = duration > 120 ? 30 : 10; // 30s or 10s intervals
    const numMarkers = Math.floor(duration / markerInterval);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    for (let i = 0; i <= numMarkers; i++) {
      const time = i * markerInterval;
      const x = (time / duration) * width;

      // Draw marker line
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, height - 15);
      ctx.lineTo(x, height - 5);
      ctx.stroke();

      // Draw time label
      const minutes = Math.floor(time / 60);
      const seconds = time % 60;
      const label = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      ctx.fillText(label, x, height - 18);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = canvas.width;

    const startX = (range.start / duration) * width;
    const endX = (range.end / duration) * width;

    // Check if clicking on start handle
    if (Math.abs(x - startX) < 10) {
      setDragging('start');
      setDragOffset(x - startX);
    }
    // Check if clicking on end handle
    else if (Math.abs(x - endX) < 10) {
      setDragging('end');
      setDragOffset(x - endX);
    }
    // Check if clicking within range
    else if (x >= startX && x <= endX) {
      setDragging('range');
      setDragOffset(x - startX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = canvas.width;

    const timeAtX = (x / width) * duration;

    if (dragging === 'start') {
      const newStart = Math.max(0, Math.min(timeAtX, range.end - 5));
      onChange({ start: newStart, end: range.end });
    } else if (dragging === 'end') {
      const newEnd = Math.max(range.start + 5, Math.min(timeAtX, duration));
      onChange({ start: range.start, end: newEnd });
    } else if (dragging === 'range') {
      const rangeDuration = range.end - range.start;
      let newStart = timeAtX - dragOffset / width * duration;
      
      // Constrain to boundaries
      newStart = Math.max(0, Math.min(newStart, duration - rangeDuration));
      const newEnd = newStart + rangeDuration;
      
      onChange({ start: newStart, end: newEnd });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setDragOffset(0);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={120}
          className="w-full border border-gray-300 rounded-lg cursor-pointer"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      <div className="flex items-center justify-between text-sm text-gray-700">
        <div className="flex items-center gap-4">
          <div>
            <span className="font-medium">Start:</span>{' '}
            <span className="font-mono">{formatTime(range.start)}</span>
          </div>
          <div>
            <span className="font-medium">End:</span>{' '}
            <span className="font-mono">{formatTime(range.end)}</span>
          </div>
          <div>
            <span className="font-medium">Duration:</span>{' '}
            <span className="font-mono">{formatTime(range.end - range.start)}</span>
          </div>
        </div>

        <div className="text-gray-500">
          Total: {formatTime(duration)}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <strong>Tip:</strong> Drag the handles to adjust clip boundaries, or drag the highlighted region to move it.
      </div>
    </div>
  );
}
