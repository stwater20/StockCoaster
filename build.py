#!/usr/bin/env python3
"""產生 GitHub Pages 靜態網站：首頁 + 每檔上市櫃股票/ETF 一頁 + sitemap + robots + 404。

用法：python3 build.py --site-url https://<user>.github.io/StockCoaster/ --out _site
"""
import argparse
import datetime
import json
import os
import shutil

import seo


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

    stocks = seo.load_stocks(refresh=True)
    tpl = seo.read_template()
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
