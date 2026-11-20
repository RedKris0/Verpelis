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

El sitio incluye [VidLink](https://vidlink.pro/), seleccionado por defecto en instalaciones nuevas, [Videasy (.ws)](https://videasy.ws/docs.html) y Videasy clásico. `js/providers.js` contiene el registro y dos plantillas comentadas para agregar proveedores HTTPS con un `id` único.

El selector recuerda el último proveedor. Si el video no carga o corresponde a otro capítulo, usa **Probar otro proveedor**. El cambio conserva la temporada y el episodio tal como los identifica TMDB.

El reproductor muestra la temporada, el número y el título del capítulo según TMDB. Para *Miraculous: Las aventuras de Ladybug*, TMDB lista «The Illustrhater» como T6E1 y «Climatiqueen» como T6E6 en inglés. Para T6E1 los tres proveedores reciben `65334/6/1`. Si el título del reproductor difiere, compara el nombre además del número, ya que los catálogos pueden ordenar los capítulos de forma distinta. Usa **Anterior** y **Siguiente** de Fotograma para mantener sincronizados los selectores y el historial. Si la fuente entrega otro video para esa URL, Fotograma no puede verificar su contenido desde fuera del iframe.

En **Subtítulos**, Videasy (.ws) permite pedir español o inglés como idioma preferido. Fotograma recuerda la elección. VidLink admite un enlace HTTPS directo y público a un archivo WebVTT (`.vtt`), que se comparte con el proveedor al pulsar **Aplicar y recargar** y se borra al cambiar de capítulo o título. La disponibilidad de las pistas, su sincronía, el audio y la calidad dependen del reproductor.

**Seguir viendo** conserva los últimos 18 títulos y el episodio seleccionado, sin guardar minutos de reproducción. Puedes borrar el historial. Se almacena en este navegador con `localStorage`, igual que el último proveedor. Si el navegador bloquea el almacenamiento, funciona durante la sesión y muestra un aviso al intentar guardar.

## Chrome, HTTPS y diagnóstico

El iframe original solo incluía `allow="encrypted-media"`. Ahora delega `autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write`, incluye `allowfullscreen` y abre tras pulsar Reproducir. Chrome puede exigir otro clic dentro del video para reproducir con sonido según sus políticas de autoplay. [Política oficial de Chrome](https://developer.chrome.com/blog/autoplay/).

En la prueba de Chrome del 10 de noviembre de 2026 se ensayaron `origin` y `strict-origin-when-cross-origin` desde un servidor HTTP local. Con ambas, `player.videasy.net` respondió 301 hacia `player.videasy.to` y la navegación falló con `net::ERR_CERT_AUTHORITY_INVALID`. Ese fallo de confianza del certificado en este entorno impidió verificar el video. No permite afirmar que sea la causa de todos los fallos anteriores en otros equipos. Se conserva `strict-origin-when-cross-origin`, que transmite el origen en peticiones entre dominios y evita enviar el referente al bajar de HTTPS a HTTP. Se mantienen las URLs originales solicitadas. [Referencia de iframe y referrerpolicy](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe).

Los recursos externos declarados por esta página usan HTTPS. La página no añade CSP. El contenido mixto, la CSP y los certificados de los recursos internos del proveedor dependen de su servidor y deben revisarse en la consola del navegador cuando su iframe sea accesible. Si aparece un error de certificado, debe resolverse en el proveedor o en la configuración de confianza del equipo.

GitHub Pages debe servirse por HTTPS, con **Enforce HTTPS** activado. Para desarrollo se admite `http://localhost` o `http://127.0.0.1` mediante `npx serve .` o `python -m http.server 8000`. Al abrir por `file://` se muestra ayuda y se evita importar módulos, que los navegadores bloquean en ese contexto. Un sitio HTTP público muestra un aviso para usar HTTPS.

## Modo seguro y anuncios

El iframe tiene por defecto `sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"`. Quedan bloqueadas las ventanas emergentes y la navegación de la ventana principal. El interruptor **Modo seguro (bloquear popups)** elimina o restaura el sandbox y recarga el iframe. La preferencia se guarda por proveedor. Un proveedor añadido comienza siempre en modo seguro.

Un script de esta página no puede inspeccionar ni filtrar anuncios dentro de un iframe de otro dominio. Para los anuncios del video se recomienda [uBlock Origin en Firefox o Brave](https://github.com/gorhill/uBlock) o [uBlock Origin Lite en Chrome](https://github.com/uBlockOrigin/uBOL-home). Su eficacia depende de las listas y del proveedor. Desactivar el modo seguro permite al proveedor abrir ventanas y redirigir la página.

### Resultado de proveedores con sandbox

| Proveedor | Modo seguro | Resultado |
| --- | --- | --- |
| VidLink y Videasy (.ws) | Activado por defecto | Ambos mostraron un aviso de bloqueo con sandbox en Chrome. El encabezado del reproductor permite comparar la selección con TMDB, aunque el contenido del video solo se confirma al reproducirlo. |
| Videasy clásico | Activado por defecto | Redirige a un dominio al que no se logró acceder desde este entorno. |
| Ejemplos 1 y 2 | Sin activar | Plantillas comentadas, sin proveedor real ni prueba de reproducción. |

El atributo sandbox se comprueba por separado de la reproducción externa. No se declara compatible un proveedor cuyo video no pudo verificarse. Usa las plantillas solo para reproductores HTTPS de otro origen que consideres fiables.

## Calidad y comprobaciones

Ejecuta `node tests/check.mjs` para comprobar la configuración, el registro de proveedores, las URLs de Videasy, la ausencia del campo de clave y los atributos de seguridad. La aplicación se sirve directamente, sin instalar dependencias.

Las consultas a TMDB tienen un límite de 12 segundos, errores en español para 401, 429, 404, red y respuestas inesperadas, cancelación de solicitudes anteriores y búsqueda con debounce de 350 ms. Los textos externos se insertan con `textContent`. Los pósteres usan carga diferida, texto alternativo y sustitución si falta o falla la imagen.

El modal nativo bloquea el fondo y mantiene el foco, permite cerrar con Esc, botón y clic exterior, restaura el foco y descarga el iframe al cerrar. Se respeta `prefers-reduced-motion`.

Comprobaciones realizadas el 10 de noviembre de 2026 desde un servidor local.

| Comprobación | Resultado |
| --- | --- |
| Chrome 157, TMDB real | Catálogo y pósteres cargados. Sin errores de JavaScript ni de consola en la página principal. |
| Chrome y Firefox, respuestas TMDB y proveedores simulados | Búsqueda, paginación, debounce, cancelación, texto XSS, modales, foco, proveedor recordado, modo seguro por proveedor, temporadas, navegación entre temporadas e historial correctos. |
| Errores simulados | Clave vacía, 401, 429, error del servidor, red, JSON inválido y timeout con mensajes controlados. |
| Persistencia | Historial malformado y almacenamiento bloqueado manejados sin romper la página. |
| Seguridad del iframe, documento de prueba de otro origen | Popups y navegación principal bloqueados con sandbox. |
| Accesibilidad | Lighthouse **100/100** en la página principal de Chrome. Axe sin infracciones en inicio y modal de detalle con los datos de prueba, en Chrome y Firefox. |
| HTML | Validación recomendada de html-validate sin errores. |
| Diseño | Revisado en escritorio de 1440 px y móvil de 375 px, sin desbordamiento horizontal en página ni modal. |
| Apertura directa | Ayuda visible con `file://`, sin intentar importar la aplicación. |
| Brave | Prueba directa pendiente. Comparte motor Chromium, pero sus bloqueos propios pueden cambiar el comportamiento del proveedor. |
| Videasy real con sandbox | Pendiente por el error de certificado descrito arriba. |

Las pruebas con proveedores simulados verifican la integración y el aislamiento. La disponibilidad del video, los subtítulos, la calidad y los anuncios dependen del proveedor real. El nombre se centraliza en `APP_NAME`, incluidos el título y Open Graph al iniciar JavaScript. Los rastreadores que no ejecutan JavaScript reciben los metadatos estáticos genéricos.
