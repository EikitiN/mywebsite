// word_generator.js
class WordGenerator {
    constructor() {
        this.charValueMap = new Map();
        this.validationCache = new Map();
        this.combinationCache = new Map();
        this.characterMap = new Map();
        
        this.vowels = ['a', 'e', 'i', 'o', 'u', 'y', '2'];
        this.consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'z', '1', '3', '4', '5'];
        this.voiceless = ['d', 's', 't', 'f', 'p', '3', '4', 'z', 'c', 'h'];
        this.semiVowels = ['j', 'w'];
        
        this.forbiddenPairs = [
            ['k', 'g'], ['s', '5'], ['t', 'd'], 
            ['f', 'v'], ['p', 'b'], ['4', '1']
        ];
        
        this.ITEMS_PER_PAGE = 100;
        this.MAX_LIGHT_MODE_COUNT = 10000;
        
        this.currentPages = { exactly: 1, pm2: 1 };
        this.allWords = { exactly: [], pm2: [] };
        
        this.workerPool = [];
        this.maxWorkers = Math.max(1, navigator.hardwareConcurrency || 4);
        this.activeWorkers = 0;
        this.memoryUsageThreshold = 0.95;
        this.memoryMonitorInterval = null;
        
        this.DEBUG = true;
        
        this.initializeQaballaOur();
        this.initializeCharacterMap();
    }

    calculateOurQaballa(text) {
        if (!text || !window.qaballaOur) return 0;
        
        let total = 0;
        for (const char of text) {
            const charData = window.qaballaOur.find(item => item.data === char);
            if (charData) {
                total += charData.qaballa;
            }
        }
        return total;
    }

    initializeCharacterMap() {
        if (window.characterData && Array.isArray(window.characterData)) {
            for (const charData of window.characterData) {
                this.characterMap.set(charData.data, {
                    character: charData.character,
                    sub: charData.sub,
                    data: charData.data
                });
            }
            this.debugLog('文字マップを初期化しました', this.characterMap.size + '文字');
        } else {
            console.warn('window.characterDataが見つかりません。character.jsonを直接読み込みます。');
            
            fetch('character.json')
                .then(response => {
                    if (!response.ok) throw new Error('character.jsonの読み込みに失敗');
                    return response.json();
                })
                .then(characterData => {
                    for (const charData of characterData) {
                        this.characterMap.set(charData.data, {
                            character: charData.character,
                            sub: charData.sub,
                            data: charData.data
                        });
                    }
                    this.debugLog('character.jsonから文字マップを初期化しました', this.characterMap.size + '文字');
                    window.characterData = characterData;
                })
                .catch(error => {
                    console.error('character.jsonの読み込みに失敗しました:', error);
                });
        }
    }

    convertOutputFormat(words, outputType) {
        if (!Array.isArray(words)) return words;
        
        return words.map(word => {
            const match = word.match(/^(.+?)(\s*\([+-]?\d+\))?$/);
            const mainWord = match[1];
            const suffix = match[2] || '';
            
            let converted = '';
            for (const char of mainWord) {
                let convertedChar = char;
                
                if (this.characterMap.has(char)) {
                    const charData = this.characterMap.get(char);
                    switch(outputType) {
                        case 'Kanji':
                            convertedChar = charData.character;
                            break;
                        case 'Karihyouki':
                            convertedChar = charData.sub;
                            break;
                        case 'Data':
                        default:
                            convertedChar = charData.data;
                            break;
                    }
                }
                converted += convertedChar;
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
        
        this.charValueMap.clear();
        window.qaballaOur.forEach(c => {
            this.charValueMap.set(c.data, c.qaballa);
        });
    }
    
    createWordValidator() {
        const vowelPattern = /[aeiouy2]{3,}/;
        const consonantPattern = /[bcdfghjklmnpqrstvwxz1345]{4,}/;
        const forbiddenPatterns = this.forbiddenPairs.map(pair => 
            new RegExp(`${pair[0]}${pair[1]}|${pair[1]}${pair[0]}`)
        );
        
        const additionalForbiddenPatterns = [
            /jw|wj/, /sj|sw/, /3j/, /mw|nw/, /([jw])\1/,
        ];
        
        return (word) => {
            if (this.validationCache.has(word)) {
                return this.validationCache.get(word);
            }
            
            if (!word || word.length === 0 || word.length > 20) {
                this.validationCache.set(word, false);
                return false;
            }
            
            if (!/[aeiouy2]/.test(word)) {
                this.validationCache.set(word, false);
                return false;
            }
            
            for (const char of word) {
                if (!this.availableChars.includes(char)) {
                    this.validationCache.set(word, false);
                    return false;
                }
            }
            
            if (vowelPattern.test(word) || consonantPattern.test(word)) {
                this.validationCache.set(word, false);
                return false;
            }
            
            for (const pattern of forbiddenPatterns) {
                if (pattern.test(word)) {
                    this.validationCache.set(word, false);
                    return false;
                }
            }
            
            for (const pattern of additionalForbiddenPatterns) {
                if (pattern.test(word)) {
                    this.validationCache.set(word, false);
                    return false;
                }
            }
            
            if (word.startsWith('l') && word.length > 1) {
                const secondChar = word[1];
                if (!this.vowels.includes(secondChar) && secondChar !== 'y') {
                    this.validationCache.set(word, false);
                    return false;
                }
            }
            
            for (let i = 0; i < word.length; i++) {
                if (this.semiVowels.includes(word[i])) {
                    const remaining = word.slice(i + 1);
                    if (remaining.length === 0) {
                        this.validationCache.set(word, false);
                        return false;
                    }
                    if (!this.vowels.includes(remaining[0])) {
                        if (remaining.length < 2 || !this.vowels.includes(remaining[1])) {
                            this.validationCache.set(word, false);
                            return false;
                        }
                    }
                }
            }
            
            const lastChar = word[word.length - 1];
            if (this.voiceless.includes(lastChar)) {
                const prevChar = word[word.length - 2];
                if (!prevChar || !['a', 'e', 'i'].includes(prevChar)) {
                    this.validationCache.set(word, false);
                    return false;
                }
            }
            
            this.validationCache.set(word, true);
            return true;
        };
    }

    updateProgress(elementId, value, max) {
        const progressBar = document.getElementById(elementId);
        if (progressBar) {
            progressBar.value = value;
            progressBar.max = max;
        }
    }

    updateStatus(message) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
        }
        this.debugLog(message);
    }

    debugLog(...args) {
        if (this.DEBUG) {
            console.log('[WordGenerator]', ...args);
        }
    }

    async startMemoryMonitoring() {
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
        }
        
        this.memoryMonitorInterval = setInterval(() => {
            if (performance && performance.memory) {
                const memoryInfo = performance.memory;
                const usedMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
                const totalMB = memoryInfo.totalJSHeapSize / (1024 * 1024);
                const usagePercent = (usedMB / totalMB) * 100;
                
                this.debugLog(`メモリ使用量: ${usedMB.toFixed(2)}MB / ${totalMB.toFixed(2)}MB (${usagePercent.toFixed(1)}%)`);
                
                if (usagePercent > this.memoryUsageThreshold * 100) {
                    this.debugLog('メモリ使用量が閾値を超えました。処理を一時停止します。');
                    this.pauseProcessing();
                }
            }
        }, 1000);
    }

    stopMemoryMonitoring() {
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
            this.memoryMonitorInterval = null;
        }
    }

    pauseProcessing() {
        this.debugLog('処理を一時停止しました');
    }

    async generateWords(targetValue, minLength, maxLength, maxCount, mode = 'light', exactMatch = true) {
        this.debugLog(`generateWords開始: target=${targetValue}, minLen=${minLength}, maxLen=${maxLength}, maxCount=${maxCount}, mode=${mode}, exact=${exactMatch}`);
        
        this.validationCache.clear();
        this.combinationCache.clear();
        const isValidWord = this.createWordValidator();
        
        if (mode === 'light') {
            return this.generateLightMode(targetValue, minLength, maxLength, maxCount, exactMatch);
        } else {
            return this.generateHeavyMode(targetValue, minLength, maxLength, maxCount, exactMatch);
        }
    }

    async generateLightMode(targetValue, minLength, maxLength, maxCount, exactMatch = true) {
        this.debugLog(`軽量モード開始: target=${targetValue}, minLen=${minLength}, maxLen=${maxLength}, maxCount=${maxCount}`);
        
        const foundWords = new Set();
        let attempts = 0;
        const maxAttempts = maxCount * 1000;
        
        // 文字数範囲を計算
        const minCharValue = 1;
        const maxCharValue = 29;
        
        const adjustedMinLength = Math.max(1, minLength);
        const adjustedMaxLength = Math.min(20, maxLength);
        
        this.debugLog(`文字数範囲: ${adjustedMinLength}-${adjustedMaxLength}`);
        
        // 値でグループ化された文字
        const charsByValue = {};
        window.qaballaOur.forEach(c => {
            if (!charsByValue[c.qaballa]) charsByValue[c.qaballa] = [];
            charsByValue[c.qaballa].push(c.data);
        });
        
        while (foundWords.size < maxCount && attempts < maxAttempts) {
            attempts++;
            
            if (attempts % 1000 === 0) {
                this.updateStatus(`軽量モード: ${foundWords.size}/${maxCount} 単語生成中... (試行: ${attempts})`);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            const length = Math.floor(Math.random() * (adjustedMaxLength - adjustedMinLength + 1)) + adjustedMinLength;
            let word = '';
            let totalValue = 0;
            let valid = true;
            
            for (let i = 0; i < length; i++) {
                const remainingValue = targetValue - totalValue;
                const remainingSlots = length - i;
                
                if (remainingValue <= 0) {
                    valid = false;
                    break;
                }
                
                // 可能な文字値の範囲を計算
                const minNextValue = Math.max(1, remainingValue - (remainingSlots - 1) * maxCharValue);
                const maxNextValue = Math.min(29, remainingValue - (remainingSlots - 1) * minCharValue);
                
                if (minNextValue > maxNextValue) {
                    valid = false;
                    break;
                }
                
                // 有効な文字を選択
                const availableChars = [];
                for (let val = minNextValue; val <= maxNextValue; val++) {
                    if (charsByValue[val]) {
                        availableChars.push(...charsByValue[val]);
                    }
                }
                
                if (availableChars.length === 0) {
                    valid = false;
                    break;
                }
                
                const randomChar = availableChars[Math.floor(Math.random() * availableChars.length)];
                const charValue = this.charValueMap.get(randomChar);
                
                word += randomChar;
                totalValue += charValue;
                
                if (totalValue === targetValue && i < length - 1) {
                    // 早く達成しすぎた場合、残りをaで埋める
                    for (let j = i + 1; j < length; j++) {
                        word += 'a';
                        totalValue += 1;
                    }
                    break;
                }
            }
            
            if (valid && totalValue === targetValue && isValidWord(word)) {
                foundWords.add(word);
                this.debugLog(`有効な単語を発見: ${word} (${totalValue})`);
            }
        }
        
        this.debugLog(`軽量モード完了: ${foundWords.size} 単語生成 (試行: ${attempts})`);
        
        if (foundWords.size < maxCount) {
            this.debugLog(`警告: 要求された ${maxCount} 単語のうち ${foundWords.size} 個しか生成できませんでした`);
        }
        
        return Array.from(foundWords).slice(0, maxCount);
    }

    async generateHeavyMode(targetValue, minLength, maxLength, maxCount, exactMatch = true) {
        this.debugLog(`重量モード開始: target=${targetValue}, minLen=${minLength}, maxLen=${maxLength}, maxCount=${maxCount}`);
        
        const results = [];
        const isValidWord = this.createWordValidator();
        
        // ワーカーを使用した並列処理
        const workerResults = await this.processWithWorkers(targetValue, minLength, maxLength, maxCount);
        
        for (const word of workerResults) {
            if (results.length >= maxCount) break;
            if (isValidWord(word)) {
                results.push(word);
            }
        }
        
        this.debugLog(`重量モード完了: ${results.length} 単語生成`);
        return results.slice(0, maxCount);
    }

    async processWithWorkers(targetValue, minLength, maxLength, maxCount) {
        this.debugLog(`ワーカー処理開始: target=${targetValue}, maxCount=${maxCount}`);
        
        return new Promise((resolve) => {
            const results = new Set();
            let completedWorkers = 0;
            let totalWorkers = this.maxWorkers;
            
            // ワーカープールの初期化
            for (let i = 0; i < this.maxWorkers; i++) {
                try {
                    const worker = new Worker('word-generator-worker.js');
                    worker.workerId = i;
                    
                    worker.onmessage = (e) => {
                        if (e.data.type === 'result') {
                            const workerWords = e.data.words;
                            this.debugLog(`ワーカー ${e.data.workerId} から ${workerWords.length} 単語受信`);
                            
                            for (const word of workerWords) {
                                if (results.size < maxCount) {
                                    results.add(word);
                                }
                            }
                            
                            worker.terminate();
                            completedWorkers++;
                            
                            if (completedWorkers === totalWorkers || results.size >= maxCount) {
                                this.debugLog(`全ワーカー完了: ${results.size} 単語収集`);
                                resolve(Array.from(results));
                            }
                        }
                    };
                    
                    worker.onerror = (error) => {
                        console.error(`ワーカー ${i} エラー:`, error);
                        completedWorkers++;
                        
                        if (completedWorkers === totalWorkers) {
                            resolve(Array.from(results));
                        }
                    };
                    
                    this.workerPool.push(worker);
                    
                    // ワーカーに処理を開始させる
                    worker.postMessage({
                        type: 'start',
                        chunk: {
                            targetValue: targetValue,
                            minLength: minLength,
                            maxLength: maxLength,
                            maxCount: Math.ceil(maxCount / this.maxWorkers)
                        },
                        workerId: i
                    });
                    
                } catch (error) {
                    console.error(`ワーカー ${i} の初期化に失敗:`, error);
                    totalWorkers--;
                }
            }
            
            // ワーカーが全く起動できなかった場合
            if (totalWorkers === 0) {
                this.debugLog('ワーカーが起動できないため、軽量モードで処理します');
                this.generateLightMode(targetValue, minLength, maxLength, maxCount)
                    .then(resolve);
            }
        });
    }

    cleanup() {
        this.stopMemoryMonitoring();
        
        // ワーカーを終了
        for (const worker of this.workerPool) {
            try {
                worker.terminate();
            } catch (e) {
                // 無視
            }
        }
        this.workerPool = [];
        
        this.validationCache.clear();
        this.combinationCache.clear();
    }
}

// グローバルインスタンス
window.wordGenerator = new WordGenerator();