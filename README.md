# Monitor Wallapop → Telegram

Bot de consulta periódica de la página pública de búsqueda, pensado para Pterodactyl o Docker. Búsqueda inicial: iPhone, categoría/subcategoría, radio de 50 km y coordenadas indicadas en Tenerife. No usa una API interna no documentada ni resuelve CAPTCHA. Intervalo inicial: 90 segundos más un pequeño margen aleatorio.

## Antes de empezar: límites reales

El 7 de noviembre de 2026 se investigaron referencias a API internas, pero **no se pudo verificar una respuesta real de Wallapop desde el entorno de desarrollo**. Tampoco se pudo probar este proyecto contra Wallapop, Telegram con un bot real, Docker ni un panel Pterodactyl real. Por tanto es un proyecto listo para probar, no una instalación validada en producción: ejecuta el diagnóstico en tu servidor antes de confiar en él. La página, sus selectores y filtros pueden cambiar. Un CAPTCHA, el consentimiento de cookies, un 403/429 o el bloqueo de la IP pueden impedir su funcionamiento sin intervención. Comprueba los términos de Wallapop antes de usarlo.

HTTP directo gasta menos memoria, pero las API internas encontradas no son oficiales, ofrecen rutas contradictorias y no se han comprobado. Playwright carga la página real y permite ver el HTML renderizado, pero consume bastante más y también puede ser bloqueado. Si no se encuentran tarjetas válidas, el bot informa del error y no inicializa la búsqueda. No reconoce de manera fiable una búsqueda realmente vacía. Consulta solo los resultados inicialmente cargados, sin paginación: puede perder anuncios durante una caída o si hay más anuncios nuevos que tarjetas visibles. El orden y el alcance dependen de que Wallapop aplique los filtros de la URL. La URL de la búsqueda es la fuente de configuración: genera otra en Wallapop para cambiar ubicación, radio, categoría o términos.

## 1. Obtener datos de Telegram

1. Abre Telegram, busca **@BotFather**, envía `/newbot` y sigue sus instrucciones. Copia el token y guárdalo en privado.
2. Abre tu nuevo bot y pulsa **Iniciar** o envíale un mensaje.
3. En tu navegador abre `https://api.telegram.org/bot<TOKEN>/getUpdates`, sustituyendo `<TOKEN>` por el token. Busca el número en `message.chat.id` (para grupos puede comenzar por `-`). No compartas esa URL: contiene tu token. Si aparece una lista vacía, envía otro mensaje al bot y recarga; si otro programa usa actualizaciones con ese bot, puede consumirlas primero.
4. El bot debe tener permiso de enviar mensajes al chat elegido. Para probar, puede ser más sencillo usar tu chat privado.

## 2. Instalación en Pterodactyl (sin SSH)

Necesitas acceso de administrador al panel, un nodo operativo y acceso a internet desde el nodo. **Antes de importar el egg hay que construir y publicar la imagen en un registro Docker** desde un ordenador que tenga Docker. No hace falta SSH al nodo, pero sí una cuenta en Docker Hub u otro registro y Docker en tu ordenador. No hemos publicado una imagen de este proyecto: la ruta del egg es un marcador que debes sustituir. Si no puedes publicar una imagen, este egg todavía no está listo para tu panel. La imagen debe compilarse para la arquitectura del nodo (amd64 o arm64).

Por ejemplo, con Docker Hub, en una terminal situada en la carpeta extraída (sustituye `TU_USUARIO`):

```bash
docker login
docker build -t TU_USUARIO/wallapop-bot:1.0 .
docker push TU_USUARIO/wallapop-bot:1.0
```

Configura el repositorio como público para que Wings pueda descargarlo, o configura de antemano en tu infraestructura el acceso a tu registro privado. Si tu ordenador tiene una arquitectura distinta al nodo usa Docker Buildx para compilar para la arquitectura del nodo. Edita `egg-wallapop.json`: sustituye `ghcr.io/REEMPLAZAR_USUARIO/wallapop-bot:1.0` por `TU_USUARIO/wallapop-bot:1.0`. No pongas credenciales en el JSON.

1. Descarga y descomprime el ZIP en tu ordenador.
2. En **Admin → Nests**, selecciona o crea un Nest, pulsa **Import Egg**, selecciona `egg-wallapop.json` y confírmalo. El egg prepara la carpeta y selecciona tu imagen publicada, que contiene Playwright, Chromium y las dependencias Python.
3. Crea un servidor usando ese Nest y egg. Asigna un allocation del nodo aunque el bot no use el puerto. Como punto de partida asigna **1 GB de RAM**, 1 CPU y 3 GB de disco; aumenta si Chromium se cierra por memoria. En paneles que piden CPU, 100% suele equivaler a un núcleo. El uso real depende del nodo y de la imagen.
4. Cuando termine la instalación, ve a **Files** y sube `bot.py`, `requirements.txt` y `.env.example` a la raíz del servidor (`/home/container`). El egg por sí solo no contiene esos archivos. Renombra `.env.example` a `.env`, ábrelo y pon tu token y chat ID. Si el gestor no muestra archivos ocultos, habilítalos o crea `.env` directamente desde el panel.
5. Opcional: sube `proxies.txt.example`, renómbralo `proxies.txt` y configura un proxy. Si no creas el archivo se usa conexión directa.
6. Inicia el servidor. Una vez cargada la imagen debe aparecer `Búsqueda ... guardados sin enviar (primera lectura)`. En los siguientes ciclos, los anuncios nuevos se envían a Telegram. Si quieres comprobar Telegram antes, en la consola de Pterodactyl no se ejecutan comandos del sistema: detén el servidor y cambia temporalmente su startup en el panel de administración, o realiza la prueba con Docker más abajo. Devuelve el startup original antes de volver a iniciar.
7. En **Settings → Startup** activa el arranque automático/recuperación si tu versión o proveedor lo ofrece, y comprueba en el nodo la recuperación tras reiniciar Wings. El egg no puede activar por sí solo las políticas del nodo ni garantizar su disponibilidad. No uses dos instancias con la misma base de datos.

**Importante:** el estado queda en `data/bot.sqlite3` y sus ficheros auxiliares SQLite. No los borres al actualizar o se volverá a crear la línea base. Pterodactyl mantiene `/home/container` entre reinicios ordinarios. Haz copias con el servidor detenido y conserva todo el directorio `data`.

## 3. Docker Compose en VPS

1. Instala Docker y el complemento Docker Compose en tu VPS.
2. Descomprime el ZIP y entra en la carpeta desde la terminal. Crea la configuración y el archivo opcional del proxy:

```bash
cp .env.example .env
cp proxies.txt.example proxies.txt
mkdir -p data
```

3. Edita `.env` con tu editor y rellena `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`. Opcionalmente edita `proxies.txt`.
4. Ejecuta:

```bash
docker compose build
docker compose run --rm wallapop --diagnose
docker compose up -d
docker compose logs -f
```

`--diagnose` comprueba la conexión y el token mediante `getMe` y extrae una muestra de la página, sin escribir en la base ni enviar mensajes. **No verifica que el chat ID pueda recibir mensajes**. Si falla, resuélvelo antes de arrancar el servicio. Detener: `docker compose down`. La carpeta `data` persiste en el VPS. Para actualizar, reemplaza los archivos del programa y ejecuta `docker compose up -d --build` sin borrar `data` ni `.env`.

La imagen oficial de Playwright incluye Chromium y sus bibliotecas, pero se instala la biblioteca Python aparte y debe coincidir su versión. La configuración Docker proporcionada ejecuta el navegador como root; su sandbox Chromium no está activo. Playwright recomienda para sitios no confiables un usuario separado y un perfil seccomp que permita su sandbox. El aislamiento adicional depende del host. No concedas privilegios adicionales al contenedor. Fuente: https://playwright.dev/python/docs/docker

## 4. Configuración

Edita `.env` y reinicia el servidor. Las variables ya existentes en el entorno tienen prioridad sobre `.env`.

| Variable | Uso |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token de BotFather, obligatorio. |
| `TELEGRAM_CHAT_ID` | ID numérico del chat, obligatorio. |
| `SEARCH_URLS` | Una o más URLs completas `https://es.wallapop.com/search?...` separadas por `|`. Si se modifica una URL, esa búsqueda se considera nueva y su primera lectura no envía avisos. |
| `INTERVAL_SECONDS` | Espera tras cada ciclo, entre 30 y 86400 segundos; por defecto 90. El ciclo también tarda el tiempo de carga y envío. |
| `PAGE_TIMEOUT_SECONDS` | Espera máxima por navegación y por tarjetas: 10–180 segundos; por defecto 45. |
| `BLOCK_PAUSE_SECONDS` | Pausa tras 403, 429 o CAPTCHA detectado: 300–86400 segundos; por defecto 1800. |
| `DB_PATH` | Ruta persistente SQLite; por defecto `data/bot.sqlite3`. En Docker debe quedar dentro de `/app/data`. |
| `PROXIES_FILE` | Archivo opcional de proxy; por defecto `proxies.txt`. |

### Proxy privado

Añade a `proxies.txt` una línea con `http://usuario:contraseña@host:puerto`. Codifica caracteres especiales de usuario/contraseña como `%40` para `@`, `%3A` para `:` y `%2F` para `/`. Solo se usa la **primera línea no comentada**; no hay rotación automática. El proxy se aplica únicamente a Chromium y las consultas a Wallapop; Telegram sale directamente. El archivo es confidencial: no lo publiques ni lo compartas. En Compose es obligatorio crear el archivo aunque esté vacío por el montaje. No cambia de proxy para sortear bloqueos.

## 5. Funcionamiento y diagnóstico

- Cada búsqueda tiene su propia línea base identificada por la URL exacta. La primera lectura válida guarda lo visible sin notificar. Los resultados posteriores que no estaban guardados se añaden a una cola persistente y se envían con título, precio, enlace y foto cuando Telegram puede obtenerla; si rechaza la foto, se intenta enviar solo texto.
- El mismo anuncio en dos búsquedas distintas puede generar dos avisos. Si cambia la dirección del anuncio, puede tratarse como uno nuevo. Los ya guardados no se borran automáticamente; la base crece con el tiempo.
- La cola se guarda antes de enviar. Ante errores de Telegram se vuelve a intentar. En una desconexión justo después de que Telegram acepte el mensaje, no se puede saber si llegó y puede repetirse. No existe garantía de entrega exactamente una vez.
- En 403/429 o desafíos detectados se aplica la pausa configurada. Errores transitorios provocan espera creciente hasta 15 minutos. El bot registra número de tarjetas, nuevos y fallos. No imprime deliberadamente el token ni el proxy; no compartas `.env`, `proxies.txt` ni la URL de la API de Telegram.
- Si aparece `No se encontraron tarjetas`, abre la misma búsqueda manualmente, comprueba que tiene resultados y que el servidor puede acceder. Si Wallapop cambió el diseño, hay que actualizar la extracción del código. Si ves 403/CAPTCHA, espera y comprueba las condiciones de acceso; el programa no puede resolverlo automáticamente.
- Si Telegram devuelve 400/401/403, revisa token, chat ID, `/start` y permisos. Si no llegan fotos, Telegram quizá no puede descargar la imagen; se enviará un enlace como texto cuando la API rechace la foto expresamente. Para confirmar que tu chat funciona, espera un anuncio nuevo; el diagnóstico solo valida el token.
- Si el contenedor termina por memoria, consulta en el panel si ha sido detenido por límite de RAM; aumenta la memoria o reduce el número de búsquedas. Cada ciclo carga las búsquedas secuencialmente en Chromium.
- En Pterodactyl, si falla `pip`, comprueba salida del nodo a PyPI y que exista espacio. Si aparece un error de navegador ausente, verifica que el egg usa la imagen **v1.55.0** y `requirements.txt` conserva Playwright **1.55.0**. El directorio `.venv` persiste: bórralo con el servidor detenido si cambias de versión de Python/imagen y reinstala.

Recuerda que Pterodactyl, el proveedor del nodo, Internet, Wallapop y Telegram pueden fallar. Esta aplicación no puede garantizar que permanezca 24/7 sin intervención ni detectar instantáneamente todos los anuncios.
