export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  url: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

export interface State {
  version: 1;
  folders: Folder[];
  conversations: Conversation[];
}

export interface ConversationDraft {
  id: string;
  title: string;
  url: string;
}
