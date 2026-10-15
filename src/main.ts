import './style.css';
import { icon } from './icons';
import { renderPage } from './view';
import { SITE_TITLE } from './seo';
import { playDemo } from './animation';
import { createFlowMotion } from './flow-motion';
import { buildChatGptUrl, buildShareUrl, normalizeQuestion, readSharedQuestion, validateQuestion } from './links';

const EXAMPLE = '¿Cómo se hace una tortilla de patatas?';
const app = document.querySelector<HTMLDivElement>('#app')!;
const $ = <T extends HTMLElement>(selector: string) => app.querySelector<T>(selector)!;
let draft = '';
let shareUrl = '';
let playbackQuestion = '';
let mode: 'create' | 'watch' = 'create';
let isPreview = false;
let finished = false;
let run: AbortController | null = null;
let toastTimer: ReturnType<typeof setTimeout>;
let copyTimer: ReturnType<typeof setTimeout>;
let typingTimer: ReturnType<typeof setTimeout>;
let linkRevision = 0;
let copyAttempt = 0;
let sharing = false;
let creating: symbol | null = null;
let flow: ReturnType<typeof createFlowMotion> | undefined;

function render() {
  creating = null;
  flow?.dispose();
  clearTimeout(toastTimer);
  clearTimeout(copyTimer);
  clearTimeout(typingTimer);
  const watching = mode === 'watch';
  app.innerHTML = renderPage({ watching, isPreview, shareUrl, draft, baseUrl: import.meta.env.BASE_URL });
  if (!watching) {
    $<HTMLTextAreaElement>('#question').value = draft;
    if (shareUrl) $<HTMLInputElement>('#share-url').value = shareUrl;
    updateShareButton();
    resizeInput(); updateSend();
  }
  flow = createFlowMotion(app);
  if (!watching) setStep(shareUrl ? 3 : draft.trim() ? 2 : 1);
  attachEvents();
}

function resizeInput() {
  const input = $<HTMLTextAreaElement>('#question');
  input.style.height = '24px';
  input.style.height = `${Math.min(input.scrollHeight, 144)}px`;
}
function updateSend() {
  $<HTMLButtonElement>('.send-button').disabled = !normalizeQuestion($<HTMLTextAreaElement>('#question').value);
}
function attachEvents() {
  app.querySelectorAll<HTMLElement>('[data-action]').forEach(button => button.addEventListener('click', () => {
    switch (button.dataset.action) {
      case 'create': createLink(); break;
      case 'preview': previewDraft(); break;
      case 'new': reset(); break;
      case 'back': if (isPreview) returnToCreator(); else reset(); break;
      case 'replay': void startDemo(playbackQuestion, isPreview); break;
      case 'skip': run?.abort(); showFinish(); break;
      case 'copy': void copyLink(); break;
      case 'share': void shareLink(); break;
    }
  }));
  const input = $<HTMLTextAreaElement>('#question');
  input.addEventListener('input', () => {
    if (mode !== 'create') return;
    creating = null;
    draft = input.value;
    resizeInput(); updateSend();
    $('#question-error').textContent = '';
    input.removeAttribute('aria-invalid');
    const invalidatedLink = Boolean(shareUrl);
    flow?.cancelEffects();
    clearTimeout(toastTimer);
    $('.toast').hidden = true;
    $('.demo-announcement').textContent = '';
    shareUrl = '';
    linkRevision++;
    clearTimeout(copyTimer);
    clearTimeout(typingTimer);
    $('.share-reveal').classList.remove('is-open');
    $('.share-reveal').inert = true;
    $('.share-reveal').setAttribute('aria-hidden', 'true');
    $('[data-action="create"]').innerHTML = `Crear enlace ${icon('arrowRight')}`;
    $<HTMLButtonElement>('[data-action="create"]').disabled = false;
    $('[data-action="create"]').removeAttribute('aria-busy');
    $('[data-action="copy"]').innerHTML = `${icon('copy')} Copiar enlace`;
    $('[data-action="copy"]').classList.remove('is-copied');
    $('[data-action="preview"]').textContent = draft.trim() ? 'Vista previa' : 'Ver ejemplo';
    if (!draft.trim()) setStep(1);
    else if (invalidatedLink) setStep(2);
    else typingTimer = setTimeout(() => { if (mode === 'create' && !shareUrl) setStep(2); }, 320);
  });
  input.addEventListener('keydown', event => {
    if (mode === 'create' && event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault(); void createLink();
    }
  });
  $('.composer-form').addEventListener('submit', event => {
    event.preventDefault();
    if (mode === 'create') void createLink();
    else if (finished) window.open(buildChatGptUrl(playbackQuestion), '_blank', 'noopener,noreferrer');
  });
  $<HTMLInputElement>('#share-url')?.addEventListener('click', event => (event.target as HTMLInputElement).select());
}
function validateDraft() {
  const error = validateQuestion(draft);
  if (!error) return true;
  $('#question-error').textContent = error;
  $('#question').setAttribute('aria-invalid', 'true');
  $('#question').focus();
  return false;
}
async function createLink() {
  if (creating || !validateDraft()) return;
  if (matchMedia('(pointer: coarse)').matches) $('#question').blur();
  if (shareUrl) { $('[data-action="copy"]').focus({ preventScroll: true }); return; }
  clearTimeout(typingTimer);
  const pending = Symbol('creating-link');
  creating = pending;
  const sourceRevision = linkRevision;
  const button = $<HTMLButtonElement>('[data-action="create"]');
  button.innerHTML = `Creando enlace ${icon('link')}`;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  $<HTMLButtonElement>('.send-button').disabled = true;
  setStep(2);
  $('.demo-announcement').textContent = 'Creando tu enlace.';
  const completed = await flow!.createLink();
  if (creating !== pending || mode !== 'create' || sourceRevision !== linkRevision || !button.isConnected) return;
  creating = null;
  button.disabled = false;
  button.removeAttribute('aria-busy');
  updateSend();
  if (!completed) { button.innerHTML = `Crear enlace ${icon('arrowRight')}`; return; }
  draft = normalizeQuestion(draft);
  $<HTMLTextAreaElement>('#question').value = draft;
  resizeInput();
  shareUrl = buildShareUrl(draft, window.location.href);
  const revision = ++linkRevision;
  clearTimeout(copyTimer);
  $<HTMLInputElement>('#share-url').value = shareUrl;
  updateShareButton();
  const reveal = $('.share-reveal');
  const wasOpen = reveal.classList.contains('is-open');
  reveal.inert = false;
  reveal.removeAttribute('aria-hidden');
  reveal.classList.add('is-open');
  $('[data-action="create"]').innerHTML = `Enlace creado ${icon('check')}`;
  const copy = $('[data-action="copy"]');
  copy.innerHTML = `${icon('copy')} Copiar enlace`;
  copy.classList.remove('is-copied');
  setStep(3);
  $('.demo-announcement').textContent = 'Tu enlace está listo. Cópialo y compártelo.';
  copy.focus({ preventScroll: true });
  const scrollToResult = () => {
    if (mode !== 'create' || linkRevision !== revision || !copy.isConnected) return;
    const panel = $('.share-panel');
    if (panel.getBoundingClientRect().bottom > innerHeight - 20) panel.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' });
  };
  if (wasOpen) scrollToResult();
  else {
    flow?.reveal($('.share-panel'), scrollToResult);
    flow?.flyLink($('[data-action="create"]'), $('.share-seal'));
  }
}
function previewDraft() {
  if (draft.trim() && !validateDraft()) return;
  void startDemo(draft.trim() ? normalizeQuestion(draft) : EXAMPLE, true);
}
function nativeShareData(): ShareData {
  return { title: 'Pregúntale a GPT', url: shareUrl };
}
function updateShareButton() {
  const button = $<HTMLButtonElement>('[data-action="share"]');
  let supported = Boolean(shareUrl) && typeof navigator.share === 'function';
  try {
    if (supported && typeof navigator.canShare === 'function') supported = navigator.canShare(nativeShareData());
  } catch {
    supported = false;
  }
  button.hidden = !supported;
  button.disabled = sharing;
}
async function shareLink() {
  if (!shareUrl || sharing || typeof navigator.share !== 'function') return;
  const revision = linkRevision;
  const button = $<HTMLButtonElement>('[data-action="share"]');
  sharing = true;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  clearTimeout(toastTimer);
  $('.toast').hidden = true;
  try {
    // Call directly from the click so the browser retains user activation.
    await navigator.share(nativeShareData());
    if (!button.isConnected || mode !== 'create' || revision !== linkRevision) return;
    setStep(4);
  } catch (error) {
    if (!button.isConnected || mode !== 'create' || revision !== linkRevision) return;
    if (error instanceof DOMException && error.name === 'AbortError') return;
    toast('No se pudo abrir el menú para compartir. Usa «Copiar enlace».');
    $('[data-action="copy"]').focus({ preventScroll: true });
  } finally {
    sharing = false;
    button.removeAttribute('aria-busy');
    if (mode === 'create') updateShareButton();
  }
}
async function copyLink() {
  if (!shareUrl) return;
  const revision = linkRevision;
  const attempt = ++copyAttempt;
  const url = shareUrl;
  const button = $('[data-action="copy"]');
  clearTimeout(copyTimer);
  button.innerHTML = `${icon('copy')} Copiar enlace`;
  button.classList.remove('is-copied');
  const input = $<HTMLInputElement>('#share-url');
  try {
    await navigator.clipboard.writeText(url);
    if (!button.isConnected || mode !== 'create' || revision !== linkRevision || attempt !== copyAttempt) return;
    button.innerHTML = `${icon('check')} ¡Copiado!`;
    button.classList.add('is-copied');
    setStep(4);
    flow?.celebrate(button);
    toast('Enlace copiado. Ya puedes compartirlo.');
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      if (button.isConnected && revision === linkRevision && attempt === copyAttempt) {
        button.innerHTML = `${icon('copy')} Copiar enlace`;
        button.classList.remove('is-copied');
      }
    }, 2500);
  } catch {
    if (!input.isConnected || revision !== linkRevision || attempt !== copyAttempt) return;
    input.focus(); input.select();
    toast(matchMedia('(pointer: coarse)').matches
      ? 'Mantén pulsado el enlace y elige «Copiar».'
      : 'Copia el enlace seleccionado con Ctrl+C o ⌘C.');
  }
}
function setStep(step: number) {
  flow?.step(step);
  app.querySelectorAll<HTMLElement>('[data-step]').forEach(item => {
    const number = Number(item.dataset.step);
    item.classList.toggle('is-current', number === step);
    item.classList.toggle('is-done', number < step);
    item.querySelector('.step-number')?.setAttribute('aria-label', `Paso ${number}${number < step ? ', completado' : ''}`);
    if (number === step) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
  if (mode === 'watch' && step <= 3) $('.demo-announcement').textContent = `Paso ${step}. ${['Entra en chatgpt.com.', 'Escribe tu pregunta.', 'Pulsa enviar.'][step - 1]}`;
}
function showChatGpt() {
  $('.tab-title').textContent = 'ChatGPT';
  $('.browser-blank').hidden = true;
  $('.chatgpt-screen').hidden = false;
  resizeInput();
}
async function startDemo(text: string, preview: boolean) {
  run?.abort();
  const controller = new AbortController();
  run = controller;
  playbackQuestion = text;
  isPreview = preview;
  mode = 'watch'; finished = false;
  render();
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  $('#main').focus({ preventScroll: true });
  try {
    await playDemo({
      question: text,
      input: $<HTMLTextAreaElement>('#question'),
      sendButton: $('.send-button'), cursor: $('.fake-cursor'),
      addressInput: $<HTMLInputElement>('.address-field'), onNavigate: showChatGpt,
      signal: controller.signal,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      onText: () => { resizeInput(); updateSend(); },
      onPhase: phase => {
        if (controller.signal.aborted || finished) return;
        if (phase === 'visiting') setStep(1);
        if (phase === 'moving' || phase === 'typing') setStep(2);
        if (phase === 'sending') setStep(3);
      },
      onSubmit: showFinish,
    });
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      console.error('No se pudo reproducir la demostración.', error);
      if (run === controller) showFinish();
    }
  }
}
function showFinish() {
  if (finished || mode !== 'watch') return;
  finished = true; showChatGpt();
  $<HTMLInputElement>('.address-field').value = 'chatgpt.com';
  $<HTMLTextAreaElement>('#question').value = playbackQuestion;
  resizeInput(); updateSend(); setStep(4);
  $('.demo-controls').hidden = true;
  $('.final-message').hidden = false;
  $<HTMLAnchorElement>('.chatgpt-link').href = buildChatGptUrl(playbackQuestion);
  $('.send-button').setAttribute('aria-label', 'Abrir en ChatGPT');
  $('.send-button').setAttribute('title', 'Abrir en ChatGPT');
  $('.demo-announcement').textContent = 'De nada. La próxima ya sabes dónde preguntar.';
  $('.final-message').focus({ preventScroll: true });
  if ($('.final-message').getBoundingClientRect().bottom > innerHeight) {
    $('.final-message').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
  }
}
function returnToCreator() {
  run?.abort(); run = null;
  mode = 'create'; finished = false;
  render();
  if (shareUrl) { setStep(3); $('[data-action="copy"]').focus(); }
  else $('#question').focus();
}
function reset() {
  run?.abort(); run = null;
  draft = shareUrl = '';
  mode = 'create'; finished = false;
  if (location.search) history.replaceState(null, '', location.pathname);
  document.title = SITE_TITLE;
  render(); $('#question').focus();
}
function toast(message: string) {
  clearTimeout(toastTimer);
  $('.toast').textContent = message; $('.toast').hidden = false;
  toastTimer = setTimeout(() => { if ($('.toast')) $('.toast').hidden = true; }, 3500);
}
function loadFromUrl() {
  run?.abort();
  const shared = readSharedQuestion(location.search);
  if (shared.question) {
    document.title = 'Una pregunta para ti — Pregúntale a GPT';
    void startDemo(shared.question, false);
  } else {
    mode = 'create'; render();
    if (shared.error) toast(shared.error);
  }
}
window.addEventListener('pagehide', () => run?.abort());
window.addEventListener('pageshow', event => { if (event.persisted && mode === 'watch' && !finished) void startDemo(playbackQuestion, isPreview); });
window.addEventListener('popstate', loadFromUrl);
window.addEventListener('resize', resizeInput);
loadFromUrl();
