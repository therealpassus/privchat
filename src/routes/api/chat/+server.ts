import type { RequestHandler } from "./$types";

interface ChatMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { baseUrl, apiKey, model, messages } = await request.json();

		if (!baseUrl || !apiKey || !model || !messages) {
			return new Response("Missing required fields", { status: 400 });
		}

		const res = await fetch(`${baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model,
				messages,
				stream: true,
			}),
			signal: AbortSignal.timeout(120000),
		});

		if (!res.ok || !res.body) {
			const body = await res.text().catch(() => "");
			return new Response(`HTTP ${res.status}: ${body.slice(0, 500)}`, { status: res.status });
		}

		const reader = res.body.getReader();
		const decoder = new TextDecoder();

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
								controller.close();
								return;
							}
							try {
								const parsed = JSON.parse(data);
								const content = parsed.choices?.[0]?.delta?.content;
								if (content) {
									controller.enqueue(new TextEncoder().encode(content));
								}
							} catch {
								/* skip unparseable chunks */
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
			},
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return new Response(message, { status: 500 });
	}
};
