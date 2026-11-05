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

    // calculateOurQaballa関数を追加
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

    // calculateEnglishQaballa関数も追加（必要なら）
    calculateEnglishQaballa(text) {
        // English Qaballaの計算ロジックをここに実装
        // 実際の計算方法に合わせて修正してください
        return text.length * 10; // 仮の実装
    }

	// characterDataの初期化部分を改善
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

    // 出力形式を変換（改善版）
    convertOutputFormat(words, outputType) {
        if (!Array.isArray(words)) return words;
        
        return words.map(word => {
            // (±1などの接尾辞を処理)
            const match = word.match(/^(.+?)(\s*\([+-]?\d+\))?$/);
            const mainWord = match[1];
            const suffix = match[2] || '';
            
            let converted = '';
            for (const char of mainWord) {
                let convertedChar = char;
                
                // characterMapから変換
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
    }

    // 単語検証関数（条件追加）
    createWordValidator() {
        const vowelPattern = /[aeiouy2]{3,}/;
        const consonantPattern = /[bcdfghjklmnpqrstvwxz1345]{4,}/;
        const forbiddenPatterns = this.forbiddenPairs.map(pair => 
            new RegExp(`${pair[0]}${pair[1]}|${pair[1]}${pair[0]}`)
        );
        
        const additionalForbiddenPatterns = [
            /jw|wj/,
            /sj|sw/,
            /3j/,
            /mw|nw/,
            /([jw])\1/,
        ];
        
        return (word) => {
            if (!word || word.length === 0 || word.length > 20) return false;
            
            if (!/[aeiouy2]/.test(word)) return false;
            
            for (const char of word) {
                if (!this.availableChars.includes(char)) return false;
            }
            
            if (vowelPattern.test(word)) return false;
            if (consonantPattern.test(word)) return false;
            
            for (const pattern of forbiddenPatterns) {
                if (pattern.test(word)) return false;
            }
            
            for (const pattern of additionalForbiddenPatterns) {
                if (pattern.test(word)) return false;
            }
            
            if (word.startsWith('l') && word.length > 1) {
                const secondChar = word[1];
                if (!this.vowels.includes(secondChar) && secondChar !== 'y') {
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
        };
    }

    // 進行状況を表示する関数
    updateProgress(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = message;
        }
    }

	// 軽量モード用のランダム生成（文字数制御改善）
	async generateLightMode(targetValue, maxCount, progressElementId = null) {
		const isValidWord = this.createWordValidator();
		const foundWords = new Set();
		let attempts = 0;
		const maxAttempts = maxCount * 10000;
		
		// 文字数範囲を計算（段階的に設定）
		const lengthMode = document.querySelector('input[name="lengthMode"]:checked').value;
		const minLength = Math.ceil(targetValue / 29); // q/29 の切り上げ
		
		let maxLength;
		if (lengthMode === 'realistic') {
			if (targetValue <= 20) {
				maxLength = targetValue; // qaballa <= 20: 同じ値
			} else if (targetValue <= 200) {
				maxLength = 20; // 20 < qaballa <= 200: 20固定
			} else {
				maxLength = Math.floor(targetValue / 10); // qaballa > 200: q/10 の切り捨て
			}
		} else {
			maxLength = targetValue; // theoreticalモード: q そのまま
		}
		
		// 最小1文字、最大20文字に制限
		const adjustedMinLength = Math.max(1, Math.min(minLength, 20));
		const adjustedMaxLength = Math.max(adjustedMinLength, Math.min(maxLength, 20));
		
		this.debugLog(`軽量モード開始: target=${targetValue}, 文字数=${adjustedMinLength}-${adjustedMaxLength}`);
		
		if (progressElementId) {
			this.updateProgress(progressElementId, `軽量モード処理中... (0/${maxCount}単語, 試行回数: 0)`);
		}
	
		while (foundWords.size < maxCount && attempts < maxAttempts) {
			attempts++;
			
			const length = Math.floor(Math.random() * (adjustedMaxLength - adjustedMinLength + 1)) + adjustedMinLength;
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
				
				if (totalValue === targetValue) {
					break;
				}
			}
			
			if (totalValue === targetValue && isValidWord(word) && word.length > 0) {
				foundWords.add(word);
				
				// 進捗表示
				if (progressElementId && (foundWords.size % 10 === 0 || foundWords.size === maxCount)) {
					this.updateProgress(progressElementId, 
						`軽量モード処理中... (${foundWords.size}/${maxCount}単語, 試行回数: ${attempts})`);
				}
			}
			
			if (attempts % 1000 === 0) {
				await this.delay(0);
			}
		}
		
		this.debugLog(`軽量モード完了: ${foundWords.size}単語`);
		if (progressElementId) {
			this.updateProgress(progressElementId, 
				`軽量モード完了: ${foundWords.size}単語見つかりました`);
		}
		
		return Array.from(foundWords).sort();
	}

    // 組み合わせ生成（進行状況表示付き）
    async *generateCombinationsIterative(targetValue, maxLength = 10, progressCallback = null) {
        const stack = [{value: 0, chars: [], lastIndex: 0}];
        let yielded = 0;
        let totalProcessed = 0;
        
        while (stack.length > 0) {
            const current = stack.pop();
            totalProcessed++;
            
            if (current.value === targetValue) {
                yielded++;
                yield current.chars;
                
                if (progressCallback && yielded % 100 === 0) {
                    progressCallback(yielded, totalProcessed);
                }
                
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
            
            if (progressCallback && totalProcessed % 1000 === 0) {
                progressCallback(yielded, totalProcessed);
                await this.delay(0);
            }
        }
        
        if (progressCallback) {
            progressCallback(yielded, totalProcessed);
        }
    }

    // 順列生成メソッドを追加
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

    // 全処理モード（進行状況表示付き）
    async generateFullMode(targetValue, progressElementId = null) {
        const isValidWord = this.createWordValidator();
        const foundWords = new Set();
        let combinationCount = 0;
        let permutationCount = 0;
        
        if (progressElementId) {
            this.updateProgress(progressElementId, '組み合わせ生成中... (0組み合わせ)');
        }
        
        const progressCallback = (yielded, totalProcessed) => {
            if (progressElementId) {
                this.updateProgress(progressElementId, 
                    `組み合わせ生成中... (${yielded}組み合わせ, ${totalProcessed}処理済み)`);
            }
        };
        
        for await (const combination of this.generateCombinationsIterative(targetValue, 10, progressCallback)) {
            combinationCount++;
            
            if (progressElementId && combinationCount % 100 === 0) {
                this.updateProgress(progressElementId, 
                    `順列生成中... (${combinationCount}組み合わせ, ${foundWords.size}単語)`);
            }
            
            for await (const word of this.generatePermutationsEfficient(combination)) {
                permutationCount++;
                if (isValidWord(word)) {
                    foundWords.add(word);
                    
                    if (progressElementId && foundWords.size % 100 === 0) {
                        this.updateProgress(progressElementId, 
                            `順列生成中... (${combinationCount}組み合わせ, ${foundWords.size}単語)`);
                    }
                }
                
                if (permutationCount % 1000 === 0) {
                    await this.delay(0);
                }
            }
            
            if (combinationCount % 100 === 0) {
                await this.delay(0);
            }
        }
        
        if (progressElementId) {
            this.updateProgress(progressElementId, 
                `全処理モード完了: ${foundWords.size}単語見つかりました`);
        }
        
        return Array.from(foundWords).sort();
    }

    // ページ表示
    displayPage(elementId, page) {
        const words = this.allWords[elementId];
        if (!words || words.length === 0) return;
        
        const totalPages = Math.ceil(words.length / this.ITEMS_PER_PAGE);
        const startIndex = (page - 1) * this.ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + this.ITEMS_PER_PAGE, words.length);
        const pageWords = words.slice(startIndex, endIndex);
        
        const element = document.getElementById(elementId);
        
        const existingControls = element.querySelector('.pagination-controls');
        if (existingControls) {
            existingControls.remove();
        }
        
        element.innerHTML = pageWords.join(', ');
        
        if (words.length > this.ITEMS_PER_PAGE) {
            const controls = this.createPaginationControls(elementId, page, totalPages, words.length);
            controls.className = 'pagination-controls';
            element.appendChild(document.createElement('br'));
            element.appendChild(controls);
        }
    }

	// ページネーションコントロール（プルダウンメニュー追加）
	createPaginationControls(elementId, currentPage, totalPages, totalItems) {
		const controls = document.createElement('div');
		controls.style.marginTop = '10px';
		controls.style.padding = '10px';
		controls.style.backgroundColor = '#f5f5f5';
		controls.style.borderRadius = '5px';
		controls.style.display = 'flex';
		controls.style.alignItems = 'center';
		controls.style.justifyContent = 'center';
		controls.style.flexWrap = 'wrap';
		controls.style.gap = '10px';
		
		const prevButton = document.createElement('button');
		prevButton.textContent = '＜ 前へ';
		prevButton.disabled = currentPage === 1;
		prevButton.onclick = () => this.changePage(elementId, currentPage - 1);
		
		const nextButton = document.createElement('button');
		nextButton.textContent = '次へ ＞';
		nextButton.disabled = currentPage === totalPages;
		nextButton.onclick = () => this.changePage(elementId, currentPage + 1);
		
		const info = document.createElement('span');
		info.textContent = ` ${currentPage}/${totalPages}ページ (全${totalItems}件) `;
		
		// ページ選択プルダウンメニュー
		const pageSelectContainer = document.createElement('div');
		pageSelectContainer.style.display = 'flex';
		pageSelectContainer.style.alignItems = 'center';
		pageSelectContainer.style.gap = '5px';
		
		const pageSelectLabel = document.createElement('label');
		pageSelectLabel.textContent = 'ページ: ';
		pageSelectLabel.htmlFor = `pageSelect-${elementId}`;
		
		const pageSelect = document.createElement('select');
		pageSelect.id = `pageSelect-${elementId}`;
		pageSelect.style.padding = '3px';
		
		// ページオプションを追加
		for (let i = 1; i <= totalPages; i++) {
			const option = document.createElement('option');
			option.value = i;
			option.textContent = i;
			if (i === currentPage) {
				option.selected = true;
			}
			pageSelect.appendChild(option);
		}
		
		// ページ選択時のイベント
		pageSelect.addEventListener('change', (e) => {
			const selectedPage = parseInt(e.target.value);
			this.changePage(elementId, selectedPage);
		});
		
		pageSelectContainer.appendChild(pageSelectLabel);
		pageSelectContainer.appendChild(pageSelect);
		
		controls.appendChild(prevButton);
		controls.appendChild(info);
		controls.appendChild(pageSelectContainer);
		controls.appendChild(nextButton);
		
		return controls;
	}
    /*// ページネーションコントロール
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
        
        const info = document.createElement('span');
        info.textContent = ` ${currentPage}/${totalPages}ページ (全${totalItems}件) `;
        info.style.margin = '0 15px';
        
        controls.appendChild(prevButton);
        controls.appendChild(info);
        controls.appendChild(nextButton);
        
        return controls;
    }*/

    // ページ変更
    changePage(elementId, newPage) {
        this.currentPages[elementId] = newPage;
        this.displayPage(elementId, newPage);
    }

    // デバッグログ
    debugLog(...args) {
        if (this.DEBUG) {
            console.log(...args);
        }
    }

    // 遅延
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

	// メイン実行関数
	async execute(targetValue, maxCount = 100) {
		this.debugLog('単語生成開始', targetValue);
		
		const mode = document.querySelector('input[name="processingMode"]:checked').value;
		const outputType = document.querySelector('input[name="qaballaex"]:checked').value;
		
		// 進捗表示初期化
		this.updateProgress('exactly', '処理を開始しています...');
		this.updateProgress('pm2', '待機中...');
		
		try {
			let exactlyWords = [];
			let pm2Words = [];
			
			// 同一Qaballa値の処理
			try {
				if (mode === 'light') {
					exactlyWords = await this.generateLightMode(targetValue, maxCount, 'exactly');
				} else {
					exactlyWords = await this.generateFullMode(targetValue, 'exactly');
				}
				
				// 出力形式を変換して表示
				const exactlyOutput = this.convertOutputFormat(exactlyWords, outputType);
				this.allWords.exactly = exactlyOutput;
				this.displayPage('exactly', 1);
				
			} catch (exactError) {
				console.error('同一Qaballa値処理中のエラー:', exactError);
				this.updateProgress('exactly', '同一Qaballa値の処理中にエラーが発生しました');
			}
			
			// ±1値の処理（エラーがあっても続行）
			try {
				this.updateProgress('pm2', '±1値の処理を開始しています...');
				
				if (mode === 'light') {
					const minusOneWords = await this.generateLightMode(targetValue - 1, Math.floor(maxCount / 2), 'pm2');
					const plusOneWords = await this.generateLightMode(targetValue + 1, Math.floor(maxCount / 2), 'pm2');
					pm2Words = [
						...minusOneWords.map(w => w + ' (-1)'),
						...plusOneWords.map(w => w + ' (+1)')
					];
				} else {
					const minusOneWords = await this.generateFullMode(targetValue - 1, 'pm2');
					const plusOneWords = await this.generateFullMode(targetValue + 1, 'pm2');
					pm2Words = [
						...minusOneWords.map(w => w + ' (-1)'),
						...plusOneWords.map(w => w + ' (+1)')
					];
				}
				
				// 出力形式を変換して表示
				const pm2Output = this.convertOutputFormat(pm2Words, outputType);
				this.allWords.pm2 = pm2Output;
				this.displayPage('pm2', 1);
				
			} catch (pmError) {
				console.error('±1値処理中のエラー:', pmError);
				this.updateProgress('pm2', '±1値の処理中にエラーが発生しました');
			}
			
		} catch (error) {
			console.error('単語生成全体のエラー:', error);
			this.updateProgress('exactly', '処理中に予期せぬエラーが発生しました');
			this.updateProgress('pm2', '処理中に予期せぬエラーが発生しました');
		}
	}
}

// グローバルインスタンス
window.wordGenerator = new WordGenerator();

// イベントリスナー設定
document.addEventListener('DOMContentLoaded', function() {
    // Qaballaモード切り替え
    document.querySelectorAll('input[name="qaballa"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('englishInput').style.display = 
                this.value === 'English' ? 'block' : 'none';
            document.getElementById('oursInput').style.display = 
                this.value === 'Ours' ? 'block' : 'none';
        });
    });
    
    // 処理モード切り替え
    document.querySelectorAll('input[name="processingMode"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('lightModeSettings').style.display = 
                this.value === 'light' ? 'block' : 'none';
        });
    });
    
    // 生成ボタン
    document.querySelector('.qaballacreate').addEventListener('click', async function() {
        const qaballaMode = document.querySelector('input[name="qaballa"]:checked').value;
        
        // Englishモードの場合は単語生成を無効化
        if (qaballaMode === 'English') {
            alert('単語生成機能はIke\'s Qaballaモードでのみ利用できます');
            return;
        }
        
        // Ourモード - 正しい入力データの取得
        const hyouki = document.getElementById('inputHyoukiQaballa').value;
        const kari = document.getElementById('inputKariQaballa').value;
        const data = document.getElementById('inputDataQaballa').value;
        
        // 優先順位: データ → 表記 → 仮表記
        let inputData;
        if (data) {
            inputData = data;
        } else if (hyouki) {
            // 表記からデータへの変換
            inputData = window.convertHyoukiToData(hyouki);
        } else if (kari) {
            // 仮表記からデータへの変換
            inputData = window.convertKariToData(kari);
        } else {
            alert('いずれかの欄に入力してください');
            return;
        }
        
        const targetValue = window.calculateTextValue(inputData, 'ours');
        
        if (targetValue <= 0) {
            alert('有効なQaballa値を入力してください');
            return;
        }
        
        const mode = document.querySelector('input[name="processingMode"]:checked').value;
        const maxCount = mode === 'light' ? 
            parseInt(document.getElementById('generateCount').value) || 100 : 
            Number.MAX_SAFE_INTEGER;
        
        // 状態をリセット
        window.wordGenerator.allWords = { exactly: [], pm2: [] };
        window.wordGenerator.currentPages = { exactly: 1, pm2: 1 };
        
        await window.wordGenerator.execute(targetValue, maxCount);
    });
    
    // 初期表示
    document.getElementById('lightModeSettings').style.display = 'block';
    document.querySelector('input[name="lengthMode"][value="realistic"]').checked = true;
    
    // Englishモードを初期表示
    document.getElementById('englishInput').style.display = 'block';
    document.getElementById('oursInput').style.display = 'none';
});