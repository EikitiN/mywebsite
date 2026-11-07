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