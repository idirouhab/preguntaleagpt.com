import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

// Inspect what an HTTP crawler actually receives, without executing the app.
const output = resolve(process.argv[2] || 'dist');
const html = await readFile(resolve(output, 'index.html'), 'utf8');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value.replaceAll('&amp;', '&')]));
const meta = name => {
  const matches = [...html.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => attrs(tag)).filter(tag => tag.name === name || tag.property === name);
  assert.equal(matches.length, 1, `Expected one ${name} meta tag`);
  return matches[0].content;
};
const canonicalTags = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => attrs(tag)).filter(tag => tag.rel === 'canonical');
assert.equal(canonicalTags.length, 1);
const site = new URL(canonicalTags[0].href);
assert.equal(site.search, '');
assert.equal(site.hash, '');
if (['preguntaleagpt.com', 'www.preguntaleagpt.com'].includes(site.hostname)) assert.equal(site.protocol, 'https:');
assert.match(html, /<html lang="es">/);
assert.equal((html.match(/<h1>/g) || []).length, 1);
assert.match(html, /<h1>Déjame preguntarle a <strong>ChatGPT<\/strong> por ti\.<\/h1>/);
assert.match(html, /<textarea id="question"/);
assert.match(html, /data-action="create">Crear enlace/);
assert.doesNotMatch(html, /<!--app-html-->|<div id="app"><\/div>/);
assert.match(html, /<title>[^<]*LMGTFY para ChatGPT en español<\/title>/);
assert.match(meta('description'), /Crea gratis un enlace animado/);
assert.equal(meta('og:url'), site.href);
assert.equal(meta('og:type'), 'website');
assert.equal(meta('og:locale'), 'es_ES');
assert.equal(meta('og:site_name'), 'Pregúntale a GPT');
assert.ok(meta('og:title'));
assert.ok(meta('og:description'));
assert.match(meta('robots'), /max-image-preview:large/);
assert.equal(meta('twitter:card'), 'summary_large_image');
assert.equal(meta('twitter:title'), meta('og:title'));
assert.equal(meta('twitter:description'), meta('og:description'));
assert.equal(meta('twitter:image'), meta('og:image'));
assert.equal(meta('twitter:image:alt'), meta('og:image:alt'));
assert.equal(meta('og:image:secure_url'), meta('og:image'));
assert.equal(meta('og:image:type'), 'image/png');
assert.equal(meta('og:image:width'), '1200');
assert.equal(meta('og:image:height'), '630');
const image = new URL(meta('og:image'));
assert.equal(image.href, new URL('social/preview-v1.png', site).href);
const png = await readFile(resolve(output, 'social/preview-v1.png'));
assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);

const schemaTags = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
assert.equal(schemaTags.length, 1);
const schema = JSON.parse(schemaTags[0][1]);
assert.equal(schema['@context'], 'https://schema.org');
assert.deepEqual(schema['@graph'].map(entity => entity['@type']), ['WebSite', 'WebApplication']);
for (const entity of schema['@graph']) {
  assert.equal(entity.url, site.href);
  assert.equal(entity.inLanguage, 'es');
  assert.equal(entity.isAccessibleForFree, true);
  assert.equal(entity.creator.url, 'https://idir.ai/');
}

// All same-site image, script, CSS, icon and font references must exist at this base.
for (const [tag] of html.matchAll(/<(?:img|script|link)\b[^>]*>/g)) {
  const attributes = attrs(tag);
  if (attributes.rel === 'canonical') continue;
  const reference = attributes.src || attributes.href;
  if (!reference) continue;
  const url = new URL(reference, site);
  if (url.origin !== site.origin) continue;
  assert.ok(url.pathname.startsWith(site.pathname), `Resource outside deployment base: ${reference}`);
  const resource = await stat(resolve(output, decodeURIComponent(url.pathname.slice(site.pathname.length))));
  assert.ok(resource.isFile(), `Missing built resource: ${reference}`);
}
assert.match(html, /rel="stylesheet"/);
const robots = await readFile(resolve(output, 'robots.txt'), 'utf8');
assert.match(robots, /User-agent: \*\nAllow: \/\n/);
assert.ok(robots.includes(`Sitemap: ${new URL('sitemap.xml', site).href}`));
const sitemap = await readFile(resolve(output, 'sitemap.xml'), 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, 1);
assert.ok(sitemap.includes(`<loc>${site.href.replaceAll('&', '&amp;')}</loc>`));
assert.ok((await readFile(resolve(output, 'llms.txt'), 'utf8')).includes(site.href));
console.log(`Built SEO checked: prerendered UI, metadata, JSON-LD, discovery files, local assets and 1200×630 PNG (${site.href}).`);
