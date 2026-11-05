// word-generator-worker.js
// 実際の組み合わせ生成ロジック

// 文字データをインポート
let qaballaOur = [
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

// 単語検証関数
function createWordValidator() {
    const vowels = ['a', 'e', 'i', 'o', 'u', 'y', '2'];
    const consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'z', '1', '3', '4', '5'];
    const voiceless = ['d', 's', 't', 'f', 'p', '3', '4', 'z', 'c', 'h'];
    const semiVowels = ['j', 'w'];
    const forbiddenPairs = [
        ['k', 'g'], ['s', '5'], ['t', 'd'], 
        ['f', 'v'], ['p', 'b'], ['4', '1']
    ];
    
    const vowelPattern = /[aeiouy2]{3,}/;
    const consonantPattern = /[bcdfghjklmnpqrstvwxz1345]{4,}/;
    const forbiddenPatterns = forbiddenPairs.map(pair => 
        new RegExp(`${pair[0]}${pair[1]}|${pair[1]}${pair[0]}`)
    );
    
    const additionalForbiddenPatterns = [
        /jw|wj/, /sj|sw/, /3j/, /mw|nw/, /([jw])\1/,
    ];
    
    return (word) => {
        if (!word || word.length === 0 || word.length > 20) {
            return false;
        }
        
        if (!/[aeiouy2]/.test(word)) {
            return false;
        }
        
        for (const char of word) {
            if (!qaballaOur.some(item => item.data === char)) {
                return false;
            }
        }
        
        if (vowelPattern.test(word) || consonantPattern.test(word)) {
            return false;
        }
        
        for (const pattern of forbiddenPatterns) {
            if (pattern.test(word)) {
                return false;
            }
        }
        
        for (const pattern of additionalForbiddenPatterns) {
            if (pattern.test(word)) {
                return false;
            }
        }
        
        if (word.startsWith('l') && word.length > 1) {
            const secondChar = word[1];
            if (!vowels.includes(secondChar) && secondChar !== 'y') {
                return false;
            }
        }
        
        for (let i = 0; i < word.length; i++) {
            if (semiVowels.includes(word[i])) {
                const remaining = word.slice(i + 1);
                if (remaining.length === 0) {
                    return false;
                }
                if (!vowels.includes(remaining[0])) {
                    if (remaining.length < 2 || !vowels.includes(remaining[1])) {
                        return false;
                    }
                }
            }
        }
        
        const lastChar = word[word.length - 1];
        if (voiceless.includes(lastChar)) {
            const prevChar = word[word.length - 2];
            if (!prevChar || !['a', 'e', 'i'].includes(prevChar)) {
                return false;
            }
        }
        
        return true;
    };
}

// 軽量モード（現実的） - ワーカー用
function generateLightModeRealistic(targetValue, maxCount) {
    const isValidWord = createWordValidator();
    const foundWords = new Set();
    let attempts = 0;
    const maxAttempts = maxCount * 1000;
    
    // 文字数範囲を計算
    const minCharValue = 1;
    const maxCharValue = 29;
    
    const minLength = Math.max(1, Math.ceil(targetValue / maxCharValue));
    const maxLength = Math.min(20, Math.floor(targetValue / minCharValue));
    
    const adjustedMinLength = Math.max(1, minLength);
    const adjustedMaxLength = Math.min(20, maxLength);
    
    // 値でグループ化された文字
    const charsByValue = {};
    qaballaOur.forEach(c => {
        if (!charsByValue[c.qaballa]) charsByValue[c.qaballa] = [];
        charsByValue[c.qaballa].push(c.data);
    });
    
    const charValueMap = new Map();
    qaballaOur.forEach(c => {
        charValueMap.set(c.data, c.qaballa);
    });
    
    while (foundWords.size < maxCount && attempts < maxAttempts) {
        attempts++;
        
        const length = Math.floor(Math.random() * (adjustedMaxLength - adjustedMinLength + 1)) + adjustedMinLength;
        let word = '';
        let totalValue = 0;
        let valid = true;
        
        for (let i = 0; i < length; i++) {
            const remainingValue = targetValue - totalValue;
            const remainingSlots = length - i;
            
            // 可能な文字値の範囲を計算
            const minNextValue = Math.max(1, remainingValue - (remainingSlots - 1) * maxCharValue);
            const maxNextValue = Math.min(29, remainingValue - (remainingSlots - 1) * minCharValue);
            
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
            const charValue = charValueMap.get(randomChar);
            
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
        }
    }
    
    return Array.from(foundWords);
}

self.onmessage = async function(e) {
    if (e.data.type === 'start') {
        const { chunk, workerId } = e.data;
        const { targetValue, minLength, maxLength, maxCount } = chunk;
        
        // 軽量モードで処理
        const results = generateLightModeRealistic(targetValue, maxCount);
        
        self.postMessage({
            type: 'result',
            words: results,
            workerId: workerId
        });
    }
};