'use client';

import { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(message.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [message.id, onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  }[message.type];

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  }[message.type];

  return (
    <div className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md animate-slide-in`}>
      <span className="text-xl font-bold">{icon}</span>
      <span className="flex-1">{message.message}</span>
      <button
        onClick={() => onClose(message.id)}
        className="text-white hover:text-gray-200 font-bold text-xl"
      >
        ×
      </button>
    </div>
  );
}

interface ToastContainerProps {
  messages: ToastMessage[];
  onClose: (id: string) => void;
}

export function ToastContainer({ messages, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {messages.map((message) => (
        <Toast key={message.id} message={message} onClose={onClose} />
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setMessages((prev) => [...prev, { id, message, type }]);
  };

  const closeToast = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  return { messages, showToast, closeToast };
}

