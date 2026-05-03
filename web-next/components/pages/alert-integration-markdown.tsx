import React from 'react';
import { AlertIntegrationMermaid } from './alert-integration-mermaid';

type ListItem = {
  depth: number;
  text: string;
};

type TableRow = string[];

function parseTableRow(line: string): TableRow | null {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) {
    return null;
  }

  const withoutLeadingPipe = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
  const withoutOuterPipes = withoutLeadingPipe.endsWith('|') ? withoutLeadingPipe.slice(0, -1) : withoutLeadingPipe;
  const cells = withoutOuterPipes.split('|').map(cell => cell.trim());
  return cells.length >= 2 ? cells : null;
}

function isTableDivider(line: string) {
  const cells = parseTableRow(line);
  return Boolean(cells?.every(cell => /^:?-{3,}:?$/.test(cell)));
}

function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const inlinePattern = /(`[^`]+`|\*\*[^*]+\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = inlinePattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    const value = match[0];
    const key = `${keyPrefix}-inline-${match.index}`;
    if (value.startsWith('`') && value.endsWith('`')) {
      nodes.push(
        <code key={key} className="rounded-[3px] border border-[#303743] bg-[#101217] px-1 py-0.5 text-[12px] text-[#eef2f7]">
          {value.slice(1, -1)}
        </code>
      );
    } else if (value.startsWith('**') && value.endsWith('**')) {
      nodes.push(
        <strong key={key} data-alert-integration-markdown-strong="true" className="font-semibold text-[#e7edf7]">
          {renderInlineMarkdown(value.slice(2, -2), key)}
        </strong>
      );
    } else {
      const href = match[3] ?? '';
      nodes.push(
        <a
          key={key}
          href={href}
          className="text-[#d8e4ff] underline decoration-[#5d6b85] underline-offset-4 hover:text-[#f2f5f8]"
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noreferrer' : undefined}
        >
          {match[2]}
        </a>
      );
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes.length > 0 ? nodes : text;
}

function renderCodeBlock(code: string[], language: string, key: string) {
  const normalizedLanguage = language.trim().toLowerCase();
  const value = code.join('\n').trimEnd();

  if (normalizedLanguage === 'mermaid') {
    return <AlertIntegrationMermaid key={key} source={value} />;
  }

  return (
    <pre
      key={key}
      data-alert-integration-code-block={normalizedLanguage || 'plain'}
      className="my-3 mb-4 max-w-full overflow-x-auto rounded-[3px] border border-[#303743] bg-[#101217] px-4 py-3.5 text-[13px] leading-5 text-[#eef2f7]"
    >
      <code className={normalizedLanguage ? `language-${normalizedLanguage}` : undefined}>{value}</code>
    </pre>
  );
}

function renderHeading(line: string, key: string) {
  const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
  if (!headingMatch) {
    return null;
  }

  const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const headingClass =
    level === 1
      ? 'mt-1 text-[22px] font-semibold leading-tight text-[#f2f5f8]'
      : level === 2
        ? 'mt-7 text-[18px] font-semibold leading-tight text-[#f2f5f8]'
        : level === 3
          ? 'mt-5 text-[15px] font-semibold leading-tight text-[#f2f5f8]'
          : 'mt-4 text-[13px] font-semibold leading-tight text-[#e7edf7]';

  return (
    <Tag key={key} data-alert-integration-markdown-heading={String(level)} className={headingClass}>
      {renderInlineMarkdown(headingMatch[2], key)}
    </Tag>
  );
}

function renderTable(headers: TableRow, rows: TableRow[], key: string) {
  return (
    <div
      key={key}
      data-alert-integration-markdown-table="true"
      className="my-3 max-w-full overflow-x-auto rounded-[3px] border border-[#303743] bg-[#101217]"
    >
      <table className="min-w-full border-collapse text-left text-[12px] leading-5">
        <thead className="bg-[#151922] text-[#e7edf7]">
          <tr>
            {headers.map((header, index) => (
              <th key={`${key}-head-${index}`} className="border-b border-[#303743] px-3 py-2 font-semibold">
                {renderInlineMarkdown(header, `${key}-head-${index}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[#a9b0bb]">
          {rows.map((row, rowIndex) => (
            <tr key={`${key}-row-${rowIndex}`} className="border-b border-[#252b34] last:border-b-0">
              {headers.map((_, cellIndex) => (
                <td key={`${key}-row-${rowIndex}-cell-${cellIndex}`} className="px-3 py-2 align-top">
                  {renderInlineMarkdown(row[cellIndex] ?? '', `${key}-row-${rowIndex}-cell-${cellIndex}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AlertIntegrationMarkdown({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let codeFence: string[] | null = null;
  let codeFenceLanguage = '';
  let codeFenceIndent = '';
  let listType: 'ordered' | 'unordered' | null = null;
  let listItems: ListItem[] = [];

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      return;
    }

    const Tag = listType === 'ordered' ? 'ol' : 'ul';
    nodes.push(
      <Tag
        key={`list-${nodes.length}`}
        data-alert-integration-markdown-list={listType}
        className={listType === 'ordered' ? 'my-2 list-decimal space-y-1 pl-5' : 'my-2 list-disc space-y-1 pl-5'}
      >
        {listItems.map((item, index) => (
          <li
            key={`${listType}-${index}-${item.text}`}
            className="leading-7 text-[#a9b0bb]"
            style={item.depth > 0 ? { marginLeft: item.depth * 16 } : undefined}
          >
            {renderInlineMarkdown(item.text, `${listType}-${index}`)}
          </li>
        ))}
      </Tag>
    );

    listType = null;
    listItems = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^(\s*)```([A-Za-z0-9_-]*)\s*$/);

    if (fenceMatch) {
      if (codeFence) {
        nodes.push(renderCodeBlock(codeFence, codeFenceLanguage, `code-${index}`));
        codeFence = null;
        codeFenceLanguage = '';
        codeFenceIndent = '';
        continue;
      }

      flushList();
      codeFence = [];
      codeFenceIndent = fenceMatch[1];
      codeFenceLanguage = fenceMatch[2] ?? '';
      continue;
    }

    if (codeFence) {
      codeFence.push(codeFenceIndent && line.startsWith(codeFenceIndent) ? line.slice(codeFenceIndent.length) : line);
      continue;
    }

    const trimmedStart = line.trimStart();
    if (trimmedStart.length === 0) {
      flushList();
      continue;
    }

    const heading = renderHeading(trimmedStart, `heading-${index}`);
    if (heading) {
      flushList();
      nodes.push(heading);
      continue;
    }

    const tableHeader = parseTableRow(trimmedStart);
    const nextLine = lines[index + 1] ?? '';
    if (tableHeader && isTableDivider(nextLine)) {
      const rows: TableRow[] = [];
      let rowIndex = index + 2;
      while (rowIndex < lines.length) {
        const row = parseTableRow(lines[rowIndex]);
        if (!row) {
          break;
        }
        rows.push(row);
        rowIndex += 1;
      }

      flushList();
      nodes.push(renderTable(tableHeader, rows, `table-${index}`));
      index = rowIndex - 1;
      continue;
    }

    const orderedListMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (orderedListMatch) {
      if (listType && listType !== 'ordered') {
        flushList();
      }
      listType = 'ordered';
      listItems.push({ depth: Math.floor(orderedListMatch[1].length / 2), text: orderedListMatch[2] });
      continue;
    }

    const unorderedListMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (unorderedListMatch) {
      if (listType && listType !== 'unordered') {
        flushList();
      }
      listType = 'unordered';
      listItems.push({ depth: Math.floor(unorderedListMatch[1].length / 2), text: unorderedListMatch[2] });
      continue;
    }

    flushList();

    const quoteMatch = trimmedStart.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      nodes.push(
        <blockquote
          key={`quote-${index}`}
          data-alert-integration-markdown-quote="true"
          className="my-3 border-l border-[#31405c] bg-[#101217] px-3 py-2 text-[13px] leading-7 text-[#a9b0bb]"
        >
          {renderInlineMarkdown(quoteMatch[1], `quote-${index}`)}
        </blockquote>
      );
      continue;
    }

    nodes.push(
      <p key={`p-${index}`} className="leading-7 text-[#a9b0bb]">
        {renderInlineMarkdown(trimmedStart, `p-${index}`)}
      </p>
    );
  }

  flushList();

  if (codeFence) {
    nodes.push(renderCodeBlock(codeFence, codeFenceLanguage, 'code-open'));
  }

  return (
    <div data-alert-integration-markdown="rendered" className="space-y-2 text-[13px]">
      {nodes}
    </div>
  );
}
