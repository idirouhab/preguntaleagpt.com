import assert from 'node:assert/strict';
import test from 'node:test';
import { discoveryFiles, normalizeSiteUrl, serializeStructuredData } from './seo.ts';
import { renderPage } from './view.ts';

test('production canonical stays HTTPS and drops shared questions and fragments', () => {
  assert.equal(normalizeSiteUrl('http://preguntaleagpt.com/?q=privado#demo').href, 'https://preguntaleagpt.com/');
  assert.equal(normalizeSiteUrl('http://www.preguntaleagpt.com/demo/?q=privado').href, 'https://www.preguntaleagpt.com/demo/');
});

test('custom deployment paths and local HTTP hosts survive canonical normalization', () => {
  assert.equal(normalizeSiteUrl('https://idirouhab.github.io/preguntaleagpt.com').href, 'https://idirouhab.github.io/preguntaleagpt.com/');
  assert.equal(normalizeSiteUrl('http://127.0.0.1:5173/preview/?q=hola').href, 'http://127.0.0.1:5173/preview/');
  assert.throws(() => normalizeSiteUrl('javascript:alert(1)'), /HTTP or HTTPS/);
  assert.throws(() => normalizeSiteUrl('https://user:password@example.com/'), /credentials/);
});

test('discovery files list only the canonical landing page and permit search crawlers', () => {
  const site = normalizeSiteUrl('https://example.com/demo/?q=privado');
  const files = discoveryFiles(site);
  assert.match(files['robots.txt'], /User-agent: \*\nAllow: \/\n/);
  assert.match(files['robots.txt'], /Sitemap: https:\/\/example\.com\/demo\/sitemap\.xml/);
  assert.equal((files['sitemap.xml'].match(/<loc>/g) || []).length, 1);
  assert.match(files['sitemap.xml'], /<loc>https:\/\/example\.com\/demo\/<\/loc>/);
  for (const content of Object.values(files)) assert.doesNotMatch(content, /privado|Disallow:/);
  assert.match(files['llms.txt'], /no genera respuestas/);
});

test('structured data describes the free Spanish tool without unsupported ratings', () => {
  const data = JSON.parse(serializeStructuredData(normalizeSiteUrl()));
  assert.deepEqual(data['@graph'].map((entity: { '@type': string }) => entity['@type']), ['WebSite', 'WebApplication']);
  for (const entity of data['@graph']) {
    assert.equal(entity.inLanguage, 'es');
    assert.equal(entity.isAccessibleForFree, true);
    assert.equal(entity.creator.url, 'https://idir.ai/');
    assert.equal(entity.url, 'https://preguntaleagpt.com/');
    assert.equal(entity.aggregateRating, undefined);
  }
});

test('static creator markup contains the approved UI and respects a non-root asset base', () => {
  const html = renderPage({ baseUrl: '/demo/' });
  assert.match(html, /<h1>Déjame preguntarle a <strong>ChatGPT<\/strong> por ti\.<\/h1>/);
  assert.match(html, /<textarea id="question"/);
  assert.match(html, /data-action="create">Crear enlace/);
  assert.match(html, /data-action="preview">Ver ejemplo/);
  assert.match(html, /src="\/demo\/brand\/idir-ai\.svg"/);
  assert.doesNotMatch(html, /Escribe una pregunta, copia|Un proyecto independiente|Qué es esto/);
  assert.doesNotMatch(renderPage({ draft: '<script>private-question</script>' }), /private-question/);
});
