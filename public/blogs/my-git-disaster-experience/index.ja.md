## 冒頭：困惑のある失敗現場

今日、非常に困惑する Git操作の事故を経験した。驚愕のほど、足の指が地面に食い込むほどだ...

GitHub OAuth2 ログイン機能の開発をしていた。本来は新しく作成した数つのファイルのみをコミットするつもりだったが、うっかり180個のファイルの全変更内容をPRブランチにコミットしてしまった。グループでそのコミット記録を見た時のこと...ああ、天が落ちてもいい！
![](/blogs/my-git-disaster-experience/466a0826fa92843b.png)
```bash
# 本来はこれらのファイルのみのコミットが必要だった
src/consts.ts
src/lib/oauth2-github.ts
src/components/oauth2-login-button.tsx
src/hooks/use-auth.ts
src/app/(home)/config-dialog/site-settings/index.tsx

# 結果はこんな恐ろしい状況になった...
modified:   src/app/(home)/config-dialog/index.tsx
modified:   src/app/about/page.tsx
modified:   src/app/blog/page.tsx
modified:   src/app/bloggers/page.tsx
modified:   src/app/pictures/page.tsx
modified:   src/app/projects/page.tsx
modified:   src/app/share/page.tsx
... (さらに170個以上のファイル)
```

## 問題の原因：ブランチの取得が間違えられた

最終的な分析を通じて、問題の根源が以下にあることがわかりました：

**私が清潔なブ랜chedを取得する際、取得されるのは自分の `main` ブ랜chedであり、源泉上流の最新コードではありません！**

これにより、最新のものではない基準で作成された機能ブ랜chedが生まれ、以前に自分のローカルでの変更がすべて含まれてしまいます。

### 正しいプロセスは以下の通りです：

1. 源泉上流から最新の `main` ブ랜치를取得する
2. 最新の内容を基に清潔な機能ブ랜チを作成する
3. OAuth2関連のファイルのみをコミットする
4. PRを作成する

### 私の間違ったプロセス：

1. 自分の `main` ブ랜チから機能ブ랜チを作成する ❌
2. 自分の `main` には既に以前の様々な変更が含まれている ❌
3. その結果新しいブ랜チには全ての変更が含まれる ❌
4. 180個のファイルのコミット... 😱

## 緊急の救済：助けて
まずPRを削除し、その後以下のようにする

```bash
# 1. 从源头上游获取最新代码
git fetch upstream

# 2. 基于上游 main 创建新的干净分支
git checkout -b clean-oauth2-final upstream/main

# 3. 从原来的混乱分支中只提取需要的文件
git checkout --theirs <需要的文件>

# 或者更直接的方法：
git checkout <原来的分支> -- <具体文件路径>
```

この方法を利用して、OAuth2機能のみを含むファイルを成功に抽出しました。

- `src/consts.ts` – OAuth2 設定
- `src/lib/oauth2-github.ts` – OAuth2 の核心ロジック
- `src/components/oauth2-login-button.tsx` – ログインコンポーネント
- `src/hooks/use-auth.ts` – 認証状態管理
- `src/app/(home)/config-dialog/site-settings/index.tsx` – 設定統合

## 分岐管理の新たな認識

ちょっと、gitの使い方をまた学んだとみなして良いよ。。。

AI発言：
### 1. forkとupstreamの関係を理解する

```bash
# リモートリポジトリを確認する
git remote -v

# このような出力が見えるはずだ：
origin  https://github.com/用户名/项目名.git (fetch)
origin  https://github.com/用户名/项目名.git (push)
upstream        https://github.com/原作者/项目名.git (fetch)
upstream        https://github.com/原作者/项目名.git (push)
```

- `origin`: 私がforkしたリポジトリ
- `upstream`: 原作者の元リポジトリ

### 2. 正しいブ랜치作成プロセス

```bash
# 1. 上流コードが最新であることを確認する
git fetch upstream

# 2. 上流の main ブ랜치に切り替える
git checkout upstream/main

# 3. 上流の main ブ랜치を基に新機能ブ랜치を作成する
git checkout -b feature/new-feature upstream/main

# 4. 開発を進める...

# 5. 関連ファイルのみをコミットする
git add <関連ファイル>
git commit -m "feat: 新機能の追加"

# 6. 自分のリポジトリにプッシュし、PRを作成する
git push origin feature/new-feature
```

### 3. テストブ랜치のデプロイ作成

PRブ랜치とmainブ랜치のマージ互換性をテストするため、PRブ랜치とmainブ랜치をマージしてvercelにデプロイする新しいブ랜치를作成します：

```bash
# 1. PR 分岐とmain分岐のマージを基にテスト分岐を作成
git checkout -b test-merge main
git merge feature/new-feature

# 2. テスト分岐をVercelのデプロイ用にプッシュする
git push origin test-merge
```
## 面倒な作業をAIに任せて要約：
## 経験のまとめ

### 学んだことのまとめ：

1. **常に上流の最新コードに基づいて機能分岐を作成する**
   - 自分のmain分岐に基づいて機能分岐を作らないこと
   - 定期的に上流のコードをローカルに同期する

2. **ファイル変更範囲を明確にする**
   - コミット前に`git status`を必ず確認する
   - 関連ファイルのみをコミットするようにする

```bash
# 1. 基準分岐のコードをコミットする
git add .
git commit -m "テスト分岐の作成"
git push origin main
```

```bash
# 2. テスト分岐をVercelにデプロイする
git push origin test-merge
```

3. **Gitの高度な機能を活用する**
   - `git checkout` を使って特定のファイルを抽出可能
   - `git cherry-pick` を使って特定のコミットを適用可能
   - Gitコマンドを使って問題を解決することを恐れない

### 新しいワークフロー：

```bash
# 私の新しいワークフロー
git fetch upstream                    # アップストリームと同期
git checkout -b feature/xxx upstream/main  # featureブランチを作成
# featureの開発を行う...
git add src/関連ファイル                  # 関連ファイルのみ追加
git commit -m "説明的なコミットメッセージ"        # コミット
git push origin feature/xxx           # originへのプッシュ
# テスト用ブランチの作成（必要な場合）
git checkout -b deploy-test main      # mainブランチを基に
git merge feature/xxx                 # featureブランチをマージ
git push origin deploy-test           # テストデプロイ用のプッシュ
```

## 今後の展開

幸いにも最終的にすべてが解決しました：

1. ✅ 7つのOAuth2関連ファイルのみを含む、クリーンな`clean-oauth2-final`ブранchingを作成しました
2. ✅ 正式なPR用の`feature/oauth2-auth`ブранchingを作成しました
3. ✅ マージの互換性を確認するための`oauth2-merged`テストブранchingを作成しました
4. ✅ すべてのブранchingが成功してプッシュされました

## 結論

面倒で、自分が愚かだった。最終的にGITHUB_OAUTH2_CLIENT_SECRETを公開できないためpassされたけど、ははは。わかってたんだ！



*（P.S. もし同じような Git の失敗経験をした場合、コメント欄（未実装）で共有してください。私が一人ではないことを知りたいです 😅）*