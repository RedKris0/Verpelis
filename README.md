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
