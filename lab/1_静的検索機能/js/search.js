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
    return data;
}
const SearchIndexJson = await getJson();
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
    //console.log(chunks);

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
            if (query_length === 1 && query_bigram[0][1] === "\uE000") {
                for (let n = 0; n < page_length; n++) {
                    if (page_bigrams[n][0] === "\uE000\uE000" && n != 0) {
                        if (page_bigrams[n-1][0][1] === query_bigram[0][0]) count++;
                    }
                    if (page_bigrams[n][0][0] === query_bigram[0][0]) count++; 
                }
            } else {
                for (let n = 0; n <= page_length - using_length; n++) {
                    const is_match = check_q.every((val, i) => page_bigrams[n + i][0] === val);
                    if (is_match) count++;
                }
            }
            if (mach_ratio >= 0.75) is_over_75 ||= count > 0;//75%以上の適合のうち、合致が見つかったとき
            const adjusted_count = Math.log2(1 + count) / Math.log2(character_count); //青天井対策+文章長に合わせて調整
            score += adjusted_count * mach_score;
            start_i++;
            end_i = start_i + using_length;
        }
        if (is_over_75) over_75_ok++;
        using_length++;
    }
    //クエリサイズによる違いの消去
    const final_score = 84*score / ((query_length + 2)*(query_length + 2)) + (query_length / 10); //経験式, 長いやつをやや優遇
    //75%合致ボーナス
    const bonus_75 = over_75_ok > 0;
    //console.log(query_bigram, final_score)
    return [final_score, bonus_75];
}

const search = async () => {
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

    const processingtime = Date.now() - starttime;

    let output_text = "";
    if (devmode) output_text += `<p>処理時間: ${processingtime} ms</p>`;
    for (const one_result of scores) {
        output_text += `<a href="/mywebsite/${one_result.path}"><p>${one_result.title}`;
        if (devmode) {
            output_text += ` | score: ${one_result.score}`;
        }
        output_text += `</p></a>`;
    }
    output_div.innerHTML = output_text;
}

GoButton.addEventListener('click', async () => {
    GoButton.disabled = true;
    await search();
    GoButton.disabled = false;
});