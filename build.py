#!/usr/bin/env python3
"""產生 GitHub Pages 靜態網站：首頁 + 每檔上市櫃股票/ETF 一頁 + sitemap + robots + 404。

用法：python3 build.py --site-url https://<user>.github.io/StockCoaster/ --out _site
"""
import argparse
import datetime
import json
import os
import re
import shutil
import subprocess
import time

import seo

# 模組 import：from './x.js' → from './x.js?v=版本'
IMPORT_RE = re.compile(r"(from\s+)(['\"])\./([\w-]+\.js)\2")


def version():
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True).strip()
    except Exception:  # noqa: BLE001
        return str(int(time.time()))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-url", default=seo.SITE_DEFAULT)
    ap.add_argument("--out", default="_site")
    a = ap.parse_args()
    site = a.site_url if a.site_url.endswith("/") else a.site_url + "/"
    out = a.out

    if os.path.exists(out):
        shutil.rmtree(out)
    shutil.copytree(seo.PUBLIC, out)

    # 快取破除：Cloudflare／瀏覽器會把 CSS、JS 快取好幾個小時，每次部署都換新版本號，
    # 否則手機會拿到新 HTML 配舊 CSS，版面就亂掉
    ver = version()
    for name in os.listdir(out):
        if name.endswith(".js"):
            fp = os.path.join(out, name)
            with open(fp, encoding="utf-8") as f:
                js = f.read()
            js = IMPORT_RE.sub(lambda m: f"{m.group(1)}{m.group(2)}./{m.group(3)}?v={ver}{m.group(2)}", js)
            with open(fp, "w", encoding="utf-8") as f:
                f.write(js)

    stocks = seo.load_stocks(refresh=True)
    tpl = seo.read_template()
    tpl = tpl.replace('href="style.css"', f'href="style.css?v={ver}"').replace('src="app.js"', f'src="app.js?v={ver}"')
    with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as f:
        f.write(seo.render(tpl, site, None, stocks))
    for code in stocks:
        d = os.path.join(out, code)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(seo.render(tpl, site, code, stocks))

    # 前端用：代號 → 名稱（自動完成、顯示名稱）
    with open(os.path.join(out, "stocks.json"), "w", encoding="utf-8") as f:
        json.dump({c: v["name"] for c, v in stocks.items()}, f, ensure_ascii=False, separators=(",", ":"))

    today = datetime.date.today().isoformat()
    urls = [(site, "1.0")] + [(f"{site}{c}/", "0.9" if c in seo.POPULAR else "0.6") for c in stocks]
    with open(os.path.join(out, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for u, p in urls:
            f.write(f"  <url><loc>{u}</loc><lastmod>{today}</lastmod><changefreq>daily</changefreq><priority>{p}</priority></url>\n")
        f.write("</urlset>\n")
    with open(os.path.join(out, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(f"User-agent: *\nAllow: /\n\nSitemap: {site}sitemap.xml\n")

    # 沒有預先產生的代號（例如新上市）→ 導回首頁帶 ?code=
    with open(os.path.join(out, "404.html"), "w", encoding="utf-8") as f:
        f.write("""<!doctype html><meta charset="utf-8"><title>股市雲霄飛車</title>
<script>
var m = location.pathname.match(/^(.*?\\/)([0-9A-Za-z]{4,6})\\/?$/);
location.replace(m ? m[1] + '?code=' + m[2].toUpperCase() + location.search.replace(/^\\?/, '&') : '%s');
</script>""" % site)
    with open(os.path.join(out, ".nojekyll"), "w") as f:
        f.write("")
    print(f"built {len(stocks) + 1} pages → {out}")


if __name__ == "__main__":
    main()
