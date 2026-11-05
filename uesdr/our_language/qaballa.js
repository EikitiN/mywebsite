let qaballaEn = [];
let qaballaOur = [];
let currentLanguage = 'english';
let characterData = [];

// 入力モードを切り替える関数
function toggleInputMode() {
    const englishInput = document.getElementById('englishInput');
    const oursInput = document.getElementById('oursInput');
    
    if (currentLanguage.toLowerCase() === 'english') {
        englishInput.style.display = 'block';
        oursInput.style.display = 'none';
    } else {
        englishInput.style.display = 'none';
        oursInput.style.display = 'block';
    }
}

// 文字データを読み込む関数
async function loadCharacterData() {
    try {
        // 既にグローバルスコープにcharacterDataがある場合は再利用
        if (window.characterData && window.characterData.length > 0) {
            characterData = window.characterData;
            console.log('既存の文字データを再利用しました');
            return;
        }
        
        const response = await fetch('character.json');
        characterData = await response.json();
        // グローバルにも保存して他のスクリプトから利用可能に
        window.characterData = characterData;
        console.log('文字データの読み込みが完了しました');
    } catch (error) {
        console.error('文字データの読み込み中にエラーが発生しました:', error);
    }
}

// JSONファイルを読み込む関数
async function loadJsonData() {
    try {
        const responseEn = await fetch('qaballa_en.json');
        qaballaEn = await responseEn.json();
        
        const responseOur = await fetch('qaballa_our.json');
        qaballaOur = await responseOur.json();
        
        console.log('JSONデータの読み込みが完了しました');
        console.log('英語Qaballaデータ数:', qaballaEn.length);
        console.log('Our Language Qaballaデータ数:', qaballaOur.length);
        
        // 入力モードを初期設定
        toggleInputMode();
        processQaballaCalculation();
        
    } catch (error) {
        console.error('JSONデータの読み込み中にエラーが発生しました:', error);
    }
}

// 表記→データ変換
function convertHyoukiToData(hyouki) {
    let data = '';
    for (let i = 0; i < hyouki.length; i++) {
        const char = hyouki[i];
        const found = characterData.find(item => item.character === char);
        data += found ? found.data : char;
    }
    return data;
}

// 仮表記→データ変換
function convertKariToData(kari) {
    let data = '';
    for (let i = 0; i < kari.length; i++) {
        const char = kari[i];
        const foundSub = characterData.find(item => item.sub === char);
        const foundSubBig = characterData.find(item => item.sub_big === char);
        const found = foundSub || foundSubBig;
        data += found ? found.data : char;
    }
    return data;
}

// 入力値をデータ形式に統一する関数
function getInputData() {
    if (currentLanguage.toLowerCase() === 'english') {
        // Englishモード：単一入力欄から直接取得
        return document.getElementById('inputEnglishQaballa').value;
    } else {
        // Ourモード：3入力欄から変換
        const hyouki = document.getElementById('inputHyoukiQaballa').value;
        const kari = document.getElementById('inputKariQaballa').value;
        const data = document.getElementById('inputDataQaballa').value;
        
        // 優先順位: データ → 表記 → 仮表記
        if (data) return data;
        if (hyouki) return convertHyoukiToData(hyouki);
        if (kari) return convertKariToData(kari);
        
        return '';
    }
}

// データ→表記変換
function convertDataToHyouki(data) {
    let hyouki = '';
    for (let i = 0; i < data.length; i++) {
        const char = data[i];
        const found = characterData.find(item => item.data === char);
        hyouki += found ? found.character : char;
    }
    return hyouki;
}

// データ→仮表記変換
function convertDataToKari(data) {
    let kari = '';
    for (let i = 0; i < data.length; i++) {
        const char = data[i];
        const found = characterData.find(item => item.data === char);
        kari += found ? found.sub : char;
    }
    return kari;
}

function convertOurLanguageText(text) {
    let convertedText = text.toUpperCase();
    console.log('Our Language変換前:', text, '変換後:', convertedText);
    return convertedText;
}

function getQaballaValue(character, language) {
    let dataArray;
    if (language.toLowerCase() === 'english') {
        dataArray = qaballaEn;
    } else {
        dataArray = qaballaOur;
    }
    
    if (dataArray.length === 0) {
        console.log('データがまだ読み込まれていません');
        return 0;
    }
    
    const found = dataArray.find(item => item.data === character.toLowerCase());
    return found ? found.qaballa : 0;
}

function calculateTextValue(text, language) {
    if (!text) return 0;
    
    let processingText = text;
    
    if (language.toLowerCase() === 'ours') {
        processingText = convertOurLanguageText(text);
    }
    
    let total = 0;
    for (let i = 0; i < processingText.length; i++) {
        total += getQaballaValue(processingText[i], language);
    }
    
    return total;
}

// 結果を表示する関数
function updateOutputBox(dataText, totalValue, language) {
    const outputBox = document.getElementById('outputqaballabox');
    if (outputBox) {
        const languageName = language.toLowerCase() === 'english' ? 'English' : 'Ike\'s Qaballa';
        
        if (language.toLowerCase() === 'english') {
            // Englishモード：シンプル表示
            outputBox.innerHTML = `
                <p><strong>入力:</strong> ${dataText}</p>
                <p><strong>言語:</strong> ${languageName}</p>
                <p><strong>合計値:</strong> ${totalValue}</p>
            `;
        } else {
            // Ourモード：3形式表示
            const hyouki = convertDataToHyouki(dataText);
            const kari = convertDataToKari(dataText);
            
            outputBox.innerHTML = `
                <p><strong>表記:</strong> ${hyouki}</p>
                <p><strong>仮表記:</strong> ${kari}</p>
                <p><strong>データ:</strong> ${dataText}</p>
                <p><strong>言語:</strong> ${languageName}</p>
                <p><strong>合計値:</strong> ${totalValue}</p>
            `;
        }
        console.log('出力ボックスを更新しました');
    }
}

function processQaballaCalculation() {
    const inputData = getInputData();
    console.log('計算開始 - データ形式:', inputData, '言語:', currentLanguage);
    
    const totalValue = calculateTextValue(inputData, currentLanguage);
    
    console.log(`計算結果: ${totalValue}`);
    updateOutputBox(inputData, totalValue, currentLanguage);
}

function handleLanguageChange(language) {
    currentLanguage = language;
    console.log('言語が変更されました:', currentLanguage);
    
    // 入力モードを切り替え
    toggleInputMode();
    
    // 入力欄をクリア
    if (language.toLowerCase() === 'english') {
        document.getElementById('inputHyoukiQaballa').value = '';
        document.getElementById('inputKariQaballa').value = '';
        document.getElementById('inputDataQaballa').value = '';
    } else {
        document.getElementById('inputEnglishQaballa').value = '';
    }
    
    processQaballaCalculation();
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // 文字データを先に読み込み
    loadCharacterData().then(() => {
        // Qaballaデータを読み込み
        loadJsonData();
    });
    
    // ラジオボタンのイベント
    const selected_radio = document.querySelectorAll('input[name="qaballa"]');
    selected_radio.forEach(radio => {
        radio.addEventListener('change', function(event) {
            const selectedValue = event.target.value;
            console.log('選択された言語:', selectedValue);
            handleLanguageChange(selectedValue);
        });
    });

    // English入力欄のイベント
    const inputEnglish = document.getElementById('inputEnglishQaballa');
    inputEnglish.addEventListener('input', function() {
        processQaballaCalculation();
    });
    inputEnglish.addEventListener('change', function() {
        processQaballaCalculation();
    });

    // Our入力欄のイベント
    const ourInputFields = [
        'inputHyoukiQaballa',
        'inputKariQaballa', 
        'inputDataQaballa'
    ];
    
    ourInputFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        field.addEventListener('input', function() {
            // 他のフィールドをクリア
            ourInputFields.forEach(otherFieldId => {
                if (otherFieldId !== fieldId) {
                    document.getElementById(otherFieldId).value = '';
                }
            });
            processQaballaCalculation();
        });
        
        field.addEventListener('change', function() {
            processQaballaCalculation();
        });
    });
});
// qaballa.jsの最後の部分を修正
window.getInputData = getInputData;
window.calculateTextValue = calculateTextValue;
window.currentLanguage = currentLanguage;
// 以下の2行を追加
window.qaballaEn = qaballaEn;
window.qaballaOur = qaballaOur;
// qaballa.jsの最後に追加
window.convertHyoukiToData = convertHyoukiToData;
window.convertKariToData = convertKariToData;
window.convertDataToHyouki = convertDataToHyouki;
window.convertDataToKari = convertDataToKari;