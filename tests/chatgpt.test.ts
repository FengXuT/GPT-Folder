import { cleanTitle, extractConversationIdFromUrl } from "../src/chatgpt";

describe("chatgpt url parsing", () => {
  it("extracts conversation ids from chatgpt.com conversation urls", () => {
    expect(extractConversationIdFromUrl("https://chatgpt.com/c/abc_123-XYZ")).toBe("abc_123-XYZ");
  });

  it("extracts conversation ids from chat.openai.com conversation urls", () => {
    expect(extractConversationIdFromUrl("https://chat.openai.com/c/abc123?model=gpt-4")).toBe("abc123");
  });

  it("returns null for non-conversation urls", () => {
    expect(extractConversationIdFromUrl("https://chatgpt.com/")).toBeNull();
    expect(extractConversationIdFromUrl("not a url")).toBeNull();
  });
});

describe("chatgpt title parsing", () => {
  it("removes common ChatGPT suffixes", () => {
    expect(cleanTitle("Project notes - ChatGPT")).toBe("Project notes");
    expect(cleanTitle("Planning | ChatGPT")).toBe("Planning");
  });

  it("falls back to an untitled label", () => {
    expect(cleanTitle(" - ChatGPT")).toBe("未命名对话");
  });
});
