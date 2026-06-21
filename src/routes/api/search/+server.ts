import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { query } = await request.json();
		if (!query) return json({ results: "" });

		const res = await fetch(
			`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
			{ signal: AbortSignal.timeout(5000) }
		);

		if (!res.ok) return json({ results: "" });

		const data = await res.json();
		const parts: string[] = [];

		if (data.AbstractText) {
			parts.push(data.AbstractText);
		}
		if (data.RelatedTopics) {
			for (const topic of data.RelatedTopics.slice(0, 3)) {
				if (topic.Text) parts.push(topic.Text);
			}
		}

		return json({ results: parts.join("\n").slice(0, 2000) });
	} catch {
		return json({ results: "" });
	}
};
