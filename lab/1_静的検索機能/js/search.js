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
//パラメーター


const GoButton = document.getElementById('go');
const search_input = document.getElementById('keywords');

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
    const normalizedNFKC = text.normalize("NFKC");
    const pre_chunks = normalizedNFKC.split(pattern).filter(Boolean);

    //重複したクエリの削除
    const seen = new Set();
    const chunks = pre_chunks.filter(item => {
        if (item === " ") return true;
        if (seen.has(item)) return false;
        seen.add(item);
        return true;
    });
    console.log(chunks);

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

const sequentiality = (page_bigrams, index_pb, q, j) => {
    let seq = 0;
    
}

const search = async () => {
    console.log(SearchIndexJson);
    //検索クエリ取得
    const query = search_input.value;
    if (!query) return 0;
    const query_bigrams = nomalizer(query);
    console.log(query_bigrams);

    //ページごとにスコアを算出
    const scores = [];
    for (const index of SearchIndexJson) {
        const this_page = {};
        const character_count = index["character_count"];
        this_page["path"] = index["path"];
        this_page["title"] = index["title"];

        const page_bigrams = index["bigrams"];
        for (const q_bigram of query_bigrams) { //ある検索クエリに対する評価
            let query_score = 0;
            let i = 0;
            while (i < page_bigrams.length) {
                const len_of_keyword = q_bigram.length;
                for (let j = 0; j < len_of_keyword; j++) { //最初に適合する位置検索
                    if (q_bigram[j] === page_bigrams[i]) {
                        i, query_score = sequentiality(page_bigrams, i, q_bigram, j);
                        break;
                    }
                }
                i++;
            }
        }
    }

}

GoButton.addEventListener('click', async () => {
    GoButton.disabled = true;
    await search();
    GoButton.disabled = false;
});