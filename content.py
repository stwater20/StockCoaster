"""長青內容頁：經典名場面（固定期間）、主題清單、產業清單、股市名詞小教室。

股價天天變，這些頁面的內容不會過期，負責接住「2020 股災」「高股息 ETF 比較」「最大回檔是什麼」
這類一直有人搜的關鍵字，再把人導進雲霄飛車。server.py 與 build.py 共用。
"""
import datetime
import json

from seo import KNOWN, MARKET, SECTOOLS, _e, meta_head, render_app

# ---------- 經典名場面：固定期間，一鍵重溫 ----------
RIDES = [
    {"slug": "2008-financial-crisis", "emoji": "🏦", "short": "2008 金融海嘯", "code": "0050",
     "start": "2008-01-01", "end": "2009-12-31",
     "title": "2008 金融海嘯雲霄飛車：0050 從高點一路俯衝",
     "kw": "2008金融海嘯,金融海嘯台股,雷曼兄弟,0050 2008,台股歷史股災",
     "lede": "雷曼兄弟倒閉、全球信用凍結，台股一路往下掉。坐一趟 0050，感受什麼叫「沒有底的溜滑梯」。",
     "story": ["2008 年 9 月雷曼兄弟聲請破產，全球金融市場陷入恐慌，台股加權指數年底一度跌到 4,000 點以下。",
               "這段軌道前半段幾乎都是綠色俯衝，偶爾一小段反彈又被打回去。2009 年各國聯手救市，軌道才慢慢開始爬坡。",
               "坐完你會很有感：為什麼老手常說「現金也是部位」，還有為什麼大跌時不要一次梭哈。"],
     "watch": ["2008 下半年連續好幾段俯衝，車上乘客會一直尖叫", "2009 年開始的長坡，是金融海嘯後的大反彈", "注意最大回檔的數字，那就是當時存股族心裡的痛"]},
    {"slug": "2020-covid-crash", "emoji": "😷", "short": "2020 疫情股災", "code": "0050",
     "start": "2020-01-01", "end": "2020-12-31",
     "title": "2020 疫情股災雲霄飛車：0050 先崩再 V 轉",
     "kw": "2020股災,疫情股災,新冠肺炎股市,V型反轉,台股2020,0050 2020",
     "lede": "新冠疫情爆發，台股 3 月急殺，接著一路 V 型反轉、年底創新高。這是近年最刺激的一趟。",
     "story": ["2020 年初新冠肺炎疫情擴散到全球，3 月美股多次觸發熔斷，台股加權指數 3 月中一度跌破 8,600 點。",
               "沒多久各國央行降息、狂印鈔票，資金湧進股市，台股一路反彈，年底站上 14,000 點以上，整年反而是上漲的。",
               "坐這趟最大的感覺是：最恐慌的那幾天，通常也是事後回頭看最便宜的時候。"],
     "watch": ["3 月那段又陡又長的綠色俯衝", "俯衝後馬上接一段長長的紅色爬坡，這就是 V 型反轉", "看看「創新高次數」，下半年幾乎一直在破紀錄"]},
    {"slug": "2021-shipping-boom", "emoji": "🚢", "short": "2021 航海王", "code": "2603",
     "start": "2020-06-01", "end": "2022-03-31",
     "title": "2021 航海王雲霄飛車：長榮 2603 全民瘋航運",
     "kw": "航海王,長榮股價,2603,貨櫃航運,航運股2021,長榮漲幅",
     "lede": "塞港、運價狂飆，長榮一年多漲了超過十倍，菜市場都在聊航運。坐一趟看看航海王的浪有多大。",
     "story": ["疫情讓全球港口大塞車，貨櫃一櫃難求，運價漲到好幾倍。長榮、陽明、萬海被稱為「航海三雄」，成交量一度超越台積電。",
               "2021 年夏天是最瘋狂的時候，單日漲跌都很大，散戶追高上車、停損下車的畫面在這趟會一直出現。",
               "這趟是學「景氣循環股」最好的教材：賺最多的時候，往往也是股價最高的時候。"],
     "watch": ["2020 下半年的長爬坡，起點其實很低", "2021 年 7 月前後的高點與暴量，下面會蓋出台北 101", "高點之後的大起大落，最適合玩遊戲模式"]},
    {"slug": "2022-rate-hike-bear", "emoji": "🐻", "short": "2022 升息熊市", "code": "2330",
     "start": "2022-01-01", "end": "2022-12-31",
     "title": "2022 升息熊市雲霄飛車：台積電從 600 多元跌破 400",
     "kw": "2022熊市,升息,台積電2022,台積電股價跌,熊市是什麼,聯準會升息",
     "lede": "通膨失控、美國聯準會暴力升息，連護國神山都撐不住。坐一趟台積電，體驗一整年的下坡。",
     "story": ["2022 年美國通膨創 40 年新高，聯準會一年內連續大幅升息，科技股估值被重新計算，全球股市進入熊市。",
               "台積電年初還在 600 多元，到了 10 月一度跌破 400 元，不少人在這一年學會「停損」兩個字怎麼寫。",
               "這趟軌道是一段一段往下的階梯，中間的反彈都撐不久，是認識「空頭走勢」最直觀的方式。"],
     "watch": ["一整年幾乎看不到新高旗", "每次反彈都爬不過上一個高點，這就是空頭排列", "10 月的谷底之後，年底開始出現小小的反彈"]},
    {"slug": "2023-ai-server", "emoji": "🤖", "short": "2023 AI 伺服器", "code": "2382",
     "start": "2023-01-01", "end": "2023-12-31",
     "title": "2023 AI 伺服器雲霄飛車：廣達 2382 衝上天",
     "kw": "AI概念股,AI伺服器,廣達股價,2382,ChatGPT概念股,輝達供應鏈",
     "lede": "ChatGPT 爆紅，輝達供應鏈全面噴發。廣達從老牌代工廠變身 AI 飆股，這趟坡度很陡。",
     "story": ["2022 年底 ChatGPT 推出，2023 年 AI 成為全球最熱門的投資題材，台灣的伺服器代工廠被視為輝達的重要供應鏈。",
               "廣達、緯創、緯穎等 AI 伺服器概念股在 2023 年上半年連番大漲，成交量暴增，廣達股價一年內翻了一倍以上。",
               "題材股坐起來特別刺激：上漲時又快又陡，熱度退了也跌得很急。"],
     "watch": ["5 月到 7 月那段幾乎垂直的紅色爬坡", "暴量那天的台北 101", "高點後的劇烈震盪，車廂會一直有人上車下車"]},
    {"slug": "2024-tsmc-1000", "emoji": "🏔️", "short": "2024 台積電破千", "code": "2330",
     "start": "2024-01-01", "end": "2024-12-31",
     "title": "2024 台積電破千雲霄飛車：護國神山登頂千元",
     "kw": "台積電破千,台積電1000元,台積電2024,護國神山,台積電股價走勢",
     "lede": "AI 晶片訂單滿到溢出，台積電 7 月首度站上千元。坐一趟看看護國神山怎麼一路爬上去。",
     "story": ["AI 晶片需求大爆發，先進製程與先進封裝產能供不應求，台積電成為全球市值最大的半導體公司之一。",
               "2024 年 7 月台積電股價首度站上 1,000 元，「千金股」台積電成了全台灣最常被討論的話題。",
               "這趟整體是上坡，但中間也有好幾段急煞俯衝，提醒你就算是神山也不會天天漲。"],
     "watch": ["上半年的長上坡", "7 月破千前後的高點旗", "8 月初全球股市急跌時的那段俯衝"]},
    {"slug": "2025-tariff-crash", "emoji": "📦", "short": "2025 關稅股災", "code": "0050",
     "start": "2025-03-01", "end": "2025-07-31",
     "title": "2025 關稅股災雲霄飛車：台股史上最大單日跌點",
     "kw": "關稅股災,2025股災,對等關稅,台股史上最大跌點,0050 2025,台股崩盤",
     "lede": "美國宣布對等關稅，台股 4 月 7 日單日重挫超過 2,000 點，接著又一路反彈。超短距離的大落差。",
     "story": ["2025 年 4 月初美國宣布大規模「對等關稅」，全球股市恐慌性下跌。清明連假結束後開盤，台股加權指數單日跌超過 2,000 點，創下史上最大單日跌點。",
               "之後關稅陸續宣布暫緩、協商，市場情緒慢慢回穩，台股在幾個月內收復大部分跌幅。",
               "這趟期間很短，但落差非常大：一兩天內的俯衝，要花好幾週慢慢爬回來。"],
     "watch": ["4 月初連續的超陡俯衝，可能會出現跌停標示", "谷底之後的反彈坡度", "0050 在 2025 年有股票分割，軌道已經自動還原，不會看到假的斷崖"]},
    {"slug": "tsmc-10-years", "emoji": "🚄", "short": "台積電十年", "code": "2330",
     "start": "2016-01-01", "end": "2025-12-31",
     "title": "台積電十年雲霄飛車：2016 到 2025 一次坐完",
     "kw": "台積電十年,台積電長期投資,台積電歷史股價,2330歷史,台積電存股",
     "lede": "從一百多元到千元以上，十年的護國神山一次坐完。長期投資到底是什麼感覺？坐了就知道。",
     "story": ["過去十年，台積電從智慧型手機晶片一路做到 AI 晶片，成為全球晶圓代工的龍頭。",
               "長期來看是一條往上的長坡，但中間有 2018 年貿易戰、2020 年疫情、2022 年升息等好幾次大回檔。",
               "坐完再看「最大回檔」的數字：就算是十年大漲的股票，中途也要撐過好幾次心臟很痛的下坡。"],
     "watch": ["期間很長，會自動改用週 K，軌道比較平順", "2022 年那段明顯的下坡", "2023 年之後坡度變陡，這是 AI 行情"]},
]
RIDE_BY_SLUG = {r["slug"]: r for r in RIDES}

# ---------- 主題清單（人工挑選，不會過期） ----------
THEMES = [
    {"slug": "high-dividend-etf", "emoji": "💰", "name": "高股息 ETF",
     "title": "高股息 ETF 雲霄飛車：0056、00878、00919 哪一台最平穩？",
     "kw": "高股息ETF,高股息ETF比較,0056,00878,00919,00929,00940,存股ETF,月配息ETF",
     "intro": "存股族最愛的高股息 ETF，坐起來到底是平穩的觀光列車，還是一樣會俯衝？挑一檔發車，比比看哪一台最不暈。",
     "codes": ["0056", "00878", "00919", "00929", "00940", "00713", "00915", "00918", "00934", "00939"]},
    {"slug": "market-cap-etf", "emoji": "🇹🇼", "name": "市值型 ETF",
     "title": "市值型 ETF 雲霄飛車：0050、006208 跟著台股大盤走",
     "kw": "市值型ETF,0050,006208,台灣50,大盤ETF,ETF推薦,定期定額",
     "intro": "市值型 ETF 買的是台灣市值最大的一群公司，走勢跟大盤很像。想知道「買大盤」坐起來是什麼感覺，從這裡開始。",
     "codes": ["0050", "006208", "00692", "00850", "00922", "00923"]},
    {"slug": "ai-concept", "emoji": "🤖", "name": "AI 伺服器概念股",
     "title": "AI 概念股雲霄飛車：廣達、緯創、緯穎、鴻海誰最刺激？",
     "kw": "AI概念股,AI伺服器概念股,輝達供應鏈,廣達,緯創,緯穎,鴻海,散熱股",
     "intro": "AI 熱潮下最會飆的一群：伺服器代工、散熱、電源、ASIC 設計服務。坡度陡、震幅大，最適合玩遊戲模式。",
     "codes": ["2382", "3231", "6669", "2317", "2356", "2376", "3017", "3324", "2308", "5274", "3661", "3443", "2345", "2368", "2383"]},
    {"slug": "semiconductor", "emoji": "🔬", "name": "半導體權值股",
     "title": "半導體股雲霄飛車：台積電、聯發科、聯電、日月光一次坐",
     "kw": "半導體股,半導體概念股,台積電,聯發科,聯電,日月光,IC設計,記憶體股",
     "intro": "台股的心臟就在這裡：晶圓代工、IC 設計、封測、矽晶圓、記憶體。護國神山和它的好朋友們，一檔一檔坐過去。",
     "codes": ["2330", "2454", "2303", "3711", "6488", "2379", "3034", "5347", "6770", "3529", "8299", "2408", "2344"]},
    {"slug": "shipping", "emoji": "🚢", "name": "航運股",
     "title": "航運股雲霄飛車：長榮、陽明、萬海航海三雄 + 航空股",
     "kw": "航運股,航海三雄,長榮,陽明,萬海,貨櫃航運,航空股,長榮航,華航",
     "intro": "景氣循環股的代表，坐起來特別有感：運價好的時候一路衝天，運價回落就整車俯衝。另附航空股，看看飛機和貨櫃誰比較會飛。",
     "codes": ["2603", "2609", "2615", "2618", "2610", "2637", "2606", "2645"]},
    {"slug": "financial", "emoji": "🏦", "name": "金融股",
     "title": "金融股雲霄飛車：富邦金、國泰金、中信金、兆豐金存股路線",
     "kw": "金融股,金控股,存股,富邦金,國泰金,中信金,兆豐金,玉山金,官股金控",
     "intro": "存股族的老朋友。金控股通常坡度比較緩，但遇到升降息、股債市大動盪，一樣會讓人抓緊扶手。",
     "codes": ["2881", "2882", "2891", "2886", "2884", "2892", "5880", "2880", "2885", "2887", "2890", "2883", "2801"]},
    {"slug": "defensive", "emoji": "🛡️", "name": "電信與防禦型股",
     "title": "防禦型股票雲霄飛車：中華電、台灣大、遠傳、統一超有多平穩？",
     "kw": "防禦型股票,電信三雄,中華電,台灣大,遠傳,統一超,牛皮股,穩定配息",
     "intro": "號稱「牛皮股」的一群，平常幾乎不太動。坐這幾台可以當作對照組，感受一下什麼叫低波動。",
     "codes": ["2412", "3045", "4904", "2912", "1216", "2207"]},
    {"slug": "old-economy", "emoji": "🏭", "name": "傳產龍頭",
     "title": "傳產股雲霄飛車：台塑四寶、中鋼、台泥、統一的長路線",
     "kw": "傳產股,台塑四寶,台塑,南亞,台化,台塑化,中鋼,台泥,傳產龍頭",
     "intro": "塑化、鋼鐵、水泥、食品，台灣經濟的老班底。跟著景氣循環上上下下，十年線坐起來很有故事。",
     "codes": ["1301", "1303", "1326", "6505", "2002", "1101", "1216", "9910", "9904", "2105", "1476"]},
]
THEME_BY_SLUG = {t["slug"]: t for t in THEMES}

# 個股小註解（主題頁卡片與個股頁會用到）
NOTES = {
    "2330": "護國神山，全球晶圓代工龍頭，台股市值第一", "2454": "IC 設計龍頭，手機晶片與 ASIC", "2303": "老牌晶圓代工，成熟製程為主",
    "3711": "全球封測龍頭", "6488": "矽晶圓大廠", "2379": "網通與音訊 IC 設計", "3034": "面板驅動 IC 設計", "5347": "8 吋晶圓代工",
    "6770": "記憶體與晶圓代工", "3529": "矽智財（IP）授權", "8299": "NAND 快閃記憶體控制晶片", "2408": "DRAM 記憶體", "2344": "利基型記憶體",
    "2382": "筆電代工轉型 AI 伺服器", "3231": "AI 伺服器與筆電代工", "6669": "雲端資料中心伺服器", "2317": "全球最大電子代工，AI 伺服器也很強",
    "2356": "伺服器與筆電代工", "2376": "主機板、顯示卡與伺服器", "3017": "散熱模組", "3324": "散熱模組", "2308": "電源與散熱、工業自動化",
    "5274": "伺服器遠端管理晶片，高價股常客", "3661": "ASIC 設計服務", "3443": "ASIC 設計服務", "2345": "高速網通交換器", "2368": "伺服器用 PCB",
    "2383": "高階銅箔基板",
    "0050": "台灣市值前 50 大公司，最經典的 ETF", "006208": "同樣追蹤台灣 50 指數，管理費較低", "00692": "公司治理評鑑佳的企業",
    "00850": "ESG 永續主題市值型", "00922": "領袖 50 指數", "00923": "ESG 低碳 50 指數",
    "0056": "最老牌的高股息 ETF", "00878": "ESG 永續高股息，季配息", "00919": "精選高息，季配息", "00929": "科技優息，月配息",
    "00940": "價值高息，月配息", "00713": "高息低波動", "00915": "優選高股息 30", "00918": "優利高填息 30", "00934": "成長高股息",
    "00939": "高息動能",
    "2603": "貨櫃航運龍頭之一，航海王代表", "2609": "貨櫃航運", "2615": "貨櫃航運，亞洲航線為主", "2618": "航空客運與貨運",
    "2610": "國籍航空", "2637": "散裝航運", "2606": "散裝航運", "2645": "飛機維修",
    "2881": "金控，旗下有壽險、銀行、證券", "2882": "金控，國內最大壽險之一", "2891": "金控，銀行業務強", "2886": "官股金控，存股人氣高",
    "2884": "金控，數位金融起步早", "2892": "官股金控", "5880": "官股金控", "2880": "官股金控", "2885": "金控，證券業務龍頭",
    "2887": "台新與新光合併後的金控", "2890": "金控", "2883": "金控", "2801": "官股銀行",
    "2412": "電信龍頭，低波動代表", "3045": "電信與有線電視", "4904": "電信", "2912": "便利商店龍頭", "1216": "食品與通路集團",
    "2207": "汽車代理龍頭", "1301": "台塑四寶之一", "1303": "台塑四寶之一", "1326": "台塑四寶之一", "6505": "台塑四寶之一，煉油",
    "2002": "鋼鐵龍頭", "1101": "水泥龍頭", "9910": "運動鞋代工", "9904": "運動鞋代工", "2105": "輪胎大廠", "1476": "機能布料",
}

# ---------- 產業：FinMind 的產業別整併成好記的網址 ----------
INDUSTRIES = [
    ("semiconductor-industry", "半導體業", ["半導體業"]), ("electronics", "電子工業", ["電子工業"]),
    ("electronic-components", "電子零組件", ["電子零組件業"]), ("computer", "電腦及週邊設備", ["電腦及週邊設備業"]),
    ("optoelectronics", "光電業", ["光電業"]), ("networking", "通信網路業", ["通信網路業"]),
    ("electronic-distribution", "電子通路業", ["電子通路業"]), ("it-services", "資訊服務業", ["資訊服務業"]),
    ("other-electronics", "其他電子業", ["其他電子類", "其他電子業"]), ("cloud", "數位雲端", ["數位雲端", "數位雲端類"]),
    ("biotech", "生技醫療", ["生技醫療業", "化學生技醫療"]), ("finance", "金融保險", ["金融保險", "金融業"]),
    ("shipping-industry", "航運業", ["航運業"]), ("machinery", "電機機械", ["電機機械"]), ("construction", "建材營造", ["建材營造"]),
    ("steel", "鋼鐵工業", ["鋼鐵工業"]), ("textile", "紡織纖維", ["紡織纖維"]), ("tourism", "觀光餐旅", ["觀光餐旅", "觀光事業"]),
    ("auto", "汽車工業", ["汽車工業"]), ("food", "食品工業", ["食品工業"]), ("plastics", "塑膠工業", ["塑膠工業"]),
    ("chemical", "化學工業", ["化學工業"]), ("green-energy", "綠能環保", ["綠能環保", "綠能環保類"]),
    ("culture", "文化創意業", ["文化創意業"]), ("home", "居家生活", ["居家生活", "居家生活類"]),
    ("sports", "運動休閒", ["運動休閒", "運動休閒類"]), ("trading", "貿易百貨", ["貿易百貨"]), ("cable", "電器電纜", ["電器電纜"]),
    ("rubber", "橡膠工業", ["橡膠工業"]), ("energy", "油電燃氣業", ["油電燃氣業"]), ("paper", "造紙工業", ["造紙工業"]),
    ("cement", "水泥工業", ["水泥工業"]), ("glass", "玻璃陶瓷", ["玻璃陶瓷"]), ("agritech", "農業科技業", ["農業科技業"]),
    ("etf", "ETF", ["ETF", "上櫃ETF", "上櫃指數股票型基金(ETF)"]),
]
IND_BY_SLUG = {s: (s, n, raw) for s, n, raw in INDUSTRIES}
RAW_TO_IND = {r: (s, n) for s, n, raw in INDUSTRIES for r in raw}

# ---------- 股市名詞小教室：用雲霄飛車比喻 ----------
GLOSSARY = [
    ("K 線", "k-line", "把一天的開盤、收盤、最高、最低畫成一根蠟燭。這裡把每天的收盤價連起來，直接鋪成雲霄飛車軌道。"),
    ("漲停／跌停", "limit", "台股單日漲跌幅上限是 10%。碰到漲停就像火箭發射，碰到跌停就是整車一起尖叫俯衝，畫面上會特別標示。"),
    ("除權息", "ex-dividend", "公司發股利後，股價會在除權息當天往下扣掉。軌道上會看到一個缺口，我們會標成「除權息缺口」，不會誤判成跌停。"),
    ("填息", "fill-gap", "除息後股價漲回除息前的價位，就叫填息。像列車掉進坑之後又爬回原本的高度。"),
    ("股票分割", "split", "把一股拆成好幾股，股價等比例變小，總價值不變。0050 在 2025 年就做過分割，軌道已自動還原，不會出現假的斷崖。"),
    ("成交量", "volume", "一天交易了多少股。量越大，軌道底下的樓蓋得越高；期間內成交量最大那天會蓋出台北 101。"),
    ("均線", "moving-average", "過去 N 天收盤價的平均，例如 20 日線（月線）、60 日線（季線）。股價站在均線上面，通常代表趨勢偏多。"),
    ("黃金交叉／死亡交叉", "cross", "短天期均線往上穿過長天期均線叫黃金交叉，往下穿叫死亡交叉。很多人拿來當進出場的參考訊號。"),
    ("RSI", "rsi", "相對強弱指標，0 到 100。一般高於 70 算過熱、低於 30 算超賣。AI 走勢推演會把它當成其中一個訊號。"),
    ("波動率", "volatility", "股價上下晃的程度。波動率越高，軌道越像大怒神；越低就越像兒童列車。"),
    ("最大回檔（MDD）", "mdd", "從期間最高點跌到之後最低點的幅度。坐完每一趟都會告訴你，這是衡量「心臟要多強」最直接的數字。"),
    ("創新高", "new-high", "股價突破期間內的最高價。每創一次新高，軌道上就插一支旗子，還會有人追高上車、車廂越接越長。"),
    ("多頭／空頭", "bull-bear", "多頭是整體趨勢往上（牛市），空頭是往下（熊市）。多頭像一路爬坡，空頭像一階一階往下的樓梯。"),
    ("盤整", "consolidation", "股價在一個區間裡來回晃，沒有明確方向。坐起來像平地上的小起伏，最容易讓人打瞌睡。"),
    ("V 型反轉", "v-reversal", "急跌之後馬上急漲，走勢像英文字母 V。2020 年疫情股災就是經典例子。"),
    ("跳空缺口", "gap", "今天的開盤價跟昨天的收盤價中間有一段沒成交的空白，軌道上會看到一小段落差。"),
    ("追高殺低", "chase", "漲了才敢買、跌了趕快賣，結果買在高點、賣在低點。車上的散戶上車下車，就是在演這個。"),
    ("停損", "stop-loss", "設定一個跌幅，跌到就先賣出，避免越賠越多。像在雲霄飛車上先決定好「掉到哪裡就下車」。"),
    ("韭菜", "leek", "網路用語，指容易追高殺低、被割了又長回來的散戶。車上那顆綠色的蔬菜乘客就是在致敬他們。"),
    ("存股", "dividend-investing", "長期持有穩定配息的股票或 ETF，靠股利累積資產。想看存股的路線，可以坐高股息 ETF 或金融股。"),
    ("定期定額", "dca", "每個月固定投入一筆錢，不管漲跌都買，長期攤平成本。適合坐十年線看看效果。"),
    ("ETF", "etf", "指數股票型基金，一次買進一籃子股票。0050 是台灣 50 大，0056、00878 是高股息。"),
    ("上市／上櫃", "listing", "上市股票在證交所交易，上櫃股票在櫃買中心交易。兩種這裡都能坐。"),
    ("權值股", "heavyweight", "市值很大、對大盤指數影響很大的股票，例如台積電。它一動，整個台股都會跟著晃。"),
    ("景氣循環股", "cyclical", "獲利跟著景氣大起大落的產業，例如航運、鋼鐵、塑化、記憶體。坐起來落差特別大。"),
]

LEARN_FAQ = [
    ("最大回檔（MDD）是什麼？", GLOSSARY[10][2]),
    ("除權息當天股價為什麼會下跌？", GLOSSARY[2][2]),
    ("漲停和跌停是多少？", GLOSSARY[1][2]),
    ("韭菜是什麼意思？", GLOSSARY[18][2]),
    ("均線是什麼？月線、季線怎麼看？", GLOSSARY[6][2]),
]


# ---------- 共用 ----------
def _breadcrumb(site, items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)]}


def _faq(pairs):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in pairs]}


def _card(code, stocks, prefix, note=True):
    info = stocks.get(code)
    if not info:
        return ""
    n = NOTES.get(code) if note else ""
    mk = MARKET.get(info.get("market"), "")
    sub = " · ".join(x for x in (code, mk, n) if x)
    return f'<a class="card" href="{prefix}{code}/"><b>{_e(info["name"])}</b><small>{_e(sub)}</small><span class="go">發車 →</span></a>'


def themes_of(code):
    return [t for t in THEMES if code in t["codes"]]


def rides_of(code):
    return [r for r in RIDES if r["code"] == code]


def ride_url(prefix, r):
    return f'{prefix}ride/{r["slug"]}/'


def nav_html(prefix):
    """首頁與個股頁底下的長青內容入口。"""
    rides = "".join(f'<li><a href="{ride_url(prefix, r)}">{r["emoji"]} {_e(r["short"])}</a></li>' for r in RIDES)
    themes = "".join(f'<li><a href="{prefix}theme/{t["slug"]}/">{t["emoji"]} {_e(t["name"])}</a></li>' for t in THEMES)
    return (f'<h3>經典名場面：一鍵重溫</h3><ul class="stock-links">{rides}</ul>'
            f'<h3>主題路線</h3><ul class="stock-links">{themes}</ul>'
            f'<p><a href="{prefix}industry/">📂 依產業找股票</a>・<a href="{prefix}learn/">📖 股市名詞小教室</a>・'
            f'<a href="{prefix}ride/">🎢 所有經典名場面</a></p>'
            f'<p class="legal"><a href="{prefix}about/">關於本站</a>・<a href="{prefix}disclaimer/">免責聲明</a>・<a href="{prefix}privacy/">隱私權說明</a></p>')


PAGE = """<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  {head}
  <link rel="icon" href="{p}favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="{p}icon-180.png" />
  <link rel="stylesheet" href="{p}page.css" />
  <script>
    (function () {{
      var t = null;
      try {{ t = localStorage.getItem('stockcoaster.theme'); }} catch (e) {{}}
      if (!t) {{ var h = (new Date().getUTCHours() + 8) % 24; t = h >= 6 && h < 18 ? 'light' : 'dark'; }}
      document.documentElement.dataset.theme = t;
    }})();
  </script>
</head>
<body>
  <header class="top"><a class="brand" href="{p}"><img src="{p}favicon.svg" alt="" width="28" height="28"> 股市雲霄飛車</a>
    <nav><a href="{p}ride/">名場面</a><a href="{p}theme/">主題</a><a href="{p}learn/">小教室</a><a href="{p}about/">關於</a></nav></header>
  <main>
    <nav class="crumbs">{crumbs}</nav>
    <h1>{h1}</h1>
    <p class="lede">{lede}</p>
    {body}
  </main>
  <footer>
    <p>股價資料來自 Yahoo Finance 與 FinMind 公開資料，AI 走勢推演為統計推估，純屬娛樂，不構成投資建議。</p>
    <p><a href="{p}about/">關於本站</a>・<a href="{p}disclaimer/">免責聲明</a>・<a href="{p}privacy/">隱私權說明</a></p>
    <p><a href="{sectools}" target="_blank" rel="noopener">🧰 SecTools.tw</a>：火車駕駛、飛行模擬、資安扭蛋機……更多免費小遊戲，免註冊隨點即玩</p>
  </footer>
</body>
</html>
"""


def _page(site, path, prefix, title, desc, kw, h1, lede, body, crumbs, ld):
    url = site + path
    head = meta_head(site, title, desc, url, kw, ld + [_breadcrumb(site, [(n, site + u) for n, u in crumbs])])
    cr = " › ".join(f'<a href="{prefix}{u}">{_e(n)}</a>' for n, u in crumbs[:-1]) + f" › <span>{_e(crumbs[-1][0])}</span>"
    return PAGE.format(head=head, p=prefix, crumbs=cr, h1=_e(h1), lede=lede, body=body, sectools=SECTOOLS)


# ---------- 經典名場面 ----------
def render_ride(template, site, slug, stocks):
    r = RIDE_BY_SLUG[slug]
    prefix = "../../"
    info = stocks.get(r["code"]) or {"name": KNOWN.get(r["code"], r["code"])}
    name = info["name"]
    url = f"{site}ride/{slug}/"
    desc = f'{r["lede"]}免費線上重溫 {r["start"][:4]} 年{name}（{r["code"]}）的走勢，像素雲霄飛車一鍵發車。'
    ld = [{"@context": "https://schema.org", "@type": "WebPage", "name": r["title"], "url": url, "description": desc,
           "inLanguage": "zh-TW", "about": {"@type": "Thing", "name": r["short"]}},
          _breadcrumb(site, [("股市雲霄飛車", site), ("經典名場面", f"{site}ride/"), (r["short"], url)])]
    head = meta_head(site, f'{r["title"]} – 股市雲霄飛車', desc, url, r["kw"] + f',{name},{r["code"]},股市雲霄飛車', ld)
    others = "".join(f'<li><a href="../{o["slug"]}/">{o["emoji"]} {_e(o["short"])}</a></li>' for o in RIDES if o["slug"] != slug)
    about = (f'<h2>{_e(r["title"])}</h2>' + "".join(f"<p>{_e(p)}</p>" for p in r["story"])
             + "<h3>坐的時候注意看</h3><ul>" + "".join(f"<li>{_e(w)}</li>" for w in r["watch"]) + "</ul>"
             + f'<p>期間：{r["start"]} → {r["end"]}。想看{_e(name)}最新走勢？<a href="{prefix}{r["code"]}/">坐{_e(name)}近一年路線</a>。</p>'
             + f'<h3>其他經典名場面</h3><ul class="stock-links">{others}</ul>'
             + f'<p><a href="{prefix}learn/">📖 看不懂術語？股市名詞小教室</a></p>')
    return render_app(template, head=head, h1=_e(r["title"]), sub=_e(r["lede"]), about=about, prefix=prefix,
                      attrs=f'data-code="{r["code"]}" data-start="{r["start"]}" data-end="{r["end"]}" data-ride="{slug}"')


def render_ride_index(site, stocks):
    p = "../"
    cards = "".join(
        f'<a class="card" href="{r["slug"]}/"><b>{r["emoji"]} {_e(r["short"])}</b>'
        f'<small>{_e((stocks.get(r["code"]) or {"name": r["code"]})["name"])} {r["code"]} · {r["start"][:7]} → {r["end"][:7]}</small>'
        f'<span>{_e(r["lede"])}</span><span class="go">重溫 →</span></a>' for r in RIDES)
    body = f'<div class="grid">{cards}</div>' + _more(p)
    return _page(site, "ride/", p, "台股經典名場面：金融海嘯、疫情股災、航海王、台積電破千 – 股市雲霄飛車",
                 "2008 金融海嘯、2020 疫情股災、2021 航海王、2022 升息熊市、2024 台積電破千、2025 關稅股災……台股歷史上最刺激的幾段走勢，做成像素雲霄飛車一鍵重溫。",
                 "台股歷史,股災,金融海嘯,疫情股災,航海王,台積電破千,關稅股災,台股名場面",
                 "台股經典名場面", "台股最刺激的幾段歷史走勢，鋪成雲霄飛車讓你一鍵重溫。坐過一次，比讀十篇新聞還有感。",
                 body, [("股市雲霄飛車", ""), ("經典名場面", "ride/")],
                 [{"@context": "https://schema.org", "@type": "ItemList", "itemListElement": [
                     {"@type": "ListItem", "position": i + 1, "name": r["title"], "url": f'{site}ride/{r["slug"]}/'} for i, r in enumerate(RIDES)]}])


# ---------- 主題 ----------
def render_theme(site, slug, stocks):
    t = THEME_BY_SLUG[slug]
    p = "../../"
    codes = [c for c in t["codes"] if c in stocks]
    names = "、".join(stocks[c]["name"] for c in codes[:4])
    cards = "".join(_card(c, stocks, p) for c in codes)
    other = "".join(f'<li><a href="../{o["slug"]}/">{o["emoji"]} {_e(o["name"])}</a></li>' for o in THEMES if o["slug"] != slug)
    body = (f'<p class="cta"><a class="btn" href="{p}{codes[0]}/">🎢 從 {_e(stocks[codes[0]]["name"])} 開始發車</a></p>'
            f'<h2>{_e(t["name"])}清單</h2><div class="grid">{cards}</div>'
            f'<h2>怎麼比較這些路線？</h2><p>每一檔都可以切換近 3 個月到 10 年的期間。坐完會看到期間報酬、最大回檔、創新高次數和單日最大漲跌，'
            f'把同一個期間的幾檔各坐一次，就知道誰比較平穩、誰比較刺激。</p>'
            f'<h2>其他主題</h2><ul class="links">{other}</ul>' + _more(p))
    ld = [{"@context": "https://schema.org", "@type": "ItemList", "name": t["name"], "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": f'{stocks[c]["name"]} {c}', "url": f"{site}{c}/"} for i, c in enumerate(codes)]}]
    return _page(site, f"theme/{slug}/", p, f'{t["title"]} – 股市雲霄飛車',
                 f'{t["intro"]}收錄{names}等 {len(codes)} 檔，股價走勢變成像素雲霄飛車，免費免註冊。',
                 t["kw"] + ",股市雲霄飛車", t["title"], _e(t["intro"]), body,
                 [("股市雲霄飛車", ""), ("主題路線", "theme/"), (t["name"], f"theme/{slug}/")], ld)


def render_theme_index(site, stocks):
    p = "../"
    cards = "".join(
        f'<a class="card" href="{t["slug"]}/"><b>{t["emoji"]} {_e(t["name"])}</b>'
        f'<small>{_e("、".join(stocks[c]["name"] for c in t["codes"][:4] if c in stocks))}…</small>'
        f'<span>{_e(t["intro"])}</span><span class="go">看清單 →</span></a>' for t in THEMES)
    return _page(site, "theme/", p, "台股主題路線：高股息 ETF、AI 概念股、半導體、航運、金融股 – 股市雲霄飛車",
                 "高股息 ETF、市值型 ETF、AI 伺服器概念股、半導體、航運、金融、防禦型與傳產龍頭，依主題整理好的台股清單，每一檔都能坐成雲霄飛車比比看。",
                 "台股主題,概念股,高股息ETF,AI概念股,半導體股,航運股,金融股,存股清單",
                 "台股主題路線", "不知道要坐哪一檔？從主題挑起。同一個主題的股票各坐一趟，誰平穩、誰刺激一目了然。",
                 f'<div class="grid">{cards}</div>' + _more(p), [("股市雲霄飛車", ""), ("主題路線", "theme/")], [])


# ---------- 產業 ----------
def _industry_members(stocks, raw):
    return sorted((c for c, v in stocks.items() if v.get("industry") in raw), key=lambda c: (c not in KNOWN and c not in NOTES, c))


def render_industry(site, slug, stocks):
    _, name, raw = IND_BY_SLUG[slug]
    p = "../../"
    codes = _industry_members(stocks, raw)
    top = codes[:24]
    rest = codes[24:]
    names = "、".join(stocks[c]["name"] for c in codes[:5])
    body = (f'<h2>{_e(name)}人氣路線</h2><div class="grid">{"".join(_card(c, stocks, p) for c in top)}</div>'
            + (f'<h2>全部 {len(codes)} 檔</h2><ul class="links small">'
               + "".join(f'<li><a href="{p}{c}/">{_e(stocks[c]["name"])} <small>{c}</small></a></li>' for c in rest) + "</ul>" if rest else "")
            + f'<p><a href="../">← 看其他產業</a></p>' + _more(p))
    return _page(site, f"industry/{slug}/", p, f"{name}股票有哪些？{len(codes)} 檔{name}股價走勢雲霄飛車 – 股市雲霄飛車",
                 f"台股{name}共 {len(codes)} 檔上市櫃股票，包含{names}等。每一檔的股價走勢都能變成像素雲霄飛車，免費免註冊。",
                 f"{name},{name}股票,{name}概念股,{name}股價,台股產業,股市雲霄飛車",
                 f"{name}股票清單", f"台股{_e(name)}共 {len(codes)} 檔，點任何一檔就能把它的股價走勢坐成雲霄飛車。",
                 body, [("股市雲霄飛車", ""), ("產業分類", "industry/"), (name, f"industry/{slug}/")], [])


def render_industry_index(site, stocks):
    p = "../"
    items = []
    for slug, name, raw in INDUSTRIES:
        n = len(_industry_members(stocks, raw))
        if n:
            items.append(f'<li><a href="{slug}/">{_e(name)} <small>{n} 檔</small></a></li>')
    return _page(site, "industry/", p, "台股產業分類：半導體、電子、金融、航運、生技股票清單 – 股市雲霄飛車",
                 "依產業整理全部上市櫃股票與 ETF：半導體、電子零組件、電腦週邊、金融保險、航運、生技醫療、鋼鐵、塑膠……點進去就能把股價走勢坐成雲霄飛車。",
                 "台股產業分類,產業股票清單,半導體股票,金融股清單,航運股清單,生技股",
                 "台股產業分類", "全部上市櫃股票與 ETF，依產業分好類。找到想坐的那一檔，點下去就發車。",
                 f'<ul class="links">{"".join(items)}</ul>' + _more(p), [("股市雲霄飛車", ""), ("產業分類", "industry/")], [])


# ---------- 小教室 ----------
def render_learn(site, stocks):
    p = "../"
    terms = "".join(f'<section class="term" id="{a}"><h2>{_e(t)}</h2><p>{_e(d)}</p></section>' for t, a, d in GLOSSARY)
    toc = "".join(f'<a href="#{a}">{_e(t)}</a>' for t, a, _ in GLOSSARY)
    body = (f'<nav class="toc">{toc}</nav>{terms}'
            f'<h2>實際坐一趟最快懂</h2><p>看完名詞，直接去坐：<a href="{p}2330/">台積電 2330</a>、<a href="{p}0050/">0050</a>、'
            f'<a href="{p}ride/2020-covid-crash/">2020 疫情股災的 V 型反轉</a>、<a href="{p}ride/2022-rate-hike-bear/">2022 升息熊市</a>。</p>' + _more(p))
    ld = [{"@context": "https://schema.org", "@type": "DefinedTermSet", "name": "股市名詞小教室", "inLanguage": "zh-TW",
           "hasDefinedTerm": [{"@type": "DefinedTerm", "name": t, "description": d, "url": f"{site}learn/#{a}"} for t, a, d in GLOSSARY]},
          _faq(LEARN_FAQ)]
    return _page(site, "learn/", p, "股市名詞小教室：K 線、除權息、最大回檔、韭菜是什麼？用雲霄飛車秒懂 – 股市雲霄飛車",
                 "K 線、漲停跌停、除權息、填息、均線、RSI、波動率、最大回檔、多頭空頭、追高殺低、韭菜、存股、定期定額……新手常見的股市名詞，用雲霄飛車比喻一次看懂。",
                 "股市名詞,股票術語,K線是什麼,除權息是什麼,最大回檔,MDD,韭菜意思,均線,RSI,股票新手",
                 "股市名詞小教室", "看盤常聽到的那些名詞，換成雲霄飛車來講就簡單多了。",
                 body, [("股市雲霄飛車", ""), ("股市名詞小教室", "learn/")], ld)


# ---------- 關於、免責聲明、隱私權 ----------
def _sec(title, paras):
    return f"<h2>{_e(title)}</h2>" + "".join(p if p.startswith("<") else f"<p>{_e(p)}</p>" for p in paras)


def render_about(site, stocks):
    p = "../"
    body = (
        _sec("這是什麼？", [
            "股市雲霄飛車（StockCoaster）把台股的歷史股價直接鋪成一條像素風雲霄飛車軌道。上漲是喀喀喀慢慢爬坡，下跌是整車一起尖叫俯衝；"
            "成交量變成軌道底下的台灣街景，量越大樓蓋得越高，爆量那天還會出現一棟台北 101。",
            "我們想做的事很簡單：讓看盤不再只是一堆數字和 K 線，而是一趟坐過就記得的旅程。漲跌幅、最大回檔、創新高這些概念，坐一次比讀十篇文章還有感。"])
        + _sec("怎麼玩？", [
            "<ol><li>選一檔股票或 ETF：熱門路線、自己輸入代號，或從<a href=\"" + p + "ride/\">經典名場面</a>挑一段歷史。</li>"
            "<li>選期間：近 3 個月到 10 年，或自訂起訖日期。</li>"
            "<li>按「發車！」。預設是自動觀賞，放著看就好；想挑戰可以切到遊戲模式，點畫面跳躍、撿金幣紅包、閃利空炸彈。</li>"
            "<li>坐車時點下方小地圖，可以跳到任一天。</li>"
            "<li>到終點後選擇「一飛衝天」或「直接掉下去」，然後看結算：期間報酬、最大回檔、創新高次數、尖叫次數。</li></ol>"])
        + _sec("畫面上的東西代表什麼", [
            "<ul><li><b>紅色軌道</b>：上漲；<b>綠色軌道</b>：下跌（台股習慣紅漲綠跌）。</li>"
            "<li><b>紫色軌道</b>：駛過「今天」之後的 AI 走勢推演，是模擬出來的可能走勢，不是真實股價。</li>"
            "<li><b>軌道下的大樓</b>：當天成交量，期間內最大量那天會蓋出台北 101。</li>"
            "<li><b>旗子</b>：創新高；<b>車廂變多</b>：有人追高上車；<b>車廂掉下去</b>：大跌時有人停損下車。</li>"
            "<li><b>除權息缺口</b>：單日變動超過漲跌幅限制，多半是除權息或減資，會特別標示，不算跌停。</li></ul>"])
        + _sec("資料從哪裡來", [
            "股價來自 FinMind 與 Yahoo Finance 的公開台股資料，上市櫃股票清單來自 FinMind。資料在每個交易日收盤後更新，可能有延遲或錯誤。",
            "股票分割（例如 0050 在 2025 年的分割）會自動還原，避免軌道出現假的斷崖。期間超過三年時改用週資料，軌道比較平順。"])
        + _sec("AI 走勢推演怎麼算", [
            "用近期報酬估計波動度（EWMA），跑 600 條蒙地卡羅模擬，取未來 30 個交易日的中位數與 80% 區間，"
            "再參考均線、RSI 與近月動能給出「偏多／偏空／中性」的描述。",
            "它是統計推估，本質上是把過去的波動延伸出去，無法預知新聞、財報或任何突發事件，純屬娛樂。"])
        + _sec("誰做的", [
            f'股市雲霄飛車是 <a href="{SECTOOLS}" target="_blank" rel="noopener">SecTools.tw</a> 的作品之一。'
            "SecTools 做各種免費、免安裝、免註冊的小工具和小遊戲，例如火車駕駛模擬、飛行模擬、資安扭蛋機。有任何建議或發現資料錯誤，歡迎透過 SecTools.tw 回報。"])
        + f'<p>相關說明：<a href="{p}disclaimer/">免責聲明</a>・<a href="{p}privacy/">隱私權說明</a></p>' + _more(p))
    ld = [{"@context": "https://schema.org", "@type": "AboutPage", "name": "關於股市雲霄飛車", "url": f"{site}about/", "inLanguage": "zh-TW",
           "publisher": {"@type": "Organization", "name": "SecTools.tw", "url": "https://sectools.tw/"}}]
    return _page(site, "about/", p, "關於股市雲霄飛車：把台股走勢變成像素雲霄飛車 – 股市雲霄飛車",
                 "股市雲霄飛車是什麼、怎麼玩、畫面代表什麼、股價資料來源與 AI 走勢推演的計算方式。由 SecTools.tw 製作，免費免註冊。",
                 "股市雲霄飛車,StockCoaster,關於,使用說明,台股走勢,SecTools",
                 "關於股市雲霄飛車", "把台股走勢變成一趟坐過就記得的雲霄飛車。這頁說明它怎麼玩、資料從哪來、AI 怎麼算。",
                 body, [("股市雲霄飛車", ""), ("關於", "about/")], ld)


def render_disclaimer(site, stocks):
    p = "../"
    body = (
        _sec("不是投資建議", [
            "股市雲霄飛車是一個娛樂與學習用途的視覺化小遊戲。網站上所有內容，包括股價走勢、統計數字、AI 走勢推演、評語、主題清單、個股簡介與經典名場面的文字，"
            "都只是資訊整理與娛樂，不構成任何投資建議、推薦或買賣邀約。",
            "本網站不是證券投資顧問，也沒有提供個人化的理財建議。任何投資決定請自行判斷，必要時請諮詢合格的專業人士，並自行承擔風險。"])
        + _sec("AI 走勢推演只是模擬", [
            "駛過「今天」之後的紫色軌道，是用歷史波動做的統計模擬，不是預測，更不是保證。實際股價可能和推演結果完全不同。",
            "終點的「一飛衝天／直接掉下去」只是好玩的動畫，跟股價未來會漲會跌沒有任何關係。"])
        + _sec("資料可能有誤差", [
            "股價資料來自 FinMind 與 Yahoo Finance 等第三方公開來源，可能有延遲、缺漏或錯誤；股票分割、除權息等調整也可能不完全準確。"
            "交易前請以證交所、櫃買中心或你的券商提供的資料為準。",
            "主題清單與個股簡介是人工整理，產業分類來自公開資料，可能與公司最新狀況不同。"])
        + _sec("過去績效不代表未來", [
            "經典名場面與歷史走勢只是回顧，任何股票或 ETF 過去的漲跌都不代表未來會重演。投資有賺有賠，請量力而為。"])
        + _sec("其他", [
            "網站中出現的公司名稱、股票代號與商標屬於各自的權利人，僅用於識別，不代表與本網站有任何合作或背書關係。",
            "畫面中的 SecTools 招牌、彩蛋連結會連到 SecTools.tw 旗下的其他免費小遊戲，屬於站內推廣。",
            "使用本網站即表示你了解並同意以上說明。本聲明可能隨網站更新而調整。"])
        + f'<p>相關說明：<a href="{p}about/">關於本站</a>・<a href="{p}privacy/">隱私權說明</a></p>' + _more(p))
    return _page(site, "disclaimer/", p, "免責聲明：純屬娛樂，不構成投資建議 – 股市雲霄飛車",
                 "股市雲霄飛車的內容與 AI 走勢推演僅供娛樂與學習，不構成投資建議；股價資料來自第三方公開來源，可能有延遲或錯誤，投資請自行判斷。",
                 "免責聲明,不構成投資建議,股市雲霄飛車,投資風險",
                 "免責聲明", "先說清楚：這是一個好玩的視覺化小遊戲，不是投資建議。",
                 body, [("股市雲霄飛車", ""), ("免責聲明", "disclaimer/")], [])


def render_privacy(site, stocks):
    p = "../"
    body = (
        _sec("不用註冊，不收個資", [
            "股市雲霄飛車不需要註冊或登入，不會要求你提供姓名、Email、電話等個人資料，也沒有放廣告追蹤或第三方分析程式。"])
        + _sec("存在你瀏覽器裡的東西", [
            "<p>為了記住你的進度，網站會用瀏覽器的 localStorage 存以下資料，<b>只存在你自己的裝置上</b>，不會上傳：</p>"
            "<ul><li>解鎖的成就、坐過的次數、猜對的次數、坐過哪些股票</li><li>遊戲模式的最高分</li><li>日間／夜間主題設定</li></ul>"
            "<p>想清除的話，清除瀏覽器的網站資料即可；用無痕模式時這些資料不會被保留。</p>"])
        + _sec("會連到哪些外部服務", [
            "<ul><li><b>FinMind</b>：瀏覽器會直接向 FinMind 的公開 API 查詢股價，查詢內容只有股票代號和日期區間。</li>"
            "<li><b>GitHub Pages 與 Cloudflare</b>：網站由它們代管與加速，它們可能依自己的政策記錄一般連線資訊（例如 IP 位址）以維持服務運作。</li>"
            "<li><b>SecTools.tw 連結</b>：點畫面中的彩蛋或推廣連結會開啟 SecTools.tw 旗下網站，網址帶有 utm 參數，用來知道是從股市雲霄飛車點過去的。</li></ul>"])
        + _sec("分享功能", [
            "按「分享這趟」時，會用你裝置內建的分享功能或複製到剪貼簿，內容是這趟的網址與成績，由你自己決定要不要傳出去。"])
        + f'<p>相關說明：<a href="{p}about/">關於本站</a>・<a href="{p}disclaimer/">免責聲明</a></p>' + _more(p))
    return _page(site, "privacy/", p, "隱私權說明：免註冊、不收個資 – 股市雲霄飛車",
                 "股市雲霄飛車免註冊、不收集個人資料，成就與最高分只存在你的瀏覽器 localStorage。說明網站會連到哪些外部服務。",
                 "隱私權,隱私權政策,股市雲霄飛車,localStorage",
                 "隱私權說明", "免註冊、不收個資。你的成就和最高分只存在你自己的瀏覽器裡。",
                 body, [("股市雲霄飛車", ""), ("隱私權說明", "privacy/")], [])


def _more(p):
    return (f'<h2>繼續逛</h2><ul class="links">'
            f'<li><a href="{p}">🎢 首頁：自己選一檔發車</a></li><li><a href="{p}ride/">🎬 經典名場面</a></li>'
            f'<li><a href="{p}theme/">🗂️ 主題路線</a></li><li><a href="{p}industry/">📂 產業分類</a></li>'
            f'<li><a href="{p}learn/">📖 股市名詞小教室</a></li></ul>')


def extra_pages(template, site, stocks):
    """回傳 {路徑: HTML}，路徑不含開頭斜線、以 / 結尾。"""
    out = {"about/": render_about(site, stocks), "disclaimer/": render_disclaimer(site, stocks), "privacy/": render_privacy(site, stocks),
           "ride/": render_ride_index(site, stocks), "theme/": render_theme_index(site, stocks),
           "industry/": render_industry_index(site, stocks), "learn/": render_learn(site, stocks)}
    for r in RIDES:
        out[f'ride/{r["slug"]}/'] = render_ride(template, site, r["slug"], stocks)
    for t in THEMES:
        out[f'theme/{t["slug"]}/'] = render_theme(site, t["slug"], stocks)
    for slug, _, raw in INDUSTRIES:
        if _industry_members(stocks, raw):
            out[f"industry/{slug}/"] = render_industry(site, slug, stocks)
    return out


def rides_json():
    return json.dumps([{k: r[k] for k in ("slug", "emoji", "short", "code", "start", "end")} for r in RIDES], ensure_ascii=False)


if __name__ == "__main__":
    print(datetime.date.today(), len(RIDES), len(THEMES), len(INDUSTRIES), len(GLOSSARY))
