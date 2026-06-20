import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const fallbacks: Record<string, string[]> = {
	"api.openai.com": ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "o3-mini", "o4-mini"],
	"api.deepseek.com": ["deepseek-chat", "deepseek-reasoner", "deepseek-v4-flash", "deepseek-v4-pro"],
};

function getFallback(baseUrl: string): string[] {
	try {
		const host = new URL(baseUrl).hostname;
		return fallbacks[host] ?? [];
	} catch {
		return [];
	}
}

export const POST: RequestHandler = async ({ request }) => {
	let body: { baseUrl: string; apiKey: string };
	try {
		body = await request.json();
	} catch {
		return json({ models: [], error: "Invalid body" });
	}

	const { baseUrl, apiKey } = body;

	if (!baseUrl || !apiKey) {
		return json({ models: [], error: "Missing baseUrl or apiKey" });
	}

	const fb = getFallback(baseUrl);

	try {
		const res = await fetch(`${baseUrl}/models`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			signal: AbortSignal.timeout(8000),
		});

		if (!res.ok) {
			return json({ models: fb.map((id) => ({ id })) });
		}

		const data = await res.json();
		const raw: { id: string }[] = data.data || [];

		const chatModels = raw
			.filter((m) => {
				const id = m.id.toLowerCase();
				return (
					id.includes("gpt") ||
					id.includes("o1-") ||
					id.includes("o3-") ||
					id.includes("o4-") ||
					id.includes("chat") ||
					id.includes("reasoner") ||
					id.includes("v4")
				);
			})
			.map((m) => ({ id: m.id }))
			.slice(0, 40);

		if (chatModels.length === 0 && fb.length > 0) {
			return json({ models: fb.map((id) => ({ id })) });
		}

		return json({ models: chatModels });
	} catch {
		return json({ models: fb.map((id) => ({ id })) });
	}
};
