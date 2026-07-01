import type { Conversation, ConversationDraft, Folder, State } from "./types";

export const STORAGE_KEY = "chatgptFoldersState";
const CURRENT_VERSION = 1;

interface StorageAreaLike {
  get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

let storageOverride: StorageAreaLike | null = null;

export function setStorageAreaForTests(area: StorageAreaLike | null): void {
  storageOverride = area;
}

function getStorageArea(): StorageAreaLike {
  if (storageOverride) {
    return storageOverride;
  }

  const storage = globalThis.chrome?.storage?.sync;
  if (!storage) {
    throw new Error("chrome.storage.sync is unavailable.");
  }

  return {
    get: (keys) =>
      new Promise((resolve, reject) => {
        storage.get(keys ?? null, (items) => {
          const error = globalThis.chrome?.runtime?.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          resolve(items);
        });
      }),
    set: (items) =>
      new Promise((resolve, reject) => {
        storage.set(items, () => {
          const error = globalThis.chrome?.runtime?.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          resolve();
        });
      })
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}_${randomId}`;
}

function normalizeFolder(value: unknown): Folder | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const folder = value as Partial<Folder>;
  if (typeof folder.id !== "string" || typeof folder.name !== "string") {
    return null;
  }

  const createdAt = typeof folder.createdAt === "string" ? folder.createdAt : nowIso();
  const updatedAt = typeof folder.updatedAt === "string" ? folder.updatedAt : createdAt;
  return {
    id: folder.id,
    name: folder.name.trim() || "\u672a\u547d\u540d\u6587\u4ef6\u5939",
    createdAt,
    updatedAt
  };
}

function normalizeConversation(value: unknown): Conversation | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const conversation = value as Partial<Conversation>;
  if (
    typeof conversation.id !== "string" ||
    typeof conversation.title !== "string" ||
    typeof conversation.url !== "string"
  ) {
    return null;
  }

  const createdAt = typeof conversation.createdAt === "string" ? conversation.createdAt : nowIso();
  const updatedAt = typeof conversation.updatedAt === "string" ? conversation.updatedAt : createdAt;
  const lastSeenAt = typeof conversation.lastSeenAt === "string" ? conversation.lastSeenAt : updatedAt;
  const folderId = typeof conversation.folderId === "string" ? conversation.folderId : null;

  return {
    id: conversation.id,
    title: conversation.title.trim() || "\u672a\u547d\u540d\u5bf9\u8bdd",
    url: conversation.url,
    folderId,
    createdAt,
    updatedAt,
    lastSeenAt
  };
}

function resolvedTitle(existingTitle: string | undefined, draftTitle: string): string {
  const cleanExisting = existingTitle?.trim();
  if (cleanExisting) {
    return cleanExisting;
  }
  return draftTitle.trim() || "\u672a\u547d\u540d\u5bf9\u8bdd";
}

export function emptyState(): State {
  return {
    version: CURRENT_VERSION,
    folders: [],
    conversations: []
  };
}

export function migrateState(value: unknown): State {
  if (!value || typeof value !== "object") {
    return emptyState();
  }

  const stored = value as { folders?: unknown; conversations?: unknown };
  const folders = Array.isArray(stored.folders)
    ? stored.folders.map(normalizeFolder).filter((folder): folder is Folder => Boolean(folder))
    : [];
  const folderIds = new Set(folders.map((folder) => folder.id));
  const conversations = Array.isArray(stored.conversations)
    ? stored.conversations
        .map(normalizeConversation)
        .filter((conversation): conversation is Conversation => Boolean(conversation))
        .map((conversation) => ({
          ...conversation,
          folderId: conversation.folderId && folderIds.has(conversation.folderId) ? conversation.folderId : null
        }))
    : [];

  return {
    version: CURRENT_VERSION,
    folders,
    conversations
  };
}

export async function loadState(): Promise<State> {
  const result = await getStorageArea().get(STORAGE_KEY);
  return migrateState(result[STORAGE_KEY]);
}

export async function saveState(state: State): Promise<void> {
  await getStorageArea().set({ [STORAGE_KEY]: migrateState(state) });
}

async function updateState<T>(updater: (state: State) => T): Promise<T> {
  const state = await loadState();
  const result = updater(state);
  await saveState(state);
  return result;
}

export async function createFolder(name: string): Promise<Folder> {
  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error("Folder name is required.");
  }

  return updateState((state) => {
    const timestamp = nowIso();
    const folder: Folder = {
      id: createId("folder"),
      name: cleanName,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    state.folders.push(folder);
    return folder;
  });
}

export async function renameFolder(folderId: string, name: string): Promise<void> {
  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error("Folder name is required.");
  }

  await updateState((state) => {
    const folder = state.folders.find((item) => item.id === folderId);
    if (!folder) {
      throw new Error("Folder not found.");
    }
    folder.name = cleanName;
    folder.updatedAt = nowIso();
  });
}

export async function deleteFolder(folderId: string): Promise<void> {
  await updateState((state) => {
    state.folders = state.folders.filter((folder) => folder.id !== folderId);
    state.conversations = state.conversations.map((conversation) =>
      conversation.folderId === folderId
        ? { ...conversation, folderId: null, updatedAt: nowIso() }
        : conversation
    );
  });
}

export async function upsertConversation(
  draft: ConversationDraft,
  folderId: string | null = null
): Promise<Conversation> {
  return updateState((state) => {
    const timestamp = nowIso();
    const existing = state.conversations.find((conversation) => conversation.id === draft.id);
    if (existing) {
      existing.title = resolvedTitle(existing.title, draft.title);
      existing.url = draft.url;
      existing.lastSeenAt = timestamp;
      existing.updatedAt = timestamp;
      if (folderId !== null) {
        existing.folderId = folderId;
      }
      return existing;
    }

    const conversation: Conversation = {
      id: draft.id,
      title: draft.title.trim() || "\u672a\u547d\u540d\u5bf9\u8bdd",
      url: draft.url,
      folderId,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSeenAt: timestamp
    };
    state.conversations.push(conversation);
    return conversation;
  });
}

export async function assignConversationToFolder(
  draft: ConversationDraft,
  folderId: string
): Promise<Conversation> {
  return updateState((state) => {
    if (!state.folders.some((folder) => folder.id === folderId)) {
      throw new Error("Folder not found.");
    }

    const timestamp = nowIso();
    const existing = state.conversations.find((conversation) => conversation.id === draft.id);
    if (existing) {
      existing.title = resolvedTitle(existing.title, draft.title);
      existing.url = draft.url;
      existing.folderId = folderId;
      existing.lastSeenAt = timestamp;
      existing.updatedAt = timestamp;
      return existing;
    }

    const conversation: Conversation = {
      id: draft.id,
      title: draft.title.trim() || "\u672a\u547d\u540d\u5bf9\u8bdd",
      url: draft.url,
      folderId,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSeenAt: timestamp
    };
    state.conversations.push(conversation);
    return conversation;
  });
}

export async function assignConversationsToFolder(
  drafts: ConversationDraft[],
  folderId: string
): Promise<Conversation[]> {
  return updateState((state) => {
    if (!state.folders.some((folder) => folder.id === folderId)) {
      throw new Error("Folder not found.");
    }

    const timestamp = nowIso();
    const assigned: Conversation[] = [];

    for (const draft of drafts) {
      const existing = state.conversations.find((conversation) => conversation.id === draft.id);
      if (existing) {
        existing.title = resolvedTitle(existing.title, draft.title);
        existing.url = draft.url;
        existing.folderId = folderId;
        existing.lastSeenAt = timestamp;
        existing.updatedAt = timestamp;
        assigned.push(existing);
        continue;
      }

      const conversation: Conversation = {
        id: draft.id,
        title: draft.title.trim() || "\u672a\u547d\u540d\u5bf9\u8bdd",
        url: draft.url,
        folderId,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastSeenAt: timestamp
      };
      state.conversations.push(conversation);
      assigned.push(conversation);
    }

    return assigned;
  });
}

export async function renameConversation(conversationId: string, title: string): Promise<void> {
  const cleanTitle = title.trim();
  if (!cleanTitle) {
    throw new Error("Conversation title is required.");
  }

  await updateState((state) => {
    const conversation = state.conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      throw new Error("Conversation not found.");
    }
    conversation.title = cleanTitle;
    conversation.updatedAt = nowIso();
  });
}

export async function removeConversation(conversationId: string): Promise<void> {
  await updateState((state) => {
    state.conversations = state.conversations.filter((conversation) => conversation.id !== conversationId);
  });
}

export async function unassignConversation(conversationId: string): Promise<void> {
  await updateState((state) => {
    const conversation = state.conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      throw new Error("Conversation not found.");
    }
    conversation.folderId = null;
    conversation.updatedAt = nowIso();
  });
}
