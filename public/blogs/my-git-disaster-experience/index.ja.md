## 冒頭：困惑のある失敗現場

今日、非常に困惑するGit操作の事故を経験した。恥ずかすぎて足の指が地面に触れるほどだ...

GitHub OAuth2のログイン機能を開発していて、本来は新しく作成した数個のファイルのみを送信するつもりだったが、誤って180個のファイルのすべての変更をPRブランチに送ってしまった。グループでその送信記録を見た時のこと...うわあ！天が落ちてもいい！
![](/blogs/my-git-disaster-experience/466a0826fa92843b.png)
```bash
# 本来はこれらのファイルのみの送信が予定されていた
src/consts.ts
src/lib/oauth2-github.ts
src/components/oauth2-login-button.tsx
src/hooks/use-auth.ts
src/app/(home)/config-dialog/site-settings/index.tsx

# しかし実際にはこんな恐ろしい状況になった...
modified:   src/app/(home)/config-dialog/index.tsx
modified:   src/app/about/page.tsx
modified:   src/app/blog/page.tsx
modified:   src/app/bloggers/page.tsx
modified:   src/app/pictures/page.tsx
modified:   src/app/projects/page.tsx
modified:   src/app/share/page.tsx
... (さらに170個以上のファイル)
```

## 誤りの原因：ブランチの取得が間違っている

分析を重ねた結果、問題の根源が明らかになった：

**私が清潔なブ랜chedを取得する際、取得されるのは自分の `main` ブ랜chedであり、源泉上流の最新コードではない！**

これにより、最新のものではない基盤上の機能ブ랜chedが作成され、以前に自分のローカルでの変更がすべて含まれている。

### 正しいプロセスは以下の通りである：

1. 源泉上流から最新の `main` ブ랜치를取得する
2. 最新の内容を基に清潔な機能ブ랜チを作成する
3. OAuth2関連のファイルのみをコミットする
4. PRを作成する

### 私の間違いのプロセス：

1. 自分の `main` ブ랜チから機能ブ랜チを作成する ❌
2. 自分の `main` には既に以前の様々な変更が含まれている ❌
3. その結果新しいブ랜チには全ての変更が含まれる ❌
4. 180個のファイルのコミット... 😱

## 緊急の救済：助けてよ
まずPRを削除し、その後以下のようにする

```bash
# 1. 源泉上流から最新のコードを取得する
git fetch upstream

# 2. 上流の main に基づいて新しい清潔なブ랜CHを作成する
git checkout -b clean-oauth2-final upstream/main

# 3. 元の混乱したブ랜CHから必要なファイルのみを抽出する
git checkout --theirs <必要なファイル>

# またはより直接的な方法：
git checkout <元のブ랜CH> -- <具体的なファイルパス>
```

この方法を使って、OAuth2 機能のみを含むファイルを成功して抽出した：

- `src/consts.ts` - OAuth2 設定
- `src/lib/oauth2-github.ts` - OAuth2 の核心ロジック
- `src/components/oauth2-login-button.tsx` - ログインコンポーネント
- `src/hooks/use-auth.ts` - 認証状態管理
- `src/app/(home)/config-dialog/site-settings/index.tsx` - 設定の統合

## ブ랜CH管理に関する新しい認識

ちょっと、gitの使い方をまた学んだとみなしておけばいいかも。。。

AI発言：
### 1. forkとupstreamの関係を理解した

```bash
# リモートリポジトリを確認する
git remote -v

# このような出力が見えるはずだ：
origin  https://github.com/ユーザ名/プロジェクト名.git (fetch)
origin  https://github.com/ユーザ名/プロジェクト名.git (push)
upstream        https://github.com/原作者名/プロジェクト名.git (fetch)
upstream        https://github.com/原作者名/プロジェクト名.git (push)
```

- `origin`: 私がforkしたリポジトリ
- `upstream`: 原作者の元リポジトリ

### 2. 正しいブ랜치作成プロセス

```bash
# 1. 上流コードが最新であることを確認する
git fetch upstream

# 2. 上流のmainブ랜치に切り替える
git checkout upstream/main

# 3. 上流のmainブ랜치を基に新機能ブ랜치を作成する
git checkout -b feature/new-feature upstream/main

# 4. 開発を行う...

# 5. 関連ファイルのみをコミットする
git add <関連ファイル>
git commit -m "feat: 新機能を追加"

# 6. 自分のリポジトリにプッシュし、PRを作成する
git push origin feature/new-feature
```

### 3. テストブ랜치の作成

PRブ랜치とmainブ랜치のマージ互換性をテストするため、PRブ랜치をmainブ랜치とマージしてvercelにデプロイする新しいブ랜치를作成する：

```bash
# 1. PRブ랜치とmainブ랜치のマージに基づいてテストブ랜치を作成する
git checkout -b test-merge main
git merge feature/new-feature

# 2. Vercelでのデプロイテストのためにテストブ랜치をプッシュする
git push origin test-merge
```
## 手間をかけるのが面倒なので、AIに要約してもらう：
## 経験のまとめ

### 教訓のまとめ

1. **常に上流の最新コードに基づいて機能ブ랜치を作成する**
   - 自分のmainブ랜치に基づいて機能ブ랜치を作成しないこと
   - 定期的に上流のコードをローカルに同期すること

2. **変更するファイルの範囲を明確にする**
   - 提交前一定要检查 `git status`
   - 确保只提交相关文件

3. **Git の高度な機能を活用する**
   - `git checkout` 可以提取特定文件
   - `git cherry-pick` 可以应用特定提交
   - 不要害怕用 Git 命令解决问题

### 新しいワークプロセス：

```bash
# 私の新しい作業プロセス
git fetch upstream                    # オルタングルを同期する
git checkout -b feature/xxx upstream/main  # 機能ブランチを作成する
# 機能を開発する...
git add src/関連ファイル                  # 関連ファイルのみ追加する
git commit -m "記述的なコミットメッセージ"        # コミットする
git push origin feature/xxx           # プッシュする

# 必要に応じてテストブランチを作成する
git checkout -b deploy-test main      # mainに基づく
git merge feature/xxx                 # 機能ブランチをマージする
git push origin deploy-test           # テストデプロイ用にプッシュする
```

## 後続の展開

幸いにも最終的にすべてが解決しました：

1. ✅ `clean-oauth2-final` というクリーンなブ랜치が作成され、OAuth2関連のファイルが7個のみになりました
2. ✅ 正式なPR用に`feature/oauth2-auth`というブ랜치が作成されました
3. ✅ マージの互換性を確認するため`oauth2-merged`というテストブ랜치が作成されました
4. ✅ すべてのブ랜치が成功してプッシュされました

## 結論

もう書くのが面倒になった。自分の間抜けさに呆れた。結局最後は GITHUB_OAUTH2_CLIENT_SECRET を露出できないという理由で
弾かれた。ははは、やっぱりな！

---

*（P.S. もし同じような Git の失敗経験をした場合、コメント欄（未実装）で共有してください。私が一人ではないことを知りたいです 😅）*