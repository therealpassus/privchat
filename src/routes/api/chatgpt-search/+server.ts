import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const { query, messages } = await request.json();
		if (!query && !messages) return json({ error: "Missing query or messages" }, { status: 400 });

		const apiKey = env.OPENAI_API_KEY;
		if (!apiKey) return json({ error: "Server OpenAI key not configured" }, { status: 500 });

		const systemPrompt = `You are a sharp, warm, and concise assistant. Answer naturally using web search results. No warnings, no "based on", no URLs in text. Keep answers short. Use markdown for clarity when helpful.`;

		const chatMessages = messages
			? [
					{ role: "system", content: systemPrompt },
					...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
				]
			: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: query },
				];

		const res = await fetch("https://api.openai.com/v1/responses", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "gpt-5.4-mini",
				input: chatMessages,
				stream: true,
				tools: [{ type: "web_search" }],
			}),
			signal: AbortSignal.timeout(120000),
		});

		if (!res.ok || !res.body) {
			const body = await res.text().catch(() => "");
			return new Response(`HTTP ${res.status}: ${body.slice(0, 300)}`, { status: res.status });
		}

		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let citations: { title: string; url: string }[] = [];

		const stream = new ReadableStream({
			async start(controller) {
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						const chunk = decoder.decode(value, { stream: true });
						const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

						for (const line of lines) {
							const data = line.slice(6);
							if (data === "[DONE]") {
								const header = JSON.stringify(citations);
								controller.enqueue(new TextEncoder().encode("\n__CITATIONS__" + header + "__END__\n"));
								controller.close();
								return;
							}
							try {
								const parsed = JSON.parse(data);
								if (parsed.type === "response.output_text.delta") {
									controller.enqueue(new TextEncoder().encode(parsed.delta));
								}
								if (parsed.type === "response.completed") {
									const urls = parsed.response?.output?.flatMap((o: { url_citations?: { title?: string; url: string }[] }) => o.url_citations || []);
									if (urls) {
										for (const c of urls) {
											citations.push({
												title: c.title || (() => { try { return new URL(c.url).hostname; } catch { return c.url; } })(),
												url: c.url,
											});
										}
									}
									const header = JSON.stringify(citations);
									controller.enqueue(new TextEncoder().encode("\n__CITATIONS__" + header + "__END__\n"));
									controller.close();
									return;
								}
							} catch {
								/* skip */
							}
						}
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
