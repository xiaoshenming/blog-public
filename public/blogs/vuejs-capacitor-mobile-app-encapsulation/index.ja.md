# Vue.jsモバイル向けのラップには6ステップが必要：パッケージのインストール→設定→コンパイル→初期化→プラットフォームの追加→同期

## 前書き

効率を追求するVue.js開発者として、私は最速のモバイル対応ソリューションを探していました。Java/Kotlinを学ぶ？Android Studioの環境を整える？Gradleの設定を書く？これらの時間コストは高すぎます！

Capacitorに出会ったとき、モバイル向けのラップが非常に簡単になることに気づきました。

今日は私の実際の経験を共有します。6つのステップを使って、完全なVue.js電子地図管理システムをAndroidアプリケーションにコンパイルする方法です。このプロセスではほとんどコードを書かなかったです。

## プロジェクトの背景

私のプロジェクトはVue.js 2.6.12 + Element UIを基盤とした電子地図管理システムで、機能には以下が含まれます：
- 機器管理と監視
- 価格テンプレート管理
- 店舗と商品管理
- データ統計と報告書

これは典型的な企業レベルの管理システムで、Web端で良好に動作します。しかし、事業の発展に伴い、顧客はスマートフォンでの操作をより望むようになりました。特に現場の管理者は、常に機器の状態を確認したり、価格情報を更新したりする必要があります。

伝統的なソリューションは、アプリ全体を書き直すか、複雑なオリジナル開発を学ぶことを意味します。しかしCapacitorは私に第三の選択肢を提供してくれました。
![](/blogs/vuejs-capacitor-mobile-app-encapsulation/2e3d72a33d9dc100.webp)
## なぜCapacitorを選ぶのか？

技術選定時、いくつかの主流ソリューションを比較しました：

### uni-app
Vueのスキルに合わせる必要があり、Element UIをuni-uiに変更する必要があり、これはプロジェクトの再構築に相当します。PASS。

### Cordova
従来のソリューションですが、設定が複雑で、性能も普通で、コミュニティの活発さも低下しています。PASS。

### PWA
純粋なWebプロジェクトですが、Bluetoothやカメラなどのハードウェア機能が利用できず、ESLシステムには適していません。PASS。

### Capacitor ✅
- Vue.jsプロジェクトでは何も変更が必要ありません
- 設定が簡単で、1つのJSONファイルで済みます
- 必要なすべてのネイティブ機能をサポート
- パフォーマンスはネイティブアプリに匹敵です

**結論：CapacitorはVue開発者向けのモバイルプロジェクトです！**

## 完全な6ステップのラッピングプロセス

### 第1步：インストールCapacitorパッケージ

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
```
これだけです。npmでいくつかのパッケージをインストールするだけです。もしnpmの使い方すらわからないなら、この記事はあまり適切ではないかもしれません😅。

### 第2步：JSON設定ファイルを作成

これがプロセス中で唯一「頭を使う」必要がある部分です。プロジェクトのルートディレクトリに`capacitor.config.json`を作成してください。

```json
{
  "appId": "com.panpantech.eslmanagement",
  "appName": "panpantech",
  "webDir": "dist",
  "server": {
    "androidScheme": "http",
    "iosScheme": "http",
    "cleartext": true
  },
  "plugins": {
    "Camera": {
      "permissions": ["camera", "photos"]
    },
    "BarcodeScanner": {
      "permissions": ["camera"]
    },
    "BluetoothLe": {
      "permissions": ["bluetooth", "bluetooth-scan", "bluetooth-connect"]
    },
    "PushNotifications": {
      "presentationOptions": ["badge", "sound", "alert"]
    },
    "Preferences": {
      "name": "ESLPrefs"
    },
    "App": {
      "appendUserAgent": "ESL-Management-App"
    }
  },
  "android": {
    "webContentsDebuggingEnabled": true
  },
  "ios": {
    "webContentsDebuggingEnabled": true
  }
}
```

この設定の説明：
- `appId`: アプリの一意な識別子、パッケージ名のようなもの
- `appName`: アプリの表示名
- `webDir`: Vueプロジェクトが構築された後のディレクトリ、通常は`dist`
- `plugins`: 必要なネイティブプラグインと権限の設定

**重点：この設定ファイルはほぼ公式テンプレートをコピーしたもので、いくつかのパラメータを変更しただけです！**

### 第3ステップ：Vueプロジェクトのコンパイル

```bash
npm run build:prod
```

このコマンドは本来あなたが実行するものですよね？CapacitorではVueコードを修正する必要はなく、既存のビルドプロセスを使用するだけでよい。

ビルドが完了すると、`dist`フォルダ内にWebアプリケーションが存在し、Capacitorがそれをネイティブアプリケーションとしてパッケージ化します。

### 第4ステップ：Capacitorプロジェクトの初期化

初回使用時にはCapacitorプロジェクトを初期化する必要があります：

```bash
npx cap init "你的アプリ名" "com.yourapp.id"
```

### 第5ステップ：プラットフォームのサポートを追加する

その後、必要なプラットフォームを追加します：

```bash
npx cap add android
npx cap add ios
```

### 第6ステップ：同期とパッケージング

その後、コードを更新した際には、パッケージングと同期するだけでよい：

```bash
npm run build:prod 
npx cap sync
```

最後に、Android Studioを開いてパッケージ化を行います：

```bash
CAPACITOR_ANDROID_STUDIO_PATH=/path/studio.sh npm run android:open
```

**これで終わりです！あなたのVueアプリケーションはAndroidアプリケーションになりました！**

## 驚くべき自動化プロセス

Capacitorが実際にどのようなことをしてくれたかを説明します：

### 自動生成されたAndroidプロジェクト構造
```
android/
├── app/
│   ├── build.gradle          # 自動設定されたビルドファイル
│   ├── src/main/             # 自動生成されたソースコード
│   └── ...                   # その他のAndroidプロジェクトファイル
├── build.gradle              # プロジェクトレベルのビルド設定
├── gradle.properties         # Gradleの設定ファイル
└── settings.gradle           # プロジェクトの設定ファイル
```

### 自動処理される機能
- **WebView設定**: WebViewの設定が自動で適用され、Webアプリケーションが表示される
- **権限管理**: 設定ファイルに基づいてAndroidの権限が自動的に申請される
- **プラグイン接続**: JavaScriptからネイティブコードへの接続コードが自動生成される
- **ビルド設定**: Gradleのビルドスクリプトが自動で設定される
- **アイコンと起動ページ**: デフォルトのアプリケーションアイコンと起動ページが自動生成される

**Androidをインストールしてもいないのに、Capacitorがネイティブ開発のすべてをこなしてくれた！**

## 本物の「ゼロ問題」体験

正直言って、多くの時間をかけて失敗を避けるつもりだったが、結果は…

### 権限問題がない
設定ファイルに権限が記載されており、CapacitorがAndroidの権限申請を自動的に処理する。

### 互動性の問題はありません。
CapacitorにはWebViewの最適化と互換性処理が内蔵されています。

### 性能に問題はない
最適化されたWebViewを使用しており、性能はネイティブアプリに匹敵する。

### デバッグに問題はない
Chrome DevToolsでのリモートデバッグが可能で、Web開発と同じくらい便利だ。

**これが手軽で楽しいところです！実際に問題が発生するかもしれないとは思えません。なぜなら全く問題がないからです！**

## 従来のモバイル開発との比較

表を使って差を示します：

| 項目 | 従来のAndroid開発 | Capacitor方案 |
|------|------------------|----------------|
| 学習コスト | Java/Kotlin、Android SDKの学習が必要 | 0、Vue開発者は直接使える |
| 開発時間 | 2～3ヶ月のリファクタリング | 2時間で完了 |
| コードの再利用 | 0%、再書きが必要 | 100%、既存コードを直接使える |
| デバッグの難易度 | 複雑、Android Studioが必要 | 簡単、Chrome DevTools |
| メンテナンスコスト | 高く、ネイティブ開発者が必要 | 低く、Web開発者でも対応可能 |

**この差は大きすぎます！**

## 私のpackage.jsonスクリプト

より便利にするために、package.jsonにいくつかスクリプトを追加しました：

```json
{
  "scripts": {
    "build:mobile": "npm run build:prod && npx cap sync",
    "android:run": "npm run build:mobile && npx cap run android",
    "android:open": "npx cap open android",
    "ios:run": "npm run build:mobile && npx cap run ios",
    "ios:open": "npx cap open ios",
    "sync": "npx cap sync"
  }
}
```

現在私の作業プロセスは以下の通りです：
1. Vueコードの修正
2. `npm run build:mobile`
3. `npx cap open android`
4. Android Studioでパッケージ化を実行

**それだけです！**

## Vue開発者へのアドバイス

もしモバイル化を考えているなら、私の提案は：

### 1. モバイル開発を恐れないこと
Capacitorがあれば、モバイル開発はWeb開発と同じくらい簡単になります。

### 2. 選択が努力より重要
正しいツールを選ぶことの方が、努力を重ねるより重要です。CapacitorはVue開発者にとって正しい選択です。

### 3. 既存のコードは貴重な資産です
既存のコードを簡単に書き換える必要はありません。Capacitorを使えばVueプロジェクトを100%再利用できます。

### 4. 小規模プロジェクトから始めましょう
心配がある場合は、小規模プロジェクトから始めてみて、信頼を築くことができます。

## まとめ

モバイル開発は本当にこんなに簡単です！

Capacitorを利用して、6つのステップを経て完全なVue.js管理システムをAndroidアプリケーションにコンパイルしました：
1. **装包** - npm installを使用してパッケージをインストール
2. **配置** - JSONファイルを作成
3. **编译** - 既存のビルドコマンドを実行
4. **初始化** - npx cap initでプロジェクトを初期化
5. **添加平台** - npx cap add android/ios
6. **同步** - 1つのコマンドでAndroidプロジェクトを生成

全過程で1行もネイティブコードを書かず、技術的な問題もなく、新しい技術を学ぶための追加の時間も必要ありませんでした。

**これが私が求めるモバイル向けのソリューションです！シンプルで、迅速で、効率的です！**

もしあなたもVue開発者で、モバイル化が必要である場合、もしネイティブ開発の複雑さを恐れる場合、Capacitorは間違いなくあなたに最適な選択です。

**モバイル開発、本当にこんなに簡単にできる！**

---

*本記事は実際のVue.js + Capacitorプロジェクトの実践に基づいています。プロジェクトのリンク：https://github.com/xiaoshenming/front_i18n*

*何か質問や提案があれば、コメント欄で話題にしましょう！*
