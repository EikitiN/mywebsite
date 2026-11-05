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
        
        // 設定
        this.ITEMS_PER_PAGE = 100; // 1ページあたりの表示数
        this.CHUNK_SIZE = 100;
        this.MEMORY_CLEAR_THRESHOLD = 10000;
        
        // ページネーション状態
        this.currentPages = {
            exactly: 1,
            pm2: 1
        };
        this.allWords = {
            exactly: [],
            pm2: []
        };
        
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
    }

    debugLog(message, data = null) {
        if (this.DEBUG) {
            if (data) {
                console.log(`[DEBUG] ${message}`, data);
            } else {
                console.log(`[DEBUG] ${message}`);
            }
        }
    }

    // ページネーションコントロールを作成
    createPaginationControls(elementId, currentPage, totalPages, totalItems) {
        const element = document.getElementById(elementId);
        const controls = document.createElement('div');
        controls.style.marginTop = '10px';
        controls.style.padding = '10px';
        controls.style.backgroundColor = '#f5f5f5';
        controls.style.borderRadius = '5px';
        
        // 前へボタン
        const prevButton = document.createElement('button');
        prevButton.textContent = '＜ 前へ';
        prevButton.disabled = currentPage === 1;
        prevButton.onclick = () => this.changePage(elementId, currentPage - 1);
        prevButton.style.marginRight = '10px';
        prevButton.style.padding = '5px 10px';
        
        // 次へボタン
        const nextButton = document.createElement('button');
        nextButton.textContent = '次へ ＞';
        nextButton.disabled = currentPage === totalPages;
        nextButton.onclick = () => this.changePage(elementId, currentPage + 1);
        nextButton.style.marginLeft = '10px';
        nextButton.style.padding = '5px 10px';
        
        // ページ情報
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `ページ ${currentPage} / ${totalPages} (全 ${totalItems} 件)`;
        pageInfo.style.margin = '0 15px';
        
        // ページ選択
        const pageSelect = document.createElement('select');
        pageSelect.style.marginLeft = '10px';
        pageSelect.onchange = (e) => this.changePage(elementId, parseInt(e.target.value));
        
        for (let i = 1; i <= totalPages; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === currentPage) option.selected = true;
            pageSelect.appendChild(option);
        }
        
        controls.appendChild(prevButton);
        controls.appendChild(pageInfo);
        controls.appendChild(nextButton);
        controls.appendChild(pageSelect);
        
        return controls;
    }

    // ページ変更
    changePage(elementId, newPage) {
        const words = this.allWords[elementId];
        if (!words || words.length === 0) return;
        
        const totalPages = Math.ceil(words.length / this.ITEMS_PER_PAGE);
        if (newPage < 1 || newPage > totalPages) return;
        
        this.currentPages[elementId] = newPage;
        this.displayPage(elementId, newPage);
    }

    // 特定のページを表示
    displayPage(elementId, page) {
        const words = this.allWords[elementId];
        const totalPages = Math.ceil(words.length / this.ITEMS_PER_PAGE);
        const startIndex = (page - 1) * this.ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + this.ITEMS_PER_PAGE, words.length);
        const pageWords = words.slice(startIndex, endIndex);
        
        const element = document.getElementById(elementId);
        
        // 既存のページネーションコントロールを削除
        const existingControls = element.querySelector('.pagination-controls');
        if (existingControls) {
            existingControls.remove();
        }
        
        // 単語表示
        element.innerHTML = pageWords.join(', ');
        
        // ページネーションコントロールを追加
        if (words.length > this.ITEMS_PER_PAGE) {
            const controls = this.createPaginationControls(elementId, page, totalPages, words.length);
            controls.className = 'pagination-controls';
            element.appendChild(document.createElement('br'));
            element.appendChild(controls);
        }
    }

    async *generateCombinationsIterative(targetValue, maxLength = 10) {
        const stack = [{value: 0, chars: [], lastIndex: 0}];
        let yielded = 0;
        
        this.debugLog(`組み合わせ生成開始: target=${targetValue}`);
        
        while (stack.length > 0) {
            const current = stack.pop();
            
            if (current.value === targetValue) {
                yielded++;
                yield current.chars;
                
                if (yielded % 100 === 0) {
                    await this.delay(0);
                }
                continue;
            }
            
            if (current.chars.length >= maxLength) {
                continue;
            }
            
            const remainingValue = targetValue - current.value;
            const minCharValue = Math.min(...window.qaballaOur.map(c => c.qaballa));
            if (remainingValue < minCharValue) {
                continue;
            }
            
            for (let i = current.lastIndex; i < window.qaballaOur.length; i++) {
                const charData = window.qaballaOur[i];
                const newValue = current.value + charData.qaballa;
                
                if (newValue <= targetValue) {
                    stack.push({
                        value: newValue,
                        chars: [...current.chars, charData.data],
                        lastIndex: i
                    });
                }
            }
        }
        
        this.debugLog(`組み合わせ生成完了: 総数=${yielded}`);
    }

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

    createWordValidator() {
        const vowelPattern = /[aeiouy2]{3,}/;
        const consonantPattern = /[bcdfghjklmnpqrstvwxz1345]{5,}/;
        const forbiddenPatterns = this.forbiddenPairs.map(pair => 
            new RegExp(`${pair[0]}${pair[1]}|${pair[1]}${pair[0]}`)
        );
        
        return (word) => {
            if (!word || word.length === 0 || word.length > 20) return false;
            
            for (const char of word) {
                if (!this.availableChars.includes(char)) return false;
            }
            
            if (vowelPattern.test(word)) return false;
            if (consonantPattern.test(word)) return false;
            
            for (const pattern of forbiddenPatterns) {
                if (pattern.test(word)) return false;
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
        };
    }

    async processStreaming(targetValue, elementId, isExact = true) {
        const element = document.getElementById(elementId);
        const isValidWord = this.createWordValidator();
        const foundWords = [];
        let combinationCount = 0;
        
        element.innerHTML = 'お待ちください-組み合わせ生成中...';
        
        try {
            for await (const combination of this.generateCombinationsIterative(targetValue)) {
                combinationCount++;
                
                if (combinationCount % 100 === 0) {
                    element.innerHTML = `お待ちください-組み合わせ生成中... (${combinationCount}件処理済み)`;
                    await this.delay(0);
                }
                
                for await (const word of this.generatePermutationsEfficient(combination)) {
                    if (isValidWord(word)) {
                        foundWords.push(word);
                        
                        if (foundWords.length % 100 === 0) {
                            element.innerHTML = `お待ちください-有効な単語を検証中... (${foundWords.length}件見つかりました)`;
                            await this.delay(0);
                        }
                    }
                }
            }
            
            // 結果を保存して表示
            foundWords.sort();
            this.allWords[elementId] = foundWords;
            this.currentPages[elementId] = 1;
            
            if (foundWords.length === 0) {
                element.innerHTML = isExact ? 
                    '同一Qaballa値の有効な単語は見つかりませんでした' :
                    '±1 Qaballa値の有効な単語は見つかりませんでした';
            } else {
                this.displayPage(elementId, 1);
            }
            
        } catch (error) {
            console.error('処理中にエラー:', error);
            element.innerHTML = '処理中にエラーが発生しました';
        }
    }

    async generateWords(inputValue, targetQaballa) {
        console.log(`生成開始: 入力=${inputValue}, 目標値=${targetQaballa}`);
        
        this.initializeQaballaOur();
        
        const exactlyElement = document.getElementById('exactly');
        const pm2Element = document.getElementById('pm2');
        
        exactlyElement.innerHTML = 'お待ちください-初期化中...';
        pm2Element.innerHTML = 'お待ちください-待機中';

        try {
            // 同一値の処理
            exactlyElement.innerHTML = 'お待ちください-同一値の処理を開始...';
            await this.processStreaming(targetQaballa, 'exactly', true);
            
            // ±1値の処理（±2から±1に変更）
            pm2Element.innerHTML = 'お待ちください-±1値の処理を開始...';
            const pm2Words = [];
            const promises = [];
            
            for (let diff = -1; diff <= 1; diff++) { // ±2 → ±1に変更
                if (diff === 0) continue;
                
                const currentTarget = targetQaballa + diff;
                if (currentTarget > 0) {
                    promises.push(this.processSingleTarget(currentTarget, diff, pm2Words));
                }
            }
            
            await Promise.all(promises);
            
            // ±1結果を保存して表示
            pm2Words.sort();
            this.allWords['pm2'] = pm2Words;
            this.currentPages['pm2'] = 1;
            
            if (pm2Words.length === 0) {
                pm2Element.innerHTML = '±1 Qaballa値の有効な単語は見つかりませんでした';
            } else {
                this.displayPage('pm2', 1);
            }
            
        } catch (error) {
            console.error('単語生成中にエラー:', error);
            exactlyElement.innerHTML = '処理中にエラーが発生しました';
            pm2Element.innerHTML = '処理中にエラーが発生しました';
        }
    }

    async processSingleTarget(targetValue, diff, resultsArray) {
        const isValidWord = this.createWordValidator();
        
        for await (const combination of this.generateCombinationsIterative(targetValue)) {
            for await (const word of this.generatePermutationsEfficient(combination)) {
                if (isValidWord(word)) {
                    resultsArray.push(`${word} (${diff > 0 ? '+' + diff : diff})`);
                    
                    if (resultsArray.length % 100 === 0) {
                        await this.delay(0);
                    }
                }
            }
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

            // ページネーション状態をリセット
            window.wordGenerator.allWords = { exactly: [], pm2: [] };
            window.wordGenerator.currentPages = { exactly: 1, pm2: 1 };

            window.wordGenerator.generateWords(inputData, targetQaballa);
        });
    }
});