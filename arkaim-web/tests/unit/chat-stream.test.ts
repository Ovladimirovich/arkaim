import { describe, expect, it } from 'vitest';
import { consumeChatStream } from '@/shared/realtime/chatStream';

/**
 * Разбор кадров POST /v1/stream (runtime/core/orchestrator.py):
 * text / related_entities / source+confidence+state / error / [DONE].
 * Регрессия: раньше /book читал только d.text и показывал «Получен пустой ответ.».
 */

function sseResponse(frames: Array<string | Record<string, unknown>>): Response {
  const body = frames
    .map(f => `data: ${typeof f === 'string' ? f : JSON.stringify(f)}\n\n`)
    .join('');
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

describe('consumeChatStream', () => {
  it('собирает текст, связи и провенанс из кадров стрима', async () => {
    const resp = sseResponse([
      { text: 'Ответ ' },
      { text: 'книги' },
      {
        related_entities: [{ entity_id: 'e1', entity_type: 'mythology', name: 'Велик' }],
        rationale: 'совпадение по имени',
      },
      {
        source: 'knowledge:theme',
        pulse_confidence: 0.8,
        llm_used: false,
        confidence_state: 'partial',
        uncertainty: { has_unknowns: true, unknown_aspects: ['точная хронология'] },
      },
      '[DONE]',
    ]);

    const result = await consumeChatStream(resp);

    expect(result.text).toBe('Ответ книги');
    expect(result.relatedEntities).toHaveLength(1);
    expect(result.relatedEntities[0].name).toBe('Велик');
    expect(result.source).toBe('knowledge:theme');
    expect(result.pulseConfidence).toBe(0.8);
    expect(result.llmUsed).toBe(false);
    expect(result.confidenceState).toBe('partial');
    expect(result.uncertainty?.has_unknowns).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('пустой стрим — пустой текст: вызывающий код делает фолбэк на /book/ask', async () => {
    const result = await consumeChatStream(sseResponse([]));
    expect(result.text).toBe('');
    expect(result.source).toBeUndefined();
  });

  it('кадр ошибки фиксируется, текст считается невалидным', async () => {
    const result = await consumeChatStream(sseResponse([{ error: 'empty_request' }, '[DONE]']));
    expect(result.error).toBe('empty_request');
    expect(result.text).toBe('');
  });

  it('отсутствующие поля не выдумываются', async () => {
    const result = await consumeChatStream(sseResponse([{ text: 'Просто текст' }, '[DONE]']));
    expect(result.text).toBe('Просто текст');
    expect(result.source).toBeUndefined();
    expect(result.confidenceState).toBeUndefined();
    expect(result.uncertainty).toBeUndefined();
    expect(result.relatedEntities).toEqual([]);
  });

  it('onText отдаёт накопленный текст после каждой дельты', async () => {
    const seen: string[] = [];
    await consumeChatStream(sseResponse([{ text: 'Мир' }, { text: ' книги' }]), {
      onText: t => seen.push(t),
    });
    expect(seen).toEqual(['Мир', 'Мир книги']);
  });
});
