/**
 * Chat state for the AI helper (port of HelperViewModel.swift). Owned by the
 * home screen, so the conversation survives closing and reopening the sheet;
 * "New chat" clears it. Failed requests show as error bubbles with a retry and
 * are never sent back to the server.
 */

import { useCallback, useRef, useState } from 'react';

import { sendHelperChat, type HelperSnapshot, type HelperTurn } from '@/api/helper';
import { ApiError } from '@/lib/api-client';
import { uuid } from '@/lib/id';
import { HELPER_DESTINATIONS } from '@/lib/helper-destinations';

export interface HelperMessage {
  id: string;
  isUser: boolean;
  text: string;
  actions: { screen: string; label: string }[];
  isError: boolean;
}

export const HELPER_SUGGESTIONS = [
  'How do I import my appointments?',
  'How do I turn on online booking?',
  'How do clients book by text?',
  'How do I get paid out?',
];

function errorText(err: unknown): string {
  // 400/429/503 carry a message written for the user.
  if (err instanceof ApiError && (err.status === 400 || err.status === 429 || err.status === 503)) {
    return err.message;
  }
  if (err instanceof ApiError && err.code === 'network') {
    return "Couldn't reach ToolBelt. Check your connection and try again.";
  }
  return "The AI helper couldn't answer just now. Please try again.";
}

export function useHelperChat() {
  const [messages, setMessages] = useState<HelperMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const sending = useRef(false);

  const request = useCallback(async (history: HelperMessage[], snapshot: HelperSnapshot) => {
    const turns: HelperTurn[] = history
      .filter((m) => !m.isError)
      .map((m) => ({ role: m.isUser ? 'user' : 'assistant', text: m.text }));
    sending.current = true;
    setIsSending(true);
    try {
      const res = await sendHelperChat(turns, snapshot);
      const blocked = new Set(snapshot.unavailableScreens);
      const seen = new Set<string>();
      const actions = res.actions.filter((a) => {
        const ok = HELPER_DESTINATIONS[a.screen]?.route && !blocked.has(a.screen) && !seen.has(a.screen);
        seen.add(a.screen);
        return ok;
      });
      setMessages((prev) => [...prev, { id: uuid(), isUser: false, text: res.reply, actions, isError: false }]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: uuid(), isUser: false, text: errorText(err), actions: [], isError: true }]);
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  }, []);

  const send = useCallback(
    (text: string, snapshot: HelperSnapshot) => {
      const trimmed = text.trim();
      if (!trimmed || sending.current) return;
      const next = [...messages, { id: uuid(), isUser: true, text: trimmed, actions: [], isError: false }];
      setMessages(next);
      request(next, snapshot);
    },
    [messages, request],
  );

  /** Re-asks the last question after a failed request. */
  const retry = useCallback(
    (snapshot: HelperSnapshot) => {
      if (sending.current || !messages.at(-1)?.isError) return;
      const next = messages.slice(0, -1);
      setMessages(next);
      request(next, snapshot);
    },
    [messages, request],
  );

  const reset = useCallback(() => {
    if (!sending.current) setMessages([]);
  }, []);

  return { messages, isSending, send, retry, reset };
}

export type HelperChat = ReturnType<typeof useHelperChat>;
