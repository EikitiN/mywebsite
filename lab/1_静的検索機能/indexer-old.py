import os
import json
import re
import math
from collections import defaultdict, Counter
from pathlib import Path

def get_char_type(char):
    #文字判定
    if re.match(r'[ぁ-ん]', char):
        return 'hira'
    elif re.match(r'[a-zA-Z0-9\+\#\u4e00-\u9fafァ-ン]', char):
        return 'other'
    else:
        return 'symbol'

def extract_weighted_tokens(text):
    #戻り値: [(token, weight), (token, weight), ...]
    chars = []
    for ch in text:
        ctype = get_char_type(ch)
        if ctype != 'symbol':
            chars.append((ch, ctype))
            
    weighted_tokens = []
    
    # 1文字ずつの単体1-gram
    for ch, ctype in chars:
        weighted_tokens.append((ch, 0.4))

    # ペアごとのルール適用
    for i in range(len(chars) - 1):
        ch1, type1 = chars[i]
        ch2, type2 = chars[i+1]
        
        if type1 == 'other' and type2 == 'other':
            # 非平仮名 ＋ 非平仮名 -> 重み1の2-gram
            weighted_tokens.append((ch1 + ch2, 1.0))
            
        elif type1 == 'hira' and type2 == 'hira':
            # 平仮名 ＋ 平仮名 -> 重み0.85の2-gram
            weighted_tokens.append((ch1 + ch2, 0.85))
            
        elif type1 == 'other' and type2 == 'hira':
            # 非平仮名 ＋ 平仮名 -> 非平仮名側0.75(1-gram), 平仮名側0.5(1-gram)
            weighted_tokens.append((ch1, 0.75))
            weighted_tokens.append((ch2, 0.5))
            
        elif type1 == 'hira' and type2 == 'other':
            # 平仮名 ＋ 非平仮名 -> 平仮名側0.5(1-gram), 非平仮名側0.75(1-gram)
            weighted_tokens.append((ch1, 0.5))
            weighted_tokens.append((ch2, 0.75))
            
    return weighted_tokens

def build_search_index():
    base_dir = Path(__file__).parent
    sample_dir = base_dir / "sample"
    output_path = base_dir / "search-index.json"
    
    if not sample_dir.exists():
        print(f"sample directory was not found: {sample_dir}")
        return

    txt_files = list(sample_dir.glob("*.txt"))
    total_docs = len(txt_files)
    
    if total_docs == 0:
        print("No text files were found.")
        return

    print(f"-> {total_docs} 件のファイルを検出")

    # --- パス1：全ドキュメントを読み込み、DF（出現文書数）を集計する ---
    documents_raw = []
    df_counter = Counter() # 各トークンが何文書に出現するか

    for file_path in txt_files:
        title = file_path.stem
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                body = f.read()
        except Exception as e:
            print(f"[Warn] 読み込みスキップ ({file_path.name}): {e}")
            continue
            
        full_text = title + " " + body
        weighted_tokens = extract_weighted_tokens(full_text)
        
        # このドキュメントに出現するユニークなトークンを抽出（1文書につき1回としてDFに加算するため）
        unique_tokens_in_doc = set(t[0] for t in weighted_tokens)
        for token in unique_tokens_in_doc:
            df_counter[token] += 1
            
        documents_raw.append({
            "title": title,
            "url": f"/mywebsite/{title}/",
            "body": body,
            "weighted_tokens": weighted_tokens
        })
    index_data = []

    for doc in documents_raw:
        title = doc["title"]
        url = doc["url"]
        body = doc["body"]
        weighted_tokens = doc["weighted_tokens"]
        doc_length = len(weighted_tokens)
        
        if doc_length == 0:
            continue
            
        # ドキュメント内での「重み付き出現回数（Weighted TF）」を計算
        # 例: 同じトークンが複数回出てきたら重みを合算する
        tf_map = defaultdict(float)
        for token, weight in weighted_tokens:
            tf_map[token] += weight
            
        # キーワードごとの最終スコア計算
        keywords_score = []
        for token, tf in tf_map.items():
            k = 1.5
            saturating_tf = tf / (tf + k)
            
            df = df_counter[token]
            idf = math.log(1.0 + (total_docs / df))
            
            length_penalty = doc_length ** 0.8
            if length_penalty == 0:
                length_penalty = 1.0
                
            # 基本スコアの算出
            raw_score = (saturating_tf * idf) / length_penalty
            
            scaled_score = raw_score * 100.0
            
            keywords_score.append([token, round(scaled_score, 4)])
            #keywords_score[token] = round(scaled_score, 4)


            
        index_data.append({
            "title": title,
            "url": url,
            "doc_length": doc_length,
            "body": body,
            "keywords": keywords_score
        })

    # JSONとして書き出し
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)
    print(f"Success: {output_path.name}")

if __name__ == "__main__":
    build_search_index()