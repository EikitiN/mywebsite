from pathlib import Path
from bs4 import BeautifulSoup, Comment, Doctype, NavigableString
import json
import re
import unicodedata
from collections import Counter

#パラメーター
exclude_dirs = []
#root = Path('./') #本番
root = Path('./lab/1_静的検索機能')
output_file = root / Path('search-index.json')
#全体スケール
scale = 1
place_weight = { #位置別重み付け
    "title": 2,
    "tags": 1.25,
    "summary": 1.25,
    "body": 1
}
type_weight = { #文字種別重み付け
    -2.0: 0.4, #ひらがな+その他文字の重み付け
    4.0: 0.9, #ひらがな+ひらがなの重み付け
    1.0: 1.1, #その他文字+その他文字の重み付け
    0.0: 0.0 #空白文字同士の重み付け
}
breakmarks = [
    " ", ",", ".", "、", "。", "!", "?", "-", "|", "~", "^", '"', "/", "'",
    "\n", "\r", "\t",
    "・", "・", "…", "‥", "―", "‐", "〜", "　", "！", "？",
    "(", ")", "[", "]", "{", "}", "<", ">",
    "「", "」", "『", "』", "【", "】", "〈", "〉", "《", "》", "〔", "〕",
    ":", ";", "_", "\\", "`", "･", "："
]
PAD = "\uE000"
PAD2 = "\uE000\uE000"
pattern = f"([{re.escape(''.join(breakmarks))}]+)"

def make_2_gram(text: str) -> list[str]:
    normalized_NFKC = unicodedata.normalize("NFKC", text)
    chunks = [c for c in re.split(pattern, text) if c]

    bigrams = []
    for chunk in chunks:
        if chunk[0] in breakmarks:
            bigrams.append(PAD2)
        elif len(chunk) == 1:
            bigrams.append(chunk + PAD)
        else:
            for i in range(len(chunk) - 1):
                bigrams.append(chunk[i : i + 2])
    return bigrams

def HTML_remover(soup: BeautifulSoup) -> str:
    #コメント
    for elem in soup.find_all(string=lambda t: isinstance(t, (Comment, Doctype))):
        elem.extract()

    #head, header, footer, script, noscript, class="disp-none" id="header-container / footer-container" の中身
    for tag in soup.find_all(["head", "header", "footer", "script", "noscript"]):
        tag.replace_with(",")
    for tag in soup.find_all(class_="disp-none"):
        tag.replace_with(",")
    for tag in soup.find_all(id=["header-container", "footer-container"]):
        tag.replace_with(",")

    #imgタグのalt
    for img in soup.find_all("img"):
        alt_text = img.get("alt")
        img.replace_with(f",{alt_text}," if alt_text else ",")

    #HTMLタグ
    parts = []
    for elem in soup.descendants:
        if isinstance(elem, NavigableString):
            parts.append(str(elem))
        else:
            parts.append(",")

    raw_text = "".join(parts)
    clean_text = re.sub(r"[ \t\r\n]+", " ", raw_text)
    return clean_text

def get_meta(soup):
    head_data = {
        "title": "",
        "meta": {}
    }
    
    # title
    if soup.title and soup.title.string:
        head_data["title"] = soup.title.string.strip()
    
    # meta（name/property/content）
    '''
    for meta in soup.find_all("meta"):
        key = meta.get("name") or meta.get("property")
        value = meta.get("content")
        if key and value:
            head_data["meta"][key] = value
    '''
            
    #original meta tag(script elm)
    script_tag = soup.select_one("script#page-meta")
    if script_tag is not None:
        json_text = script_tag.string
        if json_text is not None:
            try:
                head_data["meta"] = json.loads(json_text)
            except json.JSONDecodeError:
                pass
    
    return head_data

def type_weight_calc(x: str) -> float:
    weight = 1
    x_1 = x[0]
    x_2 = x[1] if len(x) == 2 else None
    weight *= -2 if 0x3041 <= ord(x_1) <= 0x309F else 1
    weight *= -2 if 0x3041 <= ord(x_2) <= 0x309F else 1
    weight *= int(any(ord(x) != 0xE000 for x in (x_1, x_2)))
    return type_weight[weight]


def main():
    results = [] #最終的にjsonにする結果
    pre_results = [] #一旦保管
    '''
    構造:
    [
    {
        "path": pyファイルディレクトリ基準,
        "title": 表示タイトル
        "character_count": 文字数(スペースなどなし)
        "bigrams": [
            ["○○", スコア],
            ["○○", スコア],
            ["○○", スコア],
            ["○○", スコア],
            …
        ]
    },
    …
    ]
    '''
    counters = Counter() #各2-gramの登場するファイル数
    number_of_pages = 0
    #repeat each html
    for html_file in root.rglob("*.html"):
        if any(exclude_dir in html_file.parts for exclude_dir in exclude_dirs):
            continue

        print(f"Processing: {html_file}")
        number_of_pages += 1
        character_count = 0
        set_of_2gram = set() #各ファイルでの出現2-gram一覧
        content = html_file.read_text(encoding="utf-8")
        #get head meta data
        soup = BeautifulSoup(content, "html.parser")
        meta = get_meta(soup)
        #メタデータの2-gram
        title_bigram = make_2_gram(re.sub(r"<wbr>", ",", meta["title"]))
        character_count += len(title_bigram)

        tags_bigram = []
        if "tags" in meta["meta"]:
            tags_bigram = make_2_gram(','.join(meta["meta"]["tags"]))
            character_count += len(tags_bigram)
        
        summary_bigram = []
        if "summary" in meta["meta"]:
            summary_bigram = make_2_gram(meta["meta"]["summary"])
            character_count += len(summary_bigram)

        html_body = HTML_remover(soup)
        body_bigram = make_2_gram(html_body)
        character_count += len(body_bigram)

        counters.update(set(title_bigram + tags_bigram + body_bigram))

        '''
        pre_bigrams[str(html_file)] = {
            "title": [(x, place_weight["title"]*type_weight_calc(x)) for x in title_bigram],
            "tags": [(x, place_weight["tags"]*type_weight_calc(x)) for x in tags_bigram],
            "summary": [(x, place_weight["summary"]*type_weight_calc(x)) for x in summary_bigram],
            "body": [(x, place_weight["body"]*type_weight_calc(x)) for x in body_bigram]
        }
        '''
        pre_results.append(
            {
                "path": str(html_file),
                "title": meta["title"],
                "character_count": character_count,
                "bigrams": [(x, place_weight["title"]*type_weight_calc(x)) for x in title_bigram] + [(x, place_weight["tags"]*type_weight_calc(x)) for x in tags_bigram] + [(x, place_weight["summary"]*type_weight_calc(x)) for x in summary_bigram] + [(x, place_weight["body"]*type_weight_calc(x)) for x in body_bigram]
            }
        )
    #print(pre_results)

    #それぞれの2gramに対応するIDEスコア
    IDEscores = {}
    for x in counters:
        p = counters[x] / number_of_pages
        IDEscores[x] =  -3*p*p + 1 if p <= 0.5 else -0.3*p + 0.4

    #スコア計算・組み込み
    for pr in pre_results:
        results.append(
            {
                "path": pr["path"],
                "title": pr["title"],
                "character_count": pr["character_count"],
                "bigrams": [(x[0], x[1]*IDEscores[x[0]]) for x in pr["bigrams"]]
            }
        )
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(re.sub(
            r'\[\s+("(?:\\.|[^"\\])*"),\s+(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+\]',
            r'[\1, \2]',
            json.dumps(results, ensure_ascii=False, indent=2)
        ))

if __name__ == "__main__":
    main()