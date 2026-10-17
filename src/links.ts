export const MAX_QUESTION_LENGTH = 1000;
export const INVALID_LINK_ERROR = "Este enlace no es válido.";

export function normalizeQuestion(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

/** Length in Unicode code points, the unit the limit is defined in. */
export function questionLength(value: string): number {
  return Array.from(normalizeQuestion(value)).length;
}

export function validateQuestion(value: string): string | null {
  const question = normalizeQuestion(value);

  if (!question) {
    return "Escribe una pregunta para continuar.";
  }

  if (questionLength(question) > MAX_QUESTION_LENGTH) {
    return `La pregunta no puede superar los ${MAX_QUESTION_LENGTH} caracteres.`;
  }

  return null;
}

function requireQuestion(value: string): string {
  const error = validateQuestion(value);
  if (error) throw new Error(error);
  return normalizeQuestion(value);
}

/** Base64url keeps the question unreadable at a glance in a shared link. */
function encodeQuestion(question: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(question)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeQuestion(value: string): string | null {
  if (!/^[\w-]*$/.test(value)) return null;
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** The question travels in the fragment, which browsers never send to the server. */
export function buildShareUrl(question: string, baseUrl: string): string {
  const normalized = requireQuestion(question);
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = `q=${encodeQuestion(normalized)}`;
  return url.toString();
}

/** Reads `#q=` links, and the plain `?q=` links created before them. */
export function readSharedQuestion(search: string, hash = ""): {
  question: string | null;
  error: string | null;
} {
  const encoded = new URLSearchParams(hash.replace(/^#/, "")).get("q");
  const value = encoded === null
    ? new URLSearchParams(search).get("q")
    : decodeQuestion(encoded);
  if (encoded === null && value === null) return { question: null, error: null };
  if (value === null) return { question: null, error: INVALID_LINK_ERROR };

  const error = validateQuestion(value);
  if (error) return { question: null, error };

  return { question: normalizeQuestion(value), error: null };
}

export function buildChatGptUrl(question: string): string {
  const url = new URL("https://chatgpt.com/");
  url.searchParams.set("q", requireQuestion(question));
  return url.toString();
}
