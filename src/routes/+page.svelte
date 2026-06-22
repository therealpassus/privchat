<script lang="ts">
	import { goto } from "$app/navigation";
	import { uuid } from "$lib/utils";
	import { PromptInput, MessageList } from "$lib/components/chat";
	import { toggleTheme, getTheme } from "$lib/theme.svelte";
	import {
		getKey,
		getBaseUrl,
		hasAnyKey,
		configuredProviders,
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
		if (!key) return;
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
			if (data.models?.length) {
				providerModels[selectedProvider] = data.models.map((m: { id: string }) => m.id);
				if (!selectedModel || !providerModels[selectedProvider].includes(selectedModel)) {
					selectedModel = providerModels[selectedProvider][0];
					persistSelection(selectedProvider, selectedModel);
				}
			}
		} catch { /* keep previous models */ }
		finally { modelsLoading = false; }
	}

	$effect(() => {
		selectedProvider;
		if (activeProviders.length > 0) fetchModels();
	});

	const now = new Date();
	const SYSTEM_PROMPT = `You are a sharp, warm, and concise assistant. Get straight to the point — no fluff, no throat-clearing. Keep answers short and prioritize what matters most. Use markdown (headers, lists, inline code) when it adds clarity. Be direct but never cold: a touch of personality is welcome, just don't waste words. If you don't know, admit it in one sentence. No greetings, no sign-offs.\n\nCurrent date: ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. Current time: ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}. You have the ability to search the web for real-time information when needed. Trust the search results and cite them when used.`;
	const MAX_TOKENS = 6000;
	const CHARS_PER_TOKEN = 4;

	function buildMessages(chatMessages: { role: string; content: string }[], searchContext = "", searchAttempted = false, searchFailed = false) {
		let systemContent = SYSTEM_PROMPT;
		if (searchContext) {
			systemContent = `${SYSTEM_PROMPT}\n\nResearch data:\n\n${searchContext}\n\nAnswer naturally using the data above. No warnings, no "based on", no URLs, no citations. Just the answer. If the exact information is not in the data, say so.`;
		} else if (searchFailed) {
			systemContent = `${SYSTEM_PROMPT}\n\nThe user's question required real-time information. A web search was performed but the exact data could not be found. Do not make up information. Simply state that the information could not be found and suggest what the user could search for.`;
		} else if (searchAttempted) {
			systemContent = `${SYSTEM_PROMPT}\n\nNote: Web search was attempted but returned no results. Answer based on your knowledge and note your training cutoff if the question requires real-time data.`;
		}
		const result: { role: string; content: string }[] = [{ role: "system", content: systemContent }];
		let used = Math.ceil(systemContent.length / CHARS_PER_TOKEN);
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

		let searchContext = "";
		let searchAttempted = false;
		let searchFailed = false;
		let searchSources: { title: string; url: string }[] = [];
		if (webSearch) {
			const context = messages.filter((m) => m.content).slice(-2).map((m) => ({ role: m.role, content: m.content.slice(0, 300) }));
			const decision = await shouldSearch(text, context);
			console.log("[PrivChat] Search decision:", decision.search ? `YES -> "${decision.query}"` : "NO");
			if (decision.search) {
				searchAttempted = true;
				const searchQuery = decision.query || text;
				searchStatus = "Browsing web...";
				console.log("[PrivChat] Searching for:", searchQuery);

				try {
					const sr = await fetch("/api/search", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ query: searchQuery }),
						signal: AbortSignal.timeout(5000),
					});
					const sd = await sr.json();
					const braveSources: { title: string; url: string; snippet: string }[] = sd.sources || [];
					console.log("[PrivChat] Brave returned:", braveSources.length, "sources");

					if (braveSources.length === 0) {
						searchFailed = true;
						searchStatus = "";
					} else {

					const accumulated: string[] = [];
					let foundIdx = -1;
					for (let i = 0; i < braveSources.length; i++) {
						const src = braveSources[i];
						const domain = (() => { try { return new URL(src.url).hostname.replace("www.", ""); } catch { return ""; } })();
						searchStatus = `Reading ${domain}...`;
						console.log(`[PrivChat] Scraping source ${i + 1}:`, src.url);
						const sc = await fetch("/api/scrape", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ url: src.url }),
							signal: AbortSignal.timeout(6000),
						});
						const scraped = await sc.json();
						const content = scraped.text || "";
						console.log(`[PrivChat] Source ${i + 1} scraped:`, content.length, "chars");
						if (content) console.log(`[PrivChat] Source ${i + 1} content:`, content.slice(0, 500));

						if (content.length > 100) {
							const entry = `(${i + 1}) [${src.title.slice(0, 80)}](${src.url})\n${content.slice(0, 2500)}`;
							accumulated.push(entry);
						} else {
							const entry = `(${i + 1}) [${src.title.slice(0, 80)}](${src.url})\n${src.snippet}`;
							accumulated.push(entry);
						}

						searchStatus = "";
						const enough = await hasEnoughInfo(text, accumulated.join("\n\n"));
						if (enough) {
							console.log(`[PrivChat] Enough info after source ${i + 1}`);
							foundIdx = i;
							break;
						}
						if (i === braveSources.length - 1) {
						}
					}

					searchContext = accumulated.join("\n\n");
					if (foundIdx >= 0) {
						searchSources = [{ title: braveSources[foundIdx].title, url: braveSources[foundIdx].url }];
					} else if (accumulated.length > 0 && accumulated.some((e) => e.length > 200)) {
						const lastIdx = accumulated.length - 1;
						searchSources = [{ title: braveSources[lastIdx].title, url: braveSources[lastIdx].url }];
					} else {
						searchSources = [];
						searchFailed = true;
					}
					console.log("[PrivChat] Search context:", searchContext.length, "chars from", accumulated.length, "sources");
					console.log("[PrivChat] LLM receives:", searchContext.slice(0, 1000));
					searchStatus = "";
					}
				} catch { /* fall through */ }
			} else {
				searchStatus = "";
			}
		}

		const controller = new AbortController();
		abortController = controller;

		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					baseUrl: getBaseUrl(selectedProvider),
					apiKey: getKey(selectedProvider),
					model: selectedModel,
					messages: buildMessages(messages, searchContext, searchAttempted, searchFailed),
				}),
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
				messages[assistantIdx].content += decoder.decode(value, { stream: true });
			}
			if (searchSources.length > 0) {
				(messages[assistantIdx] as { sources?: { title: string; url: string }[] }).sources = searchSources;
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

	async function shouldSearch(query: string, contextMessages: { role: string; content: string }[]): Promise<{ search: boolean; query: string }> {
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
								`Current date: ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. Current time: ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}.\n\nDecide if the user needs a web search. If YES, write a precise Brave Search query (3-8 keywords).\n\nCRITICAL: If the conversation context shows the user is asking a follow-up about specific data (prices, numbers, facts, names, events) that was previously answered via a web search, you MUST say YES to search for the new specific question. Never answer follow-ups about specific data from memory.\n\nSearch YES triggers (any of these):\n- "latest", "current", "today", "now", "recent", "this week/month/year"\n- "price of", "rate", "value", "cost", "worth"\n- "news about", "what happened", "update on"\n- Named entities with time: "Ethereum 2026", "Trump trial", "Olympics"\n- Stats, numbers, or data that changed in the last 12 months\n- "block height", "gas fee", "BTC dominance", any real-time metric\n- Events after your training cutoff\n- Follow-up questions about specific data from previous answers\n\nSearch NO triggers:\n- Coding, algorithms, debugging, syntax\n- Math, physics, philosophy definitions\n- "What is", "explain", "how does" for timeless concepts\n- Opinions, advice, creative writing\n\nReply format:\nYES: <search query>\nNO`,
						},
						...contextMessages,
						{ role: "user", content: query },
					],
				}),
				signal: AbortSignal.timeout(8000),
			});
			if (!res.ok || !res.body) return { search: false, query: "" };
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let answer = "";
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				answer += decoder.decode(value, { stream: true });
		}
		const trimmed = answer.trim();
		console.log("[PrivChat] Search decision raw:", trimmed);
		if (trimmed.toUpperCase().startsWith("YES")) {
			const searchQuery = trimmed.replace(/^YES:?\s*/i, "").trim() || query;
			return { search: true, query: searchQuery };
		}
		return { search: false, query: "" };
		} catch {
			return { search: false, query: "" };
		}
	}

	async function hasEnoughInfo(query: string, sources: string): Promise<boolean> {
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
								`Current date: ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. Reply with only YES or NO. Do the provided sources contain relevant information to answer the user's question? Say YES if there is any useful data, numbers, or facts. Only say NO if the sources are completely irrelevant or empty.`,
						},
						{ role: "user", content: `Question: ${query}\n\nSources:\n${sources.slice(0, 2000)}` },
					],
				}),
				signal: AbortSignal.timeout(6000),
			});
			if (!res.ok || !res.body) return true;
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let answer = "";
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				answer += decoder.decode(value, { stream: true });
			}
			return answer.trim().toUpperCase().startsWith("YES");
		} catch {
			return true;
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
				<Button variant="ghost" size="icon" onclick={() => (webSearch = !webSearch)} aria-label="Toggle web search">
					{#snippet children()}
						<Icon name="globe" class={webSearch ? "size-5 text-blue-500" : "size-5"} />
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
							{modelLabel(selectedModel) || "..."}
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
										<div class="px-2.5 pb-1 text-[11px] text-muted-foreground pl-3">{modelsLoading ? "Loading..." : "No models"}</div>
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

		<MessageList {messages} />

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

		{#if searchStatus}
			<div class="flex justify-center pb-1">
				<span class="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
					<span class="flex size-1.5 rounded-full bg-blue-500 animate-pulse"></span>
					{searchStatus}
				</span>
			</div>
		{/if}

		{#if hasAnyKey()}
		<div class="shrink-0 px-3 pb-3 pt-1" style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom))">
			<PromptInput
				bind:value={inputValue}
				isGenerating={isGenerating}
				onSubmit={handleSubmit}
				onStop={handleStop}
			/>
		</div>
		{/if}
	</div>
</div>

<svelte:window onclick={handleWindowClick} />
