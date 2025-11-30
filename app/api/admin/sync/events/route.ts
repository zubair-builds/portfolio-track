import { NextRequest } from 'next/server';
import { syncEventEmitter } from '@/lib/syncEventEmitter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Create a TransformStream for SSE
  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(data));

      // Listen for sync events
      const listener = (event: unknown) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        try {
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error('Error sending SSE:', error);
        }
      };

      syncEventEmitter.on('sync-update', listener);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        syncEventEmitter.off('sync-update', listener);
        try {
          controller.close();
        } catch (error) {
          // Ignore errors when closing
        }
      });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const data = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup heartbeat on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
      });
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

