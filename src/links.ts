export const MAX_QUESTION_LENGTH = 1000;

export function normalizeQuestion(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

export function validateQuestion(value: string): string | null {
  const question = normalizeQuestion(value);

  if (!question) {
    return "Escribe una pregunta para continuar.";
  }

  if (Array.from(question).length > MAX_QUESTION_LENGTH) {
    return `La pregunta no puede superar los ${MAX_QUESTION_LENGTH} caracteres.`;
  }

  return null;
}

function requireQuestion(value: string): string {
  const error = validateQuestion(value);
  if (error) throw new Error(error);
  return normalizeQuestion(value);
}

export function buildShareUrl(question: string, baseUrl: string): string {
  const normalized = requireQuestion(question);
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set("q", normalized);
  return url.toString();
}

export function readSharedQuestion(search: string): {
  question: string | null;
  error: string | null;
} {
  const value = new URLSearchParams(search).get("q");
  if (value === null) return { question: null, error: null };

  const error = validateQuestion(value);
  if (error) return { question: null, error };

  return { question: normalizeQuestion(value), error: null };
}

export function buildChatGptUrl(question: string): string {
  const url = new URL("https://chatgpt.com/");
  url.searchParams.set("q", requireQuestion(question));
  return url.toString();
}
