window.onload = function() {
    const header = document.getElementById('header');
    const headerText = header.getAttribute('data-header-text'); // data-header-textの内容を取得

    // ヘッダーの内容を変更
    header.innerHTML = `
		<a href="/index.html" class="icon-link"><img src="/index/toTop.svg" alt="" /></a>
        <div style="height: 120px; font-size:clamp(1.5rem, calc(1.5vw + 1.25rem), 10rem); background-image: url('../index/header-back-flag.svg'); color: #ffffff; text-align: center; font-weight: bold; background-size: cover; background-repeat: no-repeat; background-position: left;">
            ${headerText}
        </div>
    `;
};
