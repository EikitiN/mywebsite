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