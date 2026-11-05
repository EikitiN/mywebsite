// search.js
document.addEventListener('DOMContentLoaded', function() {
    // 入力要素の取得
    const inputHyouki = document.getElementById('inputhyouki');
    const inputKari = document.getElementById('inputkari');
    const inputData = document.getElementById('inputdata');
    const kensakuout = document.getElementById('kensakuout');
    
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
    [inputHyouki, inputKari, inputData].forEach(input => {
        input.addEventListener('input', function() {
            // 他の入力フィールドとの同期は既存のコードで処理されていると仮定
            
            // 検索を遅延実行
            clearTimeout(searchTimer);
            kensakuout.innerHTML = '検索中...';
            
            searchTimer = setTimeout(() => {
                performSearch();
            }, 750);
        });
    });
    
    // 検索実行関数
    async function performSearch() {
        // 入力値を取得（データ形式を優先）
        let searchValue = inputData.value.trim();
        
        // データが空の場合、仮表記をチェック
        if (!searchValue) {
            searchValue = inputKari.value.trim();
        }
        
        // それも空の場合、表記をチェック
        if (!searchValue) {
            searchValue = inputHyouki.value.trim();
        }
        
        // 検索値が空の場合は何もしない
        if (!searchValue) {
            kensakuout.innerHTML = '';
            return;
        }
        
        // 検索結果を格納する配列
        let allResults = [];
        
        // 各カテゴリを順に検索
        for (const category of searchOrder) {
            kensakuout.innerHTML = `検索中: ${category.name}`;
            
            try {
                const response = await fetch(category.file);
                if (!response.ok) continue;
                
                const words = await response.json();
                const results = searchInCategory(words, searchValue, category.name);
                
                if (results.length > 0) {
                    allResults = allResults.concat(results);
                }
            } catch (error) {
                console.error(`${category.file}の読み込みに失敗:`, error);
            }
        }
        
        // 結果を表示
        displayResults(allResults);
    }
    
    // カテゴリ内での検索
    function searchInCategory(words, searchValue, categoryName) {
        const results = [];
        const normalizedSearch = searchValue.toLowerCase();
        
        // 動詞と助動詞の場合の特別な処理
        if (categoryName === '動詞' || categoryName === '不規則変化動詞' || categoryName === '助動詞') {
            // 接頭辞チェック（ハイフンなし）
            const prefixes = ['za', 'ri', 'je'];
            // 接尾辞チェック（ハイフンなし）
            const suffixes = ['ev', 'el', 'e4'];
            
            // 検索するすべての形式を収集
            const searchForms = new Set([searchValue]);
            
            // 接頭辞があるかチェック
            let hasPrefix = false;
            let prefixRemoved = searchValue;
            for (const prefix of prefixes) {
                if (searchValue.toLowerCase().startsWith(prefix)) {
                    prefixRemoved = searchValue.slice(prefix.length);
                    hasPrefix = true;
                    searchForms.add(prefixRemoved);
                    break;
                }
            }
            
            // 接尾辞があるかチェック
            let hasSuffix = false;
            let suffixRemoved = searchValue;
            for (const suffix of suffixes) {
                if (searchValue.toLowerCase().endsWith(suffix)) {
                    suffixRemoved = searchValue.slice(0, -suffix.length);
                    hasSuffix = true;
                    searchForms.add(suffixRemoved);
                    break;
                }
            }
            
            // 接頭辞と接尾辞の両方がある場合、両方を除去した形も追加
            if (hasPrefix && hasSuffix) {
                for (const suffix of suffixes) {
                    if (prefixRemoved.toLowerCase().endsWith(suffix)) {
                        const bothRemoved = prefixRemoved.slice(0, -suffix.length);
                        searchForms.add(bothRemoved);
                        break;
                    }
                }
            }
            
            // 各検索形で単語を検索
            for (const form of searchForms) {
                for (const word of words) {
                    // 基本形と比較（ハイフンなしで比較）
                    const wordBase = word.Vocabulary.toLowerCase();
                    const searchForm = form.toLowerCase();
                    
                    if (wordBase === searchForm) {
                        // データから仮表記に変換
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
                    }
                }
            }
        } else {
            // その他のカテゴリは通常の検索
            for (const word of words) {
                if (word.Vocabulary.toLowerCase() === normalizedSearch) {
                    // データから仮表記に変換
                    let kariHyouki = convertDataToKari(word.Vocabulary);
                    
                    results.push({
                        word: word.Vocabulary,
                        kari: kariHyouki,
                        display: kariHyouki,
                        meaning: word.Mean.join('、'),
                        category: categoryName
                    });
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
    function displayResults(results) {
        if (results.length === 0) {
            kensakuout.innerHTML = '一致なし';
            return;
        }
        
        let html = '';
        for (const result of results) {
            html += `<div>${result.display}　${result.category}:${result.meaning}</div>`;
        }
        
        kensakuout.innerHTML = html;
    }
});