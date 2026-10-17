# Pregúntale a GPT

[Preguntaleagpt.com](https://preguntaleagpt.com/) es una versión de LMGTFY para ChatGPT, en español. Escribe una pregunta y comparte un enlace que muestra cómo hacerla, con una animación de ratón y teclado.

**De nada. La próxima ya sabes dónde preguntar.**

## Desarrollo local

Requiere Node.js 22.18 o posterior.

```sh
npm ci
npm run dev -- --port 5173
```

Abre <http://127.0.0.1:5173/>. **Ver ejemplo** reproduce una demostración sin crear un enlace.

## Cómo funciona

- Un solo Enter muestra el paso «Crea el enlace» y avanza automáticamente a «Comparte».
- «Compartir» abre el menú nativo del dispositivo cuando el navegador lo permite; «Copiar enlace» sigue siempre disponible.
- La pregunta viaja codificada en base64url en el fragmento `#q=…`: no se lee a simple vista y el navegador no la envía al servidor. Al abrir el enlace, se reproduce la animación. Los enlaces antiguos con `?q=…` siguen funcionando.
- El botón final abre la pregunta en ChatGPT. La web no genera respuestas ni utiliza una API de IA.
- Admite tildes, emoji y hasta 1.000 caracteres Unicode; un contador aparece al acercarse al límite. Shift+Enter inserta un salto de línea.
- Respeta el movimiento reducido y permite saltar, repetir y previsualizar la animación. El botón Atrás del navegador vuelve de la vista previa al editor.

TypeScript, CSS y Vite, sin dependencias de producción, base de datos ni claves API. Las preguntas forman parte de enlaces compartibles: no deben incluir información privada. Se insertan como texto, nunca como HTML.

## Pruebas y compilación

```sh
npm test
npm run build
npm run preview -- --port 4173
```

Las pruebas cubren enlaces, Unicode, animación, cancelación y metadatos. El build comprueba TypeScript, prerenderiza la portada y valida los archivos estáticos, los metadatos y las dimensiones de la imagen social. El resultado queda en `dist/`.

## Estructura

- `src/`: interfaz, animaciones, enlaces, metadatos y pruebas.
- `public/`: fuentes, logos, favicon y tarjeta social que utiliza la web.
- `scripts/check-build.mjs`: comprobación del sitio compilado.
- `.github/workflows/ci.yml`: pruebas, compilación y publicación en GitHub Pages.

## Publicación y configuración

El flujo de GitHub Actions comprueba las pull requests y publica `main` en GitHub Pages. En los ajustes de Pages, la fuente debe ser **GitHub Actions**. `CNAME` contiene el dominio de este proyecto.

Para usar otro dominio o ruta, adapta `CNAME` y los ajustes de Pages. Para compilar localmente con otra URL, copia `.env.example` a `.env.local` y configura `VITE_SITE_URL`. El workflow obtiene la URL del sitio desde GitHub Pages; Vite adapta los enlaces a esa ruta. Las variables `VITE_` son públicas y no deben contener secretos.

`index.html` incluye el identificador público de Cloudflare Web Analytics de este sitio. Al publicar un fork, elimina ese script o sustitúyelo por el identificador de tu propia propiedad.

## SEO y recursos gráficos

La portada incluye HTML prerenderizado, canonical, Open Graph, tarjeta grande de X y datos estructurados `WebSite`/`WebApplication`. El build genera `robots.txt`, `sitemap.xml` y `llms.txt`. Los enlaces con preguntas comparten la canonical de la portada y no se enumeran en el sitemap. `llms.txt` describe la herramienta; no garantiza posicionamiento ni citas en asistentes.

La tarjeta social mide 1200 × 630 px. El favicon tiene fondo transparente y adapta sus colores al tema claro u oscuro del navegador.

La tarjeta de X atribuye el sitio a `@idir_ouhab`. `public/site.webmanifest` define el nombre, los colores y los iconos de 192 y 512 px para añadir la web a la pantalla de inicio. Sus rutas relativas admiten despliegues en subdirectorios. El manifiesto no añade funcionamiento sin conexión.

## Aviso

Pregúntale a GPT es un proyecto independiente, sin relación con OpenAI. ChatGPT es una marca de OpenAI. El pie de página lo indica en todas las vistas.

## Contribuir

Abre una incidencia para describir un problema o propón una pull request. Mantén los textos de la interfaz en español, comprueba la vista móvil y ejecuta `npm test` y `npm run build` antes de enviar cambios.

## Licencia

Código bajo [licencia MIT](LICENSE). La fuente Inter conserva su [SIL Open Font License](public/fonts/OFL.txt).

Creado por [idir.ai](https://idir.ai/).
