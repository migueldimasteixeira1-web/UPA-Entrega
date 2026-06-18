/**
 * Copia texto para a área de transferência.
 * Fallback síncrono primeiro (preserva gesto do toque no iOS/Android);
 * depois Clipboard API em HTTPS.
 */
export async function copyToClipboard(text) {
  if (!text) return false;

  if (copyWithExecCommand(text)) return true;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export function canShare() {
  return typeof navigator.share === 'function';
}

/** Compartilhar via apps nativos (WhatsApp etc.) — ideal no mobile. */
export async function shareText({ title, text, url }) {
  if (!canShare()) return false;

  try {
    const payload = {};
    if (title) payload.title = title;
    if (text) payload.text = text;
    if (url) payload.url = url;
    await navigator.share(payload);
    return true;
  } catch (err) {
    if (err?.name === 'AbortError') return true;
    return false;
  }
}

function copyWithExecCommand(text) {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (isIOS) {
    return copyWithSelection(text);
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '2em';
  textarea.style.height = '2em';
  textarea.style.padding = '0';
  textarea.style.border = 'none';
  textarea.style.outline = 'none';
  textarea.style.opacity = '0';

  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

function copyWithSelection(text) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.position = 'fixed';
  el.style.top = '0';
  el.style.left = '0';
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  el.style.whiteSpace = 'pre-wrap';
  el.style.userSelect = 'text';

  document.body.appendChild(el);

  const selection = window.getSelection();
  const range = document.createRange();

  try {
    range.selectNodeContents(el);
    selection?.removeAllRanges();
    selection?.addRange(range);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    selection?.removeAllRanges();
    document.body.removeChild(el);
  }
}
