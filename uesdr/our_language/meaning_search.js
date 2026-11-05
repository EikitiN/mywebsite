// meaning_search.js
document.addEventListener('DOMContentLoaded', function() {
    // 入力要素の取得
    const imiInput = document.getElementById('imi');
    const imikarakensakuout = document.getElementById('imikarakensakuout');
    
    // 検索タイマー
    let searchTimer = null;
    
    // 検索順序
    const searchOrder = [
        { name: '名詞', file: 'vocabulary/noun.json' },
        { name: '動詞', file: 'vocabulary/veab.json' },
        { name: '不規則変化動詞', file: 'vocabulary/veab_irregular.json' },
        { name: '添加詞', file: 'vocabulary/addition.json' },
        { name: '連体修飾詞', file: 'vocabulary/adjective.json' },
        { name: '連用修飾詞', file: 'vocabulary/adverb.json' },
        { name: '助動詞', file: 'vocabulary/auxiliary.json' },
        { name: '接続詞', file: 'vocabulary/conjunction.json' },
        { name: '助詞', file: 'vocabulary/particle.json' }
    ];
    
    // 入力イベントの登録
    imiInput.addEventListener('input', function() {
        // 検索を遅延実行
        clearTimeout(searchTimer);
        imikarakensakuout.innerHTML = '検索中...';
        
        searchTimer = setTimeout(() => {
            performMeaningSearch();
        }, 750);
    });
    
    // 検索実行関数
    async function performMeaningSearch() {
        // 入力値を取得
        const searchValue = imiInput.value.trim();
        
        // 検索値が空の場合は何もしない
        if (!searchValue) {
            imikarakensakuout.innerHTML = '';
            return;
        }
        
        // 検索結果を格納する配列
        let allResults = [];
        
        // 各カテゴリを順に検索
        for (const category of searchOrder) {
            imikarakensakuout.innerHTML = `検索中: ${category.name}`;
            
            try {
                const response = await fetch(category.file);
                if (!response.ok) continue;
                
                const words = await response.json();
                const results = searchMeaningInCategory(words, searchValue, category.name);
                
                if (results.length > 0) {
                    allResults = allResults.concat(results);
                }
            } catch (error) {
                console.error(`${category.file}の読み込みに失敗:`, error);
            }
        }
        
        // 結果を表示
        displayMeaningResults(allResults);
    }
    
    // カテゴリ内での意味検索
    function searchMeaningInCategory(words, searchValue, categoryName) {
        const results = [];
        const normalizedSearch = searchValue.toLowerCase();
        
        for (const word of words) {
            // 各単語の意味を検索
            for (const meaning of word.Mean) {
                if (meaning.toLowerCase().includes(normalizedSearch)) {
                    // 仮表記を取得（データから仮表記に変換）
                    let kariHyouki = convertDataToKari(word.Vocabulary);
                    
                    // 動詞・助動詞の場合、変形した形で表示
                    let displayForm = kariHyouki;
                    if (categoryName === '動詞' || categoryName === '不規則変化動詞' || categoryName === '助動詞') {
                        displayForm = formatVerbDisplay(kariHyouki);
                    }
                    
                    results.push({
                        word: word.Vocabulary,
                        kari: kariHyouki,
                        display: displayForm,
                        meaning: word.Mean.join('、'),
                        category: categoryName
                    });
                    break; // 同じ単語で複数回追加しない
                }
            }
        }
        
        return results;
    }
    
    // データ表記を仮表記に変換する関数
    function convertDataToKari(data) {
        if (!window.characterData || window.characterData.length === 0) {
            return data; // 文字データがない場合はそのまま返す
        }
        
        let result = '';
        for (let i = 0; i < data.length; i++) {
            const char = data[i];
            const found = window.characterData.find(item => item.data === char);
            
            if (found) {
                result += found.sub;
            } else {
                result += char; // 見つからない場合はそのまま
            }
        }
        
        return result;
    }
    
    // 動詞表示を変形する関数 (例: vof → vof(el))
    function formatVerbDisplay(verb) {
        return `${verb}(el)`;
    }
    
    // 結果表示関数（仮表記で表示）
    function displayMeaningResults(results) {
        if (results.length === 0) {
            imikarakensakuout.innerHTML = '一致なし';
            return;
        }
        
        let html = '';
        for (const result of results) {
            html += `<div>${result.display}　${result.category}:${result.meaning}</div>`;
        }
        
        imikarakensakuout.innerHTML = html;
    }
});