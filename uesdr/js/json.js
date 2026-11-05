// HTMLファイル名を取得
const htmlFileName = window.location.pathname.split('/').pop().replace('.html', '');

// JSONファイルのパスを設定
const jsonFilePath = `${htmlFileName}.json`;

// JSONファイルを読み込む
fetch(jsonFilePath)
    .then(response => {
        if (!response.ok) {
            throw new Error('ネットワークレスポンスが正常ではありません');
        }
        return response.json();
    })
    .then(data => {
        // JSONのキーと一致するidを持つ要素にデータを挿入
        for (const key in data) {
            const element = document.getElementById(key);
            if (element && element.classList.contains('fromJSON')) {
                // \n を <br> に変換
                const formattedText = data[key].replace(/\n/g, '<br>');
                element.innerHTML = formattedText; // innerHTMLを使用
            }
        }
    })
    .catch(error => {
        console.error('JSONファイルの読み込みに失敗しました:', error);
    });