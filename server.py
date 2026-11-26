#!/usr/bin/env python3
"""StockCoaster 本地伺服器：提供靜態網頁，並代理 Yahoo Finance 台股日線資料（瀏覽器直接抓會被 CORS 擋）。

用法：python3 server.py  →  開 http://localhost:8765
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8765"))
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
UA = "Mozilla/5.0"  # 完整瀏覽器 UA 反而會被 Yahoo 回 429
CACHE_TTL = 600
_cache = {}

RANGES = {"3mo": "1d", "6mo": "1d", "1y": "1d", "2y": "1d", "5y": "1wk", "10y": "1wk"}


def yahoo_get(url):
    hit = _cache.get(url)
    if hit and time.time() - hit[0] < CACHE_TTL:
        return hit[1]
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=12) as r:
        data = json.loads(r.read().decode("utf-8"))
    _cache[url] = (time.time(), data)
    return data


def fetch_chart(code, rng):
    interval = RANGES.get(rng, "1d")
    # 上市 .TW 先試，失敗再試上櫃 .TWO
    suffixes = [""] if "." in code else [".TW", ".TWO"]
    last_err = None
    for suf in suffixes:
        sym = code + suf
        url = (
            "https://query1.finance.yahoo.com/v8/finance/chart/"
            + urllib.parse.quote(sym)
            + "?range=" + rng + "&interval=" + interval + "&includeAdjustedClose=true"
        )
        try:
            data = yahoo_get(url)
            res = (data.get("chart") or {}).get("result")
            if not res:
                last_err = "查無資料"
                continue
            res = res[0]
            ts = res.get("timestamp") or []
            q = (res.get("indicators") or {}).get("quote", [{}])[0]
            pts = []
            for i, t in enumerate(ts):
                c = (q.get("close") or [None] * len(ts))[i]
                if c is None:
                    continue
                pts.append({
                    "t": t,
                    "o": (q.get("open") or [c])[i] or c,
                    "h": (q.get("high") or [c])[i] or c,
                    "l": (q.get("low") or [c])[i] or c,
                    "c": c,
                    "v": (q.get("volume") or [0])[i] or 0,
                })
            if len(pts) < 10:
                last_err = "資料太少"
                continue
            meta = res.get("meta", {})
            return {
                "symbol": meta.get("symbol", sym),
                "name": meta.get("shortName") or meta.get("longName") or sym,
                "currency": meta.get("currency", "TWD"),
                "interval": interval,
                "points": pts,
            }
        except Exception as e:  # noqa: BLE001
            last_err = str(e)
    raise ValueError(last_err or "查無資料")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "/api/" in (args[0] if args else ""):
            super().log_message(fmt, *args)

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path == "/api/chart":
            qs = urllib.parse.parse_qs(u.query)
            code = (qs.get("code") or [""])[0].strip().upper()
            rng = (qs.get("range") or ["1y"])[0]
            if not re.fullmatch(r"[0-9A-Z]{4,6}(\.TWO?)?", code):
                return self.send_json(400, {"error": "股票代號格式不對（例：2330、0050、6488）"})
            if rng not in RANGES:
                rng = "1y"
            try:
                return self.send_json(200, fetch_chart(code, rng))
            except Exception as e:  # noqa: BLE001
                return self.send_json(502, {"error": "抓不到 " + code + "：" + str(e)})
        return super().do_GET()


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"🎢 StockCoaster 啟動：http://localhost:{PORT}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
