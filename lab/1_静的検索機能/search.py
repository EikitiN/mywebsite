import json
import sys
import re
import unicodedata
from pathlib import Path


def normalize_text(text):
    """半角全角、大文字小文字を統一する（NFKC正規化 ＋ 小文字化）"""
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKC", text)
    return normalized.lower()


def get_char_type(char):
    if re.match(r"[ぁ-ん]", char):
        return "hira"
    elif re.match(r"[a-z0-9\+\#\u4e00-\u9fafァ-ン]", char):
        return "other"
    else:
        return "symbol"


def smart_tokenize(text):
    norm_text = normalize_text(text)

    chars = []
    for ch in norm_text:
        ctype = get_char_type(ch)
        if ctype != "symbol":
            chars.append((ch, ctype))

    tokens = []
    for ch, _ in chars:
        tokens.append(ch)

    for i in range(len(chars) - 1):
        ch1, type1 = chars[i]
        ch2, type2 = chars[i + 1]
        if type1 == type2:
            tokens.append(ch1 + ch2)

    return tokens


def parse_query(query_str):
    """
    半角・全角スペース区切りと、"..." のフレーズ指定を解析する。
    戻り値: list of dict -> [{"text": str, "compact": str, "is_phrase": bool, "tokens": list[str]}, ...]
    """
    norm_q = normalize_text(query_str).strip()
    if not norm_q:
        return []

    pattern = re.compile(r'"([^"]+)"|(\S+)')
    units = []

    for match in pattern.finditer(norm_q):
        phrase_part, word_part = match.groups()
        raw_unit = phrase_part if phrase_part is not None else word_part
        is_phrase = phrase_part is not None

        cleaned = raw_unit.strip()
        if not cleaned:
            continue

        tokens = list(dict.fromkeys(smart_tokenize(cleaned)))
        units.append({
            "text": cleaned,
            "compact": re.sub(r"\s+", "", cleaned),
            "is_phrase": is_phrase,
            "tokens": tokens,
        })

    return units


def calc_proximity_and_order_bonus(doc_text, units):
    """
    複数ユニットが文書内に現れるときの「近さ」と「出現順」を評価する。
    戻り値: (proximity_bonus, order_bonus)
    """
    if len(units) < 2:
        return 0.0, 0.0

    positions = []
    for u in units:
        target = re.sub(r"\s+", "", u["text"]) if u["is_phrase"] else u["compact"]
        if not target:
            continue
        idx = doc_text.find(target)
        if idx != -1:
            positions.append(idx)

    if len(positions) < 2:
        return 0.0, 0.0

    # 1. 近接性：span / 60.0 基準で評価
    span = max(positions) - min(positions)
    proximity_score = 1.0 / (1.0 + (span / 60.0))
    proximity_bonus = 0.25 * proximity_score  # 最大 +0.25

    # 2. 順序性：クエリの並び順通りに単調増加しているか
    in_order_pairs = 0
    total_pairs = 0
    for i in range(len(positions)):
        for j in range(i + 1, len(positions)):
            total_pairs += 1
            if positions[i] < positions[j]:
                in_order_pairs += 1

    order_ratio = in_order_pairs / total_pairs if total_pairs > 0 else 0.0
    order_bonus = (order_ratio - 0.5) * 0.30  # -0.15 〜 +0.15

    return proximity_bonus, order_bonus


def calc_multi_keyword_and_factor(units, doc_keywords, compact_doc_text):
    """
    複数キーワード時にAND的な挙動を作るための評価：
    - 各キーワード（ユニット）の合致度（0.0〜1.0）を計算
    - 合致度 0.75 (75%) 以上のキーワードが全キーワード中に占める割合を算出
    - 割合に応じた変動係数と、75%超え時のボーナスを返す
    戻り値: (and_multiplier, high_match_ratio, over_75_bonus)
    """
    if len(units) < 2:
        return 1.0, 1.0, 0.0

    unit_match_degrees = []
    for u in units:
        if u["is_phrase"]:
            degree = 1.0 if (u["compact"] and u["compact"] in compact_doc_text) else 0.0
        else:
            if u["compact"] and u["compact"] in compact_doc_text:
                degree = 1.0
            elif u["tokens"]:
                hit = sum(1 for tok in u["tokens"] if tok in doc_keywords)
                degree = hit / len(u["tokens"])
            else:
                degree = 0.0
        unit_match_degrees.append(degree)

    # 合致度 75% 以上のキーワード数と全体割合
    threshold = 0.75
    high_match_count = sum(1 for deg in unit_match_degrees if deg >= threshold)
    high_match_ratio = high_match_count / len(units)

    # 割合に応じた変動（0%なら大きく減衰、100%ならそのまま基準維持）
    # ベーススコアを押しつぶしすぎないよう 1.5 乗の緩やかな曲線にする
    ratio_scaling = high_match_ratio ** 1.5

    # 75% (0.75) を超えている場合、超過分に応じてボーナスを付与（最大 +0.35）
    if high_match_ratio > threshold:
        excess = (high_match_ratio - threshold) / (1.0 - threshold)  # 0.0 〜 1.0
        over_75_bonus = 0.35 * excess
    else:
        over_75_bonus = 0.0

    and_multiplier = ratio_scaling * (1.0 + over_75_bonus)
    return and_multiplier, high_match_ratio, round(over_75_bonus, 3)


def load_index():
    base_dir = Path(__file__).parent
    index_path = base_dir / "search-index.json"
    if not index_path.exists():
        print(f"[Error] インデックスファイルが見つかりません: {index_path}")
        sys.exit(1)
    with open(index_path, "r", encoding="utf-8") as f:
        return json.load(f)


def search(query_str, search_index):
    units = parse_query(query_str)
    if not units:
        return []

    all_unique_tokens = list(dict.fromkeys(tok for u in units for tok in u["tokens"]))
    if not all_unique_tokens:
        return []

    results = []

    for doc in search_index:
        doc_keywords = doc.get("keywords", {})
        doc_full_text = normalize_text(doc.get("title", "") + " " + doc.get("body", ""))
        compact_doc_text = re.sub(r"\s+", "", doc_full_text)

        base_score = 0.0
        matched_tokens_count = 0
        matched_units_count = 0
        phrase_hit_count = 0
        phrase_total_count = sum(1 for u in units if u["is_phrase"])
        phrase_miss = False

        for u in units:
            unit_matched_tokens = 0
            for tok in u["tokens"]:
                if tok in doc_keywords:
                    base_score += doc_keywords[tok]
                    matched_tokens_count += 1
                    unit_matched_tokens += 1

            if u["is_phrase"]:
                if u["compact"] and u["compact"] in compact_doc_text:
                    matched_units_count += 1
                    phrase_hit_count += 1
                else:
                    phrase_miss = True
            else:
                if unit_matched_tokens > 0:
                    matched_units_count += 1

        if matched_tokens_count == 0 or base_score == 0.0:
            continue

        # トークンカバー率＆ユニットカバー率
        token_cover = matched_tokens_count / len(all_unique_tokens)
        unit_cover = matched_units_count / len(units)
        effective_cover = (token_cover * 0.5) + (unit_cover * 0.5)
        strict_cover_factor = effective_cover ** 2.5

        # フレーズ指定の反映
        phrase_factor = 1.0
        if phrase_total_count > 0:
            if phrase_miss:
                phrase_factor = 0.35
            else:
                phrase_factor = 1.35

        full_cover_bonus = 1.25 if effective_cover == 1.0 else 1.0

        # 近接性＆出現順ボーナス（span / 60.0）
        prox_bonus, order_bonus = calc_proximity_and_order_bonus(compact_doc_text, units)
        context_multiplier = max(0.5, 1.0 + prox_bonus + order_bonus)

        # 複数キーワード時のAND的割合変動＆75%超えボーナス
        and_multiplier, high_match_ratio, over_75_bonus = calc_multi_keyword_and_factor(
            units, doc_keywords, compact_doc_text
        )

        final_score = (
            base_score
            * strict_cover_factor
            * phrase_factor
            * full_cover_bonus
            * context_multiplier
            * and_multiplier
        )

        results.append({
            "title": doc["title"],
            "url": doc["url"],
            "base_score": round(base_score, 4),
            "cover_rate": round(effective_cover * 100, 1),
            "high_match_pct": round(high_match_ratio * 100, 1),
            "over_75_bonus": over_75_bonus,
            "phrase_hit": phrase_hit_count > 0 and not phrase_miss,
            "prox_bonus": round(prox_bonus, 3),
            "order_bonus": round(order_bonus, 3),
            "final_score": round(final_score, 4),
        })

    results.sort(key=lambda x: (x["final_score"], x["cover_rate"]), reverse=True)
    return results


if __name__ == "__main__":
    index_data = load_index()
    print(f"-> インデックス読み込み完了 (登録記事数: {len(index_data)}件)\n")

    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        query = input('検索キーワードを入力してください (例: "c++ ポインタ" 解説): ')

    parsed = parse_query(query)
    print(f'\n[検索クエリ] "{query}"')
    print(f"[解析ユニット] {[(u['text'], 'PHRASE' if u['is_phrase'] else 'WORD') for u in parsed]}")

    results = search(query, index_data)

    print(f"--- 検索結果 ({len(results)} 件) ---")
    if not results:
        print("該当する記事はありませんでした。")
    else:
        for i, res in enumerate(results, 1):
            tags = []
            if res["phrase_hit"]:
                tags.append("フレーズ一致")
            if len(parsed) >= 2:
                tags.append(f"75%↑率:{res['high_match_pct']}%")
                if res["over_75_bonus"] > 0:
                    tags.append(f"75%超+{res['over_75_bonus']}")
            if res["prox_bonus"] >= 0.12:
                tags.append(f"近接+{res['prox_bonus']}")
            if res["order_bonus"] >= 0.05:
                tags.append(f"順当+{res['order_bonus']}")
            elif res["order_bonus"] <= -0.05:
                tags.append(f"逆順{res['order_bonus']}")
            tag_str = f" [{' / '.join(tags)}]" if tags else ""

            print(
                f"{i}. [最終: {res['final_score']} | ベース: {res['base_score']} | カバー: {res['cover_rate']}%{tag_str}] "
                f"{res['title']} ({res['url']})"
            )