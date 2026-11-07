#!/usr/bin/env python3
"""Monitor de la página pública de búsqueda. Sin API privada ni evasión de desafíos."""
import argparse
import asyncio
import hashlib
import html
import json
import logging
import os
import random
import re
import signal
import sqlite3
import time
from pathlib import Path
from urllib.parse import urlsplit, unquote

import httpx
from dotenv import load_dotenv
from playwright.async_api import async_playwright

load_dotenv()
LOG = logging.getLogger('wallabot')
DEFAULT_URL = 'https://es.wallapop.com/search?category_id=24200&subcategory_ids=9447&latitude=28.420466115131113&longitude=-16.307544054902333&distance_in_km=50&keywords=iphone&order_by=newest'
STOP = asyncio.Event()

class SourceError(Exception): pass
class Blocked(SourceError): pass


def number(name, default, minimum, maximum):
    try: value = int(os.getenv(name, str(default)))
    except ValueError: raise ValueError(f'{name} debe ser un número entero')
    if not minimum <= value <= maximum: raise ValueError(f'{name} debe estar entre {minimum} y {maximum}')
    return value


def config():
    urls = [s.strip() for s in os.getenv('SEARCH_URLS', DEFAULT_URL).split('|') if s.strip()]
    if not urls: raise ValueError('SEARCH_URLS está vacío')
    for url in urls:
        u = urlsplit(url)
        if u.scheme != 'https' or u.hostname != 'es.wallapop.com' or u.path != '/search':
            raise ValueError('Cada búsqueda debe ser una URL https://es.wallapop.com/search?...')
    token, chat = os.getenv('TELEGRAM_BOT_TOKEN', '').strip(), os.getenv('TELEGRAM_CHAT_ID', '').strip()
    if not re.fullmatch(r'\d+:[A-Za-z0-9_-]+', token) or not re.fullmatch(r'-?\d+', chat):
        raise ValueError('Configura TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID válidos en .env')
    return dict(urls=urls, token=token, chat=chat, interval=number('INTERVAL_SECONDS', 90, 30, 86400),
                timeout=number('PAGE_TIMEOUT_SECONDS', 45, 10, 180), pause=number('BLOCK_PAUSE_SECONDS', 1800, 300, 86400),
                db=os.getenv('DB_PATH', 'data/bot.sqlite3'), proxies=os.getenv('PROXIES_FILE', 'proxies.txt'))


def proxy_from_file(path):
    p = Path(path)
    if not p.exists(): return None
    lines = [x.strip() for x in p.read_text(encoding='utf-8').splitlines() if x.strip() and not x.strip().startswith('#')]
    if not lines: return None
    # Una sola salida estable: no rotar para eludir límites o bloqueos.
    u = urlsplit(lines[0])
    if u.scheme != 'http' or not u.hostname or not u.port or u.path not in ('', '/'):
        raise ValueError('Proxy inválido; usa http://usuario:contraseña@host:puerto')
    result = {'server': f'http://{u.hostname}:{u.port}'}
    if u.username is not None: result['username'] = unquote(u.username)
    if u.password is not None: result['password'] = unquote(u.password)
    return result


def db_open(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=10)
    db.execute('PRAGMA journal_mode=WAL')
    db.executescript('''CREATE TABLE IF NOT EXISTS searches (search_id TEXT PRIMARY KEY, initialized INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS items (search_id TEXT NOT NULL, item_id TEXT NOT NULL, title TEXT NOT NULL, price TEXT NOT NULL, url TEXT NOT NULL, image TEXT NOT NULL, state TEXT NOT NULL, created REAL NOT NULL, PRIMARY KEY(search_id,item_id));''')
    db.commit()
    return db


def save_results(db, search_id, items):
    first = db.execute('SELECT 1 FROM searches WHERE search_id=?', (search_id,)).fetchone() is None
    added = 0
    with db:
        for item in items:
            cur = db.execute('INSERT OR IGNORE INTO items VALUES (?,?,?,?,?,?,?,?)',
                (search_id, item['id'], item['title'], item['price'], item['url'], item['image'], 'baseline' if first else 'pending', time.time()))
            added += cur.rowcount
        db.execute('INSERT OR IGNORE INTO searches VALUES (?,1)', (search_id,))
    return first, added


# Limitarse a enlaces de producto, y exigir título y precio. Si cambia el HTML, fallar en lugar de contaminar la base.
EXTRACT = r'''() => {
 const anchors = [...document.querySelectorAll('a[href*="/item/"]')];
 return anchors.map(a => {
   let card=a;
   for(let i=0;i<5 && card.parentElement;i++) {
     if(card.querySelector('img') && /(?:€|EUR)/i.test(card.innerText || '')) break;
     card=card.parentElement;
   }
   const text=(card.innerText||'').split('\n').map(x=>x.trim()).filter(Boolean);
   const price=text.find(x=>/(?:€|EUR)/i.test(x)) || '';
   const im=card.querySelector('img');
   const title=(im?.getAttribute('alt')||a.getAttribute('title')||text.find(x=>x!==price && x.length>3)||'').trim();
   return {href:a.href,title,price,image:im?.currentSrc||im?.src||''};
 });
}'''


async def read_page(browser, url, timeout):
    context = await browser.new_context(locale='es-ES', viewport={'width': 1365, 'height': 900})
    page = await context.new_page()
    try:
        response = await page.goto(url, wait_until='domcontentloaded', timeout=timeout*1000)
        if response and response.status in (403, 429):
            # Solo se informa de indicadores predefinidos; nunca se registra el HTML ni cookies.
            try:
                raw_title = (await page.title()).strip()
                # Evitar registrar contenido arbitrario: títulos no reconocidos se resumen.
                title = raw_title.lower()
                headers = response.headers
                safe_server = headers.get('server', '')[:80]
                safe_type = headers.get('content-type', '')[:80]
                LOG.warning('Respuesta 403: título=%s; servidor=%s; tipo=%s',
                            repr(raw_title[:100]), safe_server or 'no indicado', safe_type or 'no indicado')
                body = (await page.locator('body').inner_text(timeout=3000)).lower()
                text = title + ' ' + body
                hints = []
                for label, terms in (
                    ('captcha', ('captcha', 'verifica que eres humano', 'verify you are human')),
                    ('acceso denegado', ('access denied', 'acceso denegado', 'forbidden')),
                    ('verificación de seguridad', ('security check', 'security verification', 'verificación de seguridad', 'checking your browser')),
                ):
                    if any(term in text for term in terms): hints.append(label)
                LOG.warning('Diagnóstico HTTP %s: %s', response.status,
                            ', '.join(hints) if hints else 'sin indicadores conocidos en la página')
            except Exception:
                LOG.warning('Diagnóstico HTTP %s: no se pudo leer la página de respuesta', response.status)
            raise Blocked(f'Wallapop respondió HTTP {response.status}')
        if response and response.status >= 400: raise SourceError(f'Wallapop respondió HTTP {response.status}')
        for label in ('Aceptar todas', 'Aceptar todo', 'Accept all'):
            try:
                button = page.get_by_role('button', name=label, exact=False).first
                if await button.is_visible(timeout=800): await button.click(timeout=1500); break
            except Exception: pass
        try: await page.wait_for_selector('a[href*="/item/"]', timeout=timeout*1000)
        except Exception:
            body = (await page.locator('body').inner_text(timeout=3000)).lower()
            if any(w in body for w in ('captcha', 'access denied', 'acceso denegado', 'verifica que eres humano', 'too many requests')):
                raise Blocked('Wallapop presenta un bloqueo o verificación')
            raise SourceError('No se encontraron tarjetas: página vacía, carga incompleta o HTML cambiado')
        await page.wait_for_timeout(1500)
        raw = await page.evaluate(EXTRACT)
        items, seen = [], set()
        for x in raw:
            u = urlsplit(x['href'])
            if u.hostname != 'es.wallapop.com' or not u.path.startswith('/item/'): continue
            slug = u.path.rstrip('/').split('/')[-1]
            if not slug or slug in seen or not x['title'] or not x['price']: continue
            seen.add(slug)
            image = x['image'] if urlsplit(x['image']).scheme == 'https' else ''
            items.append(dict(id=slug, title=x['title'][:300], price=x['price'][:100], url='https://es.wallapop.com'+u.path, image=image))
        if not items: raise SourceError('Hay enlaces de productos pero no se pudo extraer título y precio; revisa el diagnóstico')
        return items
    finally: await context.close()


async def telegram(client, cfg, item):
    text = f"📱 <b>{html.escape(item['title'])}</b>\n💰 {html.escape(item['price'])}\n<a href=\"{html.escape(item['url'], quote=True)}\">Ver anuncio en Wallapop</a>"
    payload = {'chat_id': cfg['chat'], 'parse_mode':'HTML'}
    method = 'sendPhoto' if item['image'] else 'sendMessage'
    payload.update({'photo': item['image'], 'caption': text} if item['image'] else {'text': text})
    async def send(method, data):
        try:
            r = await client.post(f"https://api.telegram.org/bot{cfg['token']}/{method}", json=data)
            try: body = r.json()
            except ValueError: body = {}
            return r.status_code, body
        except httpx.HTTPError:
            raise SourceError('Telegram no responde; el envío podría haberse realizado y se reintentará') from None
    status, body = await send(method, payload)
    # Una foto inaccesible puede rechazarse de forma explícita. No repetir en caso de timeout.
    if status == 400 and method == 'sendPhoto' and any(s in body.get('description','').lower() for s in ('photo', 'image', 'http url')):
        status, body = await send('sendMessage', {'chat_id': cfg['chat'], 'parse_mode':'HTML', 'text':text})
    if status == 429:
        delay = min(3600, max(1, int(body.get('parameters', {}).get('retry_after', 60))))
        raise Blocked(f'Telegram limita los envíos; espera {delay} segundos')
    if status != 200 or not body.get('ok'): raise SourceError(f'Telegram rechazó el envío (HTTP {status}): {str(body.get("description", "sin detalles"))[:200]}')


async def flush(db, client, cfg):
    rows = db.execute("SELECT search_id,item_id,title,price,url,image FROM items WHERE state='pending' ORDER BY created LIMIT 50").fetchall()
    for sid, iid, title, price, url, image in rows:
        await telegram(client, cfg, dict(title=title, price=price, url=url, image=image))
        with db: db.execute("UPDATE items SET state='sent' WHERE search_id=? AND item_id=?", (sid,iid))
        LOG.info('Telegram: enviado %s', iid)
        await asyncio.sleep(1)


async def wait(seconds):
    try: await asyncio.wait_for(STOP.wait(), timeout=seconds)
    except asyncio.TimeoutError: pass


async def main(cfg, diagnostic=False):
    proxy = proxy_from_file(cfg['proxies'])
    db = None if diagnostic else db_open(cfg['db'])
    async with httpx.AsyncClient(timeout=20, trust_env=False) as client, async_playwright() as p:
        if diagnostic:
            try:
                r = await client.get(f"https://api.telegram.org/bot{cfg['token']}/getMe")
                LOG.info('Telegram getMe HTTP %s', r.status_code)
                ok = r.status_code == 200 and r.json().get('ok')
                if not ok: LOG.error('Token de Telegram rechazado')
            except Exception: LOG.error('No se pudo conectar a Telegram'); ok = False
        else: ok = True
        failures = 0
        while not STOP.is_set():
            try:
                # Reabrir Chromium por ciclo evita procesos acumulados tras fallos prolongados.
                browser = await p.chromium.launch(headless=True, proxy=proxy, args=['--disable-dev-shm-usage'])
                try:
                    for url in cfg['urls']:
                        sid = hashlib.sha256(url.encode()).hexdigest()[:16]
                        items = await read_page(browser, url, cfg['timeout'])
                        if diagnostic:
                            LOG.info('Búsqueda %s: %d tarjetas válidas. Ejemplo: %s | %s | foto=%s', sid, len(items), items[0]['title'], items[0]['price'], bool(items[0]['image']))
                        else:
                            first, added = save_results(db, sid, items)
                            LOG.info('Búsqueda %s: %d visibles, %d %s', sid, len(items), added, 'guardados sin enviar (primera lectura)' if first else 'nuevos')
                finally: await browser.close()
                if not diagnostic: await flush(db, client, cfg)
                failures = 0
                if diagnostic: return 0 if ok else 1
                await wait(cfg['interval'] + random.uniform(0, min(5, cfg['interval'] * .1)))
            except Blocked as exc:
                LOG.warning('%s. Pausa de %s segundos; no se cambia de proxy.', exc, cfg['pause'])
                if diagnostic: return 1
                await wait(cfg['pause'])
            except Exception as exc:
                failures += 1
                # No imprimir excepciones externas: podrían contener URLs con credenciales.
                LOG.error('Fallo de consulta o envío (%s). %s', type(exc).__name__, str(exc) if isinstance(exc, SourceError) else 'Revisa red, proxy, dependencias y registros de instalación.')
                if diagnostic: return 1
                delay = min(900, max(cfg['interval'], 15 * (2 ** min(failures, 6))))
                LOG.info('Reintento en %s segundos; fallos consecutivos=%s', delay, failures)
                await wait(delay)
    if db: db.close()
    return 0


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
    parser = argparse.ArgumentParser(description='Monitor Wallapop a Telegram')
    parser.add_argument('--diagnose', action='store_true', help='comprueba Telegram y la extracción sin tocar la base de datos')
    args = parser.parse_args()
    try:
        cfg = config()
        for sig in (signal.SIGINT, signal.SIGTERM):
            signal.signal(sig, lambda *_: STOP.set())
        raise SystemExit(asyncio.run(main(cfg, args.diagnose)))
    except (ValueError, OSError) as exc:
        LOG.error('Configuración/archivo: %s', exc)
        raise SystemExit(2)
