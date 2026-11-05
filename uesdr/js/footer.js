document.write('<footer class="footer" style="text-align: center; color: #a00000; background-color: #ffa080" ><br><a href="../index.html" style="font-size:clamp(0.5rem, calc(0.75vw + 0.5rem), 5rem)">トップページに戻る<br /></a><a href="../linktree.html" style="font-size:clamp(0.5rem, calc(0.5vw + 0.5rem), 5rem)">ウェブサイト全体を見る</a><p style="text-align: right; font-size: clamp(0.5rem, calc(0.25vw + 0.5rem), 2rem);">(c) 2025 Union of Eikiti Social-democrat Republics All Rights Reserved.</p></footer>');

const serchfc2 = function() {
	const fc2footer = document.getElementById("fc2_footer");
	console.log('id=fc2_footerの内容は',fc2footer);
	fc2footer.outerHTML = '<div id="fc2_footer" style="line-height: 0px; "><span style="font-size:0px; overflow-wrap: anywhere; display: inline-block; width: 1%;"><a target="_blank" href="//web.fc2.com/">Powered by FC2ホームページ</a></span></div>';
}
setTimeout(serchfc2,1000);