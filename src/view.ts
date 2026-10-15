import { icon } from './icons.ts';

export interface PageView {
  watching?: boolean;
  isPreview?: boolean;
  shareUrl?: string;
  draft?: string;
  baseUrl?: string;
}

/** The same visible UI is rendered at build time and after client interactions. */
export function renderPage({ watching = false, isPreview = false, shareUrl = '', draft = '', baseUrl = '/' }: PageView = {}): string {
  const steps = watching
    ? ['Abre ChatGPT', 'Escribe la pregunta', 'Pulsa enviar']
    : ['Escribe', 'Crea el enlace', 'Comparte'];
  return `<div class="page ${watching ? 'watch-mode' : ''}">
    <a class="skip-link" href="#main">Ir al contenido</a>
    <main id="main" tabindex="-1">
      <div class="page-intro"><h1>Déjame preguntarle a <strong>ChatGPT</strong> por ti.</h1></div>
      <div class="demo-layout">
        <div class="steps-shell"><span class="step-highlight" aria-hidden="true"></span><ol class="steps" aria-label="${watching ? 'Cómo preguntarle a ChatGPT' : 'Cómo crear un enlace'}">
          ${steps.map((text, index) => `<li class="step ${index === 0 ? 'is-current' : ''}" data-step="${index + 1}" ${index === 0 ? 'aria-current="step"' : ''}>${index ? '<span class="step-connector" aria-hidden="true"><span></span></span>' : ''}<span class="step-group"><span class="step-number" aria-label="Paso ${index + 1}"><span class="step-digit" aria-hidden="true">${index + 1}</span>${icon('check', 'step-check')}</span><span class="step-text">${text}</span></span></li>`).join('')}
        </ol></div>
        <div class="browser-area">
          <div class="browser-window" aria-label="Demostración en un navegador">
            <div class="browser-tabbar" aria-hidden="true">
              <span class="tab-search">${icon('chevron')}</span>
              <span class="browser-tab"><span class="tab-favicon">${icon('sparkles')}</span><span class="tab-title">${watching ? 'Nueva pestaña' : 'ChatGPT'}</span>${icon('close', 'tab-close')}</span>
              <span class="new-tab">${icon('plus')}</span>
              <span class="window-controls"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7h10"/></svg><svg width="14" height="14" viewBox="0 0 14 14"><rect x="3" y="3" width="8" height="8" rx="1"/></svg>${icon('close')}</span>
            </div>
            <div class="browser-toolbar">
              <div class="browser-navigation" aria-hidden="true">${icon('arrowRight', 'nav-back')}${icon('arrowRight', 'nav-forward')}${icon('replay')}</div>
              <div class="address-bar"><span class="address-settings" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 5h12M2 11h12"/><circle cx="6" cy="5" r="2" fill="var(--chrome-address)"/><circle cx="10" cy="11" r="2" fill="var(--chrome-address)"/></svg></span><input class="address-field" aria-label="Dirección del navegador de demostración" readonly tabindex="-1" value="${watching ? '' : 'chatgpt.com'}"><span class="address-star" aria-hidden="true"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-3-5.5 3 1-6.2L3 9.6l6.2-.9L12 3Z"/></svg></span></div>
              <span class="browser-profile" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/></svg></span><span class="browser-menu" aria-hidden="true">⋮</span>
            </div>
            <div class="browser-content">
              <div class="browser-blank" ${watching ? '' : 'hidden'}><span class="blank-caption">Una nueva pestaña.</span></div>
              <div class="chatgpt-screen" ${watching ? 'hidden' : ''}>
                <div class="chatgpt-heading">ChatGPT ${icon('chevron')}</div>
                <div class="chatgpt-center">
                  <h2>¿En qué puedo ayudarte?</h2>
                  <form class="composer-form" novalidate>
                    <div class="composer"><span class="composer-plus" aria-hidden="true">${icon('plus')}</span><textarea id="question" rows="1" placeholder="Pregunta lo que quieras" aria-label="Escribe la pregunta" aria-describedby="question-error" enterkeyhint="send" ${watching ? 'readonly tabindex="-1" inputmode="none"' : ''}></textarea><button class="send-button" type="submit" aria-label="${watching ? 'Enviar pregunta' : 'Continuar'}" title="${watching ? 'Enviar pregunta' : 'Continuar'}" disabled>${icon('arrow')}</button></div>
                    <p id="question-error" class="field-error" role="alert"></p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${watching ? `<div class="demo-controls"><button class="text-button" data-action="skip">Saltar animación</button><button class="text-button" data-action="back">${isPreview ? 'Volver a mi enlace' : 'Crear mi propio enlace'}</button></div>
        <section class="final-message" hidden tabindex="-1" aria-label="Demostración terminada"><h2>De nada.</h2><p>La próxima ya sabes dónde preguntar.</p><a class="button primary chatgpt-link" target="_blank" rel="noopener noreferrer">Abrir en ChatGPT ${icon('external')}</a><div class="share-actions"><button class="text-button" data-action="replay">${icon('replay')} Repetir</button><button class="text-button" data-action="back">${isPreview ? 'Volver a mi enlace' : 'Crear mi propio enlace'}</button></div></section>`
        : `<div class="creator-actions"><button class="button primary" data-action="create">${shareUrl ? `Enlace creado ${icon('check')}` : `Crear enlace ${icon('arrowRight')}`}</button><button class="button secondary" data-action="preview">${draft.trim() ? 'Vista previa' : 'Ver ejemplo'}</button></div>
        <div class="share-reveal ${shareUrl ? 'is-open' : ''}" ${shareUrl ? '' : 'inert aria-hidden="true"'}><div class="share-clip"><section class="share-panel" aria-labelledby="share-title"><div class="share-heading"><span class="share-seal" aria-hidden="true">${icon('link')}</span><h2 id="share-title">Tu enlace está listo.</h2></div><div class="share-row"><label class="sr-only" for="share-url">Enlace para compartir</label><input id="share-url" readonly spellcheck="false"><div class="share-buttons"><button class="button primary" data-action="copy">${icon('copy')} Copiar enlace</button><button class="button secondary" data-action="share" hidden>${icon('share')} Compartir</button></div></div><div class="share-actions"><button class="text-button" data-action="preview">Ver la animación</button><button class="text-button" data-action="new">Crear otro enlace</button></div></section></div></div>`}
    </main>
    <footer class="site-footer"><div class="powered-by"><span>powered by</span><a class="brand-link" href="https://idir.ai" target="_blank" rel="noopener noreferrer" aria-label="idir.ai"><img src="${baseUrl}brand/idir-ai.svg" alt="idir.ai" width="48" height="17"></a></div></footer>
    <div class="fake-cursor" aria-hidden="true"><span class="click-ring"></span><svg width="25" height="31" viewBox="0 0 30 36"><path d="M3 2 4 29l7-7 6 12 6-3-6-11 10-1L3 2Z" fill="#111" stroke="white" stroke-width="2.5" stroke-linejoin="round"/></svg></div>
    <div class="toast" role="status" aria-live="polite" hidden></div>
    <p class="sr-only demo-announcement" role="status" aria-live="polite"></p>
  </div>`;
}
