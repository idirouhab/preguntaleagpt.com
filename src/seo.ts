export const SITE_TITLE = 'Pregúntale a GPT — LMGTFY para ChatGPT en español';
export const SITE_DESCRIPTION = 'El LMGTFY para ChatGPT en español. Crea gratis un enlace animado con tu pregunta y compártelo. De nada. La próxima ya sabes dónde preguntar.';
export const SOCIAL_TITLE = 'Déjame preguntarle a ChatGPT por ti.';
export const SOCIAL_DESCRIPTION = 'De nada. La próxima ya sabes dónde preguntar. Crea y comparte tu enlace animado gratis.';
export const SOCIAL_IMAGE_PATH = 'social/preview-v1.png';
export const SOCIAL_IMAGE_ALT = 'De nada. La próxima ya sabes dónde preguntar. Una ventana de ChatGPT con un cursor azul y el dominio preguntaleagpt.com.';

/** Keep canonical URLs stable across deployment tooling and question links. */
export function normalizeSiteUrl(value = 'https://preguntaleagpt.com/'): URL {
  const site = new URL(value);
  if (!['http:', 'https:'].includes(site.protocol)) throw new Error('VITE_SITE_URL must use HTTP or HTTPS.');
  if (site.username || site.password) throw new Error('VITE_SITE_URL must not contain credentials.');
  if (['preguntaleagpt.com', 'www.preguntaleagpt.com'].includes(site.hostname)) site.protocol = 'https:';
  site.search = '';
  site.hash = '';
  site.pathname = `${site.pathname.replace(/\/+$/, '')}/`;
  return site;
}

export function structuredData(site: URL) {
  const creator = { '@type': 'Organization', name: 'idir.ai', url: 'https://idir.ai/' };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${site.href}#website`,
        url: site.href,
        name: 'Pregúntale a GPT',
        description: SITE_DESCRIPTION,
        inLanguage: 'es',
        isAccessibleForFree: true,
        creator,
      },
      {
        '@type': 'WebApplication',
        '@id': `${site.href}#application`,
        url: site.href,
        name: 'Pregúntale a GPT',
        description: 'Herramienta gratuita para crear enlaces que muestran una animación de cómo escribir una pregunta en ChatGPT y enviarla.',
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web',
        browserRequirements: 'Requiere JavaScript para crear enlaces y reproducir la animación.',
        inLanguage: 'es',
        isAccessibleForFree: true,
        creator,
        isPartOf: { '@id': `${site.href}#website` },
      },
    ],
  };
}

export function serializeStructuredData(site: URL): string {
  // Prevent a configured URL from terminating an inline script element.
  return JSON.stringify(structuredData(site)).replace(/</g, '\\u003c');
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function discoveryFiles(site: URL): Record<string, string> {
  return {
    'robots.txt': `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', site).href}\n`,
    'sitemap.xml': `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${escapeXml(site.href)}</loc></url>\n</urlset>\n`,
    'llms.txt': `# Pregúntale a GPT\n\n> Herramienta gratuita en español, inspirada en LMGTFY, para compartir una demostración animada de cómo hacer una pregunta en ChatGPT.\n\n## Funcionamiento\n\n1. La persona escribe una pregunta y crea un enlace.\n2. El enlace contiene la pregunta codificada en base64url en el fragmento #q=, que el navegador no envía al servidor. Al abrirlo, se reproduce una animación del cursor escribiendo la pregunta y pulsando enviar en una interfaz de demostración.\n3. La animación termina con «De nada. La próxima ya sabes dónde preguntar.» y ofrece abrir la pregunta en ChatGPT.\n\nLa herramienta no genera respuestas de inteligencia artificial ni realiza consultas a una API de ChatGPT. Crear enlaces y ver la animación requiere JavaScript; no requiere registro en esta web.\n\n## Enlaces\n\n- [Crear un enlace](${site.href}): herramienta principal.\n- [idir.ai](https://idir.ai/): creador del proyecto.\n- [ChatGPT](https://chatgpt.com/): servicio externo al que dirige el botón final.\n\nProyecto independiente, sin relación con OpenAI. ChatGPT es una marca de OpenAI.\n`,
  };
}

/**
 * GitHub Pages serves this for any unknown path. Visitors go straight to the
 * homepage, keeping a shared question (?q= or #q=) from a mistyped path.
 */
export function notFoundPage(site: URL): string {
  const home = escapeXml(site.pathname);
  const redirect = JSON.stringify(site.pathname).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <meta name="referrer" content="no-referrer" />
    <meta name="theme-color" content="#ffffff" />
    <title>Página no encontrada — Pregúntale a GPT</title>
    <link rel="icon" href="${home}favicon.ico" sizes="16x16 32x32 48x48" />
    <link rel="icon" type="image/svg+xml" href="${home}favicon.svg" />
    <script>if (location.pathname !== ${redirect}) location.replace(${redirect} + location.search + location.hash);</script>
    <style>
      @font-face { font-family: Inter; font-weight: 400 600; font-display: swap; src: url('${home}fonts/inter-latin.woff2') format('woff2'); }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box; background: #fff; color: #202124; font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; text-align: center; }
      h1 { margin: 0 0 8px; font-size: 30px; font-weight: 500; letter-spacing: -.5px; }
      p { margin: 0 0 24px; color: #5e6266; font-size: 17px; line-height: 1.5; }
      a { display: inline-block; padding: 12px 22px; border-radius: 24px; background: #222; color: #fff; text-decoration: none; }
      a:focus-visible { outline: 2px solid #547aa0; outline-offset: 4px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Esta página no existe.</h1>
      <p>Vuelve a la portada para crear tu enlace.</p>
      <a href="${home}">Ir a Pregúntale a GPT</a>
    </main>
  </body>
</html>
`;
}
