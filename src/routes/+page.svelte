<script lang="ts">
	import { goto } from "$app/navigation";
	import { uuid } from "$lib/utils";
	import { PromptInput, MessageList } from "$lib/components/chat";
	import { toggleTheme, getTheme } from "$lib/theme.svelte";
	import 	{
		getKey,
		getBaseUrl,
		hasAnyKey,
		configuredProviders,
		getSelectedModels,
		type ProviderKey,
		providers,
	} from "$lib/keys.svelte";
	import {
		getChats,
		getActiveChatId,
		getActiveChat,
		createChat,
		setActiveChat,
		updateChatMessages,
		setChatSummary,
		deleteChat,
		clearAllChats,
	} from "$lib/history.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Icon from "$lib/components/ui/icon.svelte";

	let inputValue = $state("");
	let isGenerating = $state(false);
	let dark = $state(getTheme());
	let abortController = $state<AbortController | null>(null);
	let sidebarOpen = $state(false);
	let webSearch = $state(true);
	let searchStatus = $state("");

	const chats = $derived(getChats());
	const currentChatId = $derived(getActiveChatId());
	const activeChat = $derived(getActiveChat());
	const messages = $derived(activeChat?.messages ?? []);

	let hasHydrated = $state(false);
	$effect(() => { hasHydrated = true; });

	$effect(() => {
		if (hasHydrated && !currentChatId) {
			createChat();
		}
	});

	function formatDate(ts: number): string {
		const now = Date.now();
		const diff = now - ts;
		if (diff < 60000) return "Just now";
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
		if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
		return new Date(ts).toLocaleDateString();
	}

	let selectedProvider = $state<ProviderKey>(restoreProvider());
	let selectedModel = $state(restoreModel());
	let modelMenuOpen = $state(false);
	let modelMenuEl = $state<HTMLDivElement>();

	function handleWindowClick(e: MouseEvent) {
		if (modelMenuOpen && modelMenuEl && !modelMenuEl.contains(e.target as Node)) {
			modelMenuOpen = false;
		}
	}

	function restoreProvider(): ProviderKey {
		if (typeof window === "undefined") return "openai";
		const stored = localStorage.getItem("privchat:last-provider");
		if (stored === "openai" || stored === "deepseek") return stored;
		return "openai";
	}

	function restoreModel(): string {
		if (typeof window === "undefined") return "";
		return localStorage.getItem("privchat:last-model") ?? "";
	}

	function persistSelection(provider: ProviderKey, model: string) {
		localStorage.setItem("privchat:last-provider", provider);
		localStorage.setItem("privchat:last-model", model);
	}

	let providerModels = $state<Record<ProviderKey, string[]>>({
		openai: [],
		deepseek: [],
	});
	let modelsLoading = $state(false);

	function modelLabel(id: string) {
		if (!id) return "";
		return id
			.replace(/-/g, " ")
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}

	async function fetchModels() {
		const key = getKey(selectedProvider);
		modelsLoading = true;
		try {
			const res = await fetch("/api/models", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					baseUrl: getBaseUrl(selectedProvider),
					apiKey: key,
				}),
			});
			const data = await res.json();
			const allModels: string[] = (data.models || []).map((m: { id: string }) => m.id);
			const selected = getSelectedModels(selectedProvider);
			if (selected.length > 0) {
				providerModels[selectedProvider] = allModels.filter((m) => selected.includes(m));
			} else {
				providerModels[selectedProvider] = [];
			}
			if (!selectedModel || !providerModels[selectedProvider].includes(selectedModel)) {
				if (providerModels[selectedProvider].length > 0) {
					selectedModel = providerModels[selectedProvider][0];
					persistSelection(selectedProvider, selectedModel);
				}
			}
		} catch { /* keep previous models */ }
		finally { modelsLoading = false; }
	}

	$effect(() => {
		selectedProvider;
		fetchModels();
	});

	const now = new Date();
	const SYSTEM_PROMPT = `You are a sharp, warm, and concise assistant. Get straight to the point — no fluff, no throat-clearing. Keep answers short and prioritize what matters most. Use markdown (headers, lists, inline code) when it adds clarity. Be direct but never cold: a touch of personality is welcome, just don't waste words. If you don't know, admit it in one sentence. No greetings, no sign-offs.\n\nCurrent date: ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. Current time: ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}. You have the ability to search the web for real-time information when needed. Trust the search results and cite them when used.`;
	const MAX_TOKENS = 6000;
	const CHARS_PER_TOKEN = 4;

	function isNativeSearch(model: string): boolean {
		return model.includes("5.4") || model.includes("search-preview") || model.includes("search");
	}

	function buildMessages(chatMessages: { role: string; content: string }[]) {
		const result: { role: string; content: string }[] = [{ role: "system", content: SYSTEM_PROMPT }];
		let used = Math.ceil(SYSTEM_PROMPT.length / CHARS_PER_TOKEN);
		const recent = chatMessages.filter((m) => m.content).slice(-30);
		for (let i = recent.length - 1; i >= 0; i--) {
			const cost = Math.ceil(recent[i].content.length / CHARS_PER_TOKEN);
			if (used + cost > MAX_TOKENS) break;
			result.splice(1, 0, { role: recent[i].role, content: recent[i].content });
			used += cost;
		}
		return result;
	}

	const activeProviders = $derived(configuredProviders());

	$effect(() => {
		if (activeProviders.length > 0) {
			if (!activeProviders.includes(selectedProvider)) {
				selectedProvider = activeProviders[0];
			}
		} else {
			selectedProvider = "openai";
		}
	});

	function handleThemeToggle() {
		toggleTheme();
		dark = getTheme();
	}

	function handleNewChat() {
		const chat = getActiveChat();
		if (!chat || chat.messages.length === 0) {
			sidebarOpen = false;
			return;
		}
		createChat();
		sidebarOpen = false;
		inputValue = "";
		isGenerating = false;
	}

	function handleSelectChat(id: string) {
		const current = getActiveChat();
		if (current && current.messages.length === 0 && current.id !== id) {
			deleteChat(current.id);
		}
		setActiveChat(id);
		sidebarOpen = false;
		inputValue = "";
		isGenerating = false;
	}

	function handleDeleteChat(id: string) {
		deleteChat(id);
		if (getChats().length === 0) sidebarOpen = false;
	}

	async function handleSubmit(text: string) {
		if (!hasAnyKey() || isGenerating) return;

		if (!currentChatId) createChat();
		const chat = getActiveChat();
		if (!chat) return;

		const userMsg = { id: uuid(), role: "user" as const, content: text, time: new Date().toISOString() };
		const aMsg = { id: uuid(), role: "assistant" as const, content: "", time: new Date().toISOString() };
		chat.messages.push(userMsg, aMsg);
		updateChatMessages(messages);
		console.log("[PrivChat] User:", text);
		const assistantIdx = messages.length - 1;
		isGenerating = true;

		const useNativeSearch = webSearch && isNativeSearch(selectedModel);

		if (webSearch && !useNativeSearch) {
			const needsSearch = await shouldSearch(text);
			if (needsSearch) {
				searchStatus = "Browsing web...";
				await streamGptSearch(messages, assistantIdx);
				isGenerating = false;
				return;
			}
		}

		const controller = new AbortController();
		abortController = controller;

		try {
			const body: Record<string, unknown> = {
					baseUrl: getBaseUrl(selectedProvider),
					apiKey: getKey(selectedProvider),
					model: selectedModel,
					messages: buildMessages(messages),
				};
				if (useNativeSearch) {
					body.tools = [{ type: "web_search" }];
					searchStatus = "Searching web...";
				}
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
				signal: controller.signal,
			});

			if (!res.ok) {
				const err = await res.text();
				messages[assistantIdx].content = `Error: ${res.status} - ${err.slice(0, 300)}`;
				updateChatMessages(messages);
				console.log("[PrivChat] LLM error:", res.status);
				return;
			}

			console.log("[PrivChat] LLM streaming...");
			const reader = res.body?.getReader();
			if (!reader) {
				messages[assistantIdx].content = "No response stream";
				updateChatMessages(messages);
				return;
			}

			const decoder = new TextDecoder();
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				const chunk = decoder.decode(value, { stream: true });
				const citationMatch = chunk.match(/__CITATIONS__(\[.*\]?)__END__/);
				if (citationMatch) {
					try {
						const citations = JSON.parse(citationMatch[1]);
						if (Array.isArray(citations) && citations.length > 0) {
							(messages[assistantIdx] as { sources?: { title: string; url: string }[] }).sources = citations;
						}
					} catch { /* */ }
					messages[assistantIdx].content += chunk.replace(/__CITATIONS__.*?__END__/, "");
				} else {
					messages[assistantIdx].content += chunk;
				}
			}
			updateChatMessages(messages);
			console.log("[PrivChat] LLM response:", messages[assistantIdx].content.length, "chars");
			generateSummary();
		} catch (err) {
			if ((err as Error).name !== "AbortError") {
				messages[assistantIdx].content = `Error: ${(err as Error).message}`;
				updateChatMessages(messages);
			}
		} finally {
			isGenerating = false;
			abortController = null;
		}
	}

	function handleStop() {
		abortController?.abort();
		isGenerating = false;
	}

	async function streamGptSearch(msgs: typeof messages, assistantIdx: number) {
		try {
			const lastUser = msgs.filter((m) => m.role === "user" && m.content).slice(-1)[0];
			if (!lastUser) return;

			const res = await fetch("/api/chatgpt-search", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					query: lastUser.content,
					messages: msgs.filter((m) => m.content).map((m) => ({ role: m.role, content: m.content })),
				}),
				signal: AbortSignal.timeout(120000),
			});

			if (!res.ok || !res.body) {
				searchStatus = "";
				msgs[assistantIdx].content = `Error: ${res.status}`;
				updateChatMessages(msgs);
				return;
			}

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let rawChunks = 0;
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				const chunk = decoder.decode(value, { stream: true });
				rawChunks++;
				if (rawChunks <= 3) console.log(`[PrivChat] Brave raw chunk ${rawChunks}:`, chunk.slice(0, 300));
				const citationMatch = chunk.match(/__CITATIONS__(\[.*\]?)__END__/);
				if (citationMatch) {
					try {
						const citations = JSON.parse(citationMatch[1]);
						console.log("[PrivChat] Brave citations:", citations.length, "sources");
						citations.forEach((c: { title: string; url: string }, i: number) => console.log(`[PrivChat]   ${i + 1}. ${c.title} | ${c.url}`));
						if (Array.isArray(citations) && citations.length > 0) {
							(msgs[assistantIdx] as { sources?: { title: string; url: string }[] }).sources = citations;
						}
					} catch { /* */ }
					msgs[assistantIdx].content += chunk.replace(/__CITATIONS__.*?__END__/, "");
					searchStatus = "";
				} else {
					msgs[assistantIdx].content += chunk;
				}
			}
			searchStatus = "";
			updateChatMessages(msgs);
			generateSummary();
		} catch (err) {
			searchStatus = "";
			if ((err as Error).name !== "AbortError") {
				msgs[assistantIdx].content = `Error: ${(err as Error).message}`;
				updateChatMessages(msgs);
			}
		}
	}

	async function shouldSearch(query: string): Promise<boolean> {
		try {
			const key = getKey(selectedProvider);
			if (!key) return false;
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					baseUrl: getBaseUrl(selectedProvider),
					apiKey: key,
					model: selectedModel,
					messages: [
						{
							role: "system",
							content: `Current date: ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. Reply YES or NO only. Does this question need real-time web data, current prices, latest news, recent events, or facts beyond your training cutoff? Say NO for coding, math, definitions, opinions, timeless knowledge.`,
						},
						{ role: "user", content: query },
					],
				}),
				signal: AbortSignal.timeout(6000),
			});
			if (!res.ok || !res.body) return false;
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let answer = "";
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				answer += decoder.decode(value, { stream: true });
			}
			const trimmed = answer.trim().replace(/__CITATIONS__.*?__END__/, "").trim();
			const result = trimmed.toUpperCase().startsWith("YES");
			console.log("[PrivChat] Search decision:", result ? "YES" : "NO", "|", trimmed);
			return result;
		} catch {
			return false;
		}
	}

	async function generateSummary() {
		const chat = getActiveChat();
		if (!chat) return;
		const messages = chat.messages.filter((m) => m.content);
		if (messages.length < 2) return;

		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					baseUrl: getBaseUrl(selectedProvider),
					apiKey: getKey(selectedProvider),
					model: selectedModel,
					messages: [
						{
							role: "system",
							content:
								"Create a short, descriptive title (3-6 words) that captures the essence of this conversation. Return only the title, no quotes, no punctuation at the end.",
						},
						...messages.slice(-6).map((m) => ({ role: m.role, content: m.content.slice(0, 300) })),
					],
				}),
				signal: AbortSignal.timeout(15000),
			});

			if (!res.ok || !res.body) return;
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let summary = "";
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				summary += decoder.decode(value, { stream: true });
			}
			const clean = summary.trim().replace(/^["']|["']$/g, "").slice(0, 80);
			if (clean) setChatSummary(clean);
		} catch { /* ignore */ }
	}
</script>

<div class="flex h-full overflow-x-hidden bg-background">
	<aside
		class="fixed inset-0 z-50 flex flex-col bg-background transition-transform duration-300 {sidebarOpen ? 'translate-x-0' : '-translate-x-full'}"
		style="padding-bottom: env(safe-area-inset-bottom); padding-top: env(safe-area-inset-top)"
	>
		<div class="flex h-14 shrink-0 items-center justify-between px-4">
			<h2 class="text-base font-semibold">Chats</h2>
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="icon" onclick={handleThemeToggle} aria-label="Toggle theme">
					{#snippet children()}
						{#if dark}<Icon name="sun" class="size-5" />{:else}<Icon name="moon" class="size-5" />{/if}
					{/snippet}
				</Button>
				<Button variant="ghost" size="icon" onclick={() => { sidebarOpen = false; goto("/settings"); }} aria-label="Settings">
					{#snippet children()}<Icon name="settings" class="size-5" />{/snippet}
				</Button>
				<Button variant="ghost" size="icon" onclick={() => (webSearch = !webSearch)} aria-label="Toggle search">
					{#snippet children()}
						<Icon name="globe" class={webSearch ? "size-5 text-blue-500" : "size-5 text-muted-foreground"} />
					{/snippet}
				</Button>
				<Button variant="ghost" size="icon" onclick={() => (sidebarOpen = false)} aria-label="Close">
					{#snippet children()}<Icon name="chevron-left" class="size-5" />{/snippet}
				</Button>
			</div>
		</div>

		<div class="flex-1 overflow-y-auto px-4">
			{#each chats as chat (chat.id)}
				<div
					class="flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted {chat.id === currentChatId ? 'bg-muted' : ''}"
				>
					<button class="flex-1 min-w-0 text-left" onclick={() => handleSelectChat(chat.id)}>
						<div class="truncate text-[15px] font-medium">{chat.summary || chat.title}</div>
						<div class="text-xs text-muted-foreground mt-0.5">{formatDate(chat.updatedAt)}</div>
					</button>
					<button
						class="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
						onclick={() => handleDeleteChat(chat.id)}
						aria-label="Delete chat"
					>
						<Icon name="trash" class="size-4" />
					</button>
				</div>
			{/each}
			{#if chats.length === 0}
				<p class="py-16 text-center text-sm text-muted-foreground">No chats yet</p>
			{/if}
		</div>

		{#if chats.length > 0}
			<div class="shrink-0 px-4 pb-4 pt-2">
				<button
					class="w-full rounded-xl py-3 text-center text-sm text-muted-foreground hover:bg-muted transition-colors"
					onclick={clearAllChats}
				>
					Clear all chats
				</button>
			</div>
		{/if}
	</aside>

	<div class="flex flex-1 flex-col overflow-x-hidden">
		<header class="flex h-14 shrink-0 items-center justify-between border-b px-4">
			<Button variant="ghost" size="icon" onclick={() => (sidebarOpen = true)} aria-label="Open chats">
				{#snippet children()}
					<Icon name="menu" class="size-4" />
				{/snippet}
			</Button>
			<div class="flex-1 flex justify-center">
				{#if activeProviders.length > 0}
					<div class="relative" bind:this={modelMenuEl}>
						<button
							class="flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground/90"
							onclick={() => {
								modelMenuOpen = !modelMenuOpen;
								if (modelMenuOpen && providerModels[selectedProvider].length === 0) fetchModels();
							}}
						>
							{modelLabel(selectedModel) || (providerModels[selectedProvider]?.length === 0 ? "No models" : "...")}
							<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground {modelMenuOpen ? 'rotate-180' : ''} transition-transform">
								<path d="m6 9 6 6 6-6"/>
							</svg>
						</button>
						{#if modelMenuOpen}
							<div role="menu" tabindex="-1" class="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border bg-popover p-1 shadow-md">
								{#each activeProviders as p}
									{@const info = providers.find((pr) => pr.key === p)!}
									<div class="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{info.label}</div>
									{#if providerModels[p].length === 0}
										<div class="px-2.5 pb-1 text-[11px] text-muted-foreground pl-3">
											{modelsLoading ? "Loading..." : "No models selected"}
											{#if !modelsLoading}
												<button class="text-blue-500 hover:underline ml-1" onclick={() => { modelMenuOpen = false; goto("/settings"); }}>Configure</button>
											{/if}
										</div>
									{:else}
										{#each providerModels[p] as modelId}
											<button
												class="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-accent {selectedProvider === p && selectedModel === modelId ? 'text-foreground font-medium' : 'text-muted-foreground'}"
												onclick={() => {
													const changed = selectedProvider !== p;
													selectedProvider = p;
													selectedModel = modelId;
													persistSelection(p, modelId);
													modelMenuOpen = false;
													if (changed && providerModels[p].length === 0) fetchModels();
												}}
											>
												<span class="flex-1 text-left pl-2">{modelLabel(modelId)}</span>
												{#if selectedProvider === p && selectedModel === modelId}
													<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
												{/if}
											</button>
										{/each}
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
			<Button variant="ghost" size="icon" onclick={handleNewChat} aria-label="New chat">
				{#snippet children()}
					<Icon name="plus" class="size-5" />
				{/snippet}
			</Button>
		</header>

		<MessageList {messages} class="pb-[calc(5rem+env(safe-area-inset-bottom))]" />

		{#if !hasAnyKey()}
			<div class="flex items-center justify-between border-t bg-muted/50 px-4 py-2.5" style="padding-bottom: calc(0.625rem + env(safe-area-inset-bottom))">
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
					No API key configured
				</div>
				<Button variant="outline" size="sm" onclick={() => goto("/settings")}>
					{#snippet children()}Configure{/snippet}
				</Button>
			</div>
		{/if}

		{#if hasAnyKey()}
		<div class="absolute bottom-0 left-0 right-0 z-10 px-3 pt-1" style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom))">
			<PromptInput
				bind:value={inputValue}
				isGenerating={isGenerating}
				agentStatus={searchStatus}
				onSubmit={handleSubmit}
				onStop={handleStop}
			/>
		</div>
		{/if}
	</div>
</div>

<svelte:window onclick={handleWindowClick} />
