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
