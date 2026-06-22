import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const { baseUrl, apiKey, model, messages, tools } = await request.json();

		if (!baseUrl || !apiKey || !model || !messages) {
			return new Response("Missing required fields", { status: 400 });
		}

		const body: Record<string, unknown> = {
			model,
			messages,
			stream: true,
		};

		if (tools && Array.isArray(tools)) {
			body.tools = tools;
		}

		const res = await fetch(`${baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(120000),
		});

		if (!res.ok || !res.body) {
			return new Response(`HTTP ${res.status}`, { status: res.status });
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
								if (citations.length > 0) {
									controller.enqueue(new TextEncoder().encode("\n__CITATIONS__" + JSON.stringify(citations) + "__END__\n"));
								}
								controller.close();
								return;
							}
							try {
								const parsed = JSON.parse(data);
								const content = parsed.choices?.[0]?.delta?.content;
								if (content) {
									controller.enqueue(new TextEncoder().encode(content));
								}
								const urls = parsed.choices?.[0]?.delta?.url_citation;
								if (urls) {
									for (const c of urls) {
										citations.push({ title: c.title || new URL(c.url).hostname, url: c.url });
									}
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
