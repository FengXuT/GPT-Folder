import {
  assignConversationToFolder,
  assignConversationsToFolder,
  createFolder,
  deleteFolder,
  emptyState,
  loadState,
  migrateState,
  renameConversation,
  renameFolder,
  setStorageAreaForTests,
  unassignConversation,
  upsertConversation
} from "../src/storage";

class MemoryStorage {
  private data: Record<string, unknown> = {};

  async get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>> {
    if (!keys) {
      return { ...this.data };
    }

    if (typeof keys === "string") {
      return { [keys]: this.data[keys] };
    }

    if (Array.isArray(keys)) {
      return Object.fromEntries(keys.map((key) => [key, this.data[key]]));
    }

    return Object.fromEntries(Object.keys(keys).map((key) => [key, this.data[key] ?? keys[key]]));
  }

  async set(items: Record<string, unknown>): Promise<void> {
    this.data = { ...this.data, ...items };
  }
}

const draft = {
  id: "conversation-1",
  title: "A useful thread",
  url: "https://chatgpt.com/c/conversation-1"
};

beforeEach(() => {
  setStorageAreaForTests(new MemoryStorage());
});

afterEach(() => {
  setStorageAreaForTests(null);
});

describe("storage schema", () => {
  it("loads an empty state when sync storage has not been initialized", async () => {
    await expect(loadState()).resolves.toEqual(emptyState());
  });

  it("migrates malformed data into a valid v1 state", () => {
    const migrated = migrateState({
      version: 999 as 1,
      folders: [{ id: "folder-1", name: " Work " }, { id: 12 }],
      conversations: [
        {
          id: "conversation-1",
          title: "Title",
          url: "https://chatgpt.com/c/conversation-1",
          folderId: "missing-folder"
        },
        { id: "broken" }
      ]
    });

    expect(migrated.version).toBe(1);
    expect(migrated.folders).toHaveLength(1);
    expect(migrated.folders[0]?.name).toBe("Work");
    expect(migrated.conversations).toHaveLength(1);
    expect(migrated.conversations[0]?.folderId).toBeNull();
  });
});

describe("folder and conversation actions", () => {
  it("creates and renames folders", async () => {
    const folder = await createFolder("Projects");
    await renameFolder(folder.id, "Research");

    const state = await loadState();
    expect(state.folders).toMatchObject([{ id: folder.id, name: "Research" }]);
  });

  it("assigns a conversation to one folder at a time", async () => {
    const first = await createFolder("First");
    const second = await createFolder("Second");

    await assignConversationToFolder(draft, first.id);
    await assignConversationToFolder(draft, second.id);

    const state = await loadState();
    expect(state.conversations).toHaveLength(1);
    expect(state.conversations[0]?.folderId).toBe(second.id);
  });

  it("preserves a folder conversation title when it is assigned again", async () => {
    const folder = await createFolder("Study");
    await assignConversationToFolder(draft, folder.id);
    await renameConversation(draft.id, "Custom title");
    await assignConversationToFolder({ ...draft, title: "Page title" }, folder.id);

    const state = await loadState();
    expect(state.conversations[0]?.title).toBe("Custom title");
  });

  it("assigns multiple visible history conversations to a folder", async () => {
    const folder = await createFolder("History");
    await assignConversationsToFolder(
      [
        draft,
        {
          id: "conversation-2",
          title: "Another thread",
          url: "https://chatgpt.com/c/conversation-2"
        }
      ],
      folder.id
    );

    const state = await loadState();
    expect(state.conversations).toHaveLength(2);
    expect(state.conversations.every((conversation) => conversation.folderId === folder.id)).toBe(true);
  });

  it("keeps conversations but clears folderId when a folder is deleted", async () => {
    const folder = await createFolder("Temporary");
    await assignConversationToFolder(draft, folder.id);
    await deleteFolder(folder.id);

    const state = await loadState();
    expect(state.folders).toHaveLength(0);
    expect(state.conversations).toHaveLength(1);
    expect(state.conversations[0]?.folderId).toBeNull();
  });

  it("moves a single conversation out of a folder without deleting its record", async () => {
    const folder = await createFolder("Inbox");
    await assignConversationToFolder(draft, folder.id);
    await unassignConversation(draft.id);

    const state = await loadState();
    expect(state.conversations).toHaveLength(1);
    expect(state.conversations[0]?.folderId).toBeNull();
  });

  it("can upsert a seen conversation without assigning it", async () => {
    await upsertConversation(draft);

    const state = await loadState();
    expect(state.conversations).toMatchObject([{ id: draft.id, folderId: null }]);
  });
});
