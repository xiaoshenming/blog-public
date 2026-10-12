# 6 steps to encapsulate Vue.js for mobile: Package installation → Configuration → Compilation → Initialization → Add platforms → Synchronization

## Preface

As a Vue.js developer who values efficiency, I have been searching for the fastest mobile solution. Learn Java/Kotlin? Set up Android Studio? Write Gradle configurations? The time costs are too high!

It wasn't until I encountered Capacitor that I realized mobile encapsulation can be as simple as it gets.

Today I’d like to share my real experience: how to wrap a complete Vue.js price tag management system into an Android app using just 6 steps, with almost no code written throughout the process.

## Project Background

My project is a price tag management system based on Vue.js 2.6.12 + Element UI, featuring functions such as:
- Device management and monitoring
- Price template management
- Store and product management
- Data statistics and reports

This is a typical enterprise-level management system that works well on the web. However, as the business grows, customers increasingly prefer using it on mobile devices, especially as on-site managers need to check device status and update price information at any time.

The traditional approach means rewriting the entire application or learning complex native development. But Capacitor offers a third option.
![](/blogs/vuejs-capacitor-mobile-app-encapsulation/2e3d72a33d9dc100.webp)
## Why choose Capacitor?

When selecting a technology, I compared several mainstream options:

### uni-app
Requires adapting to Vue syntax, and Element UI needs to be replaced with uni-ui, which is equivalent to refactoring the project. PASS.

### Cordova
An established solution, but with complex configuration, average performance, and declining community activity. PASS.

### PWA
A pure web solution, but cannot access hardware features like Bluetooth and cameras, making it unsuitable for ESL systems. PASS.

### Capacitor ✅
- No modifications needed for Vue.js projects
- Easy configuration, just a JSON file
- Supports all required native features
- Performance is similar to native apps

**Conclusion: Capacitor is a mobile solution tailored specifically for Vue developers!**

## Complete 6-step encapsulation process

### Step 1: Install the Capacitor package

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
```
It’s just simple npm installation of a few packages. If you can’t even use npm, this article might not be very suitable for you 😅.

### Step 2: Write the JSON configuration file

This is the only part in the process that requires some thought. Create `capacitor.config.json` in the root directory of your project:

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

Explanation of this configuration:
- `appId`: Unique identifier for the app, similar to a package name
- `appName`: Display name of the app
- `webDir`: The directory where the Vue project is built, usually `dist`
- `plugins`: Configures required native plugins and permissions

**Key point: I basically copied this from the official template, with just a few parameter changes!**

### Step 3: Compile the Vue project

```bash
npm run build:prod
```

This command is what you were supposed to run, right? Capacitor doesn’t require you to modify any Vue code; you can simply use the existing build process.

After the build is complete, the `dist` directory will contain your web application, and Capacitor will package them into a native application.

### Step 4: Initialize the Capacitor project

For the first use, you need to initialize the Capacitor project:

```bash
npx cap init "Your Application Name" "com.yourapp.id"
```

### Step 5: Add platform support

Then add the required platforms:

```bash
npx cap add android
npx cap add ios
```

### Step 6: Synchronization and packaging

After each code update, simply package and synchronize:

```bash
npm run build:prod 
npx cap sync
```

Finally, open Android Studio to perform packaging:

```bash
CAPACITOR_ANDROID_STUDIO_PATH=/path/studio.sh npm run android:open
```

**That’s it! Your Vue application has now become an Android application!**

## A magical automated process

Let me tell you what Capacitor has actually done for you:

### Automatically generated Android project structure
```
android/
├── app/
│   ├── build.gradle          # Automatically configured build file
│   ├── src/main/             # Automatically generated source code
│   └── ...                   # Other Android project files
├── build.gradle              # Project-level build configuration
├── gradle.properties         # Gradle properties
└── settings.gradle           # Project settings
```

### Automatically handled features
- **WebView configuration**: Automatically configures WebView to load your web application
- **Permission management**: Automatically requests Android permissions based on the configuration file
- **Plugin bridging**: Automatically generates JavaScript to native bridging code
- **Build configuration**: Automatically configures Gradle build scripts
- **Icons and launch screen**: Automatically generates default app icons and launch screen

**I haven’t even installed Android, and Capacitor has taken care of all the native development work!**

## A true "zero issues" experience

To be honest, I had planned to spend a lot of time avoiding pitfalls, but...

### No permission issues
The permissions are already specified in the configuration file, and Capacitor automatically handles Android permission requests.

### No compatibility issues
Capacitor includes built-inWebView optimization and compatibility handling.

### No performance issues
Optimized WebView is used, and performance is similar to native apps.

### No debugging problems
Supports remote debugging with Chrome DevTools, just as convenient as Web development.

**This is the joy of being ready out of the box! I didn’t even know what problems might arise, because none did!**

## Comparison with traditional mobile development

Let me use a table to show the differences:

| Aspect | Traditional Android Development | Capacitor Solution |
|-------|----------------------------------|---------------------|
| Learning Cost | Requires learning Java/Kotlin and Android SDK | 0, Vue developers can start immediately |
| Development Time | 2-3 months for refactoring | 2 hours for completion |
| Code Reuse | 0%, needs rewriting | 100%, can use existing code |
| Debugging Difficulty | Complex, requires Android Studio | Simple, uses Chrome DevTools |
| Maintenance Cost | High, requires native developers | Low, can be maintained by web developers |

**This gap is also too large!**

## My package.json script

For easier access, I added several scripts in package.json:

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

My current workflow is as follows:
1. Modify Vue code
2. `npm run build:mobile`
3. `npx cap open android`
4. Click build in Android Studio

**It’s that simple!**

## Tips for other Vue developers

If you are also considering mobile development, my advice is:

### 1. Don’t fear mobile development
With Capacitor, mobile development is as simple as Web development.

### 2. Choice matters more than effort
Choosing the right tools is more important than hard work. Capacitor is the right choice for Vue developers.

### 3. The existing code is a valuable asset
Do not rewrite the existing code easily; Capacitor allows you to reuse Vue projects 100%.

### 4. Start with small projects
If you have concerns, you can begin with small projects to build confidence.

## Summary

Mobile development can actually be so simple!

With Capacitor, I wrapped a complete Vue.js admin system into an Android app in just 6 steps:
1. **装包** - npm install几个包
2. **Configure** — write a JSON file
3. **Build** — run the existing build command
4. **Initialize** — `npx cap init` to set up the project
5. **添加平台** - npx cap add android/ios
6. **Sync** — one command generates the Android project

No native code was written in the entire process, no technical challenges encountered, and no extra time spent learning new technologies.

**This is the mobile solution I want! Simple, fast, and efficient!**

If you are also a Vue developer, if you need mobile adaptation, and if you are afraid of the complexity of native development, then Capacitor is definitely your best choice.

Mobile app development can indeed be so simple!

---

*This article is based on real-world Vue.js + Capacitor project practices. Project link: https://github.com/xiaoshenming/front_i18n*

*If you have any questions or suggestions, feel free to discuss in the comments!*
