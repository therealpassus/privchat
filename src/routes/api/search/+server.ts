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
		let n = 1;

		if (data.AbstractText && data.AbstractURL) {
			parts.push(`(${n}) ${data.AbstractText}\nSource: ${data.AbstractURL}`);
			n++;
		}
		if (data.RelatedTopics) {
			for (const topic of data.RelatedTopics.slice(0, 5)) {
				if (topic.Text) {
					const url = topic.FirstURL || "";
					parts.push(`(${n}) ${topic.Text}${url ? `\nSource: ${url}` : ""}`);
					n++;
				}
			}
		}

		return json({ results: parts.join("\n\n").slice(0, 3000), sources: n - 1 });
	} catch {
		return json({ results: "", sources: 0 });
	}
};
