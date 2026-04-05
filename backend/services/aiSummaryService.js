import OpenAI from "openai";
import { env } from "../config/env.js";

function truncate(s, n) {
  const str = String(s ?? "");
  if (str.length <= n) return str;
  return str.slice(0, n).trimEnd() + "...";
}

export async function generateMedicalSummary({ reportText, fileName }) {
  const cleanText = truncate(reportText ?? "", 4000);

  if (!env.OPENAI_API_KEY) {
    // Mock summary for demos / when API key is missing.
    const seed = cleanText.trim().replace(/\s+/g, " ");
    const snippet = seed ? truncate(seed, 220) : "No report text provided.";
    return `Mock summary: Based on the provided text (${fileName ?? "file"}), key findings include: ${snippet}`;
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const prompt = `
You are a medical documentation assistant.
Given the following report notes (and optionally file name), generate a short, clear medical summary.
Keep it concise (max ~120 words) and avoid making up facts beyond the text.

Report notes:
${cleanText}

Output format:
- Summary: <one paragraph>
- Highlights: <3 bullet points>
  `.trim();

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [
      { role: "system", content: "Return only the requested summary format." },
      { role: "user", content: prompt }
    ],
    temperature: 0.2
  });

  const content = completion.choices?.[0]?.message?.content ?? "";
  return truncate(content, 2000);
}

