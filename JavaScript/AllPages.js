//ヘッダー挿入
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch('/mywebsite/HTML/header.html');
        if (!response.ok) throw new Error('ヘッダーの読み込みに失敗しました');

        const headerHtml = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(headerHtml, 'text/html');

        //タイトル追加
        const scriptTag = document.querySelector('script#page-meta');
        let metaData = {};
        if (scriptTag) {
            try {
                metaData = JSON.parse(scriptTag.textContent);
            } catch (e) {
                console.error("JSONのパースに失敗しました", e);
            }
        }
        doc.getElementById('top-title').innerHTML = metaData["top-title"];

        //公開日追加
        doc.getElementById('created').textContent = metaData['created'];

        //修正日追加
        const responseJson = await fetch('https://eikitin.github.io/mywebsite/file-list.json');
        const list = await responseJson.json();
        const fileDict = Object.fromEntries(
            list.map(item => [item.path, item.updatedAt])
        );
        let pathname = window.location.pathname;
        if (pathname.endsWith('/')) {
            pathname += 'index.html';
        }
        const date = new Date(fileDict[pathname.replace(/^\/mywebsite\//, "")]);
        const updateddate = date.toLocaleDateString('ja-JP');
        doc.getElementById('modified').textContent = updateddate;

        document.getElementById('header-container').appendChild(doc.querySelector('header'));
    } catch (error) {
        console.error(error);
    }
});

//フッター挿入
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch('/mywebsite/HTML/footer.html');
        if (!response.ok) throw new Error('フッターの読み込みに失敗しました');
        
        const footerHtml = await response.text();
        
        const container = document.getElementById('footer-container');
        if (container) {
            container.innerHTML = footerHtml;
        }
    } catch (error) {
        console.error(error);
    }
});