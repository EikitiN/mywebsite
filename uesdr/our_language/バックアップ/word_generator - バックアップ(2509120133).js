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
        
        this.initializeQaballaOur();
        
        // メモリ節約のための設定
        this.MAX_DISPLAY_WORDS = 1000;
        this.CHUNK_SIZE = 100;
        this.MEMORY_CLEAR_THRESHOLD = 10000;
        
        // デバッグ用
        this.DEBUG = true;
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
        
        if (this.DEBUG) {
            console.log('使用可能な文字:', this.availableChars.join(', '));
            console.log('Qaballa値:', window.qaballaOur.map(c => `${c.data}:${c.qaballa}`).join(', '));
        }
    }

    // デバッグログ
    debugLog(message, data = null) {
        if (this.DEBUG) {
            if (data) {
                console.log(`[DEBUG] ${message}`, data);
            } else {
                console.log(`[DEBUG] ${message}`);
            }
        }
    }

    // メモリ効率の良い組み合わせ生成
    async *generateCombinationsIterative(targetValue, maxLength = 10) {
        const stack = [{value: 0, chars: [], lastIndex: 0}]; // lastIndexを0から開始
        let processed = 0;
        let yielded = 0;
        
        this.debugLog(`組み合わせ生成開始: target=${targetValue}, maxLength=${maxLength}`);
        
        while (stack.length > 0) {
            const current = stack.pop();
            
            if (current.value === targetValue) {
                yielded++;
                yield current.chars;
                
                if (yielded % 100 === 0) {
                    this.debugLog(`生成された組み合わせ: ${yielded}件`);
                    await this.delay(0);
                }
                continue;
            }
            
            if (current.chars.length >= maxLength) {
                continue;
            }
            
            // 残りの値と最小文字値で枝刈り
            const remainingValue = targetValue - current.value;
            const minCharValue = Math.min(...window.qaballaOur.map(c => c.qaballa));
            if (remainingValue < minCharValue) {
                continue;
            }
            
            // 次の文字を追加（昇順で処理）
            for (let i = current.lastIndex; i < window.qaballaOur.length; i++) {
                const charData = window.qaballaOur[i];
                const newValue = current.value + charData.qaballa;
                
                if (newValue <= targetValue) {
                    stack.push({
                        value: newValue,
                        chars: [...current.chars, charData.data],
                        lastIndex: i // 重複組み合わせを防ぐ
                    });
                }
            }
            
            processed++;
            if (processed % 1000 === 0) {
                await this.delay(0);
            }
        }
        
        this.debugLog(`組み合わせ生成完了: 総数=${yielded}`);
    }

    // メモリ効率の良い順列生成
    async *generatePermutationsEfficient(chars) {
        if (chars.length === 0) {
            yield '';
            return;
        }
        
        if (chars.length === 1) {
            yield chars[0];
            return;
        }
        
        const uniqueChars = [...new Set(chars)];
        const countMap = new Map();
        for (const char of chars) {
            countMap.set(char, (countMap.get(char) || 0) + 1);
        }
        
        yield* this.generateUniquePermutations(uniqueChars, countMap, chars.length, '');
    }

    async *generateUniquePermutations(uniqueChars, countMap, remaining, current) {
        if (remaining === 0) {
            yield current;
            return;
        }
        
        for (const char of uniqueChars) {
            const count = countMap.get(char);
            if (count > 0) {
                countMap.set(char, count - 1);
                yield* this.generateUniquePermutations(uniqueChars, countMap, remaining - 1, current + char);
                countMap.set(char, count);
                
                if (remaining % 10 === 0) {
                    await this.delay(0);
                }
            }
        }
    }

    // 高速な単語検証（母音連続を2つまでに制限）
    createWordValidator() {
        const vowelPattern = /[aeiouy2]{3,}/; // 3つ以上の母音連続を禁止
        const consonantPattern = /[bcdfghjklmnpqrstvwxz1345]{5,}/;
        const forbiddenPatterns = this.forbiddenPairs.map(pair => 
            new RegExp(`${pair[0]}${pair[1]}|${pair[1]}${pair[0]}`)
        );
        
        return (word) => {
            // 基本的なチェック
            if (!word || word.length === 0 || word.length > 20) return false;
            
            // 使用不可能な文字チェック
            for (const char of word) {
                if (!this.availableChars.includes(char)) {
                    this.debugLog(`無効な文字: ${char} in ${word}`);
                    return false;
                }
            }
            
            // 母音連続チェック（3つ以上禁止）
            if (vowelPattern.test(word)) {
                this.debugLog(`母音連続过多: ${word}`);
                return false;
            }
            
            // 子音連続チェック
            if (consonantPattern.test(word)) {
                this.debugLog(`子音連続过多: ${word}`);
                return false;
            }
            
            // 禁止ペアチェック
            for (const pattern of forbiddenPatterns) {
                if (pattern.test(word)) {
                    this.debugLog(`禁止ペア: ${word}`);
                    return false;
                }
            }
            
            // 半母音チェック
            for (let i = 0; i < word.length; i++) {
                if (this.semiVowels.includes(word[i])) {
                    const remaining = word.slice(i + 1);
                    if (remaining.length === 0) {
                        this.debugLog(`語末の半母音: ${word}`);
                        return false;
                    }
                    if (!this.vowels.includes(remaining[0])) {
                        if (remaining.length < 2) {
                            this.debugLog(`半母音の後が短い: ${word}`);
                            return false;
                        }
                        if (!this.vowels.includes(remaining[1])) {
                            this.debugLog(`半母音の後が子音: ${word}`);
                            return false;
                        }
                    }
                }
            }
            
            // 語末の無声音チェック
            const lastChar = word[word.length - 1];
            if (this.voiceless.includes(lastChar)) {
                const prevChar = word[word.length - 2];
                if (!prevChar || !['a', 'e', 'i'].includes(prevChar)) {
                    this.debugLog(`語末の無声音: ${word}`);
                    return false;
                }
            }
            
            this.debugLog(`有効な単語: ${word}`);
            return true;
        };
    }

    // デバッグ用のテスト関数
    async testWithSmallValue() {
        this.debugLog('小さな値でテスト開始');
        
        // テスト用の小さな値
        const testValues = [3, 5, 7, 10];
        
        for (const testValue of testValues) {
            this.debugLog(`テスト値: ${testValue}`);
            let count = 0;
            
            for await (const combination of this.generateCombinationsIterative(testValue, 5)) {
                this.debugLog(`組み合わせ: ${combination.join('')}`);
                count++;
                
                const isValidWord = this.createWordValidator();
                for await (const word of this.generatePermutationsEfficient(combination)) {
                    if (isValidWord(word)) {
                        this.debugLog(`有効な単語: ${word}`);
                    }
                }
            }
            
            this.debugLog(`値 ${testValue} の組み合わせ数: ${count}`);
        }
    }

    // ストリーミング方式での結果処理
    async processStreaming(targetValue, elementId, isExact = true) {
        const element = document.getElementById(elementId);
        const isValidWord = this.createWordValidator();
        const foundWords = new Set();
        let combinationCount = 0;
        let permutationCount = 0;
        let validCount = 0;
        
        this.debugLog(`ストリーミング処理開始: target=${targetValue}`);
        
        element.innerHTML = 'お待ちください-組み合わせ生成中...';
        
        try {
            // 組み合わせをストリーミング処理
            for await (const combination of this.generateCombinationsIterative(targetValue)) {
                combinationCount++;
                
                // 進捗表示
                if (combinationCount % 100 === 0) {
                    element.innerHTML = `お待ちください-組み合わせ生成中... (${combinationCount}件)`;
                    await this.delay(0);
                }
                
                // 順列を生成して検証
                for await (const word of this.generatePermutationsEfficient(combination)) {
                    permutationCount++;
                    
                    if (isValidWord(word)) {
                        foundWords.add(word);
                        validCount++;
                        
                        // 定期的に結果を表示
                        if (validCount % 10 === 0) {
                            this.displayPartialResults(foundWords, elementId, isExact);
                            await this.delay(0);
                        }
                    }
                }
            }
            
            this.debugLog(`処理完了: 組み合わせ=${combinationCount}, 順列=${permutationCount}, 有効単語=${validCount}`);
            
            // 最終結果表示
            this.displayResults(foundWords, elementId, targetValue, isExact);
            
        } catch (error) {
            console.error('ストリーミング処理中にエラー:', error);
            element.innerHTML = '処理中にエラーが発生しました';
        }
    }

    // 部分的な結果表示
    displayPartialResults(words, elementId, isExact) {
        const wordArray = Array.from(words);
        if (wordArray.length === 0) return;
        
        wordArray.sort();
        const displayWords = wordArray.slice(0, this.MAX_DISPLAY_WORDS);
        
        const element = document.getElementById(elementId);
        const countText = ` (${wordArray.length}件見つかりました - 処理継続中...)`;
        
        element.innerHTML = displayWords.join(', ') + 
            `<br><span style="color: #666;">${countText}</span>`;
    }

    // 最終結果表示
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
        const displayWords = wordArray.slice(0, this.MAX_DISPLAY_WORDS);
        
        let html = displayWords.join(', ');
        if (wordArray.length > this.MAX_DISPLAY_WORDS) {
            html += `<br><span style="color: #666;">...他 ${wordArray.length - this.MAX_DISPLAY_WORDS} 件の単語が省略されています</span>`;
        }
        
        const totalText = isExact ? 
            `同一Qaballa値(${targetQaballa})の単語` :
            `±2 Qaballa値(${targetQaballa}±2)の単語`;
        
        html = `<strong>${totalText} (${wordArray.length}件):</strong><br>` + html;
        element.innerHTML = html;
    }

    async generateWords(inputValue, targetQaballa) {
        console.log(`生成開始: 入力=${inputValue}, 目標値=${targetQaballa}`);
        
        this.initializeQaballaOur();
        
        const exactlyElement = document.getElementById('exactly');
        const pm2Element = document.getElementById('pm2');
        
        exactlyElement.innerHTML = 'お待ちください-初期化中...';
        pm2Element.innerHTML = 'お待ちください-待機中';

        // まず小さな値でテスト
        await this.testWithSmallValue();

        try {
            // 同一値の処理
            exactlyElement.innerHTML = 'お待ちください-同一値の処理を開始...';
            await this.processStreaming(targetQaballa, 'exactly', true);
            
            // ±2値の処理
            pm2Element.innerHTML = 'お待ちください-±2値の処理を開始...';
            const pm2Words = new Set();
            const promises = [];
            
            for (let diff = -2; diff <= 2; diff++) {
                if (diff === 0) continue;
                
                const currentTarget = targetQaballa + diff;
                if (currentTarget > 0) {
                    promises.push(this.processSingleTarget(currentTarget, diff, pm2Words));
                }
            }
            
            // すべての±2処理を並行実行
            await Promise.all(promises);
            
            // ±2結果表示
            const pm2Array = Array.from(pm2Words);
            if (pm2Array.length === 0) {
                pm2Element.innerHTML = '±2 Qaballa値の有効な単語は見つかりませんでした';
            } else {
                pm2Array.sort();
                const displayWords = pm2Array.slice(0, this.MAX_DISPLAY_WORDS);
                let html = `<strong>±2 Qaballa値(${targetQaballa}±2)の単語 (${pm2Array.length}件):</strong><br>` + 
                           displayWords.join(', ');
                if (pm2Array.length > this.MAX_DISPLAY_WORDS) {
                    html += `<br><span style="color: #666;">...他 ${pm2Array.length - this.MAX_DISPLAY_WORDS} 件の単語が省略されています</span>`;
                }
                pm2Element.innerHTML = html;
            }
            
        } catch (error) {
            console.error('単語生成中にエラー:', error);
            exactlyElement.innerHTML = '処理中にエラーが発生しました';
            pm2Element.innerHTML = '処理中にエラーが発生しました';
        }
    }

    async processSingleTarget(targetValue, diff, resultsSet) {
        this.debugLog(`単一ターゲット処理: ${targetValue}, diff: ${diff}`);
        
        const isValidWord = this.createWordValidator();
        let processed = 0;
        
        for await (const combination of this.generateCombinationsIterative(targetValue)) {
            for await (const word of this.generatePermutationsEfficient(combination)) {
                processed++;
                
                if (isValidWord(word)) {
                    resultsSet.add(`${word} (${diff > 0 ? '+' + diff : diff})`);
                    
                    if (resultsSet.size % 10 === 0) {
                        await this.delay(0);
                    }
                }
                
                if (processed % 1000 === 0) {
                    await this.delay(0);
                }
            }
        }
        
        this.debugLog(`単一ターゲット完了: ${targetValue}, 找到: ${resultsSet.size}`);
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

            // デバッグ情報表示
            console.log('入力データ:', inputData);
            console.log('目標Qaballa値:', targetQaballa);
            console.log('QaballaOurデータ:', window.qaballaOur);

            window.wordGenerator.generateWords(inputData, targetQaballa);
        });
    }
});