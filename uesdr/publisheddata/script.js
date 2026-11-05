function jsonOutput() {
  // XMLHttpRequestインスタンスを作成
  let request = new XMLHttpRequest();

  // JSONファイルが置いてあるパスを記述
  request.open('GET', './copytext.json');
  request.send();

  // JSON読み込み時の処理
  request.onreadystatechange = () => {
    // 全てのデータを受信・正常に処理された場合
    if (request.readyState == 4 && request.status == 200) {
      // JSONデータを変換
      let json = JSON.parse(request.responseText);

      // 親要素のidに基づいてコンテンツを生成
      generateContentBasedOnParentId(json);
    }
  };
}

// 親要素のidに基づいてコンテンツを生成する関数
function generateContentBasedOnParentId(json) {
  // すべての<article class="copytextbox">要素を取得
  const articles = document.querySelectorAll('article.copytextbox');

  articles.forEach(article => {
    // articleのidを取得（例: "PolyTrack1"）
    const articleId = article.id;

    // idからsiteとbranchを抽出（例: "PolyTrack1" → site: "PolyTrack", branch: "1"）
    const site = articleId.replace(/\d+$/, ''); // 末尾の数字を除去
    const branch = articleId.match(/\d+$/)[0]; // 末尾の数字を取得

    // JSONから対応するデータを検索
    const targetData = json.find(item => item.site === site && item.branch === branch);

    if (targetData) {
      // コンテンツを生成
      const htmlParts =
        '<div class="p-parts">' +
        '<p class="p-parts__text">' + targetData.text + '</p>' +
        '<button class="copy-button" data-text="' + targetData.text + '">コピー</button>' +
        '</div>';

      // 生成したHTMLをarticle内のcontainerに挿入
      article.querySelector('.container').innerHTML = htmlParts;
    }
  });

  // コピーボタンにイベントリスナーを追加
  addCopyEventListeners();
}

// コピーボタンにイベントリスナーを追加する関数
function addCopyEventListeners() {
  const copyButtons = document.querySelectorAll('.copy-button');
  copyButtons.forEach(button => {
    button.addEventListener('click', () => {
      const textToCopy = button.getAttribute('data-text');
      copyToClipboard(textToCopy, button);
    });
  });
}

// クリップボードにテキストをコピーする関数
function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    // コピー成功時の処理
    button.textContent = 'コピー済み';
    button.disabled = true;
    setTimeout(() => {
      button.textContent = 'コピー';
      button.disabled = false;
    }, 2000); // 2秒後に「コピー」に戻る
  }).catch(err => {
    console.error('コピーに失敗しました: ', err);
  });
}

// ページ読み込み時にJSONを読み込んでHTMLに反映
window.onload = jsonOutput;