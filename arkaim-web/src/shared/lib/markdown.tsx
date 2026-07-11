'use client';

import { Typography } from 'antd';

const { Text, Paragraph } = Typography;

/**
 * Простой markdown-рендерер для ответов книги.
 * Поддерживает: жирный, курсив, код, списки, ссылки.
 */
export function Markdown({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div>
      {lines.map((line, i) => {
        // Пустая строка
        if (!line.trim()) return <div key={i} style={{ height: 8 }} />;

        // Списки
        if (line.match(/^[\s]*[-*]\s/)) {
          return <div key={i} style={{ paddingLeft: 16 }}>• {renderInline(line.replace(/^[\s]*[-*]\s/, ''))}</div>;
        }
        if (line.match(/^[\s]*\d+\.\s/)) {
          return <div key={i} style={{ paddingLeft: 16 }}>{renderInline(line.replace(/^[\s]*\d+\.\s/, ''))}</div>;
        }

        // Заголовки
        if (line.startsWith('### ')) return <Paragraph key={i} strong style={{ marginTop: 12 }}>{renderInline(line.slice(4))}</Paragraph>;
        if (line.startsWith('## ')) return <Paragraph key={i} strong style={{ marginTop: 16, fontSize: '1.1em' }}>{renderInline(line.slice(3))}</Paragraph>;
        if (line.startsWith('# ')) return <Paragraph key={i} strong style={{ marginTop: 20, fontSize: '1.2em' }}>{renderInline(line.slice(2))}</Paragraph>;

        // Блоки кода
        if (line.startsWith('```')) return <div key={i} style={{ height: 4 }} />;

        // Обычный текст
        return <Paragraph key={i} style={{ margin: '2px 0' }}>{renderInline(line)}</Paragraph>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  // Жирный: **text**
  // Курсив: *text*
  // Код: `code`
  // Ссылки: [text](url)

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    // Код
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>);
      parts.push(<code key={key++} style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3, fontSize: '0.9em' }}>{codeMatch[2]}</code>);
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Жирный
    const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*/);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
      parts.push(<Text key={key++} strong>{boldMatch[2]}</Text>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Курсив
    const italicMatch = remaining.match(/^(.*?)\*([^*]+)\*/);
    if (italicMatch) {
      if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>);
      parts.push(<Text key={key++} italic>{italicMatch[2]}</Text>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Ссылки
    const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      if (linkMatch[1]) parts.push(<span key={key++}>{linkMatch[1]}</span>);
      parts.push(<a key={key++} href={linkMatch[3]} target="_blank" rel="noopener noreferrer">{linkMatch[2]}</a>);
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Остаток текста
    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }

  return parts;
}
