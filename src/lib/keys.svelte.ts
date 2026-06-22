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
let selectedModels = $state<Record<ProviderKey, string[]>>({
	openai: [],
	deepseek: [],
});

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
			if (parsed._selectedModels) {
				for (const k of Object.keys(defaults) as ProviderKey[]) {
					if (Array.isArray(parsed._selectedModels[k])) {
						selectedModels[k] = parsed._selectedModels[k];
					}
				}
			}
		}
	} catch {
		/* corrupted storage, reset */
	}
}

function persist() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify({
		...keys,
		_selectedModels: selectedModels,
	}));
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
		selectedModels[k] = [];
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

export function getSelectedModels(provider: ProviderKey): string[] {
	return selectedModels[provider] || [];
}

export function toggleSelectedModel(provider: ProviderKey, modelId: string) {
	const list = selectedModels[provider];
	const idx = list.indexOf(modelId);
	if (idx >= 0) {
		list.splice(idx, 1);
	} else {
		list.push(modelId);
	}
	persist();
}

export function setSelectedModels(provider: ProviderKey, models: string[]) {
	selectedModels[provider] = models;
	persist();
}
