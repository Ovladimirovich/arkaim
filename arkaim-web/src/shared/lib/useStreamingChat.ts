'use client';

import { useState, useCallback } from 'react';
import { api } from '@/shared/lib/api';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  time?: string;
  sourceType?: 'pulse' | 'llm' | 'hybrid' | 'mock';
};

type UseStreamingChatOptions = {
  onMessage?: (msg: Message) => void;
};

export function useStreamingChat(opts?: UseStreamingChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const now = () => new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });

  const sendMessage = useCallback(async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || sending) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: q, time: now() };
    setMessages(prev => [...prev, userMsg]);
    opts?.onMessage?.(userMsg);
    setSending(true);
    setStreamingText('');

    try {
      const resp = await fetch('/v1/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ messages: [{ role: 'user', content: q }] }),
      });

      if (resp.ok && resp.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = resp.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.text) { fullText += data.text; setStreamingText(fullText); }
                } catch {}
              }
            }
          }
          if (buffer.startsWith('data: ')) {
            try {
              const data = JSON.parse(buffer.slice(6));
              if (data.text) { fullText += data.text; setStreamingText(fullText); }
            } catch {}
          }
        }
        const assistantMsg: Message = { role: 'assistant', content: fullText || 'Получен пустой ответ.', sourceType: 'hybrid', time: now() };
        setMessages(prev => [...prev, assistantMsg]);
        opts?.onMessage?.(assistantMsg);
      } else {
        const result = await api.post<{ data: { answer: string; source?: string } }>('/book/ask', { question: q });
        const sourceType = result.data.source === 'mock' ? 'mock' : result.data.source?.includes('pulse') ? 'pulse' : 'llm';
        const assistantMsg: Message = { role: 'assistant', content: result.data.answer, source: result.data.source, sourceType, time: now() };
        setMessages(prev => [...prev, assistantMsg]);
        opts?.onMessage?.(assistantMsg);
      }
    } catch {
      const errorMsg: Message = { role: 'assistant', content: 'Извините, произошла ошибка. Попробуйте позже.', sourceType: 'mock', time: now() };
      setMessages(prev => [...prev, errorMsg]);
      opts?.onMessage?.(errorMsg);
    } finally {
      setSending(false);
      setStreamingText('');
    }
  }, [input, sending, opts]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setInput('');
    setStreamingText('');
  }, []);

  return { messages, setMessages, input, setInput, sending, streamingText, sendMessage, clearMessages };
}

export type { Message };
