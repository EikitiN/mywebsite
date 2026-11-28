const breakmarks = new Set([
    " ", ",", ".", "、", "。", "!", "?", "-", "|", "~", "^", '"', "/", "'",
    "\n", "\r", "\t",
    "・", "・", "…", "‥", "―", "‐", "〜", "　", "！", "？",
    "(", ")", "[", "]", "{", "}", "<", ">",
    "「", "」", "『", "』", "【", "】", "〈", "〉", "《", "》", "〔", "〕",
    ":", ";", "_", "\\", "`", "･", "："
]);
const PAD = "\uE000";
const PAD2 = "\uE000\uE000";
const url = new URLSearchParams(window.location.search);
const devmode = url.has('dev');

const GoButton = document.getElementById('go');
const search_input = document.getElementById('keywords');
const output_div = document.getElementById('output');

//初期処理
GoButton.disabled = true;
async function getJson() {
    const resp = await fetch('search-index.json');
    const data = await resp.json();

    const resp2 = await fetch('search-index-one-char.json');
    const data2 = await resp2.json();
    return [data, data2];
}
const [SearchIndexJson, SearchIndexOneCharJson] = await getJson();
GoButton.disabled = false;


const escaped = [...breakmarks]
  .join("")
  .replace(/[\\\]\-^]/g, "\\$&");
const pattern = new RegExp(`([${escaped}]+)`);

const nomalizer = (text) => { //index側と同じbigramにする
    const normalizedNFKC = text.normalize("NFKC").toLowerCase();
    const pre_chunks = normalizedNFKC.split(pattern).filter(Boolean);

    //重複したクエリの削除
    const seen = new Set();
    const chunks = pre_chunks.filter(item => {
        if (item === " ") return true;
        if (seen.has(item)) return false;
        seen.add(item);
        return true;
    });

    const bigram = [];
    const bigrams = [];
    for (const chunk of chunks) {
        if (breakmarks.has(chunk[0])) {
            if (bigram.length != 0) {
                bigrams.push([...bigram]);
                bigram.splice(0);
            }
        } else if (chunk.length === 1) {
            bigram.push(chunk + PAD);
        } else {
            for (let i = 0; i < chunk.length - 1; i++) {
                bigram.push(chunk.slice(i, i + 2));
            }
        }
    }
    if (bigram.length != 0) bigrams.push(bigram);

    return bigrams;
}

const query_scorer = (page_bigrams, query_bigram, character_count) => {
    let score = 0;
    const page_length = page_bigrams.length;
    const query_length = query_bigram.length;
    let using_length = 1;
    let over_75_ok = 0; //合致度75%超えのusingのうち適応する場所が見つかったやつ
    while (using_length <= query_length) {
        const mach_ratio = using_length / query_length;
        let is_over_75 = false;
        /* a = 0.6, n=2
        x = mach_ratio
        c = (a / (1 - a))^n
        mach_score = x^n / (x^n + c(1 - x)^n)
        */
        const mach_score = (mach_ratio*mach_ratio) / (mach_ratio*mach_ratio + 2.25 - 4.5*mach_ratio + 2.25*mach_ratio*mach_ratio);
        let start_i = 0;
        let end_i = start_i + using_length;
        while (end_i <= query_length) {
            const check_q = query_bigram.slice(start_i, end_i);
            //check_qが合致した個数を調べる
            let count = 0;
            let is_one_char = false;
            let query_quality; //1文字のときの評価用
            if (query_length === 1 && query_bigram[0][1] === "\uE000") {
                query_quality = SearchIndexOneCharJson[query_bigram[0][0]] || 0;
                is_one_char = true;
                for (let n = 0; n < page_length; n++) {
                    if (page_bigrams[n][0] === "\uE000\uE000" && n != 0) {
                        if (page_bigrams[n-1][0][1] === query_bigram[0][0]) count++;
                    }
                    if (page_bigrams[n][0][0] === query_bigram[0][0]) count++; 
                }
            } else {
                is_one_char = false;
                for (let n = 0; n <= page_length - using_length; n++) {
                    const is_match = check_q.every((val, i) => page_bigrams[n + i][0] === val);
                    if (is_match) count++;
                }
            }
            if (mach_ratio >= 0.75 && !is_one_char) is_over_75 ||= count > 0;//75%以上の適合のうち、合致が見つかったとき
            const adjusted_count = Math.log2(1 + count) / Math.log2(character_count); //青天井対策+文章長に合わせて調整
            if (is_one_char) score += adjusted_count * mach_score * query_quality;
            else score += adjusted_count * mach_score;
            start_i++;
            end_i = start_i + using_length;
        }
        if (is_over_75) over_75_ok++;
        using_length++;
    }
    //クエリサイズによる違いの消去
    const final_score = 84*score / ((query_length + 2)*(query_length + 2)) + (query_length / 10 - (1 / (10*query_length))); //経験式, 長いやつをやや優遇
    //75%合致ボーナス
    const bonus_75 = over_75_ok > 0;
    //console.log(query_bigram, final_score)
    return [final_score, bonus_75];
}

const advanced_keyword = (chunks) => {
    //console.log(chunks);
    //1. 5文字以下の日本語キーワードの処理
    //2. ひらがな、カタカナ、漢字、その他 の区切り位置で分割したものを生成
    //3. ひらがなをカタカナにしたもの、カタカナを平仮名にしたものを生成
    //↓
    //うまくいかなかったから(スコアが低くなるだけ)、5文字以内の日本語ならひらがな、カタカナを入れ替えたものを追加
    //各文字に分割 に変更
    //追加検証としてスコアを足し算するようにする＜ー明日
    let japaneseRegex;
    try {
        japaneseRegex = new RegExp("[\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Han}]", "u");
    } catch (e) {
        japaneseRegex = /[ぁ-んァ-ヶー一-龠々ｦ-ﾟ]/;
    }
    const additional_bigram = []; //追加検証用bigram
    const unigram = new Set(); //追加検証用unigram
    for (const chunk of chunks) {
        if (chunk.length === 0) continue;
        const chunk_character_count = chunk[chunk.length - 1][1] === "\uE000" ? chunk.length : chunk.length + 1;
        const raw_chunk = chunk.join("");
        if ([...breakmarks].some((char) => raw_chunk.includes(char))) continue; //区切り文字だったらやらない
        if (chunk_character_count >= 6) continue; //6文字以上だったらやらない
        if (!japaneseRegex.test(raw_chunk)) continue; //日本語じゃなかったらやらない
        
        const swapped_bigram = [];
        for (const one_bigram of chunk) swapped_bigram.push(one_bigram.replace(/[ぁ-ゖァ-ヶ]/g, (s) => {
            const code = s.charCodeAt(0);
            return String.fromCharCode(code >= 0x30A1 ? code - 0x60 : code + 0x60);
        }))
        additional_bigram.push(swapped_bigram);

        for (const char of raw_chunk) unigram.add(char);
    }
    //console.log(additional_bigram);
    //console.log(unigram);

    const path_bigram = {};
    const scores = [];
    const result = {};
    for (const index of SearchIndexJson) { //ページごとにスコアを算出
        const this_page = {};
        const character_count = index["character_count"];
        this_page["path"] = index["path"];
        this_page["title"] = index["title"];
        this_page["score"] = 0;

        const page_bigrams = index["bigrams"];
        let is_75_bonus = 0;
        const query_size = additional_bigram.length;
        for (const q_bigram of additional_bigram) { //ある検索クエリに対する評価
            const [q_score, bonus_75] = query_scorer(page_bigrams, q_bigram, character_count);
            if (bonus_75) is_75_bonus++;
            this_page["score"] += bonus_75 ? q_score + 2 : q_score; //キーワード中75%以上当てはまったならボーナス
            //console.log(this_page["path"], q_bigram, q_score);
        }
        //検索クエリのうち、75%以上の合致度のあったクエリが全体の数の75%を超えたらさらにボーナス
        if (is_75_bonus / query_size >= 0.75) this_page["score"] *= 1.5;
        scores.push(this_page);
        path_bigram[this_page.path] = [page_bigrams, character_count];
    }
    //console.log(scores);
    const uni_score = {};
    for (const original_score of [...scores]) {
        const this_path = original_score.path;
        const page_bigrams = path_bigram[this_path][0];
        const character_count = path_bigram[this_path][1];
        let q_score = 0;
        for (let i = 0; i < page_bigrams.length; i++) {
            let char = [page_bigrams[i][0][0], page_bigrams[i][1]];
            if (char === "\uE000" && i !== 0) char = [page_bigrams[i-1][1], page_bigrams[i-1][1]];
            for (const unigram_char of unigram) {
                const unigram_quality = SearchIndexOneCharJson[unigram_char] ?? 0;
                if (char[0] === unigram_char) {
                    q_score += char[1] * unigram_quality;
                }
            }
        }
        const adjusted_score = Math.log2(1 + q_score) / Math.log2(character_count);
        uni_score[this_path] = adjusted_score;
    }
    for (const score of scores) {
        result[score.path] = score.score + uni_score[score.path];
    }
    return result;
}

const search = async () => {
    const next_disp_button = document.getElementById('next_disp');
    const other_disp_button = document.getElementById('other_disp');
    const now_searching = document.getElementById('now_searching');
    next_disp_button.classList.add('disp-none');
    other_disp_button.classList.add('disp-none');
    next_disp_button.disabled = true;
    other_disp_button.disabled = true;
    output_div.innerHTML = "";

    const starttime = Date.now();
    //検索クエリ取得
    const query = search_input.value;
    if (!query) return 0;
    const query_bigrams = nomalizer(query);

    const scores = [];
    for (const index of SearchIndexJson) { //ページごとにスコアを算出
        const this_page = {};
        const character_count = index["character_count"];
        this_page["path"] = index["path"];
        this_page["title"] = index["title"];
        this_page["score"] = 0;

        const page_bigrams = index["bigrams"];
        let is_75_bonus = 0;
        const query_size = query_bigrams.length;
        for (const q_bigram of query_bigrams) { //ある検索クエリに対する評価
            const [q_score, bonus_75] = query_scorer(page_bigrams, q_bigram, character_count);
            if (bonus_75) is_75_bonus++;
            this_page["score"] += bonus_75 ? q_score + 2 : q_score; //キーワード中75%以上当てはまったならボーナス
            //console.log(this_page["path"], q_bigram, q_score);
        }
        //検索クエリのうち、75%以上の合致度のあったクエリが全体の数の75%を超えたらさらにボーナス
        if (is_75_bonus / query_size >= 0.75) this_page["score"] *= 1.5;
        scores.push(this_page);
        //console.log(this_page);
    }
    //スコア順に並べて表示
    scores.sort((a, b) => b.score - a.score);

    //偏差値算出(普遍的な内容か、特化した内容化の判別) => 必要なさそうだから消す
    /*
    const mean = scores.reduce((sum, item) => sum + item.score, 0) / scores.length;
    const variance = scores.reduce((sum, item) => sum + (item.score - mean) ** 2, 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    console.log("");
    console.log("標準偏差: ", stdDev);
    scores.forEach((s) => {
        s.deviation = stdDev < 1e-10 ? 50 : ((s.score - mean) / stdDev) * 10 + 50;
    });
    */

    const priority_disp = []; //優先的表示
    const follows_disp = []; //「続きを表示」で表示
    const other_disp = []; //「すべて表示」で表示
    const border_score = scores[0].score * 0.35;
    for (const one_score of scores) {
        const this_score = one_score.score;
        if (this_score < 1.0 || this_score < border_score) other_disp.push(one_score);
        else if (priority_disp.length < 10) priority_disp.push(one_score);
        else follows_disp.push(one_score);
    }

    //console.log("優先: ", priority_disp);
    //console.log("追従: ", follows_disp);
    //console.log("全体: ", other_disp);

    //優先に該当するものがなければ追加検索
    let advanced_result;
    let is_advanced = false;
    if (priority_disp.length === 0) {
        is_advanced = true;
        advanced_result = advanced_keyword(query_bigrams);
        for (let i = 0; i < scores.length; i++) {
            const this_path = scores[i].path;
            scores[i].score += advanced_result[this_path] || 0;
        }
        scores.sort((a, b) => b.score - a.score);
        priority_disp.length = 0;
        follows_disp.length = 0;
        other_disp.length = 0;
        const border_score_2 = scores[0].score * 0.35;
        for (const one_score of scores) {
            const this_score = one_score.score;
            if (this_score < 1.0 || this_score < border_score_2) other_disp.push(one_score);
            else if (priority_disp.length < 10) priority_disp.push(one_score);
            else follows_disp.push(one_score);
        }
    }

    const processingtime = Date.now() - starttime;

    let priority_text = "";
    let follows_text  = "";
    let other_text = "";

    if (devmode) priority_text += `<p>処理時間: ${processingtime} ms</p>`;
    if (is_advanced) priority_text += `<p>この結果の精度は低い可能性があります。</p>`;
    if (priority_disp.length === 0) priority_text += `<p>結果が見つかりませんでした。キーワードを変えてもう一度試してください。</p>`;
    for (const one_result of priority_disp) {
        priority_text += `<a href="/mywebsite/${one_result.path}"><p>${one_result.title}`;
        if (devmode) {
            priority_text+= ` | score: ${(one_result.score).toFixed(2)}`;
        }
        priority_text += `</p></a>`;
    }
    for (const one_result of follows_disp) {
        follows_text += `<a href="/mywebsite/${one_result.path}"><p>${one_result.title}`;
        if (devmode) {
            follows_text += ` | score: ${(one_result.score).toFixed(2)}`;
        }
        follows_text += `</p></a>`;
    }
    for (const one_result of other_disp) {
        other_text += `<a href="/mywebsite/${one_result.path}"><p class="search-other">${one_result.title}`;
        if (devmode) {
            other_text += ` | score: ${(one_result.score).toFixed(2)}`;
        }
        other_text += `</p></a>`;
    }

    const displaying_other = () => {
        output_div.innerHTML = priority_text + follows_text + other_text;
        other_disp_button.classList.add('disp-none');
        other_disp_button.disabled = true;
    }

    output_div.innerHTML = priority_text;
    if (follows_text) {
        next_disp_button.classList.remove('disp-none');
        next_disp_button.disabled = false;
        next_disp_button.addEventListener('click', () => {
            output_div.innerHTML = priority_text + follows_text;
            next_disp_button.classList.add('disp-none');
            next_disp_button.disabled = true;
            other_disp_button.classList.remove('disp-none');
            other_disp_button.disabled = false;
            other_disp_button.addEventListener('click', displaying_other, {once: true});
        }, {once: true});
    } else if (other_text) {
        other_disp_button.classList.remove('disp-none');
        other_disp_button.disabled = false;
        other_disp_button.addEventListener('click', displaying_other, {once: true});
    }

    //旧
    /*
    let output_text = "";
    if (devmode) output_text += `<p>処理時間: ${processingtime} ms</p>`;
    for (const one_result of scores) {
        output_text += `<a href="/mywebsite/${one_result.path}"><p>${one_result.title}`;
        if (devmode) {
            output_text += ` | score: ${(one_result.score).toFixed(2)}`;
            //console.log(one_result.title, one_result.deviation, one_result.score);
        }
        output_text += `</p></a>`;
    }
    output_div.innerHTML = output_text;
    */
}

GoButton.addEventListener('click', async () => {
    GoButton.disabled = true;
    try {
        await search();
    } finally {
        GoButton.disabled = false;
    }
});