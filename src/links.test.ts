import assert from "node:assert/strict";
import test from "node:test";
import {
  INVALID_LINK_ERROR,
  MAX_QUESTION_LENGTH,
  buildChatGptUrl,
  buildShareUrl,
  normalizeQuestion,
  questionLength,
  readSharedQuestion,
  validateQuestion,
} from "./links.ts";

test("normalizes outer whitespace and Windows line endings without truncating", () => {
  assert.equal(normalizeQuestion("  ¿Qué tal?\r\n¡Hola!  "), "¿Qué tal?\n¡Hola!");
  const longQuestion = "a".repeat(MAX_QUESTION_LENGTH + 1);
  assert.equal(normalizeQuestion(longQuestion), longQuestion);
});

test("shared links preserve Spanish, reserved URL characters, newlines and emoji", () => {
  const question = "¿Cómo sumar 2 + 2 & usar #etiquetas?\nExplícamelo en español 😊";
  const url = new URL(
    buildShareUrl(question, "http://localhost:5173/demostracion?old=1&q=vieja#anterior"),
  );

  assert.equal(url.origin, "http://localhost:5173");
  assert.equal(url.pathname, "/demostracion");
  assert.equal(url.search, "");
  assert.match(url.hash, /^#q=[\w-]+$/);
  assert.deepEqual(readSharedQuestion(url.search, url.hash), { question, error: null });
});

test("shared links keep the question out of the query and unreadable at a glance", () => {
  const url = buildShareUrl("¿Cómo se hace un gazpacho?", "https://preguntaleagpt.com/");
  assert.ok(url.startsWith("https://preguntaleagpt.com/#q="));
  assert.doesNotMatch(decodeURIComponent(url), /gazpacho/);
});

test("plain ?q= links created before encoded links still play", () => {
  const question = "¿Qué hora es en Tokio?";
  assert.deepEqual(readSharedQuestion(`?${new URLSearchParams({ q: question })}`), {
    question,
    error: null,
  });
  const encoded = new URL(buildShareUrl("Nueva", "https://preguntaleagpt.com/"));
  assert.deepEqual(readSharedQuestion("?q=Vieja", encoded.hash), { question: "Nueva", error: null });
});

test("damaged encoded links report an invalid link instead of garbled text", () => {
  for (const hash of ["#q=no+es+base64", "#q=%C3%B1", "#q=_w", "#q=A"]) {
    assert.deepEqual(readSharedQuestion("", hash), { question: null, error: INVALID_LINK_ERROR });
  }
  assert.deepEqual(readSharedQuestion("", "#anterior"), { question: null, error: null });
  assert.deepEqual(readSharedQuestion("", "#q="), {
    question: null,
    error: "Escribe una pregunta para continuar.",
  });
});

test("distinguishes an absent question from an invalid empty question", () => {
  assert.deepEqual(readSharedQuestion(""), { question: null, error: null });
  assert.deepEqual(readSharedQuestion("?other=1"), { question: null, error: null });
  for (const search of ["?q=", "?q=+++", "?q=%0A%0D%0A"]) {
    assert.deepEqual(readSharedQuestion(search), {
      question: null,
      error: "Escribe una pregunta para continuar.",
    });
  }
});

test("validates the limit in Unicode codepoints, including emoji", () => {
  const atLimit = "😊".repeat(MAX_QUESTION_LENGTH);
  const tooLong = `${atLimit}a`;
  assert.equal(validateQuestion(atLimit), null);
  assert.equal(validateQuestion(tooLong), "La pregunta no puede superar los 1000 caracteres.");
  assert.equal(validateQuestion(`  ${atLimit}\r\n `), null);
  assert.equal(questionLength(`  ${atLimit}\r\n `), MAX_QUESTION_LENGTH);
  assert.deepEqual(readSharedQuestion(`?${new URLSearchParams({ q: tooLong })}`), {
    question: null,
    error: "La pregunta no puede superar los 1000 caracteres.",
  });
  // Extra base64 characters decode to NUL bytes, pushing an encoded link past the limit.
  const encoded = new URL(buildShareUrl(atLimit, "https://preguntaleagpt.com/"));
  assert.equal(readSharedQuestion("", `${encoded.hash}AAAA`).error, "La pregunta no puede superar los 1000 caracteres.");
});

test("rejects invalid questions before building navigation links", () => {
  for (const question of [" \r\n ", "a".repeat(MAX_QUESTION_LENGTH + 1)]) {
    assert.throws(() => buildShareUrl(question, "https://preguntaleagpt.com/"));
    assert.throws(() => buildChatGptUrl(question));
  }
});

test("keeps HTML and URL-looking questions as exact inert text inside q", () => {
  const question = '<script>alert("hola")</script> & q=otra#javascript:alert(1)';
  const url = new URL(buildShareUrl(question, "https://preguntaleagpt.com/"));
  assert.equal(url.origin, "https://preguntaleagpt.com");
  assert.equal(url.search, "");
  assert.deepEqual(Array.from(new URLSearchParams(url.hash.slice(1)).keys()), ["q"]);
  assert.deepEqual(readSharedQuestion(url.search, url.hash), { question, error: null });
});

test("ChatGPT links use the official HTTPS origin and round-trip the normalized question", () => {
  const question = "¿Por qué 2 + 2? & #sí\nCon ejemplos 🚀";
  const url = new URL(buildChatGptUrl(`  ${question.replace(/\n/g, "\r\n")}  `));
  assert.equal(url.origin, "https://chatgpt.com");
  assert.equal(url.pathname, "/");
  assert.equal(url.hash, "");
  assert.deepEqual(Array.from(url.searchParams.keys()), ["q"]);
  assert.equal(url.searchParams.get("q"), question);
});
