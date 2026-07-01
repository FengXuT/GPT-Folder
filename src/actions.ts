import { getCurrentConversation } from "./chatgpt";
import { assignConversationToFolder } from "./storage";
import type { Conversation, ConversationDraft } from "./types";

export async function assignCurrentConversation(
  folderId: string,
  currentDraft?: ConversationDraft | null
): Promise<Conversation> {
  const current = currentDraft ?? getCurrentConversation();
  if (!current) {
    throw new Error("Open a saved ChatGPT conversation before assigning it to a folder.");
  }

  return assignConversationToFolder(current, folderId);
}

export {
  assignConversationsToFolder,
  createFolder,
  deleteFolder,
  loadState,
  removeConversation,
  renameConversation,
  renameFolder,
  saveState,
  unassignConversation
} from "./storage";
