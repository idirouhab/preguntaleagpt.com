import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite';
import { discoveryFiles, normalizeSiteUrl, serializeStructuredData, SITE_DESCRIPTION, SITE_TITLE, SOCIAL_DESCRIPTION, SOCIAL_IMAGE_ALT, SOCIAL_IMAGE_PATH, SOCIAL_TITLE } from './src/seo.ts';
import { renderPage } from './src/view.ts';

function discoverableSite(site: URL): Plugin {
  let assetBase = '/';
  const files = discoveryFiles(site);
  const socialImage = new URL(SOCIAL_IMAGE_PATH, site).href;
  const meta = (attribute: 'name' | 'property', name: string, content: string): HtmlTagDescriptor => ({ tag: 'meta', attrs: { [attribute]: name, content }, injectTo: 'head' });
  return {
    name: 'discoverable-site',
    configResolved(config) { assetBase = config.base; },
    transformIndexHtml(html) {
      if (!html.includes('<!--app-html-->')) return html;
      return {
        html: html.replace('<!--app-html-->', renderPage({ baseUrl: assetBase })),
        tags: [
          { tag: 'title', children: SITE_TITLE, injectTo: 'head' },
          meta('name', 'description', SITE_DESCRIPTION),
          meta('name', 'robots', 'index, follow, max-image-preview:large'),
          { tag: 'link', attrs: { rel: 'canonical', href: site.href }, injectTo: 'head' },
          meta('property', 'og:title', SOCIAL_TITLE),
          meta('property', 'og:description', SOCIAL_DESCRIPTION),
          meta('property', 'og:type', 'website'),
          meta('property', 'og:locale', 'es_ES'),
          meta('property', 'og:site_name', 'Pregúntale a GPT'),
          meta('property', 'og:url', site.href),
          meta('property', 'og:image', socialImage),
          meta('property', 'og:image:secure_url', socialImage),
          meta('property', 'og:image:type', 'image/png'),
          meta('property', 'og:image:width', '1200'),
          meta('property', 'og:image:height', '630'),
          meta('property', 'og:image:alt', SOCIAL_IMAGE_ALT),
          meta('name', 'twitter:card', 'summary_large_image'),
          meta('name', 'twitter:site', '@idir_ouhab'),
          meta('name', 'twitter:title', SOCIAL_TITLE),
          meta('name', 'twitter:description', SOCIAL_DESCRIPTION),
          meta('name', 'twitter:image', socialImage),
          meta('name', 'twitter:image:alt', SOCIAL_IMAGE_ALT),
          { tag: 'script', attrs: { type: 'application/ld+json' }, children: serializeStructuredData(site), injectTo: 'head' },
        ],
      };
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        const file = pathname.replace(/^\//, '');
        if (!Object.hasOwn(files, file)) return next();
        res.setHeader('Content-Type', `${file.endsWith('.xml') ? 'application/xml' : 'text/plain'}; charset=utf-8`);
        res.end(files[file]);
      });
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(files)) this.emitFile({ type: 'asset', fileName, source });
    },
  };
}

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const site = normalizeSiteUrl(env.VITE_SITE_URL || undefined);
  return {
    base: command === 'serve' && !isPreview ? '/' : site.pathname,
    plugins: [discoverableSite(site)],
  };
});
