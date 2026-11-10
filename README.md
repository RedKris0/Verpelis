# Fotograma

Buscador personal de películas y series con TMDB y un reproductor embebido.

## Uso local

Desde la carpeta del proyecto ejecuta `python -m http.server 8000` o `npx serve .` y abre la dirección HTTP que indique el servidor. Los módulos ES requieren un servidor, evita abrir `index.html` con doble clic.

## Configuración

- `js/config.js` contiene el nombre de la aplicación, definido una sola vez en `APP_NAME` y aplicado al título, header y footer.
- `js/providers.js` contiene las URLs del reproductor.
- `TMDB_API_KEY` en `js/config.js` conserva la clave existente y se usa internamente. La interfaz no muestra controles para verla ni editarla. Sigue siendo pública al inspeccionar los archivos o las peticiones del navegador.
- `js/app.js` contiene la interacción y `css/styles.css` los estilos.

## GitHub Pages

En Settings → Pages selecciona Deploy from a branch, rama `main`, carpeta `/ (root)`. Guarda y activa Enforce HTTPS cuando esté disponible. Abre la URL de Pages. No hay frameworks, compilación ni servidor de aplicación.

## Reproductores, series e historial

Videasy es el único proveedor real incluido. `js/providers.js` exporta el registro de objetos `{id, nombre, movie(tmdbId), tv(tmdbId, season, episode)}`. En la sección **AÑADIR PROVEEDORES AQUÍ** hay dos ejemplos comentados con dominios `.invalid`. Reemplaza las plantillas por las URLs HTTPS de tus proveedores y descomenta los objetos. Usa un `id` único por proveedor.

El selector muestra el proveedor actual y recuerda la elección. El botón para probar otro rota por los proveedores configurados. Con uno solo aparece desactivado y se explica cómo añadir más. Subtítulos y calidad los controla el reproductor embebido de cada proveedor.

Las temporadas y episodios proceden de TMDB. Puedes elegirlos antes de reproducir y usar anterior/siguiente, incluso entre temporadas. Al volver a una serie se recupera el último episodio abierto. Los cambios hechos dentro del iframe, incluido su avance automático, no actualizan los selectores externos. La página no recibe eventos de progreso del proveedor.

**Seguir viendo** conserva los últimos 18 títulos y el episodio seleccionado, sin guardar minutos de reproducción. Puedes borrar el historial. Se almacena en este navegador con `localStorage`, igual que el último proveedor. Si el navegador bloquea el almacenamiento, funciona durante la sesión y muestra un aviso al intentar guardar.

## Chrome, HTTPS y diagnóstico

El iframe original solo incluía `allow="encrypted-media"`. Ahora delega `autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write`, incluye `allowfullscreen` y abre tras pulsar Reproducir. Chrome puede exigir otro clic dentro del video para reproducir con sonido según sus políticas de autoplay. [Política oficial de Chrome](https://developer.chrome.com/blog/autoplay/).

En la prueba de Chrome del 10 de noviembre de 2026 se ensayaron `origin` y `strict-origin-when-cross-origin` desde un servidor HTTP local. Con ambas, `player.videasy.net` respondió 301 hacia `player.videasy.to` y la navegación falló con `net::ERR_CERT_AUTHORITY_INVALID`. Ese fallo de confianza del certificado en este entorno impidió verificar el video. No permite afirmar que sea la causa de todos los fallos anteriores en otros equipos. Se conserva `strict-origin-when-cross-origin`, que transmite el origen en peticiones entre dominios y evita enviar el referente al bajar de HTTPS a HTTP. Se mantienen las URLs originales solicitadas. [Referencia de iframe y referrerpolicy](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe).

Los recursos externos declarados por esta página usan HTTPS. La página no añade CSP. El contenido mixto, la CSP y los certificados de los recursos internos del proveedor dependen de su servidor y deben revisarse en la consola del navegador cuando su iframe sea accesible. Si aparece un error de certificado, debe resolverse en el proveedor o en la configuración de confianza del equipo.

GitHub Pages debe servirse por HTTPS, con **Enforce HTTPS** activado. Para desarrollo se admite `http://localhost` o `http://127.0.0.1` mediante `npx serve .` o `python -m http.server 8000`. Al abrir por `file://` se muestra ayuda y se evita importar módulos, que los navegadores bloquean en ese contexto. Un sitio HTTP público muestra un aviso para usar HTTPS.
