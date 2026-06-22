import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const { query, messages } = await request.json();
		if (!query && !messages) return new Response("Missing query", { status: 400 });

		const apiKey = env.BRAVE_ANSWERS_API_KEY || env.BRAVE_API_KEY;
		if (!apiKey) return new Response(JSON.stringify({ error: "No Answers API key configured. Add BRAVE_ANSWERS_API_KEY to .env" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});

		const queryOnly = messages
			? messages.filter((m: { role: string; content: string }) => m.content).map((m: { content: string }) => m.content).join("\n\n")
			: query;

		console.log("[Answers] Sending to Brave:", queryOnly.length, "chars");

		const res = await fetch("https://api.search.brave.com/res/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-subscription-token": apiKey,
			},
			body: JSON.stringify({
				model: "brave",
				messages: [{ role: "user", content: queryOnly.slice(0, 4000) }],
				stream: true,
				enable_citations: true,
			}),
			signal: AbortSignal.timeout(120000),
		});

		if (!res.ok || !res.body) {
			const body = await res.text().catch(() => "");
			return new Response(`HTTP ${res.status}: ${body.slice(0, 300)}`, { status: res.status });
		}

		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		const citations: { title: string; url: string }[] = [];
		const seenUrls = new Set<string>();
		let citationBuffer = "";

		const stream = new ReadableStream({
			async start(controller) {
				try {
					let buffer = "";
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						const chunk = decoder.decode(value, { stream: true });
						buffer += chunk;
						const lines = buffer.split("\n");
						buffer = "";

						for (let i = 0; i < lines.length; i++) {
							const line = lines[i];
							if (!line.startsWith("data: ")) continue;
							const data = line.slice(6);
							if (data === "[DONE]") {
								if (citations.length > 0) {
									controller.enqueue(new TextEncoder().encode("\n__CITATIONS__" + JSON.stringify(citations) + "__END__\n"));
								}
								controller.close();
								return;
							}
							try {
								const parsed = JSON.parse(data);
								const delta = parsed.choices?.[0]?.delta?.content;
								if (!delta) continue;

								if (delta.startsWith("<citation>")) {
									citationBuffer += delta;
									if (citationBuffer.includes("</citation>")) {
										const match = citationBuffer.match(/<citation>(.*?)<\/citation>/s);
										if (match) {
											try {
												const cite = JSON.parse(match[1]);
												if (!seenUrls.has(cite.url)) {
													seenUrls.add(cite.url);
													citations.push({
														title: (() => { try { return new URL(cite.url).hostname.replace("www.", ""); } catch { return cite.url; } })(),
														url: cite.url,
													});
												}
											} catch { /* */ }
										}
										citationBuffer = citationBuffer.replace(/<citation>.*?<\/citation>/s, "");
									}
								} else if (!delta.startsWith("<usage>") && !delta.startsWith("<enum_item>")) {
									controller.enqueue(new TextEncoder().encode(delta));
								}
							} catch {
								/* skip */
							}
						}
					}
					if (citations.length > 0) {
						controller.enqueue(new TextEncoder().encode("\n__CITATIONS__" + JSON.stringify(citations) + "__END__\n"));
					}
					controller.close();
				} catch (err) {
					controller.error(err);
				}
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "no-cache",
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return new Response(message, { status: 500 });
	}
};
