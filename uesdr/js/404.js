const data = [
    {
        "keywords": ["ホーム", "トップページ", "home", "top", "ほーむ", "とっぷ", "index"],
        "url": "https://uesdr.web.fc2.com"
    },
    {
        "keywords": ["ソ連国旗", "ソビエト社会民主主義共和国連邦", "ソビエト連邦", "国旗", "flag" ,"作図"],
        "url": "https://uesdr.web.fc2.com/drow-sssrflag/drow-sssrflag"
    },
    {
        "keywords": ["uesdr", "UESDR","エイキチ社会民主主義共和国連邦" ,"エ連" , "エ連邦", "エイキチ連邦", "国家", "領土", "歴史"],
        "url": "https://uesdr.web.fc2.com/uesdr/uesdr"
    },
	{
        "keywords": ["キャラクター", "紹介","エイキチ" ,"パトサ" , "パトサルニスクリナ", "さなか", "早嫋", "青影", "冬革", "永徳", "アナトリー", "ヤリチンコフ", "永徳冬革", "青影早嫋"],
        "url": "https://uesdr.web.fc2.com/uesdr/character"
    },
	{
        "keywords": ["地図", "高画質", "白地図"],
        "url": "https://uesdr.web.fc2.com/map/map"
    },
	{
        "keywords": ["パトリッシュ","パトサ","英語","Podlish","言語"],
        "url": "https://uesdr.web.fc2.com/uesdr/podlish"
    },
	{
        "keywords": ["イラスト", "配布", "illust"],
        "url": "https://uesdr.web.fc2.com/illust/illust"
    },
	{
        "keywords": ["日記", "diary"],
        "url": "https://uesdr.web.fc2.com/diary/diary"
    }
];


// 検索処理を関数化
function performSearch() {
    const searchTerm = searchBox.value.trim().toLowerCase();
    const searchWords = searchTerm.split(/\s+/); // スペースでキーワードを分割

    // すべての検索単語が含まれているアイテムを探す
    const foundItem = data.find(item => {
        return searchWords.every(word => 
            item.keywords.some(keyword => keyword.toLowerCase().includes(word))
        );
    });

    if (foundItem) {
		let element = document.getElementById('result');
		element.innerHTML = `<a href="${foundItem.url}" target="_blank">${foundItem.url}</a>`;
    } else {
        let element = document.getElementById('result');
		element.innerHTML = '該当するキーワードが見つかりませんでした。<br>キーワードを変えるか、ひらがな、漢字などを変えてみてください。';
    }
}

// 検索ボタンのクリックイベント
searchButton.addEventListener('click', performSearch);

// 入力ボックスでエンターキーが押されたときのイベント
searchBox.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
});