#!/bin/bash
set -e
if [ -n "${STARTUP:-}" ]; then
  cd /home/container
  # El egg no usa sustituciones {{...}} y no incluye secretos en STARTUP.
  exec /bin/bash -c "$STARTUP"
fi
cd /app
exec python -u bot.py "$@"
