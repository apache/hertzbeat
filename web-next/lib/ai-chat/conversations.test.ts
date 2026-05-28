import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAiChatConversation,
  deleteAiChatConversation,
  loadAiChatConversationHistory,
  loadAiChatConversations,
  mapAiChatConversationHistory,
  mapAiChatConversations,
  parseAiChatStreamData,
  streamAiChatResponse
} from './conversations';

vi.mock('@/lib/api-client', () => ({
  apiMessageGet: vi.fn(),
  apiMessageDelete: vi.fn(),
  apiMessagePost: vi.fn()
}));

describe('AI chat conversations controller', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps Angular chat conversation records into shared modal rows', () => {
    const state = mapAiChatConversations([
      { id: 7, title: 'Checkout incident review', gmtUpdate: '2026-05-24T10:00:00Z' },
      { id: 8, title: 'Collector health', gmtCreated: '2026-05-24T09:00:00Z' }
    ]);

    expect(state.status).toBe('ready');
    expect(state.statusLabelKey).toBe('ai.chat.conversation.ready');
    expect(state.conversations).toHaveLength(2);
    expect(state.conversations[0]).toMatchObject({
      id: 7,
      title: 'Checkout incident review',
      active: true
    });
    expect(state.conversations[1]).toMatchObject({
      id: 8,
      title: 'Collector health',
      active: false
    });
  });

  it('keeps an explicit empty state when the conversation API returns no rows', () => {
    const state = mapAiChatConversations([]);

    expect(state).toEqual({
      status: 'empty',
      conversations: [],
      statusLabelKey: 'ai.chat.conversation.empty'
    });
  });

  it('degrades the shell instead of throwing when the BFF conversation read fails', async () => {
    const { apiMessageGet } = await import('@/lib/api-client');
    vi.mocked(apiMessageGet).mockRejectedValueOnce(new Error('401'));

    await expect(loadAiChatConversations()).resolves.toEqual({
      status: 'error',
      conversations: [
        {
          id: 0,
          title: 'Offline Conversation',
          subtitle: 'API unavailable',
          active: true
        }
      ],
      statusLabelKey: 'ai.chat.conversation.error'
    });
  });

  it('maps selected Angular conversation history into shared message rows', () => {
    const state = mapAiChatConversationHistory({
      id: 7,
      title: 'Checkout incident review',
      messages: [
        { role: 'user', content: 'Why did checkout fail?' },
        { role: 'assistant', content: 'The collector reported a timeout.' },
        { role: 'system_push', content: 'SOP report attached.' },
        { role: 'assistant', content: '   ' }
      ]
    });

    expect(state.status).toBe('ready');
    expect(state.statusLabelKey).toBe('ai.chat.history.ready');
    expect(state.conversationId).toBe(7);
    expect(state.messages).toEqual([
      { role: 'user', labelKey: 'ai.chat.user', content: 'Why did checkout fail?' },
      { role: 'assistant', labelKey: 'ai.chat.assistant', content: 'The collector reported a timeout.' },
      { role: 'system', labelKey: 'ai.chat.system', content: 'SOP report attached.' }
    ]);
  });

  it('keeps an explicit empty state when the selected conversation has no history', () => {
    const state = mapAiChatConversationHistory({ id: 8, messages: [] });

    expect(state).toEqual({
      status: 'empty',
      messages: [],
      statusLabelKey: 'ai.chat.history.empty',
      conversationId: 8
    });
  });

  it('degrades selected conversation history instead of throwing when the detail read fails', async () => {
    const { apiMessageGet } = await import('@/lib/api-client');
    vi.mocked(apiMessageGet).mockRejectedValueOnce(new Error('500'));

    await expect(loadAiChatConversationHistory(9)).resolves.toEqual({
      status: 'error',
      messages: [],
      statusLabelKey: 'ai.chat.history.error',
      conversationId: 9
    });
  });

  it('creates a new conversation through the Angular POST endpoint and returns an active row', async () => {
    const { apiMessagePost } = await import('@/lib/api-client');
    vi.mocked(apiMessagePost).mockResolvedValueOnce({
      id: 10,
      title: 'New assistant conversation',
      gmtUpdate: '2026-05-24T12:00:00Z',
      messages: []
    });

    await expect(createAiChatConversation()).resolves.toMatchObject({
      status: 'ready',
      conversation: {
        id: 10,
        title: 'New assistant conversation',
        active: true
      },
      statusLabelKey: 'ai.chat.conversation.ready'
    });
  });

  it('falls back to an offline conversation when new conversation creation fails', async () => {
    const { apiMessagePost } = await import('@/lib/api-client');
    vi.mocked(apiMessagePost).mockRejectedValueOnce(new Error('503'));

    await expect(createAiChatConversation()).resolves.toEqual({
      status: 'error',
      conversation: {
        id: 0,
        title: 'Offline Conversation',
        subtitle: 'API unavailable',
        active: true
      },
      statusLabelKey: 'ai.chat.conversation.error'
    });
  });

  it('deletes a conversation through the Angular DELETE endpoint', async () => {
    const { apiMessageDelete } = await import('@/lib/api-client');
    vi.mocked(apiMessageDelete).mockResolvedValueOnce(undefined);

    await expect(deleteAiChatConversation(10)).resolves.toEqual({
      status: 'ready',
      conversationId: 10,
      statusLabelKey: 'ai.chat.conversation.ready'
    });
  });

  it('reports a delete error without throwing when the DELETE endpoint fails', async () => {
    const { apiMessageDelete } = await import('@/lib/api-client');
    vi.mocked(apiMessageDelete).mockRejectedValueOnce(new Error('503'));

    await expect(deleteAiChatConversation(10)).resolves.toEqual({
      status: 'error',
      conversationId: 10,
      statusLabelKey: 'ai.chat.conversation.error'
    });
  });

  it('parses Angular SSE stream chunks and raw fallback data', () => {
    expect(parseAiChatStreamData('{"response":"hello","timestamp":"2026-05-24T12:00:00Z"}')).toMatchObject({
      content: 'hello',
      role: 'assistant',
      gmtCreate: new Date('2026-05-24T12:00:00Z')
    });
    expect(parseAiChatStreamData('plain assistant text')).toMatchObject({
      content: 'plain assistant text',
      role: 'assistant'
    });
    expect(parseAiChatStreamData('[DONE]')).toBeNull();
  });

  it('streams chat through /api/chat/stream and emits assistant chunks', async () => {
    const chunks: string[] = [];
    const encoder = new TextEncoder();
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"response":"Hel","timestamp":"2026-05-24T12:00:00Z"}\n'));
          controller.enqueue(encoder.encode('data: {"response":"lo"}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        }
      }),
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
    );
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);

    await streamAiChatResponse('Summarize checkout errors', {
      conversationId: 10,
      onChunk: chunk => chunks.push(chunk.content)
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/chat/stream', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json'
      }),
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify({ message: 'Summarize checkout errors', conversationId: 10 })
    }));
    expect(chunks).toEqual(['Hel', 'lo']);
  });

  it('fails the stream when the SSE endpoint returns a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(streamAiChatResponse('hello', { conversationId: 10, onChunk: () => {} })).rejects.toThrow(
      'AI chat stream failed with status 503'
    );
  });
});
