import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { baseUrl, apiKey } = await request.json();

		if (!baseUrl || !apiKey) {
			return json({ valid: false, error: "Missing baseUrl or apiKey" }, { status: 400 });
		}

		const res = await fetch(`${baseUrl}/models`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			signal: AbortSignal.timeout(8000),
		});

		if (!res.ok) {
			return json({ valid: false, error: `Invalid key (HTTP ${res.status})` });
		}

		return json({ valid: true });
	} catch (err) {
		const message = err instanceof Error ? err.message : "Network error";
		return json({ valid: false, error: message });
	}
};
