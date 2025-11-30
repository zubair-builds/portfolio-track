/**
 * Sync Event Emitter
 * Manages Server-Sent Events for real-time sync updates
 */

import { EventEmitter } from 'events';

export interface SyncEvent {
  type: 'companies' | 'dividends' | 'fundamentals';
  event: 'progress' | 'status' | 'error';
  data: unknown;
  timestamp: string;
}

class SyncEventEmitter extends EventEmitter {
  private static instance: SyncEventEmitter;

  private constructor() {
    super();
    this.setMaxListeners(100); // Allow multiple clients
  }

  static getInstance(): SyncEventEmitter {
    if (!SyncEventEmitter.instance) {
      SyncEventEmitter.instance = new SyncEventEmitter();
    }
    return SyncEventEmitter.instance;
  }

  emitSyncEvent(event: SyncEvent) {
    this.emit('sync-update', event);
  }

  emitProgress(type: 'companies' | 'dividends' | 'fundamentals', data: unknown) {
    this.emitSyncEvent({
      type,
      event: 'progress',
      data,
      timestamp: new Date().toISOString()
    });
  }

  emitStatus(type: 'companies' | 'dividends' | 'fundamentals', data: unknown) {
    this.emitSyncEvent({
      type,
      event: 'status',
      data,
      timestamp: new Date().toISOString()
    });
  }

  emitError(type: 'companies' | 'dividends' | 'fundamentals', error: string) {
    this.emitSyncEvent({
      type,
      event: 'error',
      data: { error },
      timestamp: new Date().toISOString()
    });
  }
}

export const syncEventEmitter = SyncEventEmitter.getInstance();

