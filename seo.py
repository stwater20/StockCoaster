"""SEO 頁面產生：每檔股票一個網址（/2330/），各自有標題、描述、結構化資料與內部連結。

server.py（本機即時產生）與 build.py（GitHub Pages 靜態輸出）共用。
"""
import datetime
import html
import json
import os
import re
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(ROOT, "public")
CACHE = os.path.join(ROOT, ".cache", "stocks.json")
SITE_DEFAULT = "https://stockcoaster.sectools.tw/"
SECTOOLS = "https://sectools.tw/?utm_source=stockcoaster&utm_medium=referral"
CODE_RE = re.compile(r"^(\d{4}|00\d{2,4}[A-Z]?)$")

KNOWN = {
    "2330": "台積電", "0050": "元大台灣50", "2317": "鴻海", "2454": "聯發科", "2603": "長榮", "2382": "廣達",
    "0056": "元大高股息", "00878": "國泰永續高股息", "00919": "群益台灣精選高息", "006208": "富邦台50",
    "2308": "台達電", "2412": "中華電", "2881": "富邦金", "2882": "國泰金", "2891": "中信金", "2886": "兆豐金",
    "3008": "大立光", "2609": "陽明", "2615": "萬海", "3231": "緯創", "2357": "華碩", "2376": "技嘉",
    "3711": "日月光投控", "2303": "聯電", "6505": "台塑化", "1301": "台塑", "2002": "中鋼", "2618": "長榮航",
    "3661": "世芯-KY", "6488": "環球晶", "5274": "信驊", "8299": "群聯", "3529": "力旺", "6669": "緯穎",
    "1216": "統一", "2207": "和泰車", "2912": "統一超", "00940": "元大台灣價值高息", "00929": "復華台灣科技優息",
}
POPULAR = ["2330", "0050", "2317", "2454", "2603", "2382", "0056", "00878", "2308", "2881",
           "2412", "3008", "2303", "00919", "006208", "3231", "2357", "3711", "2618", "6505"]
MARKET = {"twse": "上市", "tpex": "上櫃"}


def fetch_stocks():
    """從 FinMind 抓全部上市櫃股票與 ETF（代號、名稱、產業）。"""
    req = urllib.request.Request("https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo",
                                 headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))["data"]
    out = {}
    for row in data:
        code = row["stock_id"]
        if row.get("type") in MARKET and CODE_RE.match(code):
            out[code] = {"name": row["stock_name"], "industry": row.get("industry_category") or "", "market": row["type"]}
    return out


def load_stocks(refresh=False):
    if not refresh and os.path.exists(CACHE):
        with open(CACHE, encoding="utf-8") as f:
            return json.load(f)
    try:
        stocks = fetch_stocks()
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        with open(CACHE, "w", encoding="utf-8") as f:
            json.dump(stocks, f, ensure_ascii=False)
        return stocks
    except Exception:  # noqa: BLE001  抓不到就用內建清單
        return {c: {"name": n, "industry": "", "market": "twse"} for c, n in KNOWN.items()}


def _e(s):
    return html.escape(str(s), quote=True)


def head_html(site, code=None, info=None):
    today = datetime.date.today().isoformat()
    if code:
        name = info["name"]
        mk = MARKET.get(info.get("market"), "")
        ind = info.get("industry") or ""
        title = f"{name}股價走勢 {code}｜坐一趟雲霄飛車看懂漲跌 – 股市雲霄飛車"
        desc = (f"{name}（{code}）股價走勢變成像素雲霄飛車！漲是喀喀喀爬坡、跌是全車尖叫俯衝，"
                f"一趟看懂{name}的最大回檔、創新高次數與單日最大漲跌，還有 AI 預言家推估未來 30 個交易日。免費免註冊，手機也能玩。")
        url = f"{site}{code}/"
        kw = f"{name},{code},{name}股價,{code}股價,{name}股價走勢,{name}走勢圖,{name}K線,台股,{ind or '台股'},股市雲霄飛車"
    else:
        title = "股市雲霄飛車｜台股走勢變成雲霄飛車，台積電、0050 一鍵發車"
        desc = ("看盤太無聊？輸入台股代號，股價走勢立刻變成像素雲霄飛車：紅漲綠跌、漲停衝天、跌停俯衝。"
                "上市櫃股票與 ETF 都能坐，可自訂期間，附 AI 預言家與遊戲模式，免費免註冊。")
        url = site
        kw = "台股,股價走勢,台積電股價,0050,ETF,存股,K線,股市遊戲,雲霄飛車,AI 股價預測"
    img = f"{site}og.png"
    app = {
        "@context": "https://schema.org", "@type": "WebApplication", "name": "股市雲霄飛車 StockCoaster",
        "url": url, "description": desc, "applicationCategory": "GameApplication", "operatingSystem": "Any",
        "inLanguage": "zh-TW", "image": img, "isAccessibleForFree": True,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "TWD"},
        "publisher": {"@type": "Organization", "name": "SecTools.tw", "url": "https://sectools.tw/"},
    }
    ld = [app]
    if not code:
        ld.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]})
    if code:
        ld.append({
            "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "股市雲霄飛車", "item": site},
                {"@type": "ListItem", "position": 2, "name": f"{info['name']} {code}", "item": url},
            ]})
    return f"""<title>{_e(title)}</title>
  <meta name="description" content="{_e(desc)}" />
  <meta name="keywords" content="{_e(kw)}" />
  <link rel="canonical" href="{_e(url)}" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="股市雲霄飛車 StockCoaster" />
  <meta property="og:locale" content="zh_TW" />
  <meta property="og:title" content="{_e(title)}" />
  <meta property="og:description" content="{_e(desc)}" />
  <meta property="og:url" content="{_e(url)}" />
  <meta property="og:image" content="{_e(img)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{_e(title)}" />
  <meta name="twitter:description" content="{_e(desc)}" />
  <meta name="twitter:image" content="{_e(img)}" />
  <meta name="theme-color" content="#141633" />
  <meta name="dcterms.modified" content="{today}" />
  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>"""


def _links(codes, stocks, prefix):
    items = []
    for c in codes:
        if c in stocks:
            items.append(f'<li><a href="{prefix}{c}/">{_e(stocks[c]["name"])} <small>{c}</small></a></li>')
    return "<ul class=\"stock-links\">" + "".join(items) + "</ul>"


FAQ = [
    ("股價資料從哪裡來？多久更新一次？",
     "資料來自 Yahoo Finance 與 FinMind 的公開台股資料，每個交易日收盤後更新。股票分割會自動還原，除權息造成的缺口會特別標示，不會被誤判成跌停。"),
    ("要付費、下載或註冊嗎？", "完全免費，免安裝、免註冊，用手機或電腦的瀏覽器打開就能玩。"),
    ("哪些股票可以坐？", "所有上市、上櫃股票和 ETF 都可以，例如台積電 2330、元大台灣50 0050、鴻海 2317、聯發科 2454、長榮 2603、元大高股息 0056、國泰永續高股息 00878。"),
    ("AI 預言家準嗎？", "AI 預言家用均線、RSI、近月動能和 600 條蒙地卡羅模擬，推估未來 30 個交易日的可能區間。它比較像廟口的籤筒，不是分析師，純屬娛樂，不構成投資建議。"),
    ("可以分享給朋友嗎？", "每檔股票都有專屬網址，例如 /2330/ 或 /0050/?range=5y。坐完按「分享這趟」，就能把報酬、最大回檔和尖叫次數傳給朋友。"),
]


def about_html(stocks, code=None, info=None, prefix=""):
    parts = []
    if code:
        name = info["name"]
        ind = info.get("industry") or ""
        mk = MARKET.get(info.get("market"), "")
        desc_ind = f"{mk}{('的' + _e(ind)) if ind else '股票'}" if mk else "股票"
        parts.append(f"<h2>{_e(name)}（{code}）股價走勢雲霄飛車</h2>")
        parts.append(
            f"<p>{_e(name)}是台股{desc_ind}。按下「發車」，{_e(name)}近一年的收盤價會鋪成一整條軌道："
            f"紅色爬坡是上漲、綠色俯衝是下跌，成交量越大，底下的樓就蓋得越高。爆量那天還會蓋出一棟台北 101。</p>"
            f"<p>坐到「今天」之後，列車會駛入 AI 預言家鋪的紫色未來軌道，看看{_e(name)}接下來 30 個交易日可能怎麼走。"
            f"一路上還會看到散戶追高上車、停損下車，比看 K 線圖有感多了。</p>")
        parts.append(
            f'<p>換個期間坐坐看：<a href="./?range=3mo">近 3 個月</a>・<a href="./?range=ytd">今年以來</a>・'
            f'<a href="./?range=1y">近 1 年</a>・<a href="./?range=5y">近 5 年</a>・<a href="./?range=10y">近 10 年</a></p>')
        if ind:
            peers = sorted((c for c, v in stocks.items() if v.get("industry") == ind and c != code), key=lambda c: (c not in KNOWN, c))[:16]
            if peers:
                parts.append(f"<h3>{_e(ind)}的其他路線</h3>" + _links(peers, stocks, prefix))
    else:
        parts.append("<h2>把 K 線坐一遍，比看盤更有感</h2>")
        parts.append(
            "<p>看盤看到眼睛花？股市雲霄飛車把台股的歷史股價直接鋪成像素風雲霄飛車軌道。上漲是喀喀喀慢慢爬坡，"
            "下跌是整車人一起尖叫俯衝；成交量變成底下的台北街景，量越大樓越高。路上還有廟宇、超商、夜市燈籠，跟一台亂切車道的三寶機車。</p>"
            "<p>上市、上櫃股票和 ETF 全都能坐：台積電、0050、鴻海、聯發科、長榮、0056、00878……輸入代號就發車。"
            "期間可以選近 3 個月、今年以來、1 年、5 年、10 年，也能自訂起訖日期，回味疫情崩盤、航運狂潮、AI 行情這些經典時刻。</p>"
            "<h3>坐完你會知道</h3><p>期間報酬、最大回檔、創新高次數、單日最大漲跌，還有你尖叫了幾次。"
            "想挑戰的話切到遊戲模式：點畫面跳躍、撿金幣跟紅包、閃過利空炸彈，看誰分數最高。</p>")
        parts.append("<h3>常見問題</h3>" + "".join(f"<p><b>{_e(q)}</b><br>{_e(a)}</p>" for q, a in FAQ))
    parts.append("<h3>熱門路線</h3>" + _links([c for c in POPULAR if c != code], stocks, prefix))
    parts.append(
        f'<h3>還想玩點別的？</h3><p><a href="{SECTOOLS}" target="_blank" rel="noopener">SecTools.tw</a> 還有'
        '<a href="https://train.sectools.tw/?utm_source=stockcoaster" target="_blank" rel="noopener">火車駕駛模擬</a>、'
        '<a href="https://airplane.sectools.tw/?utm_source=stockcoaster" target="_blank" rel="noopener">桃園飛東京的飛行模擬</a>、'
        '<a href="https://gacha-sho.sectools.tw/?utm_source=stockcoaster" target="_blank" rel="noopener">資安扭蛋機</a>、'
        '<a href="https://tesla-roadster.sectools.tw/?utm_source=stockcoaster" target="_blank" rel="noopener">Roadster Rush 閃三寶賽車</a>、'
        '<a href="https://car.sectools.tw/?utm_source=stockcoaster" target="_blank" rel="noopener">停好停滿停車挑戰</a>'
        "，全部免費、免安裝、免註冊，隨點即玩。</p>")
    return "\n".join(parts)


_ASSET_RE = re.compile(r'(\s(?:href|src))="(?!https?:|#|/|\.\./|data:|mailto:)([^"]*)"')


def render(template, site=SITE_DEFAULT, code=None, stocks=None):
    """把 index.html 範本變成首頁或個股頁。個股頁位在 /<code>/，相對路徑要多退一層。"""
    stocks = stocks or {}
    info = stocks.get(code) if code else None
    if code and not info:
        info = {"name": KNOWN.get(code, code), "industry": "", "market": ""}
    prefix = "../" if code else ""
    out = re.sub(r"<!--SEO:HEAD-->.*?<!--/SEO:HEAD-->", lambda m: "<!--SEO:HEAD-->" + head_html(site, code, info) + "<!--/SEO:HEAD-->", template, flags=re.S)
    if code:
        h1 = f"{_e(info['name'])}（{code}）股價走勢雲霄飛車"
        out = re.sub(r"<!--SEO:H1-->.*?<!--/SEO:H1-->", lambda m: f"<!--SEO:H1-->{h1}<!--/SEO:H1-->", out, flags=re.S)
        out = out.replace('<html lang="zh-Hant">', f'<html lang="zh-Hant" data-code="{code}">')
        out = _ASSET_RE.sub(lambda m: f'{m.group(1)}="../{m.group(2)}"', out)
    out = re.sub(r"<!--SEO:ABOUT-->.*?<!--/SEO:ABOUT-->",
                 lambda m: "<!--SEO:ABOUT-->" + about_html(stocks, code, info, prefix) + "<!--/SEO:ABOUT-->", out, flags=re.S)
    return out


def read_template():
    with open(os.path.join(PUBLIC, "index.html"), encoding="utf-8") as f:
        return f.read()
