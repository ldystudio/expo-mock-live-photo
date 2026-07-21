# expo-mock-live-photo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个以 Expo Modules API 实现的跨平台 `MockLivePhoto` 原生视图，并提供 Expo SDK 52 Example。

**Architecture:** React Native `Image` 负责封面加载，Swift `AVPlayerLayer` 与 Kotlin `MediaPlayer` 只负责视频。JS 协调图片/视频就绪、封面显隐和内部 `play`、`pause`、`reset` 命令；两端使用相同的最小播放状态机。

**Tech Stack:** TypeScript、React Native >=0.75.5、Expo Modules API、Swift/AVFoundation、Kotlin/MediaPlayer、Expo SDK 52、Bun、Biome。

## Global Constraints

- 包名必须是 `expo-mock-live-photo`，原生模块名必须是 `ExpoMockLivePhoto`。
- React Native peer dependency 必须是 `>=0.75.5`。
- iOS 只使用 Swift，Android 只使用 Kotlin。
- 包管理与 JS 测试只使用 Bun；lint 与 format 只使用 Biome，不保留 ESLint 或 Prettier。
- 默认 `muted=true`、`resizeMode="cover"`。
- 资源错误只能 `console.error` 和可选回调，不能 throw、fatal 或导致应用崩溃。
- 不增加第三方图片或视频依赖，不暴露命令式 ref。
- Example 必须使用 Expo SDK 52 development build，不能依赖 Expo Go。

## File Structure

- `src/MockLivePhoto.tsx`：公共组件、RN Image 覆盖层与原生视图协调。
- `src/MockLivePhoto.types.ts`：公共 Props、事件和资源类型。
- `src/MockLivePhotoNativeView.ts`：内部 Expo 原生视图类型与命令接口。
- `src/playbackState.ts`：JS 可测试的资源就绪与封面状态转换。
- `src/index.ts`：公共导出。
- `src/__tests__/playbackState.test.ts`：Bun 状态测试。
- `ios/ExpoMockLivePhotoModule.swift`、`ios/MockLivePhotoView.swift`、`ios/PlaybackState.swift`：Expo 注册、AVPlayer 视图和纯状态转换。
- `ios/Tests/PlaybackStateTests.swift`：Swift 状态测试。
- `android/src/main/java/expo/modules/mocklivephoto/ExpoMockLivePhotoModule.kt`、`MockLivePhotoView.kt`、`PlaybackState.kt`：Expo 注册、MediaPlayer 视图和纯状态转换。
- `android/src/test/java/expo/modules/mocklivephoto/PlaybackStateTest.kt`：Kotlin 状态测试。
- `example/App.tsx`、`example/assets/cover.jpg`、`example/assets/live-photo.mov`：单屏交互 Example 与本地资源。
- `biome.json`、`package.json`、`tsconfig.json`、`expo-module.config.json`：工具、类型和 autolinking 配置。
- `README.md`：安装、API 与运行说明。

---

### Task 1: 官方脚手架与 Bun/Biome 基线

**Files:**
- Create/replace: `package.json`, `expo-module.config.json`, `tsconfig.json`, `biome.json`
- Create: `src/index.ts`
- Delete generated: ESLint/Prettier config and template function files

**Interfaces:**
- Produces: workspace scripts `bun test`, `bun run typecheck`, `bun run check`; Expo native module name `ExpoMockLivePhoto`.

- [ ] **Step 1: 用官方模板生成 standalone module**

在仓库父目录生成临时模板，避免覆盖已确认文档：

```sh
cd ..
bunx create-expo-module@latest expo-mock-live-photo-template \
  --name ExpoMockLivePhoto \
  --package expo.modules.mocklivephoto \
  --platform android apple \
  --features View \
  --description "Simulate Live Photo playback from an image and a video" \
  --license MIT \
  --module-version 0.1.0 \
  --package-manager bun
rsync -a --exclude .git --exclude docs expo-mock-live-photo-template/ react-native-mock-live-photo/
```

Expected: 根目录存在 `ios/`、`android/`、`src/`、`example/` 和 `expo-module.config.json`。

- [ ] **Step 2: 收紧 package metadata 与工具脚本**

将 `package.json` 的核心字段改为：

```json
{
  "name": "expo-mock-live-photo",
  "version": "0.1.0",
  "main": "build/index.js",
  "types": "build/index.d.ts",
  "scripts": {
    "build": "expo-module build",
    "check": "biome check .",
    "format": "biome format --write .",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "expo": "*",
    "react": "*",
    "react-native": ">=0.75.5"
  },
  "devDependencies": {
    "@biomejs/biome": "latest",
    "typescript": "^5.3.0"
  }
}
```

保留模板生成的 `expo-module` build 配置、files、repository 与平台开发依赖；移除 ESLint、Prettier、Jest 及其 scripts。

- [ ] **Step 3: 添加最小 Biome 配置**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.2.0/schema.json",
  "files": { "ignoreUnknown": true },
  "formatter": { "enabled": true, "indentStyle": "space" },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "always" } }
}
```

- [ ] **Step 4: 安装并验证工具基线**

Run: `bun install && bun run typecheck && bun run check`

Expected: 安装成功；模板遗留错误全部清理后 typecheck 和 Biome 均退出 0。

- [ ] **Step 5: Commit**

```sh
git add package.json bun.lock biome.json tsconfig.json expo-module.config.json ios android src example
git commit -m "chore: scaffold expo mock live photo module"
```

### Task 2: TypeScript API 与协调状态

**Files:**
- Create: `src/MockLivePhoto.types.ts`
- Create: `src/playbackState.ts`
- Create: `src/__tests__/playbackState.test.ts`
- Create: `src/MockLivePhotoNativeView.ts`
- Create: `src/MockLivePhoto.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `MockLivePhotoProps`, `MockLivePhotoError`, `MockLivePhoto`；内部原生命令 `play(): Promise<void>`, `pause(): Promise<void>`, `reset(): Promise<void>`。

- [ ] **Step 1: 先写状态转换失败测试**

```ts
import { describe, expect, test } from 'bun:test';
import { initialPlaybackState, reducePlaybackState } from '../playbackState';

describe('playback state', () => {
  test('starts only after image and video are ready', () => {
    const imageReady = reducePlaybackState(initialPlaybackState, { type: 'imageReady' });
    expect(imageReady.shouldAutoPlay).toBe(false);
    const ready = reducePlaybackState(imageReady, { type: 'videoReady' });
    expect(ready.shouldAutoPlay).toBe(true);
  });

  test('shows video while playing or paused and cover after completion', () => {
    const playing = reducePlaybackState(initialPlaybackState, { type: 'playing' });
    expect(playing.showCover).toBe(false);
    const paused = reducePlaybackState(playing, { type: 'paused' });
    expect(paused.showCover).toBe(false);
    const ended = reducePlaybackState(paused, { type: 'ended' });
    expect(ended.showCover).toBe(true);
  });

  test('reset ignores readiness from the previous resource version', () => {
    const reset = reducePlaybackState(initialPlaybackState, { type: 'reset' });
    const stale = reducePlaybackState(reset, { type: 'videoReady', version: 0 });
    expect(stale.videoReady).toBe(false);
  });
});
```

- [ ] **Step 2: 验证测试失败**

Run: `bun test src/__tests__/playbackState.test.ts`

Expected: FAIL，提示无法找到 `../playbackState`。

- [ ] **Step 3: 实现最小 reducer 和公共类型**

`playbackState.ts` 定义不可变状态：

```ts
export type PlaybackState = {
  version: number;
  imageReady: boolean;
  videoReady: boolean;
  shouldAutoPlay: boolean;
  showCover: boolean;
};

export const initialPlaybackState: PlaybackState = {
  version: 0,
  imageReady: false,
  videoReady: false,
  shouldAutoPlay: false,
  showCover: true,
};
```

`reducePlaybackState` 只接受 `imageReady`、`videoReady`、`playing`、`paused`、`ended`、`reset`；带版本的旧事件原样返回，两个资源首次同时 ready 时仅产生一次 `shouldAutoPlay=true`。

`MockLivePhoto.types.ts` 精确定义：

```ts
export type MockLivePhotoError = { code: string; message: string };
export type VideoSource = { uri: string };
export type MockLivePhotoProps = ViewProps & {
  source: ImageSourcePropType;
  videoSource: VideoSource;
  muted?: boolean;
  resizeMode?: 'cover' | 'contain';
  onLoad?: () => void;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onError?: (error: MockLivePhotoError) => void;
};
```

- [ ] **Step 4: 实现内部 NativeView 与公共组件**

`MockLivePhotoNativeView.ts` 用 `requireNativeViewManager('ExpoMockLivePhoto')` 获取视图，内部 props 只包含 `videoUri`、`muted`、`resizeMode` 与原生事件；ref 接口只供 `MockLivePhoto.tsx` 使用。

`MockLivePhoto.tsx`：

- 使用绝对定位的 NativeView 和 RN `Image`；
- `Image.onLoad` 与原生 `onVideoReady` 进入 reducer；
- 两者 ready 后调用一次内部 `play()` 并触发 `onLoad`；
- 点击整个容器按当前状态调用 `play()` 或 `pause()`；
- 图片 `onError` 生成 `IMAGE_LOAD_ERROR`，调用一次 `console.error` 和可选 `onError`，不 throw；
- 原生错误同样去重并转发；
- 资源变化调用 `reset()` 并递增 version；
- `onPlaybackStart` 隐藏封面，`onPlaybackEnd` 恢复封面。

- [ ] **Step 5: 导出并运行测试**

```ts
export { MockLivePhoto } from './MockLivePhoto';
export type { MockLivePhotoError, MockLivePhotoProps, VideoSource } from './MockLivePhoto.types';
```

Run: `bun test && bun run typecheck && bun run check`

Expected: reducer 测试全部 PASS，类型检查和 Biome 退出 0。

- [ ] **Step 6: Commit**

```sh
git add src
git commit -m "feat: add mock live photo component API"
```

### Task 3: Swift AVPlayer 视图

**Files:**
- Create: `ios/PlaybackState.swift`
- Create: `ios/MockLivePhotoView.swift`
- Modify: `ios/ExpoMockLivePhotoModule.swift`
- Create: `ios/Tests/PlaybackStateTests.swift`

**Interfaces:**
- Consumes: `videoUri`, `muted`, `resizeMode`; commands `play`, `pause`, `reset`.
- Produces: `onVideoReady`, `onPlaybackStart`, `onPlaybackEnd`, `onError` native events.

- [ ] **Step 1: 写 Swift 状态测试**

```swift
func testPlaybackTransitions() {
  var state = PlaybackState.idle(version: 0)
  state = state.reduce(.ready(version: 0))
  XCTAssertEqual(state, .ready(version: 0))
  state = state.reduce(.play)
  XCTAssertEqual(state, .playing(version: 0))
  state = state.reduce(.pause)
  XCTAssertEqual(state, .paused(version: 0))
  state = state.reduce(.ended(version: 0))
  XCTAssertEqual(state, .ended(version: 0))
}
```

另加一个断言：version 0 的 `.ready` 不能改变 reset 后 version 1 的状态。

- [ ] **Step 2: 实现纯 Swift 状态 enum**

`PlaybackState` 使用 `idle/ready/playing/paused/ended/failed` associated version；`PlaybackAction` 使用 `ready/play/pause/ended/reset/failed`。`reduce` 对旧 version action 返回当前状态。

- [ ] **Step 3: 实现 AVPlayer 视图**

`MockLivePhotoView: ExpoView` 持有一个 `AVPlayer` 和 `AVPlayerLayer`：

- `setVideoUri` 先 `reset`，只接受可构造的 URL；失败发送 `VIDEO_LOAD_ERROR`；
- 用 `AVPlayerItem.status` observation 发送一次 `onVideoReady` 或错误；
- 监听 `AVPlayerItem.didPlayToEndTimeNotification`，进入 ended 并发送 `onPlaybackEnd`；
- `play` 在 ended 时先 seek 到 zero，然后播放；仅从非 playing 进入 playing 时发送 `onPlaybackStart`；
- `pause` 保留 layer 当前画面；
- 后台通知只暂停，不自动恢复；
- `reset` 取消 observation/notification、暂停、清空 item 并递增 version；
- `deinit` 调用同一清理路径；
- `layoutSubviews` 只同步 playerLayer frame；`resizeMode` 映射 `.resizeAspectFill/.resizeAspect`。

- [ ] **Step 4: 注册 Expo View**

在 `ExpoMockLivePhotoModule.definition()` 中注册 `View(MockLivePhotoView.self)`、三个 Props、四个 Events，以及仅供 JS 包装层调用的 `play`、`pause`、`reset` AsyncFunction。

- [ ] **Step 5: 构建与测试 iOS**

Run: `cd example && bun expo prebuild --platform ios && bun pod-install && xcodebuild -workspace ios/*.xcworkspace -scheme expo-mock-live-photo-example -sdk iphonesimulator -configuration Debug build CODE_SIGNING_ALLOWED=NO`

Expected: Swift 编译成功、xcodebuild 返回 0。若模板创建了可运行的 XCTest scheme，再执行 `xcodebuild test` 并要求 `PlaybackStateTests` PASS；否则状态测试纳入 Example test target 后再运行。

- [ ] **Step 6: Commit**

```sh
git add ios example/ios
git commit -m "feat: add iOS live photo playback view"
```

### Task 4: Kotlin MediaPlayer 视图

**Files:**
- Create: `android/src/main/java/expo/modules/mocklivephoto/PlaybackState.kt`
- Create: `android/src/main/java/expo/modules/mocklivephoto/MockLivePhotoView.kt`
- Modify: `android/src/main/java/expo/modules/mocklivephoto/ExpoMockLivePhotoModule.kt`
- Create: `android/src/test/java/expo/modules/mocklivephoto/PlaybackStateTest.kt`

**Interfaces:**
- Consumes and produces the same props, commands and events as Task 3.

- [ ] **Step 1: 写 Kotlin 状态失败测试**

```kotlin
@Test
fun playbackTransitions() {
  var state: PlaybackState = PlaybackState.Idle(0)
  state = state.reduce(PlaybackAction.Ready(0))
  assertEquals(PlaybackState.Ready(0), state)
  state = state.reduce(PlaybackAction.Play)
  assertEquals(PlaybackState.Playing(0), state)
  state = state.reduce(PlaybackAction.Pause)
  assertEquals(PlaybackState.Paused(0), state)
  state = state.reduce(PlaybackAction.Ended(0))
  assertEquals(PlaybackState.Ended(0), state)
}
```

另加 version 0 回调不能改变 reset 后 version 1 状态的断言。

- [ ] **Step 2: 验证测试失败并实现 sealed state**

Run: `cd android && ./gradlew testDebugUnitTest --tests '*PlaybackStateTest'`

Expected before implementation: FAIL，找不到 `PlaybackState`。实现与 Swift 同构的 sealed interface 后再次运行，Expected: PASS。

- [ ] **Step 3: 实现 TextureView/MediaPlayer 视图**

`MockLivePhotoView(context, appContext): ExpoView`：

- 创建单个铺满父视图的 `TextureView`；
- Surface 可用且 URI 已设置时创建 `MediaPlayer`，设置 data source、surface、muted 和 listeners 后 `prepareAsync()`；
- `onPrepared` 发送一次 `onVideoReady`；`onCompletion` 发送 `onPlaybackEnd`；`onError` 消费错误并发送稳定错误码，绝不向上传播 exception；
- `play`、`pause`、ended 后 seek-to-zero 重播与 Swift 事件语义一致；
- `reset` 与 `onDetachedFromWindow` 释放 MediaPlayer 和旧 Surface callback，递增 version；
- `resizeMode` 通过 TextureView matrix 实现 `cover/contain`，尺寸或视频尺寸改变时重算；
- `setDataSource`、`prepareAsync`、`start`、`pause`、`seekTo` 全部捕获 `IllegalArgumentException`、`IllegalStateException`、`IOException` 并只发送错误事件。

- [ ] **Step 4: 注册 Expo View 并构建 Android**

模块定义与 iOS 使用相同 Props、Events 和 AsyncFunction 名称。

Run: `cd example && bun expo prebuild --platform android && cd android && ./gradlew app:assembleDebug testDebugUnitTest`

Expected: `BUILD SUCCESSFUL`，`PlaybackStateTest` PASS。

- [ ] **Step 5: Commit**

```sh
git add android example/android
git commit -m "feat: add Android live photo playback view"
```

### Task 5: Expo SDK 52 Example 与文档

**Files:**
- Replace: `example/App.tsx`
- Add: `example/assets/cover.jpg`, `example/assets/live-photo.mov`
- Modify: `example/package.json`, `example/app.json`
- Replace: `README.md`

**Interfaces:**
- Consumes: public `MockLivePhoto` API only.

- [ ] **Step 1: 固定 Example 版本与本地包**

确保 `example/package.json` 使用 Expo `~52.0.0`、对应 React Native `0.76.x`，并通过 `"expo-mock-live-photo": "file:.."` 引用根包。保留 Expo 模板要求的 React/React Native 精确版本，使用 Bun 重新安装。

- [ ] **Step 2: 添加可授权分发的本地媒体**

创建或选用仓库自有的一张静态 JPEG 和一个 2-4 秒 MOV/MP4；视频首帧与封面相同，避免切换闪烁。将授权来源写入 `example/assets/README.md`；若为自行生成，注明由项目生成并可随库分发。

- [ ] **Step 3: 实现单屏 Example**

页面包含固定 3:4 比例的 `MockLivePhoto`、一个 `muted` Switch 和非阻塞状态文本。状态文本由 `onLoad`、`onPlaybackStart`、`onPlaybackEnd`、`onError` 更新；不增加导航、说明页或额外组件库。

- [ ] **Step 4: 编写 README**

README 必须包含：

- `bun add expo-mock-live-photo`；
- bare RN 需要先安装 Expo Modules；
- Expo Go 不支持，需 development build；
- 完整 Props 表和最小 TSX 示例；
- `bun expo prebuild`、`bun expo run:ios`、`bun expo run:android`；
- iOS Swift/AVPlayer 与 Android Kotlin/MediaPlayer 的一句话说明。

- [ ] **Step 5: 全量静态验证**

Run: `bun install && bun test && bun run typecheck && bun run check && bun run build`

Expected: 所有命令退出 0，`build/index.js` 与 `build/index.d.ts` 生成成功。

- [ ] **Step 6: 双端手动验收**

分别运行 `cd example && bun expo run:ios` 与 `bun expo run:android`，验证：挂载后自动播放一次、自然结束回封面、点击重播、点击暂停/恢复、静音开关、后台暂停、资源错误不崩溃且只 `console.error` 一次。

- [ ] **Step 7: Commit**

```sh
git add README.md example package.json bun.lock
git commit -m "docs: add Expo 52 live photo example"
```
