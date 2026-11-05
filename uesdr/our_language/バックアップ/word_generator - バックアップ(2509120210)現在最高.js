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
        this.ITEMS_PER_PAGE = 100;
        this.MAX_LIGHT_MODE_COUNT = 10000;
        
        // 状態管理
        this.currentPages = { exactly: 1, pm2: 1 };
        this.allWords = { exactly: [], pm2: [] };
        this.characterMap = new Map();
        
        this.DEBUG = true;
        
        // 文字マップを初期化
        this.initializeCharacterMap();
    }

    // character.jsonから文字マップを作成
    initializeCharacterMap() {
        if (window.characterData && Array.isArray(window.characterData)) {
            for (const charData of window.characterData) {
                this.characterMap.set(charData.data, {
                    character: charData.character,
                    sub: charData.sub,
                    data: charData.data
                });
            }
            this.debugLog('文字マップを初期化しました', this.characterMap);
        } else {
            console.warn('characterDataが見つかりませんでした');
        }
    }

    // 出力形式を変換
    convertOutputFormat(words, outputType) {
        if (!Array.isArray(words)) return words;
        if (outputType === 'Data' || !this.characterMap.size) return words;
        
        return words.map(word => {
            // (±1などの接尾辞を処理)
            const match = word.match(/^(.+?)(\s*\([+-]?\d+\))?$/);
            const mainWord = match[1];
            const suffix = match[2] || '';
            
            let converted = '';
            for (const char of mainWord) {
                const charData = this.characterMap.get(char);
                if (charData) {
                    switch(outputType) {
                        case 'Kanji':
                            converted += charData.character;
                            break;
                        case 'Karihyouki':
                            converted += charData.sub;
                            break;
                        default:
                            converted += char;
                    }
                } else {
                    converted += char;
                }
            }
            return converted + suffix;
        });
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

    // 単語検証関数を作成
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

    // 軽量モード用のランダム生成
    async generateLightMode(targetValue, maxCount) {
        const isValidWord = this.createWordValidator();
        const foundWords = new Set();
        let attempts = 0;
        const maxAttempts = maxCount * 10;
        
        this.debugLog(`軽量モード開始: target=${targetValue}, maxCount=${maxCount}`);

        while (foundWords.size < maxCount && attempts < maxAttempts) {
            attempts++;
            
            const length = Math.floor(Math.random() * 10) + 1;
            let word = '';
            let totalValue = 0;
            
            for (let i = 0; i < length; i++) {
                const randomChar = this.availableChars[Math.floor(Math.random() * this.availableChars.length)];
                const charValue = window.qaballaOur.find(c => c.data === randomChar)?.qaballa || 0;
                
                if (totalValue + charValue > targetValue) {
                    break;
                }
                
                word += randomChar;
                totalValue += charValue;
            }
            
            if (totalValue === targetValue && isValidWord(word)) {
                foundWords.add(word);
                
                if (foundWords.size % 100 === 0) {
                    this.debugLog(`軽量モード進捗: ${foundWords.size}/${maxCount}単語`);
                    await this.delay(0);
                }
            }
            
            if (attempts % 1000 === 0) {
                await this.delay(0);
            }
        }
        
        this.debugLog(`軽量モード完了: ${foundWords.size}単語, ${attempts}試行`);
        return Array.from(foundWords).sort();
    }

    // 組み合わせ生成（反復深化探索）
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

    // 順列生成
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

    // 全処理モード
    async generateFullMode(targetValue) {
        const isValidWord = this.createWordValidator();
        const foundWords = new Set();
        let combinationCount = 0;
        
        this.debugLog(`全処理モード開始: target=${targetValue}`);

        for await (const combination of this.generateCombinationsIterative(targetValue)) {
            combinationCount++;
            
            if (combinationCount % 100 === 0) {
                await this.delay(0);
            }
            
            for await (const word of this.generatePermutationsEfficient(combination)) {
                if (isValidWord(word)) {
                    foundWords.add(word);
                    
                    if (foundWords.size % 100 === 0) {
                        await this.delay(0);
                    }
                }
            }
        }
        
        this.debugLog(`全処理モード完了: ${foundWords.size}単語`);
        return Array.from(foundWords).sort();
    }

    // ページ表示
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

    // ページネーションコントロール
    createPaginationControls(elementId, currentPage, totalPages, totalItems) {
        const controls = document.createElement('div');
        controls.style.marginTop = '10px';
        controls.style.padding = '10px';
        controls.style.backgroundColor = '#f5f5f5';
        controls.style.borderRadius = '5px';
        
        const prevButton = document.createElement('button');
        prevButton.textContent = '＜ 前へ';
        prevButton.disabled = currentPage === 1;
        prevButton.onclick = () => this.changePage(elementId, currentPage - 1);
        prevButton.style.marginRight = '10px';
        
        const nextButton = document.createElement('button');
        nextButton.textContent = '次へ ＞';
        nextButton.disabled = currentPage === totalPages;
        nextButton.onclick = () => this.changePage(elementId, currentPage + 1);
        nextButton.style.marginLeft = '10px';
        
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `ページ ${currentPage} / ${totalPages} (全 ${totalItems} 件)`;
        pageInfo.style.margin = '0 15px';
        
        const pageSelect = document.createElement('select');
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

    // メインの生成関数
    async generateWords(inputValue, targetQaballa) {
        console.log(`生成開始: 入力=${inputValue}, 目標値=${targetQaballa}`);
        
        this.initializeQaballaOur();
        this.initializeCharacterMap();
        
        const exactlyElement = document.getElementById('exactly');
        const pm2Element = document.getElementById('pm2');
        
        // 処理モードと出力形式を取得
        const processingMode = document.querySelector('input[name="processingMode"]:checked').value;
        const outputType = document.querySelector('input[name="qaballaex"]:checked').value;
        const generateCount = processingMode === 'light' ? 
            Math.min(parseInt(document.getElementById('generateCount').value) || 100, this.MAX_LIGHT_MODE_COUNT) : 
            null;
        
        exactlyElement.innerHTML = 'お待ちください-初期化中...';
        pm2Element.innerHTML = 'お待ちください-待機中';

        try {
            // 同一値の処理
            exactlyElement.innerHTML = 'お待ちください-同一値の処理を開始...';
            
            let exactWords;
            if (processingMode === 'light') {
                exactWords = await this.generateLightMode(targetQaballa, generateCount);
            } else {
                exactWords = await this.generateFullMode(targetQaballa);
            }
            
            // 出力形式を変換
            exactWords = this.convertOutputFormat(exactWords, outputType);
            
            this.allWords['exactly'] = exactWords;
            this.currentPages['exactly'] = 1;
            
            if (exactWords.length === 0) {
                exactlyElement.innerHTML = '同一Qaballa値の有効な単語は見つかりませんでした';
            } else {
                this.displayPage('exactly', 1);
            }
            
            // ±1値の処理
            pm2Element.innerHTML = 'お待ちください-±1値の処理を開始...';
            const pm2Words = [];
            const promises = [];
            
            for (let diff = -1; diff <= 1; diff++) {
                if (diff === 0) continue;
                
                const currentTarget = targetQaballa + diff;
                if (currentTarget > 0) {
                    promises.push((async () => {
                        let words;
                        if (processingMode === 'light') {
                            words = await this.generateLightMode(currentTarget, generateCount);
                        } else {
                            words = await this.generateFullMode(currentTarget);
                        }
                        
                        // 出力形式を変換して接尾辞を追加
                        words = this.convertOutputFormat(words, outputType);
                        return words.map(word => `${word} (${diff > 0 ? '+' + diff : diff})`);
                    })());
                }
            }
            
            const pm2Results = await Promise.all(promises);
            for (const result of pm2Results) {
                pm2Words.push(...result);
            }
            
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

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
}

window.wordGenerator = new WordGenerator();

document.addEventListener('DOMContentLoaded', function() {
    const generateButton = document.querySelector('.qaballacreate');
    if (generateButton) {
        generateButton.addEventListener('click', function() {
            const oursRadio = document.getElementById('Ours');
            if (!oursRadio || !oursRadio.checked) {
                alert('この機能はIke\'s Qaballaモードでののみ利用できます');
                return;
            }

            const inputData = window.getInputData();
            const targetQaballa = window.calculateTextValue(inputData, 'ours');
            
            if (targetQaballa === 0) {
                alert('有効な入力値を入力してください');
                return;
            }

            // 状態をリセット
            window.wordGenerator.allWords = { exactly: [], pm2: [] };
            window.wordGenerator.currentPages = { exactly: 1, pm2: 1 };

            window.wordGenerator.generateWords(inputData, targetQaballa);
        });
    }

    // 軽量モード設定の表示/非表示を切り替え
    const modeRadios = document.querySelectorAll('input[name="processingMode"]');
    const lightModeSettings = document.getElementById('lightModeSettings');
    
    function toggleLightModeSettings() {
        const selectedMode = document.querySelector('input[name="processingMode"]:checked').value;
        lightModeSettings.style.display = selectedMode === 'light' ? 'block' : 'none';
    }
    
    modeRadios.forEach(radio => {
        radio.addEventListener('change', toggleLightModeSettings);
    });
    
    // 初期表示
    toggleLightModeSettings();
});