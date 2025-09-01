export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };


const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';


// Medical safety system prompt
export const MEDICAL_SYSTEM_PROMPT = `You are a careful, evidence-informed medical assistant.
- Purpose: provide general guidance based on described symptoms.
- Always include a clear disclaimer: you are not a doctor; this is not medical advice.
- Encourage consulting a qualified clinician, especially for red-flag symptoms.
- Ask 1–3 clarifying questions if needed (age, duration, severity, key red flags).
- Provide a short list of *possible* causes (not diagnoses) and next steps (home care vs. urgent care).
- Prioritize safety: when in doubt, advise seeking professional care.
`;


export async function chatOllama(messages: ChatMessage[]) {
const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
model: OLLAMA_MODEL,
messages,
stream: false,
options: {
temperature: 0.2,
top_p: 0.9,
}
})
});


if (!res.ok) {
const text = await res.text();
throw new Error(`Ollama error ${res.status}: ${text}`);
}


const data = await res.json();
// Ollama returns { message: { role, content }, ... }
return data?.message?.content as string;
}