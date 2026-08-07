'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Отключаем SW в dev-режиме — вызывает конфликты с HMR и кэширование старых ответов
    if (process.env.NODE_ENV === 'development') return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — silently ignore
    });
  }, []);

  return null;
}
