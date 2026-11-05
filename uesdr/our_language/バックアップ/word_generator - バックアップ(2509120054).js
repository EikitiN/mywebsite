// word_generator.js
class WordGenerator {
    constructor() {
        this.vowels = ['a', 'e', 'i', 'o', 'u', 'y', '2'];
        this.consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'z', '1', '3', '4', '5'];
        this.voiceless = ['d', 's', 't', 'f', 'p', '3', '4', 'z', 'c', 'h'];
        this.semiVowels = ['j', 'w'];
        
        // 連続禁止の子音ペア
        this.forbiddenPairs = [
            ['k', 'g'], ['s', '5'], ['t', 'd'], 
            ['f', 'v'], ['p', 'b'], ['4', '1']
        ];
        
        // 特殊な子音クラスタ (1文字として扱う)
        this.specialClusters = ['kj', 'kw', 'gj', 'gw'];
        
        // qaballaOurデータの確認と初期化
        this.initializeQaballaOur();
    }

    // qaballaOurデータを初期化
    initializeQaballaOur() {
        if (!window.qaballaOur || window.qaballaOur.length === 0) {
            // 提供されたqaballa_our.jsonに基づいてデータを設定
            window.qaballaOur = [
                {data: 'a', qaballa: 1}, {data: 'l', qaballa: 2}, {data: 'w', qaballa: 3},
                {data: 'h', qaballa: 4}, {data: 's', qaballa: 5}, {data: 'd', qaballa: 6},
                {data: 'o', qaballa: 7}, {data: 'z', qaballa: 8}, {data: 'k', qaballa: 9},
                {data: 'v', qaballa: 10}, {data: 'g', qaballa: 11}, {data: 'r', qaballa: 12},
                {data: 'c', qaballa: 13}, {data: 'n', qaballa: 14}, {data: 'y', qaballa: 15},
                {data: 'j', qaballa: 16}, {data: 'u', qaballa: 17}, {data: 'f', qaballa: 18},
                {data: '4', qaballa: 19}, {data: 'b', qaballa: 20}, {data: 'm', qaballa: 21},
                {data: '3', qaballa: 22}, {data: 'i', qaballa: 23}, {data: 't', qaballa: 24},
                {data: 'e', qaballa: 25}, {data: 'p', qaballa: 26}, {data: '1', qaballa: 27},
                {data: '2', qaballa: 28}, {data: '5', qaballa: 29}
            ];
            console.log('qaballaOurデータを初期化しました');
        }
        
        // 使用可能な文字のリストを作成（検証用）
        this.availableChars = window.qaballaOur.map(item => item.data);
        console.log('使用可能な文字:', this.availableChars.join(', '));
    }

    // 有効な文字かチェック（Ike's Qaballaの文字セットに基づく）
    isValidChar(char) {
        return this.availableChars.includes(char);
    }

    // 音のルールに合致するかチェック
    isValidWord(word) {
        // 空の単語は無効
        if (!word || word.length === 0) return false;
        
        // 使用不可能な文字が含まれていないかチェック
        for (let i = 0; i < word.length; i++) {
            if (!this.isValidChar(word[i])) {
                return false;
            }
        }

        // 母音の連続チェック (3つまで)
        const vowelSequences = word.match(/[aeiouy2]{4,}/g);
        if (vowelSequences && vowelSequences.length > 0) {
            return false;
        }

        // 子音の連続チェック (4つまで)
        const consonantSequences = word.match(/[bcdfghjklmnpqrstvwxz1345]{5,}/g);
        if (consonantSequences && consonantSequences.length > 0) {
            return false;
        }

        // 禁止された子音ペアのチェック
        for (const pair of this.forbiddenPairs) {
            const pattern = new RegExp(`${pair[0]}${pair[1]}|${pair[1]}${pair[0]}`);
            if (pattern.test(word)) {
                return false;
            }
        }

        // 半母音のチェック
        for (let i = 0; i < word.length; i++) {
            if (this.semiVowels.includes(word[i])) {
                // 半母音の後ろに母音または子音+母音が必要
                const remaining = word.slice(i + 1);
                if (remaining.length === 0) return false;
                
                if (!this.vowels.includes(remaining[0])) {
                    if (remaining.length < 2) return false;
                    if (!this.vowels.includes(remaining[1])) return false;
                }
            }
        }

        // 語末の無声音チェック
        const lastChar = word[word.length - 1];
        if (this.voiceless.includes(lastChar)) {
            const prevChar = word[word.length - 2];
            if (!prevChar || !['a', 'e', 'i'].includes(prevChar)) {
                return false;
            }
        }

        return true;
    }

    // 効率的な組み合わせ生成アルゴリズム
    generateCombinationsEfficient(targetValue, maxLength = 10) {
        this.initializeQaballaOur(); // データ確認
        
        const results = [];
        // dp[i] = iという値になるすべての組み合わせ
        const dp = Array(targetValue + 1).fill().map(() => []);
        
        // 初期化：0の値には空の組み合わせ
        dp[0].push([]);
        
        for (let value = 1; value <= targetValue; value++) {
            for (const charData of window.qaballaOur) {
                const prevValue = value - charData.qaballa;
                if (prevValue >= 0 && dp[prevValue].length > 0) {
                    for (const combo of dp[prevValue]) {
                        if (combo.length < maxLength) {
                            const newCombo = [...combo, charData.data];
                            // 重複チェック（同じ組み合わせを防ぐ）
                            const comboKey = newCombo.sort().join('');
                            if (!results.some(r => r.sort().join('') === comboKey)) {
                                dp[value].push(newCombo);
                                if (value === targetValue) {
                                    results.push(newCombo);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return results;
    }

    // 順列を生成（並び替え）
    generatePermutations(chars) {
        const results = [];
        
        function permute(arr, memo = []) {
            if (arr.length === 0) {
                results.push(memo.join(''));
            } else {
                for (let i = 0; i < arr.length; i++) {
                    const curr = arr.slice();
                    const next = curr.splice(i, 1);
                    permute(curr.slice(), memo.concat(next));
                }
            }
        }
        
        permute(chars);
        return results;
    }

    // メインの生成関数
    async generateWords(inputValue, targetQaballa) {
        console.log(`生成開始: 入力=${inputValue}, 目標値=${targetQaballa}`);
        
        // データを確実に初期化
        this.initializeQaballaOur();
        
        // 1. 待機中表示
        document.getElementById('exactly').innerHTML = 'お待ちください-待機中';
        document.getElementById('pm2').innerHTML = 'お待ちください-待機中';

        await this.delay(100);

        try {
            // 2. 同一Qaballaの組み合わせ生成
            document.getElementById('exactly').innerHTML = 'お待ちください-組み合わせ計算中';
            console.time('exactCombinations');
            const exactCombinations = this.generateCombinationsEfficient(targetQaballa);
            console.timeEnd('exactCombinations');
            console.log(`同一値の組み合わせ数: ${exactCombinations.length}`);

            if (exactCombinations.length === 0) {
                document.getElementById('exactly').innerHTML = '同一Qaballa値の有効な単語は見つかりませんでした';
            } else {
                // 3. 並び替え計算
                document.getElementById('exactly').innerHTML = 'お待ちください-並び替え計算中';
                await this.delay(100);

                let exactWords = new Set();
                console.time('exactPermutations');
                for (const combo of exactCombinations) {
                    const permutations = this.generatePermutations(combo);
                    for (const word of permutations) {
                        if (this.isValidWord(word)) {
                            exactWords.add(word);
                        }
                    }
                }
                console.timeEnd('exactPermutations');
                console.log(`有効な同一値単語数: ${exactWords.size}`);

                // 4. 結果表示
                this.displayResults(exactWords, 'exactly', targetQaballa, true);
            }

            // 5. ±2 Qaballaの処理
            document.getElementById('pm2').innerHTML = 'お待ちください-組み合わせ計算中';
            await this.delay(100);

            let pm2Words = new Set();
            for (let diff = -2; diff <= 2; diff++) {
                if (diff === 0) continue;
                
                const currentTarget = targetQaballa + diff;
                if (currentTarget > 0) {
                    const combinations = this.generateCombinationsEfficient(currentTarget);
                    
                    for (const combo of combinations) {
                        const permutations = this.generatePermutations(combo);
                        for (const word of permutations) {
                            if (this.isValidWord(word)) {
                                pm2Words.add(`${word} (${diff > 0 ? '+' + diff : diff})`);
                            }
                        }
                    }
                }
            }

            // 6. 結果表示
            this.displayResults(pm2Words, 'pm2', targetQaballa, false);

        } catch (error) {
            console.error('単語生成中にエラー:', error);
            document.getElementById('exactly').innerHTML = '処理中にエラーが発生しました';
            document.getElementById('pm2').innerHTML = '処理中にエラーが発生しました';
        }
    }

    // 結果表示関数
    displayResults(words, elementId, targetQaballa, isExact) {
        const wordArray = Array.from(words);
        const element = document.getElementById(elementId);
        
        if (wordArray.length === 0) {
            element.innerHTML = isExact ? 
                '同一Qaballa値の有効な単語は見つかりませんでした' :
                '±2 Qaballa値の有効な単語は見つかりませんでした';
            return;
        }

        let displayWords = wordArray;
        let showMoreButton = false;

        if (wordArray.length > 200) {
            // ランダムに200個選択
            displayWords = [];
            const indices = new Set();
            while (indices.size < 200 && indices.size < wordArray.length) {
                indices.add(Math.floor(Math.random() * wordArray.length));
            }
            indices.forEach(index => displayWords.push(wordArray[index]));
            showMoreButton = true;
        }

        // ソートして表示
        displayWords.sort();
        element.innerHTML = displayWords.join(', ');
        
        if (showMoreButton) {
            const button = document.createElement('button');
            button.textContent = `▼すべての並び替え(${wordArray.length}個)を表示`;
            button.onclick = () => {
                element.innerHTML = wordArray.sort().join(', ');
                button.remove();
            };
            element.appendChild(document.createElement('br'));
            element.appendChild(button);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// グローバルインスタンスを作成
window.wordGenerator = new WordGenerator();

// 生成ボタンのイベントリスナー
document.addEventListener('DOMContentLoaded', function() {
    const generateButton = document.querySelector('.qaballacreate');
    if (generateButton) {
        generateButton.addEventListener('click', function() {
            // ラジオボタンの状態を直接確認
            const oursRadio = document.getElementById('Ours');
            if (!oursRadio || !oursRadio.checked) {
                alert('この機能はIke\'s Qaballaモードでのみ利用できます');
                return;
            }

            const inputData = window.getInputData();
            const targetQaballa = window.calculateTextValue(inputData, 'ours');
            
            if (targetQaballa === 0) {
                alert('有効な入力値を入力してください');
                return;
            }

            window.wordGenerator.generateWords(inputData, targetQaballa);
        });
    }
});