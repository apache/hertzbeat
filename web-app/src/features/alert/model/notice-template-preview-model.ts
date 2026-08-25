/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export type NoticeTemplatePreviewToken = {
  end: number;
  matchIndex: number | null;
  start: number;
};

export function noticeTemplateBodyOffset(content: string): number | null {
  const commentStart = content.search(/\S/);
  if (commentStart < 0) return null;
  const comment = leadingCommentBoundary(content, commentStart);
  if (!comment) return null;
  const commentEnd = content.indexOf(comment.close, commentStart + comment.open.length);
  if (commentEnd < 0) return null;
  const afterComment = commentEnd + comment.close.length;
  const bodyStart = content.slice(afterComment).search(/\S/);
  return bodyStart < 0 ? null : afterComment + bodyStart;
}

function leadingCommentBoundary(content: string, start: number) {
  if (content.startsWith('/*', start)) return { open: '/*', close: '*/' };
  if (content.startsWith('<!--', start)) return { open: '<!--', close: '-->' };
  return null;
}

export function noticeTemplateMatches(content: string, query: string) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];
  const haystack = content.toLocaleLowerCase();
  const matches: Array<{ end: number; start: number }> = [];
  let cursor = 0;
  while (cursor < haystack.length) {
    const start = haystack.indexOf(needle, cursor);
    if (start < 0) break;
    matches.push({ start, end: start + needle.length });
    cursor = start + needle.length;
  }
  return matches;
}

export function noticeTemplatePreviewTokens(
  contentLength: number,
  matches: Array<{ end: number; start: number }>,
  bodyOffset: number | null
): NoticeTemplatePreviewToken[] {
  const boundaries = new Set([0, contentLength]);
  if (bodyOffset != null) boundaries.add(bodyOffset);
  for (const match of matches) {
    boundaries.add(match.start);
    boundaries.add(match.end);
  }
  const points = [...boundaries].sort((left, right) => left - right);
  let matchIndex = 0;
  return points.slice(0, -1).map((start, index) => {
    const end = points[index + 1]!;
    while (matches[matchIndex] && matches[matchIndex]!.end <= start) matchIndex += 1;
    const match = matches[matchIndex];
    return {
      start,
      end,
      matchIndex: match && match.start <= start && match.end >= end ? matchIndex : null
    };
  });
}
