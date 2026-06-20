const STORAGE_KEY = "privchat:api-keys";

export type ProviderKey = "openai" | "deepseek";

export interface ProviderInfo {
	key: ProviderKey;
	label: string;
	placeholder: string;
	hint: string;
	baseUrl: string;
}

export const providers: ProviderInfo[] = [
	{ key: "openai", label: "OpenAI", placeholder: "sk-...", hint: "Platform API key", baseUrl: "https://api.openai.com/v1" },
	{ key: "deepseek", label: "DeepSeek", placeholder: "sk-...", hint: "Platform API key", baseUrl: "https://api.deepseek.com/v1" },
];

const defaults: Record<ProviderKey, string> = {
	openai: "",
	deepseek: "",
};

let keys = $state<Record<ProviderKey, string>>({ ...defaults });

if (typeof window !== "undefined") {
	load();
}

function load() {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			for (const k of Object.keys(defaults) as ProviderKey[]) {
				if (typeof parsed[k] === "string") keys[k] = parsed[k];
			}
		}
	} catch {
		/* corrupted storage, reset */
	}
}

function persist() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function getKey(provider: ProviderKey): string {
	return keys[provider] || "";
}

export function setKey(provider: ProviderKey, value: string) {
	keys[provider] = value;
	persist();
}

export function removeKey(provider: ProviderKey) {
	keys[provider] = "";
	persist();
}

export function clearAll() {
	for (const k of Object.keys(defaults) as ProviderKey[]) {
		keys[k] = "";
	}
	localStorage.removeItem(STORAGE_KEY);
}

export function hasAnyKey(): boolean {
	return Object.values(keys).some((v) => v.length > 0);
}

export function getBaseUrl(key: ProviderKey): string {
	return providers.find((p) => p.key === key)?.baseUrl ?? "";
}

export function configuredProviders(): ProviderKey[] {
	return (Object.keys(defaults) as ProviderKey[]).filter((k) => keys[k].length > 0);
}
