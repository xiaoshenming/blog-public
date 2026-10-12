# Liuxiandongについて言わざるを得ないこと

## 前書き

（奇妙なネットワーク環境下の）開発者として、`pip install`、`docker pull`、`conda install`、`nvm install`、`npm/pnpm/yarn/cnpm install`は見覚えがあるでしょう。いつも不思議な理由で停止してしまうのは、これらの問題が主に現在のネットワークが何らかのイメージソースによって阻害されているからです！

## イメージソースとは何か？

镜像源（Mirror Source）とは、原始ソフトウェア倉庫の内容を国内サーバーに完全にコピーしたものであり、この「镜像」を形成するものです。私たちがこの镜像源にアクセスする際、実際には国内のサーバーにアクセスしていることになり、ダウンロード速度と安定性が大幅に向上します。

一般的な镜像源には以下が含まれます：
- **パッケージ管理器の镜像源**：pip、conda、npm、yumなど
- **システムの镜像源**：Ubuntu、CentOS、DebianなどのLinuxディストリビューション
- **コンテナの镜像源**：Docker Hub、GitHub Container Registryなど
- **開発ツールの镜像源**：Maven、Gradleなど

## Condaの镜像源設定

### 公式ソースのダウンロードリンク（推奨！少なくとも最新！）

Anaconda公式リポジトリアドレス：`https://repo.anaconda.com/archive/`
国内の一部大学のイメージリポジトリが古いバージョンであることがないように注意（つまり問題を招く）
nvm国内公式リポジトリアドレス：`https://nvm.uihtm.com/doc/download-nvm.html`
### 設定手順

#### 1. Condaの初期化

condaをまだ初期化していない場合、まず次のコマンドを実行する必要があります：

```bash
conda init
```

#### 2. 国内のイメージソースを追加する

例として清華大学のイメージソースを挙げる：

```bash
# 主要なイメージソースを追加する
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/r
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/pro
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/conda-forge

# 検索時にイメージソースを優先的に使用する設定をする
conda config --set channel_priority strict
```

#### 3. 設定を確認する

現在の設定されたイメージソースを確認する：

```bash
conda config --show channels
```

#### 4. 設定を削除（リセットが必要な場合）

デフォルト設定に戻す必要がある場合：

```bash
conda config --remove-key channels
```

### よく使う Conda イメージソース

| イメージソース | アドレス | 特徴 |
|--------|------|------|
| 清華大学 | https://mirrors.tuna.tsinghua.edu.cn/anaconda/ | 処理速度が速く、更新が迅速 |
| 中国科学技術大学 | https://mirrors.ustc.edu.cn/anaconda/ | 安定かつ信頼性が高い |
| アリバイトクラウド | https://mirrors.aliyun.com/anaconda/ | 企業レベルのサービス |
| 華為クラウド | https://mirrors.huaweicloud.com/anaconda/ | 新興のイメージソース |

## Linux システムのイメージソース設定

### 一键換ソーススクリプト

Linuxシステムでは、一键換ソーススクリプトを使用して迅速に設定できます：

```bash
bash <(curl -sSL https://linuxmirrors.cn/main.sh)
```

## Dockerイメージソースの設定

### 一键配置スクリプト

```bash
bash <(curl -sSL https://linuxmirrors.cn/docker.sh)
```

### pip イメージソース

```bash
# 临时使用
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple package_name

# 永久配置
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 代理使用
pip install --proxy=http://127.0.0.1:7897 -r requirements.txt
最推荐的用法，系统代理跟TUN模式有时候可能都有问题，但是标准用法绝对稳定。
```
---

## 一、npm イメージソースの設定

### 1. 設定淘宝镜像（永久生效）

```bash
npm config set registry https://registry.npmmirror.com
```

### 2. 設定が有効かどうかを確認する

```bash
npm config get registry
# 出力：https://registry.npmmirror.com
```

### 3. 一時使用（単一コマンド）

```bash
npm install --registry https://registry.npmmirror.com
```

### 4. 正式な出典を復元（必要な場合）

```bash
npm config delete registry
# または正式に公式ソースを復元
npm config set registry https://registry.npm.org
```

---

## 二、NVM イメージ設定（Node.js ダウンロードの高速化）

NVM はデフォルトで `https://nodejs.org/dist` から Node.js をダウンロードしますが、国内でのアクセスが遅いです。イメージを設定してダウンロードを高速化できます。

---

### 🖥️ Windows（[nvm-windows](https://github.com/coreybutler/nvm-windows)]を使用）

1. **PowerShell または CMD** を開く
2. 環境変数を設定（永続的）：

```powershell
# Node.js のミラーを設定
[Environment]::SetEnvironmentVariable("NVM_NODEJS_ORG_MIRROR", "https://npmmirror.com/mirrors/node", "User")

# オプション：npm のミラーを設定（nvm install 後に自動的に構成される）
[Environment]::SetEnvironmentVariable("NVM_NPM_MIRROR", "https://npmmirror.com/mirrors/npm", "User")
```

3. 终端を再起動し、テストを実施してください：

```bash
nvm install latest
```

> イメージのアドレス説明：
> - Node.js イメージ：`https://npmmirror.com/mirrors/node`
> - npm イメージ：`https://npmmirror.com/mirrors/npm`

---

### 🐧 Linux / 🍏 macOS（使用 [nvm-sh/nvm](https://github.com/nvm-sh/nvm)）

1. 編集您的 shell 設定ファイル（例：~/.bashrc、~/.zshrc など）：

```bash
nano ~/.zshrc   # 或 ~/.bashrc
```

2. ファイルの末尾に以下の環境変数を追加してください：

```bash
export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node
export NVM_NPM_MIRROR=https://npmmirror.com/mirrors/npm
```

3. 設定を保存して有効化する：

```bash
source ~/.zshrc   # 或 source ~/.bashrc
```

4. テストインストール：

```bash
nvm install --lts
```

---

### Mavenイメージソース

~/.m2/settings.xml に次の内容を追加してください：

```xml
<mirrors>
  <mirror>
    <id>aliyunmaven</id>
    <mirrorOf>*</mirrorOf>
    <name>阿里云公共倉庫</name>
    <url>https://maven.aliyun.com/repository/public</url>
  </mirror>
</mirrors>
```

## グラフィカルカードドライバー関連のコマンド

開発環境を設定する際、グラフィカルカードドライバーのチェックも重要です：

```bash
# グラフィカルカードのハードウェア情報を確認する
lspci | grep -i nvidia

# NVIDIAドライバーの状態を確認する
nvidia-smi

# ドライバーのバージョンを表示する
nvidia-smi --query-gpu=driver_version --format=csv
```

---

## 🐉 ArchLinux 代理設定（2026年最新方案）

> これは私がとても便利だと思う方案です！特に Clash Verge と連携して、ローカルネットモードを直接有効にすることで、本機のすべてのアプリが自動的に代理を利用するようになり、設定も不要になります。

### 核心的な考え方

代理を個別に設定するより、システムレベルで統一して利用する方が良い。私の提案は以下の通り：

- **代理クライアント**：Clash Verge（オープンソースで無料、インターフェースが美しい）
- **代理モード**：「ローカルネットワーク接続を許可」のみを有効にし、TUNモードは有効にしない
- **代理アドレス**：`http://127.0.0.1:7897`
- **グローバル代理**：`alias` の別名とコマンドのプレフィックスを使用し、任意のコマンドを一括で代理に切り替える

### ステップ1：Clash Vergeのインストール

```bash
# Archユーザーは直接 yay または pacmanを使用できます
yay -S clash-verge

# または AppImageをダウンロードすることもできます
wget https://github.com/zzzgydi/clash-verge/releases/latest/download/Clash-Verge-linux-x64.tar.gz
tar -xzf Clash-Verge-linux-x64.tar.gz
./Clash-Verge-linux-x64/clash-verge
```

### ステップ2：Clash Vergeの設定を行う

1. Clash Vergeを開く
2. 空港のサブスクリプションリンクを追加する
3. **重要設定**：「設定」→「ネットワーク」で「ローカルエリア接続を許可」を選択
4. TUNモードは必要ない、通常のHTTPプロキシモードで十分だ
5. プロキシアドレスを記録：`http://127.0.0.1:7897`

### ステップ3：ターミングプロキシの別名を設定する（おすすめ！）

`~/.zshrc` または `~/.bashrc` を編集し、便利な別名を追加する：

```bash
# 代理アライバル：px = proxy
alias px='http_proxy=http://127.0.0.1:7897 HTTP_PROXY=http://127.0.0.1:7897 https_proxy=http://127.0.0.1:7897 HTTPS_PROXY=http://127.0.0.1:7897'
```

保存後、`source ~/.zshrc`を実行すると有効になります。

### ステップ4：楽しみながら使用する

現在は、任意のコマンドの前に `px ` のプレフィックスを付けるだけで、そのコマンドは自動的にエージェントを使用するようになります。

```bash
# npmパッケージのインストール
px npm install express

# GitHubリポジトリのクローン
px git clone https://github.com/some/repo.git

# pipによるインストール
px pip install torch

# dockerのコンテナ引き落とし
px docker pull nginx:latest

# curlによるテスト
px curl https://google.com

# さらに、ネットワークリクエスト付きのスクリプトを実行することも可能
px python my_script.py
```

### なぜこの方法が推奨されるのか？

1. **シンプルで手軽**：各アプリに個別の設定をする必要がなく、一つのアライバルで全てを処理可能
2. **制御性が高い**：プロキースを使う命令のみが実行され、他の操作には影響を与えない
3. **互換性が良い**：TUNモードでは時々問題が発生するが、このアライバル方式ではほとんど問題ない
4. **いつでも終了可能**：`px` のプレフィックスを付けない限り、自由に操作可能
5. **一度設定で永遠に便利**：一度設定すれば、今後も快適に使用可能

### 高度な使い方

`px` を毎回書くのが面倒だと感じる場合は、さらに詳細な設定が可能です：

```bash
# 方法1：より短いアライラー名
alias p='px'

# 方法2：特定のツール用の永続的なプロキシ設定（選択可能）
# npm
npm config set proxy http://127.0.0.1:7897
npm config set https-proxy http://127.0.0.1:7897

# git
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897

# pip
pip config set global.proxy http://127.0.0.1:7897
```

### よくある質問

**Q：プロキシが機能しない？**
A：Clash Verge が有効になっているか、『ローカルネットワーク接続を許可』のチェックが入っているか、ポートが 7897 であるかを確認してください

**Q：一部のコマンドはまだタイムアウトになっている？**
A：一部の空港ではコンマンチに制限がありますので、コンマンチを減らすか別のノードを使用してみてください

**Q：TUNモードとこの別名法の違いは何ですか？**
A：TUNはグローバルエージェントであり、すべてのトラフィックがエージェントを通過します。別名法はより柔軟で、利用したいときは利用し、利用したくないときは利用しないことができます。個人的には別名法の方が好きです。問題が発生した場合、対処が容易です。

---

# イメージサイト推奨リスト

## 🏢 企業サイト
| 名称 | 住所 |
|------|------|
| 网易 | https://mirrors.163.com |
| 搜狐 | http://mirrors.sohu.com |
| 阿里云 | https://mirrors.aliyun.com |
| 首都在线科技股份有限公司 | http://mirrors.yun-idc.com |
| 华为云 | https://mirrors.huaweicloud.com |
| 腾讯云 | https://mirrors.cloud.tencent.com |
| 平安云 | https://mirrors.pinganyun.com |
| 开源社/Azure中国 | http://mirror.azure.cn |
| OpenTuna/AWS中国 | https://opentuna.cn |

## 🎓 教育サイト
| 名称 | 住所 |
|------|------|
| 中国科技大学 | https://mirrors.ustc.edu.cn |
| 清华大学 | https://mirrors.tuna.tsinghua.edu.cn |
| 北京外国语大学 | http://mirrors.bfsu.edu.cn |
| 北京交通大学 | https://mirror.bjtu.edu.cn |
| 北京理工大学 | http://mirror.bit.edu.cn/web |
| 兰州大学 | http://mirror.lzu.edu.cn |
| 上海交通大学 | http://ftp.sjtu.edu.cn |
| 大连东软信息学院 | http://mirrors.neusoft.edu.cn |
| 浙江大学 | http://mirrors.zju.edu.cn |
| 重庆大学 | http://mirrors.cqu.edu.cn |
| 南阳理工学院 | http://mirror.nyist.edu.cn |
| 中科院高能物理研究所 | http://mirror.ihep.ac.cn |
| 西北农林科技大学 | https://mirrors.nwafu.edu.cn |
| 华中科技大学 | http://mirror.hust.edu.cn |
| 大连理工大学 | http://mirror.dlut.edu.cn |
| 山东女子学院 | http://mirrors.sdwu.edu.cn |
| 西安交通大学 | https://mirrors.xjtu.edu.cn |
| 上海交通大学SJTUG | https://mirrors.sjtug.sjtu.edu.cn |
| 南京邮电大学 | http://mirrors.njupt.edu.cn |
| 南京大学 | http://mirrors.nju.edu.cn |
| 同济大学 | https://mirrors.tongji.edu.cn |
| 华南农业大学 | https://mirrors.scau.edu.cn |
| 东莞理工学院 | https://mirrors.dgut.edu.cn |
| 重庆邮电大学 | http://mirrors.cqupt.edu.cn |
| 云南大学 | http://mirrors.ynuosa.org/index |
| 哈尔滨工业大学 | https://mirrors.hit.edu.cn |
| 南方科技大学 | https://mirrors.sustech.edu.cn |

## 📦 その他の専用ミラーサイト
| 種類 | 名前 | アドレス |
|------|------|------|
| 総合 | 常州贝特康姆ソフトウェア技術有限公司(公云PubYun) | http://centos.bitcomm.cn |
| Python | 豆瓣pypi | http://pypi.doubanio.com |
| Python | v2exのpypi | http://pypi.v2ex.com |
| NPM | 淘宝NPM | https://npm.taobao.org |
| Ruby | Ruby ChinaのRubyGems | https://gems.ruby-china.com |
| Maven | 淘宝TAEMavenリポジトリミラーサイト | http://mvnrepo.tae.taobao.com/content/groups/public |
| Maven | 阿里云Mavenリポジトリミラーサイト | http://maven.aliyun.com/nexus/content/groups/public |
| Maven | 阿里云Jcenterリポジトリミラーサイト | http://maven.aliyun.com/nexus/content/repositories/jcenter |
| 総合 | LinuxEye | http://mirrors.linuxeye.com |
| 総合 | モバイルクラウドミラーサイト | http://mirrors.bclinux.org |
| 総合 | Cloud-Stackリポジトリサイト | http://mirrors.cloudstack-china.com |
| 総合 | cn99(常州贝特康姆傘下) | http://mirrors.cn99.com |
| 龍芯 | 龍芯オープンソースコミュニティ | http://mirrors.loongnix.org |
| 教育 | 英荔教育 | https://mirrors.e-ducation.cn |
| JDK | injdk.cnの各バージョンのJDKミラーサイト | https://www.injdk.cn |
| Go | 百度Go Moduleリポジトリエージェント | http://goproxy.baidu.com |

## 🏆 推奨使用（総合性能が良い）
1. **清華大学ミラーサイト** - https://mirrors.tuna.tsinghua.edu.cn
2. **中国科学技術大学ミラーサイト** - https://mirrors.ustc.edu.cn
3. **阿里云ミラーサイト** - https://mirrors.aliyun.com
4. **テンセントクラウドミラーサイト** - https://mirrors.cloud.tencent.com

## 💡 使用推奨事項
- **開発環境**：清華大学または中国科学技術大学のミラーサイトを推奨します。更新が迅速で対応範囲が広い
- **生産環境**：阿里云、テンセントクラウドなどの企業レベルのミラーサイトを使用することを推奨します。安定性が高い
- **特定言語**：開発言語に応じて専用ミラーサイトを選択します（例：NPMには淘宝、RubyにはRuby Chinaを使用）
- **地理位置**：自分の地理位置に近いミラーサイトを選択すると速度が速い