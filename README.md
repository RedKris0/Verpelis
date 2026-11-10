# Fotograma

Buscador personal de películas y series con metadatos de TMDB y reproductores embebidos.

## Uso local y GitHub Pages

Ejecuta `python -m http.server 8000` desde la raíz y abre `http://localhost:8000/`. Para GitHub Pages selecciona **Deploy from a branch → main → / (root)** y habilita **Enforce HTTPS**. El sitio usa módulos ES con rutas relativas y se publica directamente, sin compilación ni dependencias de ejecución. Si se abre por `file://`, la página muestra instrucciones para servirla por HTTP.

`js/config.js` conserva el nombre y la configuración de TMDB. La clave se usa desde el navegador y es visible al inspeccionar los archivos o peticiones.

## Reproducción y disponibilidad

Pulsa **Reproducir** y elige un proveedor en el mismo modal. Para un título nuevo se intenta conservar tu proveedor preferido si es compatible con el tipo de contenido y con su ajuste de seguridad. Si tu comprobación anterior indica ausencia del título, se prioriza una fuente confirmada para ese título o episodio y luego una sin verificar. Sin preferencia ni comprobaciones previas, se prioriza la copia clásica si existe y después VidSpark. El botón para probar otra fuente da prioridad a las que pueden usarse con los ajustes actuales. Los cambios automáticos de fuente al abrir otro título o episodio conservan la preferencia guardada.

El selector usa una sola instancia del iframe. **Seguir viendo** guarda hasta 18 títulos con la última temporada y episodio abiertos. Puedes seguir usando anterior y siguiente, incluso entre temporadas. Los cambios realizados dentro del reproductor externo quedan bajo el control del proveedor.

| Estado | Evidencia |
| --- | --- |
| `AVAILABLE` | Marcaste que viste el video correcto en esa fuente. |
| `UNAVAILABLE` | Marcaste que el proveedor confirmó que carece de ese video. |
| `UNKNOWN` | La reproducción sigue sin verificar. También se usa tras cargar el iframe o recibir HTTP 200. |
| `ERROR` | Informaste un problema técnico o el navegador entregó un evento de error del iframe. Los navegadores suelen ocultar errores de iframes de otros orígenes. |

Las comprobaciones de disponibilidad guardadas se limitan a las últimas 500 y se identifican por proveedor, tipo, TMDB ID y, para series, temporada y episodio. Los errores técnicos solo se guardan durante la sesión y se limpian al reintentar. Para volver a cargar la fuente actual, pulsa de nuevo **Reproducir**. Fotograma no realiza comprobaciones masivas ni registra el progreso de video.

## Proveedores integrados

Estado observado el 10 de noviembre de 2026 en Chrome 157 desde un servidor local. La disponibilidad varía por título, país y configuración del navegador.

| Fuente | Identificador y alcance | Evidencia y modo seguro |
| --- | --- | --- |
| [VidSpark, antes MoviesAPI.to](https://vidspark.to/#documentation) | TMDB o IMDb, película y episodio. Se usa TMDB. | Reproducción iniciada con sandbox en películas y un episodio. Consulta la matriz. |
| [Wikimedia Commons](https://www.mediawiki.org/wiki/Extension:TimedMediaHandler) | Archivos concretos relacionados con IDs TMDB. Solo películas del catálogo revisado. | Reproducción iniciada con sandbox en las dos películas del catálogo. |
| [Internet Archive](https://archivesupport.zendesk.com/hc/en-us/articles/360018377531-Movies-and-Videos-Tips-Troubleshooting) | Identificador de elemento de Archive asociado a un ID TMDB. Solo películas del catálogo revisado. | Iframes cargados y metadatos de los archivos revisados. Consulta el resultado por título abajo. |
| [2Embed.cc](https://www.2embed.cc/) | TMDB o IMDb, película y episodio. Se usa TMDB. | El endpoint mostró la ficha del título y su código presenta un aviso de incompatibilidad con sandbox. Reproducción pendiente de validar. |
| [VidSrc.to](https://vidsrc.to/) | TMDB o IMDb, película y episodio. Se usa TMDB. | Entregó un iframe anidado que rechaza el sandbox. Reproducción pendiente de validar. |
| [AutoEmbed.me, antes AutoEmbed.co](https://autoembed.me/) | TMDB o IMDb, película y episodio. Se usa TMDB. | Su reproductor anidado rechazó el sandbox. Reproducción pendiente de validar. |

El modo seguro viene activado para cada fuente. El iframe mantiene `sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"`, `allowfullscreen`, la lista existente de permisos de reproducción y `strict-origin-when-cross-origin`. Con el modo seguro activado, los proveedores que lo rechazan muestran un aviso en vez de abrir el iframe. Puedes cambiar ese ajuste individual con el interruptor existente. Al desactivarlo, ese proveedor puede abrir ventanas o redirigir la página. La preferencia se guarda por proveedor. Autoplay, subtítulos y calidad dependen del navegador y del reproductor. Cerrar el modal descarga el iframe.

## Proveedores investigados fuera del selector

Se revisó el registro, el código de diagnóstico y la licencia MIT de [tmdb-embed-providers, revisión 3b03784](https://github.com/anikolabs/tmdb-embed-providers/tree/3b03784). El diagnóstico del paquete distingue respuestas y marcas de reproductor. Fotograma implementa sus propias plantillas a partir de la documentación de los servicios.

| Servicio | Evidencia y motivo |
| --- | --- |
| [VidFast](https://vidfast.domains/) | Dominio oficial actual `vidfast.vc`. [Documenta](https://vidfast.vc/) películas y episodios por TMDB/IMDb. La navegación de prueba devolvió 403 y Chrome bloqueó el iframe. La referencia también señala rechazo del sandbox. |
| [VidLink](https://vidlink.pro/) | Documenta películas y episodios por TMDB. Chrome rechazó el certificado del endpoint probado. La referencia señala incompatibilidad con sandbox. |
| [VidSrc.pm](https://vidsrc.pm/) | La referencia ofrece rutas de películas y episodios por TMDB. Un intento HTTP devolvió 403 y Chrome recibió una página sin video comprobado. |
| [2Embed.skin](https://www.2embed.skin/) | La referencia ofrece rutas TMDB de películas y episodios. La película probada devolvió el mismo reproductor de 2Embed.cc. Se omitió el duplicado. |
| [VidSrc.cc](https://vidsrc.cc/) | La referencia usa `/v2/embed/` con TMDB para películas y episodios. HTTP 403 y navegación sin video verificado. |
| [NontonGo](https://nontongo.win/) | Documenta películas y episodios por TMDB/IMDb en `www.nontongo.win`. Chrome bloqueó el iframe después de una respuesta 403. Cobertura asiática pendiente de verificar. |
| [SmashyStream](https://player.smashystream.com/) | La referencia usa `playere.php` con TMDB y parámetros de episodio. El endpoint de prueba devolvió 403. |
| [Frembed](https://frembed.icu/) | La referencia usa rutas separadas con TMDB para películas y episodios. La comprobación del endpoint falló en la validación TLS. |
| [MultiEmbed / SuperEmbed](https://multiembed.mov/) | Dominio de referencia devolvió 403. Quedan por confirmar el endpoint vigente, los IDs y el iframe. |
| [VidSrc.xyz](https://vidsrc.xyz/) | Falló la resolución DNS en la prueba local. Quedan por confirmar el endpoint vigente, los IDs y el iframe. |
| [Cno](https://cno.to/) | Catálogo de películas y series en su sitio. No se encontró documentación pública para API, búsqueda de terceros, IDs TMDB/IMDb o iframe de reproducción. |
| [Nepu](https://nepu.io/) | El sitio devolvió 403 en la consulta. No se verificaron una API pública, búsqueda documentada, IDs TMDB/IMDb ni un iframe. |
| [Tubi](https://tubitv.com/) | Catálogo con disponibilidad regional. La [lista oficial de mercados fuera de EE. UU.](https://tubitv.com/help-center/About-Tubi/articles/4409969055259) no incluye Chile. No se encontró una API pública o iframe de reproducción para Fotograma. |

## Cine clásico

La correspondencia se mantiene en `js/classics.js`. Para añadir una película, busca candidatos mediante [Advanced Search](https://archive.org/advancedsearch.php) y comprueba el elemento en [la API de metadatos de Archive](https://archive.org/developers/metadata.html), usando `/metadata/{identifier}`. Cruza la edición con TMDB por año, título original, créditos y, si está disponible, IMDb. Comprueba que el archivo sea el largometraje completo, que su duración sea razonable, que el acceso sea público y que su licencia o fundamento de dominio público corresponda a esa copia. Añade el TMDB ID y el identificador exacto. El iframe oficial usa `https://archive.org/embed/{identifier}`. Las etiquetas de licencia de Archive corresponden a elementos individuales.

[WikiFlix](https://wikiflix.toolforge.org/) sirve como referencia para localizar fuentes. Su [guía de Wikidata](https://www.wikidata.org/wiki/Help:WikiFlix/en) distingue tráileres y obras completas. Su [código](https://github.com/magnusmanske/wikistream/blob/main/public_html/vue_components/pages/play-page.js) reproduce desde las fuentes originales. Fotograma integra copias de Commons revisadas individualmente mediante el reproductor del archivo original, sin cargar el sitio de WikiFlix.

| TMDB | Película | Copia y derechos documentados |
| --- | --- | --- |
| 15856 | *House on Haunted Hill* (1959) | [Internet Archive, 74 min](https://archive.org/details/HouseOnHauntedHill1959), metadatos CC BY 3.0. [Wikimedia Commons documenta el dominio público en EE. UU. de esa versión](https://commons.wikimedia.org/wiki/File:House_on_Haunted_Hill_(1959)_-_Title.jpg). |
| 20529 | *Sita Sings the Blues* (2008) | [Internet Archive, 82 min](https://archive.org/details/Sita_Sings_the_Blues). [Nina Paley distribuye la película y documenta CC0 y las excepciones de algunas canciones](https://www.sitasingstheblues.com/). |
| 34078 | *The Screaming Skull* (1958) | [Wikimedia Commons, 68 min](https://commons.wikimedia.org/wiki/File:The_Screaming_Skull.webm), ficha con marca de dominio público. |
| 10331 | *Night of the Living Dead* (1968) | [Wikimedia Commons, 95 min](https://commons.wikimedia.org/wiki/File:Night_of_the_Living_Dead_(1968).webm), con fundamento de dominio público en EE. UU. y matices territoriales en la ficha. |

El catálogo curado solo cubre los títulos enumerados. Que una película aparezca en TMDB o en la búsqueda de Archive no implica que tenga reproducción.

## Mantenimiento y pruebas

`js/providers.js` exporta `providers` con `id`, `nombre`, `category`, `movie(tmdbId)` y `tv(tmdbId, season, episode)`. Omite la función de un tipo no compatible o devuelve `null` para títulos fuera del catálogo. Usa un ID estable y único, un destino HTTPS de otro origen y `enabled: false` para retirar temporalmente una fuente. Si el proveedor documenta o muestra que su propio reproductor exige un iframe sin sandbox, registra `requiresUnsandboxed: true`. Verifica película y episodio desde un origen local antes de habilitar la fuente. Si solo admite IMDb, usa los [identificadores externos de TMDB](https://developer.themoviedb.org/reference/movie-external-ids) y conserva una ruta de error para títulos sin equivalencia.

Ejecuta `node tests/check.mjs`. Las pruebas cubren plantillas y coordenadas, películas sin fuente clásica, remakes, deshabilitados, duplicados, URLs no válidas, selección inicial, estados, controles de seguridad y arranque estático. Chrome a 375 px, con respuestas simuladas, verificó cambios de fuente, temporada y episodio, recuperación del historial y de los ajustes al recargar, y cierre con Esc. Las consultas directas a la API real de TMDB corroboraron los IDs del catálogo clásico. Desde Chrome con TMDB real se abrió *Expediente X*, se seleccionó T2E3 («Sangre») y se verificó que el iframe apuntaba al episodio correspondiente.

### Matriz de reproducción

Pruebas en Chrome 157, con sandbox activo y contenido remoto real. La matriz usó datos de fichas controlados para seleccionar los IDs exactos. Se registró el avance del video y la duración anunciada por el reproductor. Las pruebas cubrieron el inicio del video, con el audio silenciado.

| Título | TMDB y fuente | Resultado |
| --- | --- | --- |
| *The Screaming Skull* (1958) | 34078 · Wikimedia Commons | Video en reproducción, duración de 68 min. La variante de 1973 (485620) queda fuera del catálogo. |
| *House on Haunted Hill* (1959) | 15856 · Internet Archive | Iframe y archivo identificados. El video no avanzó. El remake de 1999 (11377) no recibe esta fuente. |
| *Night of the Living Dead* (1968) | 10331 · Wikimedia Commons | Video en reproducción, duración de 95 min. Se seleccionó el archivo completo, distinto de los clips y de la versión de 1990 (19185). |
| *The Thing* (1982) | 1091 · VidSpark | Video en reproducción, duración de 109 min. |
| *Jurassic Park* (1993) | 329 · VidSpark | Tiempo de espera agotado antes de detectar video. Disponibilidad sin verificar. |
| *The X-Files* (1993), T2E3 «Blood» | 4087 · VidSpark | El endpoint T2E3 reprodujo video de 45 min. El salto T2E3 → T3E1 y el regreso se comprobaron con datos simulados. |
| *Memento* (2000) | 77 · VidSpark | Video en reproducción, duración de 113 min. |
| *Sita Sings the Blues* (2008) | 20529 · Internet Archive | Se identificó el MP4 de la película completa en el iframe. El video no avanzó. |
| *Interstellar* (2014) | 157336 · VidSpark | Tiempo de espera agotado antes de detectar video. Disponibilidad sin verificar. |

Para repetir la matriz, busca cada título y comprueba año, edición, temporada y episodio antes de cambiar de fuente. Si empieza el video, coteja su contenido y duración con la ficha antes de registrar el resultado. Un tiempo de espera agotado indica una prueba inconclusa. Queda pendiente comprobar fuentes adicionales para los años setenta y para más temporadas y series de 2010 a 2015.
