# Fotograma

Buscador personal de películas y series con TMDB y un reproductor embebido.

## Uso local

Desde la carpeta del proyecto ejecuta `python -m http.server 8000` o `npx serve .` y abre la dirección HTTP que indique el servidor. Los módulos ES requieren un servidor, evita abrir `index.html` con doble clic.

## Configuración

- `js/config.js` contiene el nombre de la aplicación, definido una sola vez en `APP_NAME` y aplicado al título, header y footer.
- `js/providers.js` contiene las URLs del reproductor.
- La API key de TMDB se configura temporalmente en el campo existente de la página.
- `js/app.js` contiene la interacción y `css/styles.css` los estilos.

## GitHub Pages

En Settings → Pages selecciona Deploy from a branch, rama `main`, carpeta `/ (root)`. Guarda y activa Enforce HTTPS cuando esté disponible. Abre la URL de Pages. No hay frameworks, compilación ni servidor de aplicación.
