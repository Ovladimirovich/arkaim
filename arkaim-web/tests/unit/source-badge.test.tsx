import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

import { SourceBadge } from '@/shared/ui/SourceBadge';

/**
 * B3 (FRONTEND_RESTORE_BACKLOG) + P0: бейдж читает реальные поля AskAnswer
 * (source, pulse_confidence, llm_used, confidence_state, uncertainty) и
 * НЕ выдумывает источник, когда backend его не прислал.
 * P0: три состояния (confirmed / partial / insufficient) отражаются
 * честными тегами, а не арифметикой confidence.
 */
describe('SourceBadge', () => {
  it('renders nothing without source (SSE path has no source field)', () => {
    const { container } = render(<SourceBadge />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing for undefined source (field absent in event)', () => {
    const { container } = render(<SourceBadge source={undefined} confidence={0.9} llmUsed />);
    expect(container.innerHTML).toBe('');
  });

  it('maps "pulse" to Genome label', () => {
    render(<SourceBadge source="pulse" />);
    expect(screen.getByText(/Геном/)).toBeTruthy();
  });

  it('maps "knowledge:rag" to Knowledge base label', () => {
    render(<SourceBadge source="knowledge:rag" />);
    expect(screen.getByText(/База знаний/)).toBeTruthy();
  });

  it('maps "knowledge:catalog_text" to Knowledge base label', () => {
    render(<SourceBadge source="knowledge:catalog_text" />);
    expect(screen.getByText(/База знаний/)).toBeTruthy();
  });

  it('maps "silence" to "Нет ответа в книге" label', () => {
    render(<SourceBadge source="silence" />);
    expect(screen.getByText(/Нет ответа в книге/)).toBeTruthy();
  });

  it('maps "knowledge:theme" to Theme label', () => {
    render(<SourceBadge source="knowledge:theme" />);
    expect(screen.getByText(/Тема книги/)).toBeTruthy();
  });

  it('maps "mock" to stub label', () => {
    render(<SourceBadge source="mock" />);
    expect(screen.getByText(/Заглушка/)).toBeTruthy();
  });

  it('maps unknown source value to voice label (backend default)', () => {
    render(<SourceBadge source="something_else" />);
    expect(screen.getByText(/Голос книги/)).toBeTruthy();
  });

  it('shows pulse confidence as percent for value in 0..1', () => {
    render(<SourceBadge source="pulse" confidence={0.85} />);
    expect(screen.getByText(/85%/)).toBeTruthy();
  });

  it('hides confidence outside 0..1 instead of inventing a percent', () => {
    render(<SourceBadge source="pulse" confidence={2.5} />);
    expect(screen.queryByText(/%$/)).toBeNull();
  });

  it('hides confidence when field is absent', () => {
    render(<SourceBadge source="pulse" />);
    expect(screen.queryByText(/%$/)).toBeNull();
  });

  it('shows AI-synthesis tag only when llm_used is true', () => {
    const { rerender } = render(<SourceBadge source="pulse" llmUsed />);
    expect(screen.getByText(/AI-синтез/)).toBeTruthy();

    rerender(<SourceBadge source="pulse" llmUsed={false} />);
    expect(screen.queryByText(/AI-синтез/)).toBeNull();
  });

  it('shows "Частичный ответ" tag for partial state', () => {
    render(
      <SourceBadge
        source="knowledge:catalog_text"
        confidenceState="partial"
        uncertainty={{ has_unknowns: true, unknown_aspects: ['фрагмент книги'] }}
      />,
    );
    expect(screen.getByText(/Частичный ответ/)).toBeTruthy();
  });

  it('shows "В книге нет ответа" tag for insufficient state', () => {
    render(<SourceBadge source="silence" confidenceState="insufficient" />);
    expect(screen.getByText(/В книге нет ответа/)).toBeTruthy();
  });

  it('does not invent a state tag when field is missing', () => {
    render(<SourceBadge source="pulse" confidence={0.9} />);
    expect(screen.queryByText(/Частичный ответ/)).toBeNull();
    expect(screen.queryByText(/В книге нет ответа/)).toBeNull();
  });

  it('confirmed state renders no extra ambiguity tag', () => {
    render(<SourceBadge source="knowledge:character" confidenceState="confirmed" />);
    expect(screen.queryByText(/Частичный ответ/)).toBeNull();
    expect(screen.queryByText(/В книге нет ответа/)).toBeNull();
  });

  it('shows raw source in accessible tooltip text', () => {
    render(<SourceBadge source="knowledge:rag" confidence={0.5} llmUsed />);
    const tag = screen.getByText(/База знаний/).closest('span');
    expect(tag).toBeTruthy();
  });
});
