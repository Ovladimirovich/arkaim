'use client';

/**
 * chatStream.ts — сбор ответа POST /v1/stream в один типизированный результат.
 *
 * Backend отдаёт стрим из кадров (runtime/core/orchestrator.py):
 *   {"text": "..."}                              — дельты текста ответа;
 *   {"related_entities": [...], "rationale": ...} — связи с World (EntityCard);
 *   {"source", "pulse_confidence", "llm_used",
 *    "confidence_state", "uncertainty"}          — провенанс (SourceBadge);
 *   {"error": "..."}                             — честный кадр ошибки;
 *   [DONE]                                       — маркер завершения (не JSON).
 *
 * Правило проекта: показываются только реально присланные поля — отсутствующие
 * значения не подставляются и не выдумываются.
 */

import { consumeSseResponse } from '@/shared/realtime/sse';
import type { AskAnswer, RelatedEntity } from '@/shared/api/contracts/book';

export type ChatStreamResult = {
  /** Накопленный текст ответа ("" — стрим пуст, вызывающий код обязан сделать фолбэк). */
  text: string;
  relatedEntities: RelatedEntity[];
  source?: string;
  pulseConfidence?: number;
  llmUsed?: boolean;
  confidenceState?: string | null;
  uncertainty?: AskAnswer['uncertainty'];
  /** Кадр {"error": ...} от backend: стрим завершился ошибкой. */
  error?: string;
};

export type ConsumeChatStreamOptions = {
  /** Вызывается после каждой текстовой дельты с накопленным текстом (для «живого» показа). */
  onText?: (fullText: string) => void;
};

/** Прочитать SSE-ответ /v1/stream и собрать все кадры ответа. */
export async function consumeChatStream(resp: Response, opts?: ConsumeChatStreamOptions): Promise<ChatStreamResult> {
  const result: ChatStreamResult = { text: '', relatedEntities: [] };

  await consumeSseResponse(resp, {
    onEvent: ({ data }) => {
      if (typeof data !== 'object' || data === null) return;
      const frame = data as Record<string, unknown>;
      if (typeof frame.text === 'string') {
        result.text += frame.text;
        opts?.onText?.(result.text);
      }
      if (Array.isArray(frame.related_entities)) {
        result.relatedEntities = frame.related_entities as RelatedEntity[];
      }
      if (typeof frame.source === 'string') result.source = frame.source;
      if (typeof frame.pulse_confidence === 'number') result.pulseConfidence = frame.pulse_confidence;
      if (typeof frame.llm_used === 'boolean') result.llmUsed = frame.llm_used;
      if (typeof frame.confidence_state === 'string' || frame.confidence_state === null) {
        result.confidenceState = frame.confidence_state as string | null;
      }
      if (typeof frame.uncertainty === 'object' && frame.uncertainty !== null) {
        result.uncertainty = frame.uncertainty as AskAnswer['uncertainty'];
      }
      if (typeof frame.error === 'string') result.error = frame.error;
    },
  });

  return result;
}
