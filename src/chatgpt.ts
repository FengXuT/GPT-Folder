import type { ConversationDraft } from "./types";

const UNTITLED = "\u672a\u547d\u540d\u5bf9\u8bdd";

export function extractConversationIdFromUrl(input: string): string | null {
  try {
    const url = new URL(input);
    const parts = url.pathname.split("/").filter(Boolean);
    const conversationIndex = parts.indexOf("c");
    const candidate = conversationIndex >= 0 ? parts[conversationIndex + 1] : null;
    return candidate && /^[a-zA-Z0-9_-]+$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function cleanTitle(rawTitle: string): string {
  const title = rawTitle
    .replace(/\s*[-|]\s*ChatGPT\s*$/i, "")
    .replace(/^ChatGPT\s*[-|]\s*/i, "")
    .trim();
  return title || UNTITLED;
}

function findVisiblePageTitle(): string | null {
  const selectors = ["main h1", "main [data-testid='conversation-title']", "h1"];
  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    const text = element?.innerText?.trim();
    if (text) {
      return text;
    }
  }
  return null;
}

export function getCurrentConversation(): ConversationDraft | null {
  const id = extractConversationIdFromUrl(window.location.href);
  if (!id) {
    return null;
  }

  const visibleTitle = findVisiblePageTitle();
  const title = cleanTitle(visibleTitle || document.title || UNTITLED);

  return {
    id,
    title,
    url: window.location.href
  };
}

export function watchChatGptRouteChanges(onChange: () => void): () => void {
  let currentUrl = window.location.href;
  let frame = 0;

  const schedule = (): void => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      if (currentUrl !== window.location.href) {
        currentUrl = window.location.href;
        onChange();
      }
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const patchHistory = (method: "pushState" | "replaceState"): (() => void) => {
    const original = history[method];
    history[method] = function patchedHistoryMethod(data: unknown, unused: string, url?: string | URL | null) {
      const result = original.call(history, data, unused, url);
      window.dispatchEvent(new Event("chatgpt-folders-route-change"));
      return result;
    };

    return () => {
      history[method] = original;
    };
  };

  const restorePushState = patchHistory("pushState");
  const restoreReplaceState = patchHistory("replaceState");

  window.addEventListener("popstate", schedule);
  window.addEventListener("chatgpt-folders-route-change", schedule);

  return () => {
    observer.disconnect();
    restorePushState();
    restoreReplaceState();
    window.removeEventListener("popstate", schedule);
    window.removeEventListener("chatgpt-folders-route-change", schedule);
    window.cancelAnimationFrame(frame);
  };
}
