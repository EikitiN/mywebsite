// word_generator.js
class WordGenerator {
    constructor() {
        this.vowels = ['a', 'e', 'i', 'o', 'u', 'y', '2'];
        this.consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'z', '1', '3', '4', '5'];
        this.voiceless = ['d', 's', 't', 'f', 'p', '3', '4', 'z', 'c', 'h'];
        this.semiVowels = ['j', 'w'];
        
        this.forbiddenPairs = [
            ['k', 'g'], ['s', '5'], ['t', 'd'], 
            ['f', 'v'], ['p', 'b'], ['4', '1']
        ];
        
        this.specialClusters = ['kj', 'kw', 'gj', 'gw'];
        
        this.initializeQaballaOur();
        
        // メモ化用キャッシュ
        this.permutationCache = new Map();
        this.isValidWordCache = new Map();
        
        // 進捗表示用
        this.progressInterval = null;
        this.currentProgress = 0;
        this.totalProgress = 0;
    }

    initializeQaballaOur() {
        if (!window.qaballaOur || window.qaballaOur.length === 0) {
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
        }
        this.availableChars = window.qaballaOur.map(item => item.data);
    }

    // 進捗表示を開始
    startProgress(elementId, total) {
        this.currentProgress = 0;
        this.totalProgress = total;
        const element = document.getElementById(elementId);
        
        // 既存の進捗表示をクリア
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        this.progressInterval = setInterval(() => {
            const percent = this.totalProgress > 0 ? 
                ((this.currentProgress / this.totalProgress) * 100).toFixed(1) : 0;
            element.innerHTML = `お待ちください-組み合わせ計算中(${percent}%)`;
        }, 100);
    }

    // 進捗表示を停止
    stopProgress(elementId, finalMessage) {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        document.getElementById(elementId).innerHTML = finalMessage;
    }

    // 進捗を更新
    updateProgress(increment = 1) {
        this.currentProgress += increment;
    }

    // メモ化付きの順列生成
    generatePermutationsMemoized(chars) {
        const key = chars.sort().join('');
        if (this.permutationCache.has(key)) {
            return this.permutationCache.get(key);
        }
        
        const results = [];
        const used = new Set();
        
        function backtrack(current) {
            if (current.length === chars.length) {
                results.push(current.join(''));
                return;
            }
            
            for (let i = 0; i < chars.length; i++) {
                if (used.has(i) || (i > 0 && chars[i] === chars[i - 1] && !used.has(i - 1))) {
                    continue;
                }
                
                used.add(i);
                backtrack([...current, chars[i]]);
                used.delete(i);
            }
        }
        
        backtrack([]);
        this.permutationCache.set(key, results);
        return results;
    }

    // メモ化付きの単語検証
    isValidWordMemoized(word) {
        if (this.isValidWordCache.has(word)) {
            return this.isValidWordCache.get(word);
        }
        
        const result = this.isValidWord(word);
        this.isValidWordCache.set(word, result);
        return result;
    }

    isValidWord(word) {
        if (!word || word.length === 0) return false;
        
        for (let i = 0; i < word.length; i++) {
            if (!this.availableChars.includes(word[i])) {
                return false;
            }
        }

        const vowelSequences = word.match(/[aeiouy2]{4,}/g);
        if (vowelSequences) return false;

        const consonantSequences = word.match(/[bcdfghjklmnpqrstvwxz1345]{5,}/g);
        if (consonantSequences) return false;

        for (const pair of this.forbiddenPairs) {
            if (word.includes(pair[0] + pair[1]) || word.includes(pair[1] + pair[0])) {
                return false;
            }
        }

        for (let i = 0; i < word.length; i++) {
            if (this.semiVowels.includes(word[i])) {
                const remaining = word.slice(i + 1);
                if (remaining.length === 0) return false;
                if (!this.vowels.includes(remaining[0])) {
                    if (remaining.length < 2) return false;
                    if (!this.vowels.includes(remaining[1])) return false;
                }
            }
        }

        const lastChar = word[word.length - 1];
        if (this.voiceless.includes(lastChar)) {
            const prevChar = word[word.length - 2];
            if (!prevChar || !['a', 'e', 'i'].includes(prevChar)) {
                return false;
            }
        }

        return true;
    }

    // より効率的な組み合わせ生成（動的計画法の改良版）
    async generateCombinationsEfficient(targetValue, maxLength = 10, progressCallback = null) {
        const dp = Array(targetValue + 1).fill().map(() => new Set());
        const stringSet = new Set();
        
        // 各値ごとの文字列を文字列として保存（メモリ節約）
        dp[0].add('');
        
        let totalOperations = targetValue * window.qaballaOur.length;
        let completedOperations = 0;
        
        for (let value = 1; value <= targetValue; value++) {
            for (const charData of window.qaballaOur) {
                const prevValue = value - charData.qaballa;
                if (prevValue >= 0 && dp[prevValue].size > 0) {
                    for (const comboStr of dp[prevValue]) {
                        if (comboStr.length < maxLength) {
                            const newCombo = comboStr + charData.data;
                            if (newCombo.length <= maxLength) {
                                dp[value].add(newCombo);
                                if (value === targetValue) {
                                    stringSet.add(newCombo);
                                }
                            }
                        }
                    }
                }
                completedOperations++;
                if (progressCallback && completedOperations % 100 === 0) {
                    progressCallback(completedOperations / totalOperations);
                }
            }
            
            // メモリ節約のため、古いデータをクリア
            if (value > 5) {
                dp[value - 5] = new Set();
            }
        }
        
        return Array.from(stringSet).map(str => str.split(''));
    }

    // ワーカーを使用した並列処理
    async processCombinationsWithWorker(combinations, elementId) {
        return new Promise((resolve) => {
            const validWords = new Set();
            const total = combinations.length;
            let processed = 0;
            
            // 進捗表示
            const progressInterval = setInterval(() => {
                const percent = ((processed / total) * 100).toFixed(1);
                document.getElementById(elementId).innerHTML = 
                    `お待ちください-並び替え計算中(${percent}%)`;
            }, 100);
            
            // チャンクに分割して処理
            const chunkSize = 1000;
            const processChunk = (start) => {
                const end = Math.min(start + chunkSize, total);
                
                setTimeout(() => {
                    for (let i = start; i < end; i++) {
                        const permutations = this.generatePermutationsMemoized(combinations[i]);
                        for (const word of permutations) {
                            if (this.isValidWordMemoized(word)) {
                                validWords.add(word);
                            }
                        }
                        processed++;
                    }
                    
                    if (end < total) {
                        processChunk(end);
                    } else {
                        clearInterval(progressInterval);
                        resolve(validWords);
                    }
                }, 0);
            };
            
            processChunk(0);
        });
    }

    async generateWords(inputValue, targetQaballa) {
        console.log(`生成開始: 入力=${inputValue}, 目標値=${targetQaballa}`);
        
        this.initializeQaballaOur();
        this.permutationCache.clear();
        this.isValidWordCache.clear();
        
        document.getElementById('exactly').innerHTML = 'お待ちください-待機中';
        document.getElementById('pm2').innerHTML = 'お待ちください-待機中';

        await this.delay(50);

        try {
            // 同一Qaballa値の処理
            document.getElementById('exactly').innerHTML = 'お待ちください-組み合わせ計算中(0.0%)';
            
            const exactCombinations = await this.generateCombinationsEfficient(
                targetQaballa, 
                10,
                (progress) => {
                    const percent = (progress * 100).toFixed(1);
                    document.getElementById('exactly').innerHTML = 
                        `お待ちください-組み合わせ計算中(${percent}%)`;
                }
            );
            
            console.log(`同一値の組み合わせ数: ${exactCombinations.length}`);

            if (exactCombinations.length === 0) {
                document.getElementById('exactly').innerHTML = '同一Qaballa値の有効な単語は見つかりませんでした';
            } else {
                const exactWords = await this.processCombinationsWithWorker(exactCombinations, 'exactly');
                console.log(`有効な同一値単語数: ${exactWords.size}`);
                this.displayResults(exactWords, 'exactly', targetQaballa, true);
            }

            // ±2 Qaballa値の処理
            let pm2Words = new Set();
            const pm2Promises = [];
            
            for (let diff = -2; diff <= 2; diff++) {
                if (diff === 0) continue;
                
                const currentTarget = targetQaballa + diff;
                if (currentTarget > 0) {
                    pm2Promises.push((async () => {
                        const combinations = await this.generateCombinationsEfficient(currentTarget);
                        const validWords = new Set();
                        
                        for (const combo of combinations) {
                            const permutations = this.generatePermutationsMemoized(combo);
                            for (const word of permutations) {
                                if (this.isValidWordMemoized(word)) {
                                    validWords.add(`${word} (${diff > 0 ? '+' + diff : diff})`);
                                }
                            }
                        }
                        
                        return validWords;
                    })());
                }
            }
            
            // すべての±2処理を並行して実行
            const pm2Results = await Promise.all(pm2Promises);
            for (const result of pm2Results) {
                for (const word of result) {
                    pm2Words.add(word);
                }
            }
            
            this.displayResults(pm2Words, 'pm2', targetQaballa, false);

        } catch (error) {
            console.error('単語生成中にエラー:', error);
            document.getElementById('exactly').innerHTML = '処理中にエラーが発生しました';
            document.getElementById('pm2').innerHTML = '処理中にエラーが発生しました';
        }
    }

    displayResults(words, elementId, targetQaballa, isExact) {
        const wordArray = Array.from(words);
        const element = document.getElementById(elementId);
        
        if (wordArray.length === 0) {
            element.innerHTML = isExact ? 
                '同一Qaballa値の有効な単語は見つかりませんでした' :
                '±2 Qaballa値の有効な単語は見つかりませんでした';
            return;
        }

        wordArray.sort();
        
        if (wordArray.length > 500) {
            // 大量の場合は最初の500件のみ表示
            const limitedWords = wordArray.slice(0, 500);
            element.innerHTML = limitedWords.join(', ') + 
                `<br><span style="color: #666;">...他 ${wordArray.length - 500} 件の単語が省略されています</span>`;
        } else {
            element.innerHTML = wordArray.join(', ');
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

window.wordGenerator = new WordGenerator();

document.addEventListener('DOMContentLoaded', function() {
    const generateButton = document.querySelector('.qaballacreate');
    if (generateButton) {
        generateButton.addEventListener('click', function() {
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