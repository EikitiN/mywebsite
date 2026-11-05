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
    }

    // 音のルールに合致するかチェック
    isValidWord(word) {
        // 母音の連続チェック (3つまで)
        const vowelSequences = word.match(/[aeiouy2]{4,}/g);
        if (vowelSequences && vowelSequences.length > 0) {
            return false;
        }

        // 子音の連続チェック (4つまで) と禁止ペアチェック
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

    /*// 文字の組み合わせを生成
    generateCombinations(targetValue, currentValue = 0, currentChars = [], allCombinations = [], maxLength = 10) {
        if (currentValue === targetValue) {
            allCombinations.push([...currentChars]);
            return;
        }

        if (currentChars.length >= maxLength) {
            return;
        }

        // 使用可能な文字で再帰的に組み合わせを生成
        for (const charData of window.qaballaOur) {
            const newValue = currentValue + charData.qaballa;
            if (newValue <= targetValue) {
                currentChars.push(charData.data);
                this.generateCombinations(targetValue, newValue, currentChars, allCombinations, maxLength);
                currentChars.pop();
            }
        }
    }*/
	/*
	generateCombinations(targetValue, currentValue = 0, currentChars = [], allCombinations = [], maxLength = 10, depth = 0) {
		// 深さ制限（デバッグ用）
		if (depth > 1000) {
			console.log('深さ制限に達しました');
			return;
		}
		
		if (currentValue === targetValue) {
			allCombinations.push([...currentChars]);
			console.log(`組み合わせ found: ${currentChars.join('')}, value: ${currentValue}`);
			return;
		}
	
		if (currentChars.length >= maxLength) {
			return;
		}
	
		// 使用可能な文字で再帰的に組み合わせを生成
		for (const charData of window.qaballaOur) {
			const newValue = currentValue + charData.qaballa;
			if (newValue <= targetValue) {
				currentChars.push(charData.data);
				this.generateCombinations(targetValue, newValue, currentChars, allCombinations, maxLength, depth + 1);
				currentChars.pop();
			}
		}
	}*/
	// より効率的な組み合わせ生成アルゴリズム
	generateCombinationsEfficient(targetValue, maxLength = 10) {
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

    /*// メインの生成関数
    async generateWords(inputValue, targetQaballa) {
        // 1. 待機中表示
        document.getElementById('exactly').innerHTML = 'お待ちください-待機中';
        document.getElementById('pm2').innerHTML = 'お待ちください-待機中';

        await this.delay(100); // 少し待ってUIを更新

        // 2. 同一Qaballaの組み合わせ生成
        document.getElementById('exactly').innerHTML = 'お待ちください-組み合わせ計算中';
        const exactCombinations = [];
        this.generateCombinations(targetQaballa, 0, [], exactCombinations);

        // 3. 並び替え計算
        document.getElementById('exactly').innerHTML = 'お待ちください-並び替え計算中';
        await this.delay(100);

        let exactWords = new Set();
        for (const combo of exactCombinations) {
            const permutations = this.generatePermutations(combo);
            for (const word of permutations) {
                if (this.isValidWord(word)) {
                    exactWords.add(word);
                }
            }
        }

        // 4. 結果表示
        this.displayResults(exactWords, 'exactly', targetQaballa, true);

        // 5. ±2 Qaballaの組み合わせ生成
        document.getElementById('pm2').innerHTML = 'お待ちください-組み合わせ計算中';
        await this.delay(100);

        let pm2Words = new Set();
        for (let diff = -2; diff <= 2; diff++) {
            if (diff === 0) continue; // 同一は既に処理済み
            
            const currentTarget = targetQaballa + diff;
            if (currentTarget > 0) {
                const combinations = [];
                this.generateCombinations(currentTarget, 0, [], combinations);
                
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
		}*/
	async generateWords(inputValue, targetQaballa) {
		console.log(`生成開始: 入力=${inputValue}, 目標値=${targetQaballa}`);
		
		// データチェック
		if (!window.qaballaOur || window.qaballaOur.length === 0) {
			console.error('qaballaOurデータがありません');
			return;
		}
		
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
	
			// 5. ±2 Qaballaの処理（同様に修正）
			// ...
			// 5. ±2 Qaballaの組み合わせ生成
			document.getElementById('pm2').innerHTML = 'お待ちください-組み合わせ計算中';
			await this.delay(100);
	
			let pm2Words = new Set();
			for (let diff = -2; diff <= 2; diff++) {
				if (diff === 0) continue; // 同一は既に処理済み
				
				const currentTarget = targetQaballa + diff;
				if (currentTarget > 0) {
					const combinations = [];
					this.generateCombinations(currentTarget, 0, [], combinations);
					
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
	
		} catch (error) {
			console.error('単語生成中にエラー:', error);
			document.getElementById('exactly').innerHTML = '処理中にエラーが発生しました';
			document.getElementById('pm2').innerHTML = '処理中にエラーが発生しました';
		}
	}
	
	// テスト用メソッドを追加
	testSmallValue() {
		// 小さな値でテスト（例: 5）
		this.generateWords('a', 5); // 'a'の値は1なので、5になる組み合わせを探す
	}
	
	// シンプルなテスト用メソッド
	async generateWordsSimple(inputValue, targetQaballa) {
		console.log(`簡単テスト: 目標値=${targetQaballa}`);
		
		// 非常に小さな値でテスト
		const testCombinations = [];
		this.generateCombinations(5, 0, [], testCombinations, 3); // 最大長を短く
		
		console.log(`テスト組み合わせ:`, testCombinations);
		
		if (testCombinations.length === 0) {
			document.getElementById('exactly').innerHTML = 'テスト: 組み合わせが見つかりませんでした';
		} else {
			document.getElementById('exactly').innerHTML = `テスト: ${testCombinations.length}個の組み合わせ found`;
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

        element.innerHTML = displayWords.join(', ');
        
        if (showMoreButton) {
            const button = document.createElement('button');
            button.textContent = `▼すべての並び替え(${wordArray.length}個)を表示`;
            button.onclick = () => {
                element.innerHTML = wordArray.join(', ');
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

/*// 生成ボタンのイベントリスナー
document.addEventListener('DOMContentLoaded', function() {
    const generateButton = document.querySelector('.qaballacreate');
    if (generateButton) {
        generateButton.addEventListener('click', function() {
            const currentLanguage = window.currentLanguage;
            if (currentLanguage.toLowerCase() !== 'ours') {
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
});*/
// word_generator.jsの最終的な修正版
document.addEventListener('DOMContentLoaded', function() {
    const generateButton = document.querySelector('.qaballacreate');
    if (generateButton) {
        generateButton.addEventListener('click', function() {
            // ラジオボタンの状態を直接確認（最も確実）
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