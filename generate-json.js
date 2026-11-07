const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDir = path.join(__dirname); // 必要に応じて公開ディレクトリ（docsなど）に変更
const results = [];

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    // node_modulesや .git などは除外
    if (file.startsWith('.') || file === 'node_modules') continue;

    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.html')) {
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