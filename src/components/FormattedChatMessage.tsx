import React from 'react';

interface FormattedChatMessageProps {
  content: string;
  isUser?: boolean;
}

// Parses inline markdown: **bold**, *italic*, `code`, and highlighting
function renderInlineMarkdown(text: string, isUser: boolean = false): React.ReactNode[] {
  // Regex to match **bold**, *italic*, `code`
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong
          key={index}
          className={isUser ? 'font-bold text-white' : 'font-bold text-slate-900'}
        >
          {renderInlineMarkdown(inner, isUser)}
        </strong>
      );
    }

    // Italic *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <em key={index} className="italic">
          {renderInlineMarkdown(inner, isUser)}
        </em>
      );
    }

    // Inline Code `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={index}
          className={
            isUser
              ? 'px-1.5 py-0.5 rounded bg-emerald-700/80 text-white font-mono text-[11px] border border-emerald-500/50'
              : 'px-1.5 py-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-[11px] border border-slate-200 font-semibold'
          }
        >
          {inner}
        </code>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

export function FormattedChatMessage({ content, isUser = false }: FormattedChatMessageProps) {
  if (isUser) {
    return (
      <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
        {renderInlineMarkdown(content, true)}
      </div>
    );
  }

  // Parse blocks (headers, lists, tables, paragraphs)
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line
    if (!trimmed) {
      i++;
      continue;
    }

    // Markdown Table detection (starts with |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && lines[i + 1]?.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        
        const isSeparator = tableLines[1].replace(/[-| :]/g, '').length === 0;
        const bodyRows = tableLines.slice(isSeparator ? 2 : 1).map((r) =>
          r
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        elements.push(
          <div key={`table-${elements.length}`} className="my-2.5 overflow-x-auto rounded-lg border border-slate-200 shadow-2xs">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  {headerRow.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider">
                      {renderInlineMarkdown(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-1.5 text-slate-800 font-medium whitespace-nowrap">
                        {renderInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Heading: ### or ## or #
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h-${elements.length}`} className="text-xs sm:text-sm font-bold text-indigo-900 mt-2.5 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
          <span>{renderInlineMarkdown(trimmed.replace(/^###\s+/, ''))}</span>
        </h4>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      elements.push(
        <h3 key={`h-${elements.length}`} className="text-sm font-bold text-slate-900 mt-3 mb-1.5 border-b border-slate-100 pb-1">
          {renderInlineMarkdown(trimmed.replace(/^#+\s+/, ''))}
        </h3>
      );
      i++;
      continue;
    }

    // Numbered List (e.g. "1. ", "2. ")
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: { num: string; text: string }[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemLine = lines[i].trim();
        const match = itemLine.match(/^(\d+)\.\s+(.*)/);
        if (match) {
          listItems.push({ num: match[1], text: match[2] });
        }
        i++;
      }

      elements.push(
        <ol key={`ol-${elements.length}`} className="space-y-1.5 my-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start space-x-2 text-xs sm:text-sm text-slate-800">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100 shrink-0 mt-0.5">
                {item.num}
              </span>
              <span className="flex-1 leading-relaxed">{renderInlineMarkdown(item.text)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Bullet List (e.g. "- ", "* ")
    if (/^[-*]\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }

      elements.push(
        <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start space-x-2 text-xs sm:text-sm text-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
              <span className="flex-1 leading-relaxed">{renderInlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Normal Paragraph
    elements.push(
      <p key={`p-${elements.length}`} className="text-xs sm:text-sm text-slate-800 leading-relaxed my-1">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1.5">{elements}</div>;
}
