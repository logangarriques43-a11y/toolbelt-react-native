/**
 * Browser replacement for React Native's `Share.share`.
 *
 * react-native-web's Share only works where the browser has `navigator.share`
 * (mostly phones) and rejects everywhere else, and the app's callers swallow
 * that rejection, so exports and "share link" buttons would silently do
 * nothing on a computer. `installWebShare()` makes them useful everywhere:
 *
 * - report / export content (multi-line text such as CSV) downloads as a file
 *   named from the share title, which is what people expect on a computer;
 * - links and short text use the system share sheet when there is one, and
 *   otherwise are copied to the clipboard with a confirmation.
 *
 * Only the web build imports this file.
 */

import { Alert, Share, type ShareAction, type ShareContent, type ShareOptions } from 'react-native';

function looksLikeFileContent(text: string): boolean {
  return text.includes('\n') && text.length > 120;
}

function fileNameFor(title: string | undefined, text: string): string {
  const base =
    (title ?? 'ToolBelt export')
      .replace(/[^\w\s()-]+/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'ToolBelt-export';
  const firstLine = text.split('\n', 1)[0];
  const ext = firstLine.split(',').length > 2 ? 'csv' : 'txt';
  return `${base}.${ext}`;
}

function download(text: string, fileName: string) {
  const type = fileName.endsWith('.csv') ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let installed = false;

export function installWebShare() {
  if (installed) return;
  installed = true;

  const shared: ShareAction = { action: Share.sharedAction };
  const dismissed: ShareAction = { action: Share.dismissedAction };

  (Share as unknown as { share: typeof Share.share }).share = async (
    content: ShareContent,
    _options?: ShareOptions,
  ): Promise<ShareAction> => {
    const title = 'title' in content ? content.title : undefined;
    const message = 'message' in content ? content.message ?? '' : '';
    const url = 'url' in content ? content.url : undefined;

    if (!url && looksLikeFileContent(message)) {
      download(message, fileNameFor(title, message));
      return shared;
    }

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: url && message === url ? undefined : message || undefined, url });
        return shared;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return dismissed;
        // Fall through to the clipboard (e.g. the browser refused this payload).
      }
    }

    const text = url ?? message;
    try {
      await navigator.clipboard.writeText(text);
      Alert.alert(url ? 'Link copied' : 'Copied', url ? 'The link is on your clipboard, ready to paste.' : 'Copied to your clipboard.');
      return shared;
    } catch {
      Alert.alert('Copy this', text);
      return shared;
    }
  };
}
