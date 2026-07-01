import {
  assignConversationsToFolder,
  assignCurrentConversation,
  createFolder,
  deleteFolder,
  loadState,
  renameConversation,
  renameFolder,
  unassignConversation
} from "./actions";
import { cleanTitle, extractConversationIdFromUrl, getCurrentConversation, watchChatGptRouteChanges } from "./chatgpt";
import { STORAGE_KEY } from "./storage";
import type { Conversation, ConversationDraft, Folder, State } from "./types";

const HOST_ID = "chatgpt-folders-extension-root";

const text = {
  folders: "Folders",
  search: "\u641c\u7d22\u6587\u4ef6\u5939",
  searchShort: "\u641c\u7d22",
  searchPlaceholder: "\u641c\u7d22\u6587\u4ef6\u5939\u6216\u5bf9\u8bdd",
  createFolder: "\u65b0\u5efa\u6587\u4ef6\u5939",
  createShort: "\u65b0\u5efa",
  batchAdd: "\u6279\u91cf\u52a0\u5165\u5386\u53f2\u5bf9\u8bdd",
  renameFolder: "\u91cd\u547d\u540d\u6587\u4ef6\u5939",
  renameConversation: "\u91cd\u547d\u540d\u5bf9\u8bdd",
  deleteFolder: "\u5220\u9664\u6587\u4ef6\u5939",
  folderNamePrompt: "\u6587\u4ef6\u5939\u540d\u79f0",
  newFolderPrompt: "\u65b0\u6587\u4ef6\u5939\u540d\u79f0",
  addCurrent: "\u52a0\u5165\u5f53\u524d\u5bf9\u8bdd",
  addCurrentShort: "\u52a0\u5165\u5f53\u524d",
  addSelected: "\u52a0\u5165\u9009\u4e2d",
  cancel: "\u53d6\u6d88",
  remove: "\u79fb\u51fa\u5217\u8868",
  noFolders: "\u8fd8\u6ca1\u6709\u6587\u4ef6\u5939",
  noConversations: "\u8fd8\u6ca1\u6709\u5bf9\u8bdd",
  noCurrent: "\u6253\u5f00\u5df2\u4fdd\u5b58\u5bf9\u8bdd\u540e\u53ef\u52a0\u5165",
  noHistory: "\u5de6\u4fa7\u680f\u6682\u672a\u8bfb\u5230\u5386\u53f2\u5bf9\u8bdd",
  selectFolder: "\u9009\u62e9\u76ee\u6807\u6587\u4ef6\u5939",
  collapse: "\u6298\u53e0",
  expand: "\u5c55\u5f00",
  batchShort: "\u6279\u91cf",
  renameShort: "\u6539\u540d",
  unassignShort: "\u79fb\u51fa",
  deleteShort: "\u5220\u9664",
  menu: "\u83dc\u5355",
  deleteConfirmPrefix: "\u5220\u9664\u6587\u4ef6\u5939",
  deleteConfirmSuffix: "\uff1f\u5176\u4e2d\u7684\u5bf9\u8bdd\u4f1a\u53d8\u4e3a\u672a\u5f52\u7c7b\u3002"
};

const icons = {
  search:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z"/></svg>',
  folderPlus:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z"/><path d="M12 11v5m-2.5-2.5h5"/></svg>',
  batch:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7h10M9 12h10M9 17h10"/><path d="m4 7 .8.8L6.5 6M4 12l.8.8 1.7-1.8M4 17l.8.8 1.7-1.8"/></svg>',
  more:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.5h.01M12 12h.01M12 16.5h.01"/></svg>',
  chevronDown:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  chevronRight:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  plus:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  edit:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h8"/><path d="M16.8 4.2a2 2 0 0 1 2.8 2.8L8 18.6 4.5 19.5 5.4 16Z"/></svg>',
  trash:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V5.5h6V7m-5 4v5m4-5v5M7 7l1 13h8l1-13"/></svg>',
  x:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12"/></svg>'
};

const styles = `
  :host {
    color-scheme: light dark;
    clear: both;
    display: block;
    flex: none;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    margin: 8px 0;
    min-width: 0;
    width: 100%;
  }

  * {
    box-sizing: border-box;
  }

  .cf-section {
    color: var(--text-primary, CanvasText);
    font-size: 14px;
    line-height: 1.35;
    min-width: 0;
    width: 100%;
  }

  .cf-header {
    display: flex;
    align-items: center;
    height: 32px;
    gap: 6px;
    padding: 0 20px;
    position: relative;
  }

  .cf-title {
    flex: 1;
    min-width: 0;
    color: color-mix(in srgb, CanvasText 82%, transparent);
    font-weight: 500;
  }

  .cf-icon-button {
    display: inline-grid;
    flex: none;
    place-items: center;
    width: 26px;
    height: 26px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: color-mix(in srgb, CanvasText 72%, transparent);
    cursor: pointer;
    padding: 0;
  }

  .cf-icon-button svg,
  .cf-folder-icon svg,
  .cf-menu-item svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .cf-icon-button:hover,
  .cf-folder-row:hover,
  .cf-conversation:hover,
  .cf-menu-item:hover {
    background: color-mix(in srgb, CanvasText 8%, transparent);
  }

  .cf-icon-button:disabled {
    cursor: default;
    opacity: 0.38;
  }

  .cf-search {
    display: block;
    width: calc(100% - 40px);
    height: 32px;
    margin: 4px 20px 8px;
    border: 1px solid color-mix(in srgb, CanvasText 14%, transparent);
    border-radius: 8px;
    background: transparent;
    color: inherit;
    font: inherit;
    padding: 0 10px;
  }

  .cf-bulk {
    display: grid;
    gap: 8px;
    margin: 4px 20px 8px;
    padding: 8px;
    border: 1px solid color-mix(in srgb, CanvasText 10%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, CanvasText 4%, transparent);
  }

  .cf-select {
    width: 100%;
    height: 30px;
    border: 1px solid color-mix(in srgb, CanvasText 12%, transparent);
    border-radius: 8px;
    background: Canvas;
    color: CanvasText;
    font: inherit;
    padding: 0 8px;
  }

  .cf-history-list {
    display: grid;
    gap: 1px;
    max-height: 220px;
    overflow: auto;
  }

  .cf-history-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 30px;
    border-radius: 8px;
    padding: 4px 6px;
    color: color-mix(in srgb, CanvasText 80%, transparent);
    cursor: pointer;
  }

  .cf-history-row:hover {
    background: color-mix(in srgb, CanvasText 8%, transparent);
  }

  .cf-history-row input {
    width: 15px;
    height: 15px;
    margin: 0;
    accent-color: currentColor;
  }

  .cf-history-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cf-bulk-actions {
    display: flex;
    gap: 6px;
  }

  .cf-text-button {
    height: 30px;
    border: 0;
    border-radius: 8px;
    background: color-mix(in srgb, CanvasText 8%, transparent);
    color: inherit;
    cursor: pointer;
    flex: 1;
    font: inherit;
    padding: 0 10px;
  }

  .cf-text-button:hover {
    background: color-mix(in srgb, CanvasText 12%, transparent);
  }

  .cf-text-button:disabled {
    cursor: default;
    opacity: 0.45;
  }

  .cf-list {
    display: grid;
    gap: 2px;
    padding: 0 8px;
  }

  .cf-folder-block,
  .cf-conversation-item {
    display: grid;
    gap: 1px;
    position: relative;
  }

  .cf-folder-row {
    display: flex;
    align-items: center;
    min-height: 36px;
    gap: 8px;
    border-radius: 8px;
    padding: 0 12px;
    color: inherit;
    position: relative;
    width: 100%;
  }

  .cf-folder-row[data-active="true"] {
    background: color-mix(in srgb, CanvasText 10%, transparent);
  }

  .cf-folder-main {
    display: flex;
    align-items: center;
    min-width: 0;
    flex: 1;
    gap: 8px;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 0;
    text-align: left;
  }

  .cf-folder-icon {
    display: inline-grid;
    flex: none;
    place-items: center;
    color: color-mix(in srgb, CanvasText 70%, transparent);
  }

  .cf-name,
  .cf-conversation {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cf-name {
    min-width: 0;
    flex: 1;
    font-weight: 500;
  }

  .cf-children {
    display: grid;
    gap: 1px;
    margin: 0 0 4px;
  }

  .cf-conversation {
    flex: 1;
    display: block;
    min-width: 0;
    min-height: 28px;
    border-radius: 8px;
    color: color-mix(in srgb, CanvasText 76%, transparent);
    padding: 5px 8px 5px 44px;
    text-decoration: none;
  }

  .cf-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    z-index: 2147483647;
    display: grid;
    width: 188px;
    gap: 2px;
    border: 1px solid color-mix(in srgb, CanvasText 12%, transparent);
    border-radius: 12px;
    padding: 8px;
    background: Canvas;
    color: CanvasText;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
  }

  .cf-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 36px;
    width: 100%;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 0 10px;
    text-align: left;
  }

  .cf-menu-item svg {
    flex: none;
    width: 18px;
    height: 18px;
  }

  .cf-menu-item[data-danger="true"] {
    color: #d93025;
  }

  .cf-menu-item:disabled {
    cursor: default;
    opacity: 0.42;
  }

  .cf-menu-item:disabled:hover {
    background: transparent;
  }

  .cf-menu-divider {
    height: 1px;
    margin: 4px 2px;
    background: color-mix(in srgb, CanvasText 10%, transparent);
  }

  .cf-empty,
  .cf-error {
    padding: 6px 12px 8px 54px;
    color: color-mix(in srgb, CanvasText 56%, transparent);
    font-size: 13px;
  }

  .cf-error {
    color: color-mix(in srgb, red 72%, CanvasText);
  }
`;

class FoldersPanel {
  private shadow: ShadowRoot;
  private state: State = { version: 1, folders: [], conversations: [] };
  private currentConversation: ConversationDraft | null = null;
  private expandedFolderIds = new Set<string>();
  private collapsed = false;
  private searchOpen = false;
  private bulkOpen = false;
  private bulkFolderId: string | null = null;
  private menuPortal: HTMLElement | null = null;
  private menuCloseController: AbortController | null = null;
  private selectedHistoryIds = new Set<string>();
  private query = "";
  private error: string | null = null;

  constructor(host: HTMLElement) {
    this.shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  }

  async init(): Promise<void> {
    this.currentConversation = getCurrentConversation();
    await this.refreshState();
    this.render();
  }

  async handleRouteChange(): Promise<void> {
    this.currentConversation = getCurrentConversation();
    this.render();
  }

  async refreshState(): Promise<void> {
    this.state = await loadState();
    if (!this.bulkFolderId || !this.state.folders.some((folder) => folder.id === this.bulkFolderId)) {
      this.bulkFolderId = this.state.folders[0]?.id ?? null;
    }
    if (this.expandedFolderIds.size === 0 && this.state.folders[0]) {
      this.expandedFolderIds.add(this.state.folders[0].id);
    }
  }

  private setError(error: unknown): void {
    this.error = error instanceof Error ? error.message : String(error);
    this.render();
  }

  private clearError(): void {
    this.error = null;
  }

  private element<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    className?: string,
    label?: string
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (label !== undefined) {
      element.textContent = label;
    }
    return element;
  }

  private iconButton(
    icon: string,
    title: string,
    onClick: (button: HTMLButtonElement) => void | Promise<void>
  ): HTMLButtonElement {
    const button = this.element("button", "cf-icon-button") as HTMLButtonElement;
    button.type = "button";
    button.title = title;
    button.innerHTML = icon;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      event.preventDefault();
      void onClick(button);
    });
    return button;
  }

  private closeMenu(): void {
    this.menuCloseController?.abort();
    this.menuCloseController = null;
    this.menuPortal?.remove();
    this.menuPortal = null;
  }

  private showMenu(
    anchor: HTMLElement,
    actions: Array<{
      icon: string;
      label: string;
      onClick: () => void | Promise<void>;
      danger?: boolean;
      disabled?: boolean;
      title?: string;
      dividerBefore?: boolean;
    }>
  ): void {
    this.closeMenu();

    const rect = anchor.getBoundingClientRect();
    const menuWidth = 204;
    const menu = document.createElement("div");
    menu.style.position = "fixed";
    menu.style.left = `${Math.min(rect.right + 8, window.innerWidth - menuWidth - 8)}px`;
    menu.style.top = `${Math.min(rect.top, window.innerHeight - 260)}px`;
    menu.style.zIndex = "2147483647";
    menu.style.display = "grid";
    menu.style.width = `${menuWidth}px`;
    menu.style.gap = "2px";
    menu.style.border = "1px solid rgba(0, 0, 0, 0.12)";
    menu.style.borderRadius = "14px";
    menu.style.padding = "8px";
    menu.style.background = "Canvas";
    menu.style.color = "CanvasText";
    menu.style.boxShadow = "0 12px 30px rgba(0, 0, 0, 0.18)";
    menu.style.font = '14px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    for (const action of actions) {
      if (action.dividerBefore) {
        const divider = document.createElement("div");
        divider.style.height = "1px";
        divider.style.margin = "4px 2px";
        divider.style.background = "rgba(0, 0, 0, 0.12)";
        menu.append(divider);
      }

      const item = document.createElement("button");
      item.type = "button";
      item.disabled = Boolean(action.disabled);
      item.title = action.title ?? action.label;
      item.innerHTML = `${action.icon}<span>${action.label}</span>`;
      const svg = item.querySelector("svg");
      if (svg) {
        svg.style.flex = "none";
        svg.style.width = "18px";
        svg.style.height = "18px";
        svg.style.fill = "none";
        svg.style.stroke = "currentColor";
        svg.style.strokeWidth = "1.8";
        svg.style.strokeLinecap = "round";
        svg.style.strokeLinejoin = "round";
      }
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.gap = "12px";
      item.style.minHeight = "38px";
      item.style.width = "100%";
      item.style.border = "0";
      item.style.borderRadius = "9px";
      item.style.background = "transparent";
      item.style.color = action.danger ? "#d93025" : "inherit";
      item.style.cursor = action.disabled ? "default" : "pointer";
      item.style.font = "inherit";
      item.style.opacity = action.disabled ? "0.42" : "1";
      item.style.padding = "0 10px";
      item.style.textAlign = "left";
      item.addEventListener("mouseenter", () => {
        if (!item.disabled) {
          item.style.background = "rgba(0, 0, 0, 0.08)";
        }
      });
      item.addEventListener("mouseleave", () => {
        item.style.background = "transparent";
      });
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        event.preventDefault();
        if (item.disabled) {
          return;
        }
        this.closeMenu();
        void action.onClick();
      });
      menu.append(item);
    }

    this.menuPortal = menu;
    document.body.append(menu);

    const controller = new AbortController();
    this.menuCloseController = controller;
    window.addEventListener("scroll", () => this.closeMenu(), { signal: controller.signal, capture: true });
    window.addEventListener("resize", () => this.closeMenu(), { signal: controller.signal });
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (!menu.contains(event.target as Node) && !anchor.contains(event.target as Node)) {
          this.closeMenu();
        }
      },
      { signal: controller.signal, capture: true }
    );
  }

  private showHeaderMenu(anchor: HTMLElement): void {
    this.showMenu(anchor, [
      {
        icon: icons.search,
        label: text.search,
        onClick: () => {
          this.searchOpen = !this.searchOpen;
          this.render();
        }
      },
      { icon: icons.folderPlus, label: text.createFolder, onClick: () => this.handleCreateFolder() },
      {
        icon: icons.batch,
        label: text.batchAdd,
        onClick: () => {
          this.bulkOpen = !this.bulkOpen;
          this.render();
        }
      }
    ]);
  }

  private showFolderMenu(anchor: HTMLElement, folder: Folder): void {
    this.showMenu(anchor, [
      {
        icon: icons.plus,
        label: text.addCurrent,
        title: this.currentConversation ? text.addCurrent : text.noCurrent,
        disabled: !this.currentConversation,
        onClick: () => this.handleAssignCurrent(folder.id)
      },
      {
        icon: icons.batch,
        label: text.batchAdd,
        onClick: () => {
          this.bulkFolderId = folder.id;
          this.bulkOpen = true;
          this.render();
        }
      },
      { icon: icons.edit, label: text.renameFolder, onClick: () => this.handleRenameFolder(folder) },
      {
        icon: icons.trash,
        label: text.deleteFolder,
        danger: true,
        dividerBefore: true,
        onClick: () => this.handleDeleteFolder(folder)
      }
    ]);
  }

  private showConversationMenu(anchor: HTMLElement, conversation: Conversation): void {
    this.showMenu(anchor, [
      { icon: icons.edit, label: text.renameConversation, onClick: () => this.handleRenameConversation(conversation) },
      {
        icon: icons.trash,
        label: text.remove,
        danger: true,
        onClick: () => this.handleUnassignConversation(conversation)
      }
    ]);
  }

  private render(): void {
    const style = this.element("style");
    style.textContent = styles;

    const root = this.element("section", "cf-section");
    root.append(this.renderHeader());

    if (this.searchOpen) {
      root.append(this.renderSearch());
    }

    if (this.bulkOpen) {
      root.append(this.renderBulkPicker());
    }

    if (this.error) {
      root.append(this.element("div", "cf-error", this.error));
    }

    if (!this.collapsed) {
      root.append(this.renderFolders());
    }

    this.shadow.replaceChildren(style, root);
  }

  private renderHeader(): HTMLElement {
    const header = this.element("div", "cf-header");
    header.append(this.element("div", "cf-title", text.folders));
    header.append(
      this.iconButton(icons.more, text.menu, (button) => this.showHeaderMenu(button)),
      this.iconButton(this.collapsed ? icons.chevronRight : icons.chevronDown, this.collapsed ? text.expand : text.collapse, () => {
        this.collapsed = !this.collapsed;
        this.render();
      })
    );
    return header;
  }

  private renderSearch(): HTMLElement {
    const input = this.element("input", "cf-search") as HTMLInputElement;
    input.type = "search";
    input.placeholder = text.searchPlaceholder;
    input.value = this.query;
    input.addEventListener("input", () => {
      this.query = input.value;
      this.render();
      const nextInput = this.shadow.querySelector<HTMLInputElement>(".cf-search");
      nextInput?.focus();
      nextInput?.setSelectionRange(nextInput.value.length, nextInput.value.length);
    });
    return input;
  }

  private renderBulkPicker(): HTMLElement {
    const panel = this.element("div", "cf-bulk");
    const folderSelect = this.element("select", "cf-select") as HTMLSelectElement;
    folderSelect.title = text.selectFolder;
    folderSelect.disabled = this.state.folders.length === 0;

    for (const folder of this.state.folders) {
      const option = this.element("option") as HTMLOptionElement;
      option.value = folder.id;
      option.textContent = folder.name;
      option.selected = folder.id === this.bulkFolderId;
      folderSelect.append(option);
    }

    folderSelect.addEventListener("change", () => {
      this.bulkFolderId = folderSelect.value;
    });

    const historyList = this.element("div", "cf-history-list");
    const history = collectVisibleHistoryConversations();

    if (!history.length) {
      historyList.append(this.element("div", "cf-empty", text.noHistory));
    } else {
      for (const item of history) {
        const row = this.element("label", "cf-history-row");
        const checkbox = this.element("input") as HTMLInputElement;
        checkbox.type = "checkbox";
        checkbox.checked = this.selectedHistoryIds.has(item.id);
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            this.selectedHistoryIds.add(item.id);
          } else {
            this.selectedHistoryIds.delete(item.id);
          }
        });
        row.append(checkbox, this.element("span", "cf-history-title", item.title));
        historyList.append(row);
      }
    }

    const actions = this.element("div", "cf-bulk-actions");
    const addButton = this.element("button", "cf-text-button", text.addSelected) as HTMLButtonElement;
    addButton.type = "button";
    addButton.disabled = !this.bulkFolderId || !history.length;
    addButton.addEventListener("click", () => {
      void this.handleBulkAssign(history);
    });

    const cancelButton = this.element("button", "cf-text-button", text.cancel) as HTMLButtonElement;
    cancelButton.type = "button";
    cancelButton.addEventListener("click", () => {
      this.bulkOpen = false;
      this.selectedHistoryIds.clear();
      this.render();
    });

    actions.append(addButton, cancelButton);
    panel.append(folderSelect, historyList, actions);
    return panel;
  }

  private renderFolders(): HTMLElement {
    const list = this.element("div", "cf-list");
    const folders = this.filteredFolders();

    if (!folders.length) {
      list.append(this.element("div", "cf-empty", text.noFolders));
      return list;
    }

    for (const folder of folders) {
      list.append(this.renderFolderBlock(folder));
    }

    return list;
  }

  private renderFolderBlock(folder: Folder): HTMLElement {
    const block = this.element("div", "cf-folder-block");
    block.append(this.renderFolderRow(folder));
    if (this.expandedFolderIds.has(folder.id)) {
      block.append(this.renderConversations(folder));
    }
    return block;
  }

  private renderFolderRow(folder: Folder): HTMLElement {
    const row = this.element("div", "cf-folder-row");
    const containsCurrent = Boolean(
      this.currentConversation &&
        this.state.conversations.some(
          (conversation) => conversation.id === this.currentConversation?.id && conversation.folderId === folder.id
        )
    );
    row.dataset.active = String(containsCurrent);

    const main = this.element("button", "cf-folder-main") as HTMLButtonElement;
    main.type = "button";
    main.append(this.iconSpan(icons.folder), this.element("span", "cf-name", folder.name));
    main.addEventListener("click", () => {
      this.toggleFolder(folder.id);
    });

    row.append(
      main,
      this.iconButton(icons.more, text.menu, (button) => this.showFolderMenu(button, folder)),
      this.iconButton(this.expandedFolderIds.has(folder.id) ? icons.chevronDown : icons.chevronRight, text.expand, () => this.toggleFolder(folder.id))
    );
    return row;
  }

  private renderConversations(folder: Folder): HTMLElement {
    const children = this.element("div", "cf-children");
    const conversations = this.filteredConversations(folder.id);

    if (!conversations.length) {
      children.append(this.element("div", "cf-empty", text.noConversations));
      return children;
    }

    for (const conversation of conversations) {
      const item = this.element("div", "cf-conversation-item");
      const row = this.element("div", "cf-folder-row");
      const link = this.element("a", "cf-conversation", conversation.title) as HTMLAnchorElement;
      link.href = conversation.url;
      link.title = conversation.title;

      row.append(
        link,
        this.iconButton(icons.more, text.menu, (button) => this.showConversationMenu(button, conversation))
      );
      item.append(row);
      children.append(item);
    }

    return children;
  }

  private iconSpan(icon: string): HTMLElement {
    const span = this.element("span", "cf-folder-icon");
    span.innerHTML = icon;
    return span;
  }

  private filteredFolders(): Folder[] {
    const query = this.query.trim().toLowerCase();
    if (!query) {
      return this.state.folders;
    }

    return this.state.folders.filter((folder) => {
      if (folder.name.toLowerCase().includes(query)) {
        return true;
      }
      return this.state.conversations.some(
        (conversation) => conversation.folderId === folder.id && conversation.title.toLowerCase().includes(query)
      );
    });
  }

  private filteredConversations(folderId: string): Conversation[] {
    const query = this.query.trim().toLowerCase();
    return this.state.conversations.filter((conversation) => {
      if (conversation.folderId !== folderId) {
        return false;
      }
      return !query || conversation.title.toLowerCase().includes(query);
    });
  }

  private toggleFolder(folderId: string): void {
    if (this.expandedFolderIds.has(folderId)) {
      this.expandedFolderIds.delete(folderId);
    } else {
      this.expandedFolderIds.add(folderId);
    }
    this.render();
  }

  private async handleCreateFolder(): Promise<void> {
    const name = window.prompt(text.folderNamePrompt);
    if (name === null) {
      return;
    }

    this.clearError();
    try {
      const folder = await createFolder(name);
      this.expandedFolderIds.add(folder.id);
      this.bulkFolderId = folder.id;
      await this.refreshState();
      this.render();
    } catch (error) {
      this.setError(error);
    }
  }

  private async handleAssignCurrent(folderId: string): Promise<void> {
    this.clearError();
    try {
      await assignCurrentConversation(folderId, this.currentConversationWithSidebarTitle());
      this.expandedFolderIds.add(folderId);
      await this.refreshState();
      this.render();
    } catch (error) {
      this.setError(error);
    }
  }

  private currentConversationWithSidebarTitle(): ConversationDraft | null {
    if (!this.currentConversation) {
      return null;
    }

    const fromSidebar = collectVisibleHistoryConversations().find((item) => item.id === this.currentConversation?.id);
    return fromSidebar ?? this.currentConversation;
  }

  private async handleBulkAssign(history: ConversationDraft[]): Promise<void> {
    if (!this.bulkFolderId) {
      return;
    }

    const selected = history.filter((item) => this.selectedHistoryIds.has(item.id));
    if (!selected.length) {
      return;
    }

    this.clearError();
    try {
      await assignConversationsToFolder(selected, this.bulkFolderId);
      this.expandedFolderIds.add(this.bulkFolderId);
      this.bulkOpen = false;
      this.selectedHistoryIds.clear();
      await this.refreshState();
      this.render();
    } catch (error) {
      this.setError(error);
    }
  }

  private async handleRenameFolder(folder: Folder): Promise<void> {
    const name = window.prompt(text.newFolderPrompt, folder.name);
    if (name === null) {
      return;
    }

    this.clearError();
    try {
      await renameFolder(folder.id, name);
      await this.refreshState();
      this.render();
    } catch (error) {
      this.setError(error);
    }
  }

  private async handleDeleteFolder(folder: Folder): Promise<void> {
    if (!window.confirm(`${text.deleteConfirmPrefix}\u201c${folder.name}\u201d${text.deleteConfirmSuffix}`)) {
      return;
    }

    this.clearError();
    try {
      this.expandedFolderIds.delete(folder.id);
      await deleteFolder(folder.id);
      await this.refreshState();
      this.render();
    } catch (error) {
      this.setError(error);
    }
  }

  private async handleRenameConversation(conversation: Conversation): Promise<void> {
    const title = window.prompt(text.renameConversation, conversation.title);
    if (title === null) {
      return;
    }

    this.clearError();
    try {
      await renameConversation(conversation.id, title);
      await this.refreshState();
      this.render();
    } catch (error) {
      this.setError(error);
    }
  }

  private async handleUnassignConversation(conversation: Conversation): Promise<void> {
    this.clearError();
    try {
      await unassignConversation(conversation.id);
      await this.refreshState();
      this.render();
    } catch (error) {
      this.setError(error);
    }
  }
}

function findSidebar(): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("nav, aside, [data-testid='history-sidebar']")
  );
  return (
    candidates.find((candidate) => {
      const textContent = candidate.innerText || "";
      const rect = candidate.getBoundingClientRect();
      return rect.width >= 180 && rect.width <= 420 && /(\u65b0\u804a\u5929|\u6700\u8fd1|ChatGPT|Search)/.test(textContent);
    }) ?? null
  );
}

function findTextElement(root: HTMLElement, labels: string[]): HTMLElement | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const value = node.textContent?.trim();
    if (value && labels.some((label) => value === label || value.includes(label))) {
      return node.parentElement;
    }
    node = walker.nextNode();
  }

  return null;
}

function findInsertionTarget(sidebar: HTMLElement): Element | null {
  const recent = findTextElement(sidebar, ["\u6700\u8fd1", "Recent"]);
  if (!recent) {
    return null;
  }

  let target: Element = recent;
  while (target.parentElement && target.parentElement !== sidebar) {
    const parent = target.parentElement;
    const rect = parent.getBoundingClientRect();
    if (rect.height > 18 && rect.height <= 60 && rect.width >= 120) {
      target = parent;
      break;
    }
    target = parent;
  }

  return target;
}

function findCompactRowFromText(textElement: HTMLElement, boundary: HTMLElement): Element {
  let target: Element = textElement;
  while (target.parentElement && target.parentElement !== boundary) {
    const parent = target.parentElement;
    const rect = parent.getBoundingClientRect();
    target = parent;
    if (rect.height > 24 && rect.height <= 64 && rect.width >= 120) {
      break;
    }
  }
  return target;
}

function findTopNavigationAnchor(sidebar: HTMLElement): Element | null {
  const more = findTextElement(sidebar, ["\u66f4\u591a", "More"]);
  if (!more) {
    return null;
  }
  return findCompactRowFromText(more, sidebar);
}

function placeHostBeforeRecent(host: HTMLElement, sidebar: HTMLElement): void {
  const topAnchor = findTopNavigationAnchor(sidebar);
  if (topAnchor?.parentElement) {
    topAnchor.parentElement.insertBefore(host, topAnchor.nextSibling);
    return;
  }

  const target = findInsertionTarget(sidebar);
  if (target?.parentElement) {
    target.parentElement.insertBefore(host, target);
  } else {
    sidebar.append(host);
  }
}

function collectVisibleHistoryConversations(): ConversationDraft[] {
  const sidebar = findSidebar();
  if (!sidebar) {
    return [];
  }

  const conversations = new Map<string, ConversationDraft>();
  const links = Array.from(sidebar.querySelectorAll<HTMLAnchorElement>("a[href]"));

  for (const link of links) {
    const href = link.href;
    const id = extractConversationIdFromUrl(href);
    if (!id || conversations.has(id)) {
      continue;
    }

    const rawTitle = link.innerText || link.title || link.getAttribute("aria-label") || "";
    const title = cleanTitle(rawTitle.replace(/\s+/g, " "));
    conversations.set(id, {
      id,
      title,
      url: href
    });
  }

  return Array.from(conversations.values());
}

function mountHost(): HTMLElement {
  const existing = document.getElementById(HOST_ID);
  if (existing) {
    return existing;
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.display = "block";
  host.style.flex = "none";
  host.style.width = "100%";

  const sidebar = findSidebar();
  if (!sidebar) {
    document.documentElement.append(host);
    host.hidden = true;
    return host;
  }

  placeHostBeforeRecent(host, sidebar);

  return host;
}

function keepHostMounted(host: HTMLElement): () => void {
  const ensureMounted = (): void => {
    if (!host.isConnected || host.hidden) {
      const sidebar = findSidebar();
      if (!sidebar) {
        return;
      }
      host.hidden = false;
      placeHostBeforeRecent(host, sidebar);
    }
  };

  const observer = new MutationObserver(ensureMounted);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ensureMounted();
  return () => observer.disconnect();
}

async function boot(): Promise<void> {
  const host = mountHost();
  const panel = new FoldersPanel(host);
  await panel.init();
  keepHostMounted(host);

  watchChatGptRouteChanges(() => {
    void panel.handleRouteChange();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes[STORAGE_KEY]) {
      void panel.refreshState().then(() => panel.handleRouteChange());
    }
  });
}

void boot().catch((error: unknown) => {
  console.error("ChatGPT Folders failed to initialize", error);
  document.getElementById(HOST_ID)?.remove();
});
