# Vue.js 모바일 환경 구축 단 6단계: 패키지 설치→설정→컴파일→초기화→플랫폼 추가→동기화

## 서문

효율을 추구하는 Vue.js 개발자로서, 저는 모바일 환경 구축을 위한 가장 빠른 방법을 찾고 있었습니다. Java/Kotlin을 배우나요? Android Studio 환경을 준비하나요? Gradle 설정 작업을 하나요? 이 모든 것들이 시간 낭비가 됩니다!

Capacitor를 만나고서야 모바일 환경 구축이 매우 간단하다는 것을 알게 되었습니다.

오늘은 제 실제 경험을 공유하려고 합니다: 6단계의 과정을 통해 완전한 Vue.js 전자 태그 관리 시스템을 Android 애플리케이션으로封装하는 방법을 소개합니다. 이 과정에서 코드를 거의 작성하지 않았습니다.

## 프로젝트 배경

제 프로젝트는 Vue.js 2.6.12 + Element UI를 기반으로 한 전자 태그 관리 시스템입니다. 기능에는 다음이 포함됩니다:
- 장비 관리 및 모니터링
- 가격 템플릿 관리
- 매장 및 상품 관리
- 데이터 통계 및 보고서

이것은 전형적인 기업급 관리 시스템으로 웹 버전에서 잘 작동합니다. 하지만 사업이 발전함에 따라 고객들은 특히 모바일 기기에서 작업하는 것을 더욱 원합니다. 특히 현장 관리자들은 언제든지 장비 상태를 확인하고 가격 정보를 업데이트해야 합니다.

전통적인 방안은 애플리케이션 전체를 다시 작성하거나 복잡한 네이티브 개발을 배우는 것을 의미합니다. 하지만 Capacitor는 세 번째 선택지를 제공합니다.
![](/blogs/vuejs-capacitor-mobile-app-encapsulation/2e3d72a33d9dc100.webp)
## 왜 Capacitor를 선택할까?

기술 선택 시, 저는 여러 주요 방안을 비교했습니다:

### uni-app
Vue 문법에 맞게 조정해야 하며, Element UI를 uni-ui로 교체해야 하므로 프로젝트를 재구성하는 것과 같습니다. PASS.

### Cordova
오래된 방안이지만 설정이 복잡하고 성능이 평범하며 커뮤니티 활동도 줄어듭니다. PASS.

### PWA
순수 웹 솔루션이지만 블루투스, 카메라 등 하드웨어 기능을 사용할 수 없으며 ESL 시스템에는 적합하지 않습니다. PASS.

### Capacitor ✅
- Vue.js 프로젝트에는 어떠한 수정도 필요하지 않음
- 설정이 간단하여 한 개의 JSON 파일로 충분함
- 필요한 모든 기본 기능을 지원함
- 성능이 기본 애플리케이션과 유사함

**결론: Capacitor는 Vue 개발자를 위해 특별히 고안된 모바일 솔루션입니다!**

## 완전한 6단계 포장 프로세스

### 1단계: Capacitor 패키지 설치

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
```
정말 간단합니다. npm을 사용하여 몇 개의 패키지를 설치하는 것뿐입니다. 만약 npm 사용법도 모른다면 이 글이 당신에게 적합하지 않을 수 있습니다😅.

### 2단계: JSON 설정 파일 작성

이 부분만큼은 과제를 해야 하는 유일한 부분입니다. 프로젝트의 루트 디렉터리에 `capacitor.config.json` 파일을 만들어 주세요.

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

이 설정에 대한 설명:
- `appId`: 앱의 고유 식별자로, 패키지 이름과 유사합니다
- `appName`: 앱의 표시된 이름
- `webDir`: Vue 프로젝트가 빌드된 후의 디렉터리로, 보통 `dist`입니다
- `plugins`: 필요한 네이티브 플러그인과 권한 설정

**중요: 이 설정 파일은 거의 공식 템플릿을 그대로 가져온 것 같아요, 몇 가지 매개변수만 변경한 것뿐입니다!**

### 3단계: Vue 프로젝트를 컴파일하기

```bash
npm run build:prod
```

이 명령은 당신이 원래 실행하려는 것이죠? Capacitor는 Vue 코드를 조정할 필요가 없으며, 기존의 빌드 프로세스를 그대로 사용하면 됩니다.

빌드가 완료되면 `dist` 디렉터리 안에 당신의 웹 애플리케이션이 있을 것입니다. Capacitor는 이를 네이티브 앱으로 패키지화합니다.

### 4단계: Capacitor 프로젝트를 초기화하기

```markdown
## Capacitor 프로젝트 초기화 과정
1. 프로젝트를 리뉴더링하는 단계
2. Capacitor 설치 및 설정
3. 빌드 파일의 구성 확인
4. 배포 준비
```

처음 사용할 때 Capacitor 프로젝트를 초기화해야 합니다:

```bash
npx cap init "당신의 애플리케이션 이름" "com.yourapp.id"
```

### 5단계: 플랫폼 지원 추가

그런 다음 필요한 플랫폼을 추가하세요:

```bash
npx cap add android
npx cap add ios
```

### 6단계: 동기화 및 패키징

이후 코드를 업데이트하면, 패키징하고 동기화하는 것만 필요합니다:

```bash
npm run build:prod 
npx cap sync
```

마지막으로 Android Studio를 열어 패키징을 진행합니다:

```bash
CAPACITOR_ANDROID_STUDIO_PATH=/path/studio.sh npm run android:open
```

**이렇게! 당신의 Vue 애플리케이션이 이제 Android 애플리케이션이 되었습니다!**

## 놀라운 자동화 과정

저에게 Capacitor가 당신에게 어떤 도움을 주었는지 말해드리겠습니다:

### 자동 생성된 Android 프로젝트 구조
```
android/
├── app/
│   ├── build.gradle          # 자동 설정된 빌드 파일
│   ├── src/main/             # 자동 생성된 소스 코드
│   └── ...                   # 기타 Android 프로젝트 파일
├── build.gradle              # 프로젝트 수준의 빌드 설정
├── gradle.properties         # Gradle 속성
└── settings.gradle           # 프로젝트 설정
```

### 자동 처리되는 기능
- **WebView 설정**: WebView를 자동으로 설정하여 당신의 Web 애플리케이션을 로드합니다
- **권한 관리**: 설정 파일에 따라 Android 권한을 자동으로 요청합니다
- **플러그인 연결**: JavaScript를 네이티브 코드로 연결하는 코드를 자동으로 생성합니다
- **빌드 설정**: Gradle 빌드 스크립트를 자동으로 설정합니다
- **아이콘과 시작 페이지**: 기본 애플리케이션 아이콘과 시작 페이지를 자동으로 생성합니다

**저는 Android를 설치하지도 않았는데, Capacitor가 모든 네이티브 개발 작업을 처리해주었습니다!**

## 진짜 "아무 문제도 없는" 경험

솔직히 말해서, 많은 시간을 들여서 실수를 피할 준비를 했는데, 결과는...

### 권한 문제 없음
설정 파일에 권한이 명시되어 있으며, Capacitor가 Android 권한 요청을 자동으로 처리합니다.

### 호환성 문제 없음
Capacitor에는 WebView 최적화 및 호환성 처리가 내장되어 있습니다.

## Glossary
- 留仙洞 → Liuxiandong
- 鸣潮 → Wuthering Waves
- 博主/站名 Suni → Suni
- 汇文明朝体 → Huiwen Mingcho (font name)

### 성능 문제 없음
최적화된WebView를 사용하여 성능이 기본 앱과 비슷합니다.

### 디버깅 문제 없음
Chrome DevTools를 통한 원격 디버깅을 지원하며, 웹 개발만큼 편리합니다.

**이것이 바로 즉시 사용 가능한 즐거움입니다! 전혀 문제가 없어서 모르는 사이에 사용할 수 있었습니다!**

## 기존 모바일 개발과 비교

표를 통해 차이를 보여드리겠습니다:

| 항목 | 전통적인 Android 개발 | Capacitor 방식 |
|------|--------------------------|----------------|
| 학습 비용 | Java/Kotlin, Android SDK 배우기 필요 | 0, Vue 개발자가 바로 시작 가능 |
| 개발 시간 | 2-3개월의 리팩터링 필요 | 2시간으로 완료 |
| 코드 재사용 | 0%, 다시 작성 필요 | 100%, 기존 코드 그대로 사용 |
| 디버깅 난이도 | 복잡, Android Studio 필요 | 간단, Chrome DevTools |
| 유지보수 비용 | 높음, 네이티브 개발자 필요 | 낮음, 웹 개발자가 유지 가능 |

**이 차이도 너무 큽니다!**

## 내 package.json 스크립트

편리하게 하기 위해 package.json에 몇 가지 스크립트를 추가했습니다:

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

지금 내 작업 과정은 다음과 같습니다:
1. Vue 코드를 수정합니다
2. `npm run build:mobile`
3. `npm run android:open`
4. Android Studio에서 패키징을 실행합니다

**이렇게 간단합니다!**

## Vue 개발자에게 드리는 조언

모바일화를 고려하고 있다면, 제 조언은 다음과 같습니다:

### 1. 모바일 개발에 두려워하지 마세요
Capacitor가 있으면 모바일 개발은 웹 개발만큼 간단합니다.

### 2. 노력보다 선택이 중요합니다
올바른 도구를 선택하는 것이 열심히 공부하는 것보다 더 중요합니다. Capacitor는 Vue 개발자에게 가장 적합한 선택입니다.

### 3. 기존 코드는 귀중한 자산입니다
기존 코드를 쉽게 다시 작성하지 마세요, Capacitor를 사용하면 Vue 프로젝트를 100% 재사용할 수 있습니다.

### 4. 작은 프로젝트부터 시작하세요
걱정이 된다면 작은 프로젝트부터 시작하여 자신감을 쌓으세요.

## 결론

모바일 개발은 정말 이렇게 간단할 수 있습니다!

Capacitor를 사용하여 6단계의 과정을 거쳐 완전한 Vue.js 관리 시스템을 Android 애플리케이션으로 포장했습니다:
1. **설치** - npm install 몇 개의 패키지
2. **설정** - JSON 파일을 작성합니다
3. **컴파일** - 기존의 빌드 명령을 실행합니다
4. **초기화** - npx cap init으로 프로젝트를 초기화합니다
5. **플랫폼 추가** - npx cap add android/ios로 플랫폼을 추가합니다
6. **동기화** - 한 줄의 명령으로 Android 프로젝트를 생성합니다

전체 과정에서 한 줄의 네이티브 코드도 작성되지 않았으며, 어떠한 기술적 문제도 발생하지 않았고, 새로운 기술을 배우는 추가적인 시간도 들지 않았습니다.

**이것이 바로 제가 원하는 모바일 방식의 솔루션입니다! 간단하고 빠르며 효율적입니다!**

만약 당신도 Vue 개발자이고 모바일화가 필요하다면, 네이티브 개발의 복잡성에 두려워한다면, Capacitor는 분명 당신에게 최적의 선택입니다.

모바일 개발도 이렇게 간단할 수 있어요!

---

*이 글은 실제 Vue.js + Capacitor 프로젝트를 바탕으로 작성되었습니다. 프로젝트 주소: https://github.com/xiaoshenming/front_i18n*

*문의나 제안이 있으면 댓글 böl에서 이야기해 주세요!*
