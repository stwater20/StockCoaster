#!/usr/bin/env python3
"""StockCoaster 本地伺服器：提供靜態網頁，並代理 Yahoo Finance 台股日線資料（瀏覽器直接抓會被 CORS 擋）。

用法：python3 server.py  →  開 http://localhost:8765 ，個股頁 http://localhost:8765/2330/
"""
import calendar
import datetime
import json
import os
import re
import time
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import content
import seo

PORT = int(os.environ.get("PORT", "8765"))
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
UA = "Mozilla/5.0"  # 完整瀏覽器 UA 反而會被 Yahoo 回 429
CACHE_TTL = 600
_cache = {}
STOCKS = {}

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def to_ts(d, end=False):
    t = calendar.timegm(datetime.datetime.strptime(d, "%Y-%m-%d").timetuple()) - 8 * 3600
    return t + 86400 if end else t


def yahoo_get(url):
    hit = _cache.get(url)
    if hit and time.time() - hit[0] < CACHE_TTL:
        return hit[1]
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=12) as r:
        data = json.loads(r.read().decode("utf-8"))
    _cache[url] = (time.time(), data)
    return data


def fetch_chart(code, start, end):
    p1, p2 = to_ts(start), to_ts(end, True)
    interval = "1wk" if (p2 - p1) > 3 * 366 * 86400 else "1d"
    # 上市 .TW 先試，失敗再試上櫃 .TWO
    suffixes = [""] if "." in code else [".TW", ".TWO"]
    last_err = None
    for suf in suffixes:
        sym = code + suf
        url = (
            "https://query1.finance.yahoo.com/v8/finance/chart/"
            + urllib.parse.quote(sym)
            + f"?period1={p1}&period2={p2}&interval={interval}&includeAdjustedClose=true"
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
            start = (qs.get("start") or [""])[0]
            end = (qs.get("end") or [""])[0]
            if not re.fullmatch(r"[0-9A-Z]{4,6}(\.TWO?)?", code):
                return self.send_json(400, {"error": "股票代號格式不對（例：2330、0050、6488）"})
            if not (DATE_RE.match(start) and DATE_RE.match(end)) or start >= end:
                return self.send_json(400, {"error": "日期格式不對"})
            try:
                return self.send_json(200, fetch_chart(code, start, end))
            except Exception as e:  # noqa: BLE001
                return self.send_json(502, {"error": "抓不到 " + code + "：" + str(e)})
        # SEO 頁：首頁與 /2330/ 這類個股頁，用同一份範本即時產生
        m = re.fullmatch(r"/([0-9A-Za-z]{4,6})/?", u.path)
        if m and m.group(1).lower() in ("ride", "theme", "learn"):
            m = None
        if u.path in ("/", "/index.html") or m:  # noqa: SIM102
            if m and not u.path.endswith("/"):
                self.send_response(301)
                self.send_header("Location", u.path + "/" + ("?" + u.query if u.query else ""))
                return self.end_headers()
            code = m.group(1).upper() if m else None
            page = seo.render(seo.read_template(), f"http://localhost:{PORT}/", code, STOCKS)
            body = page.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        # 長青內容頁：/ride/、/theme/、/industry/、/learn/
        rel = urllib.parse.unquote(u.path).lstrip("/")
        if re.match(r"(ride|theme|industry|learn)(/|$)", rel):
            if not rel.endswith("/"):
                self.send_response(301)
                self.send_header("Location", u.path + "/")
                return self.end_headers()
            page = content.extra_pages(seo.read_template(), f"http://localhost:{PORT}/", STOCKS).get(rel)
            if page:
                body = page.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                return self.wfile.write(body)
        if u.path == "/rides.json":
            body = content.rides_json().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        if u.path == "/stocks.json":
            return self.send_json(200, {c: v["name"] for c, v in STOCKS.items()})
        return super().do_GET()


if __name__ == "__main__":
    STOCKS = seo.load_stocks()
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"🎢 StockCoaster 啟動：http://localhost:{PORT}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
