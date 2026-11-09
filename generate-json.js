const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDir = path.join(__dirname); 
const results = [];

// ==========================================
// 除外したいファイル名やフォルダ名のリスト
// ==========================================
const excludeFiles = ['footer.html', 'header.html']; // ここに除外したいファイル名を追加できます
const excludeDirs = ['.git', 'node_modules', '_templates', 'モデル', 'uesdr']; // 除外したいフォルダがある場合

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    // 1. 隠しファイル（.で始まるもの）や除外ディレクトリのチェック
    if (file.startsWith('.') || excludeDirs.includes(file)) continue;

    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.html')) {
      
      // 2. 除外ファイルリストに含まれているかチェック
      if (excludeFiles.includes(file)) {
        console.log(`除外されました: ${file}`);
        continue; // リストに追加せずに次のループへ
      }

      // 相対パスを算出
      const relativePath = path.relative(targetDir, fullPath).replace(/\\/g, '/');
      
      // Gitの最終コミット日時を取得（取得できない場合はファイルの更新日時）
      let updatedAt;
      try {
        const gitTime = execSync(`git log -1 --format=%cI -- "${relativePath}"`, { encoding: 'utf-8' }).trim();
        updatedAt = gitTime ? new Date(gitTime).getTime() : stat.mtimeMs;
      } catch (e) {
        updatedAt = stat.mtimeMs;
      }

      results.push({
        path: relativePath,
        updatedAt: updatedAt
      });
    }
  }
}

scanDir(targetDir);

// 更新日時の新しい順にソート
results.sort((a, b) => b.updatedAt - a.updatedAt);

// JSONとして出力
fs.writeFileSync(path.join(targetDir, 'file-list.json'), JSON.stringify(results, null, 2));
console.log('file-list.json generated successfully!');