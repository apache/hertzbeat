import type { HzAiChatConversationPreview, HzAiChatConversationStatus, HzAiChatMessageStatus } from '@hertzbeat/ui';
import { apiMessageDelete, apiMessageGet, apiMessagePost } from '@/lib/api-client';

const AI_CHAT_FETCH_TIMEOUT_MS = 3500;

type RawChatMessage = {
  content?: string | null;
  role?: 'user' | 'assistant' | 'system' | 'system_push' | string | null;
  gmtCreate?: string | number | Date | null;
  createTime?: string | number | Date | null;
};

type RawChatConversation = {
  id?: string | number | null;
  title?: string | null;
  gmtUpdate?: string | number | Date | null;
  gmtUpdated?: string | number | Date | null;
  updateTime?: string | number | Date | null;
  updatedAt?: string | number | Date | null;
  gmtCreated?: string | number | Date | null;
  createTime?: string | number | Date | null;
  messages?: RawChatMessage[] | null;
};

export type AiChatConversationMessage = {
  role: 'user' | 'assistant' | 'system';
  labelKey: string;
  content: string;
};

export type AiChatConversationListState = {
  status: HzAiChatConversationStatus;
  conversations: HzAiChatConversationPreview[];
  statusLabelKey: string;
};

export type AiChatConversationHistoryState = {
  status: HzAiChatMessageStatus;
  messages: AiChatConversationMessage[];
  statusLabelKey: string;
  conversationId?: string | number;
};

export type AiChatConversationCreateState = {
  status: 'ready' | 'error';
  conversation: HzAiChatConversationPreview;
  statusLabelKey: string;
};

export type AiChatConversationDeleteState = {
  status: 'ready' | 'error';
  conversationId: string | number;
  statusLabelKey: string;
};

export type AiChatStreamChunk = {
  content: string;
  role: 'assistant';
  gmtCreate: Date;
};

export type AiChatStreamOptions = {
  conversationId?: string | number | null;
  signal?: AbortSignal;
  onChunk: (chunk: AiChatStreamChunk) => void;
};

export const AI_CHAT_CONVERSATION_STATUS_LABEL_KEYS = {
  loading: 'ai.chat.conversation.loading',
  ready: 'ai.chat.conversation.ready',
  empty: 'ai.chat.conversation.empty',
  error: 'ai.chat.conversation.error'
} as const satisfies Record<HzAiChatConversationStatus, string>;

export const AI_CHAT_MESSAGE_STATUS_LABEL_KEYS = {
  idle: 'ai.chat.history.idle',
  loading: 'ai.chat.history.loading',
  ready: 'ai.chat.history.ready',
  empty: 'ai.chat.history.empty',
  error: 'ai.chat.history.error'
} as const satisfies Record<HzAiChatMessageStatus, string>;

export const AI_CHAT_MESSAGE_ROLE_LABEL_KEYS = {
  user: 'ai.chat.user',
  assistant: 'ai.chat.assistant',
  system: 'ai.chat.system'
} as const satisfies Record<AiChatConversationMessage['role'], string>;

export function parseAiChatStreamData(raw: string): AiChatStreamChunk | null {
  const json = raw.trim();
  if (!json || json === '[DONE]') return null;

  try {
    const data = JSON.parse(json) as { response?: unknown; timestamp?: string | number | Date | null };
    if (data.response === undefined) return null;
    return {
      content: String(data.response || ''),
      role: 'assistant',
      gmtCreate: data.timestamp ? new Date(data.timestamp) : new Date()
    };
  } catch {
    return {
      content: json,
      role: 'assistant',
      gmtCreate: new Date()
    };
  }
}

async function apiMessageGetWithTimeout<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), AI_CHAT_FETCH_TIMEOUT_MS);
  try {
    return await apiMessageGet<T>(path, { signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function promiseWithAiChatTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = globalThis.setTimeout(() => {
          reject(new Error('AI chat request timed out'));
        }, AI_CHAT_FETCH_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeout) {
      globalThis.clearTimeout(timeout);
    }
  }
}

function formatConversationTime(value: RawChatConversation[keyof RawChatConversation]) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString();
}

export function buildOfflineAiChatConversation(): HzAiChatConversationPreview {
  return {
    id: 0,
    title: 'Offline Conversation',
    subtitle: 'API unavailable',
    active: true
  };
}

export function mapAiChatConversationPreview(conversation: RawChatConversation, index = 0): HzAiChatConversationPreview {
  const updated =
    conversation.gmtUpdate ??
    conversation.gmtUpdated ??
    conversation.updateTime ??
    conversation.updatedAt ??
    conversation.gmtCreated ??
    conversation.createTime;
  return {
    id: conversation.id ?? `conversation-${index}`,
    title: conversation.title?.trim() || `Conversation ${index + 1}`,
    subtitle: formatConversationTime(updated),
    active: index === 0
  };
}

export function mapAiChatConversations(raw: RawChatConversation[] | null | undefined): AiChatConversationListState {
  const rows = (raw || [])
    .map((conversation, index): HzAiChatConversationPreview | null => mapAiChatConversationPreview(conversation, index))
    .filter((conversation): conversation is HzAiChatConversationPreview => conversation !== null);

  return {
    status: rows.length > 0 ? 'ready' : 'empty',
    conversations: rows,
    statusLabelKey: rows.length > 0 ? AI_CHAT_CONVERSATION_STATUS_LABEL_KEYS.ready : AI_CHAT_CONVERSATION_STATUS_LABEL_KEYS.empty
  };
}

function normalizeMessageRole(role: RawChatMessage['role']): AiChatConversationMessage['role'] {
  if (role === 'user' || role === 'assistant') return role;
  return 'system';
}

export function mapAiChatConversationHistory(
  raw: RawChatConversation | null | undefined,
  conversationId?: string | number
): AiChatConversationHistoryState {
  const messages = (raw?.messages || [])
    .map(message => {
      const content = message.content?.trim();
      if (!content) return null;
      const role = normalizeMessageRole(message.role);
      return {
        role,
        labelKey: AI_CHAT_MESSAGE_ROLE_LABEL_KEYS[role],
        content
      };
    })
    .filter((message): message is AiChatConversationMessage => message !== null);

  return {
    status: messages.length > 0 ? 'ready' : 'empty',
    messages,
    statusLabelKey: messages.length > 0 ? AI_CHAT_MESSAGE_STATUS_LABEL_KEYS.ready : AI_CHAT_MESSAGE_STATUS_LABEL_KEYS.empty,
    conversationId: raw?.id ?? conversationId
  };
}

export async function loadAiChatConversations(): Promise<AiChatConversationListState> {
  try {
    return mapAiChatConversations(await apiMessageGetWithTimeout<RawChatConversation[]>('/chat/conversations'));
  } catch {
    return {
      status: 'error',
      conversations: [buildOfflineAiChatConversation()],
      statusLabelKey: AI_CHAT_CONVERSATION_STATUS_LABEL_KEYS.error
    };
  }
}

export async function createAiChatConversation(): Promise<AiChatConversationCreateState> {
  try {
    return {
      status: 'ready',
      conversation: {
        ...mapAiChatConversationPreview(
          await promiseWithAiChatTimeout(apiMessagePost<RawChatConversation>('/chat/conversations', {})),
          0
        ),
        active: true
      },
      statusLabelKey: AI_CHAT_CONVERSATION_STATUS_LABEL_KEYS.ready
    };
  } catch {
    return {
      status: 'error',
      conversation: buildOfflineAiChatConversation(),
      statusLabelKey: AI_CHAT_CONVERSATION_STATUS_LABEL_KEYS.error
    };
  }
}

export async function deleteAiChatConversation(conversationId: string | number): Promise<AiChatConversationDeleteState> {
  try {
    const encodedConversationId = encodeURIComponent(String(conversationId));
    await promiseWithAiChatTimeout(apiMessageDelete<void>(`/chat/conversations/${encodedConversationId}`));
    return {
      status: 'ready',
      conversationId,
      statusLabelKey: AI_CHAT_CONVERSATION_STATUS_LABEL_KEYS.ready
    };
  } catch {
    return {
      status: 'error',
      conversationId,
      statusLabelKey: AI_CHAT_CONVERSATION_STATUS_LABEL_KEYS.error
    };
  }
}

export async function loadAiChatConversationHistory(conversationId: string | number): Promise<AiChatConversationHistoryState> {
  try {
    const encodedConversationId = encodeURIComponent(String(conversationId));
    return mapAiChatConversationHistory(
      await apiMessageGetWithTimeout<RawChatConversation>(`/chat/conversations/${encodedConversationId}`),
      conversationId
    );
  } catch {
    return {
      status: 'error',
      messages: [],
      statusLabelKey: AI_CHAT_MESSAGE_STATUS_LABEL_KEYS.error,
      conversationId
    };
  }
}

export async function streamAiChatResponse(message: string, options: AiChatStreamOptions): Promise<void> {
  const requestBody: { message: string; conversationId?: string | number } = { message };
  if (options.conversationId) {
    requestBody.conversationId = options.conversationId;
  }

  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache'
    },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify(requestBody),
    signal: options.signal
  });

  if (!response.ok) {
    throw new Error(`AI chat stream failed with status ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('AI chat stream response body is unavailable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith('data:')) continue;
      const chunk = parseAiChatStreamData(trimmedLine.substring(5));
      if (chunk) {
        options.onChunk(chunk);
      }
    }
  }

  if (buffer.trim().startsWith('data:')) {
    const chunk = parseAiChatStreamData(buffer.trim().substring(5));
    if (chunk) {
      options.onChunk(chunk);
    }
  }
}
