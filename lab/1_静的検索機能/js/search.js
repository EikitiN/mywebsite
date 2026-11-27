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

const advanced_keyword = (original) => {
    console.log(chunks);
    //1. 5文字以下の日本語キーワードの処理
    //2. ひらがな、カタカナ、漢字、その他 の区切り位置で分割したものを生成
    //3. ひらがなをカタカナにしたもの、カタカナを平仮名にしたものを生成
    //↓
    //うまくいかなかったから(スコアが低くなるだけ)、5文字以内の日本語ならひらがな、カタカナを入れ替えたものを追加
    //3文字以内なら各文字に分割 に変更
    //追加検証としてスコアを足し算するようにする＜ー明日
    let put_into_chunks = [];
    let japaneseRegex;
    try {
        japaneseRegex = new RegExp("[\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Han}]", "u");
    } catch (e) {
        japaneseRegex = /[ぁ-んァ-ヶー一-龠々ｦ-ﾟ]/;
    }
    for (const chunk of chunks) {
        continue; //いったん機能をオフにしておく
        if ([...breakmarks].some((char) => chunk.includes(char))) continue; //区切り文字だったらやらない
        if ([...chunk].length >= 6) continue; //6文字以上だったらやらない
        if (!japaneseRegex.test(chunk)) continue; //日本語じゃなかったらやらない
        const swapped = chunk.replace(/[ぁ-ゖァ-ヶ]/g, (s) => {
            const code = s.charCodeAt(0);
            return String.fromCharCode(code >= 0x30A1 ? code - 0x60 : code + 0x60);
        });
        put_into_chunks.push(swapped);
        /*
        if ([...chunk].length >= 4) continue; //4文字以上だったらやらない
        put_into_chunks.push(...[...chunk]);
        */
        /*
        const getCharType = (char) => {
            if (/[ぁ-ん]/.test(char)) return "hiragana";
            if (/[ァ-ヶーｦ-ﾟ]/.test(char)) return "katakana";
            if (/[一-龠々〆ヵヶ]/.test(char) || char.codePointAt(0) > 0xFFFF) return "kanji";
            return "other";
        };

        const hiraToKana = (str) =>
            str.replace(/[ぁ-ゖ]/g, (s) => String.fromCharCode(s.charCodeAt(0) + 0x60));

        const kanaToHira = (str) =>
            str.replace(/[ァ-ヶ]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0x60));

        //文字種が変わる位置での切り替え
        const splitParts = [];
        let currentPart = "";
        let prevType = null;

        for (const char of chunk) {
            const type = getCharType(char);
            if (prevType !== null && type !== prevType) {
            splitParts.push(currentPart);
            currentPart = char;
            } else {
            currentPart += char;
            }
            prevType = type;
        }
        if (currentPart) splitParts.push(currentPart);

        if (splitParts.length > 1) {
            put_into_chunks.push(...splitParts);
        }

        //ひらがな、カタカナの処理
        for (const part of splitParts) {
            const type = getCharType([...part][0]);
            if (type === "hiragana") {
            put_into_chunks.push(hiraToKana(part));
            } else if (type === "katakana") {
            put_into_chunks.push(kanaToHira(part));
            }
        }
        */
    }
    //put_into_chunksの重複削除
    if (put_into_chunks.length > 0) {
        const seen = new Set(chunks);
        const cleaned_put_into_chunks = put_into_chunks.filter(item => {
            if (item === " ") return true;
            if (seen.has(item)) return false;
            seen.add(item);
            return true;
        });
        chunks.push(...cleaned_put_into_chunks);
        console.log("追加: ", cleaned_put_into_chunks, chunks);
    }
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

const search = async () => {
    const next_disp_button = document.getElementById('next_disp');
    const other_disp_button = document.getElementById('other_disp');
    next_disp_button.classList.add('no-disp');
    other_disp_button.classList.add('no-disp');
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

    console.log("優先: ", priority_disp);
    console.log("追従: ", follows_disp);
    console.log("全体: ", other_disp);

    //優先に該当するものがなければ追加検索
    if (priority_disp.length === 0) {

    }

    const processingtime = Date.now() - starttime;

    let priority_text = "";
    let follows_text  = "";
    let other_text = "";

    if (devmode) priority_text += `<p>処理時間: ${processingtime} ms</p>`;
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
        other_disp_button.classList.add('no-disp');
        other_disp_button.disabled = true;
    }

    output_div.innerHTML = priority_text;
    if (follows_text) {
        next_disp_button.classList.remove('no-disp');
        next_disp_button.disabled = false;
        next_disp_button.addEventListener('click', () => {
            output_div.innerHTML = priority_text + follows_text;
            next_disp_button.classList.add('no-disp');
            next_disp_button.disabled = true;
            other_disp_button.classList.remove('no-disp');
            other_disp_button.disabled = false;
            other_disp_button.addEventListener('click', displaying_other, {once: true});
        }, {once: true});
    } else if (other_text) {
        other_disp_button.classList.remove('no-disp');
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
    await search();
    GoButton.disabled = false;
});