import { uuid } from "$lib/utils";

const STORAGE_KEY = "privchat:history";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	time: string;
}

export interface Chat {
	id: string;
	title: string;
	summary: string;
	messages: ChatMessage[];
	createdAt: number;
	updatedAt: number;
}

let chats = $state<Chat[]>([]);
let activeChatId = $state<string | null>(null);

if (typeof window !== "undefined") {
	load();
}

function load() {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			if (Array.isArray(parsed)) {
				chats = parsed.filter((c: Chat) => c.messages && c.messages.length > 0);
			}
		}
	} catch {
		chats = [];
	}
}

function persist() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

function titleFromMessages(messages: ChatMessage[]): string {
	const first = messages.find((m) => m.role === "user");
	if (!first) return "New chat";
	return first.content.slice(0, 50) || "New chat";
}

export function getChats(): Chat[] {
	return chats;
}

export function getActiveChatId(): string | null {
	return activeChatId;
}

export function getActiveChat(): Chat | undefined {
	return chats.find((c) => c.id === activeChatId);
}

export function createChat(): Chat {
	const chat: Chat = {
		id: uuid(),
		title: "New chat",
		summary: "",
		messages: [],
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
	chats.unshift(chat);
	activeChatId = chat.id;
	persist();
	return chat;
}

export function setActiveChat(id: string) {
	activeChatId = id;
}

export function updateChatMessages(messages: ChatMessage[]) {
	const chat = chats.find((c) => c.id === activeChatId);
	if (!chat) return;
	chat.messages = messages;
	chat.title = titleFromMessages(messages);
	chat.updatedAt = Date.now();
	persist();
}

export function setChatSummary(summary: string) {
	const chat = chats.find((c) => c.id === activeChatId);
	if (!chat) return;
	chat.summary = summary;
	persist();
}

export function deleteChat(id: string) {
	chats = chats.filter((c) => c.id !== id);
	if (activeChatId === id) {
		activeChatId = chats[0]?.id ?? null;
	}
	persist();
}

export function clearAllChats() {
	chats = [];
	activeChatId = null;
	persist();
}
