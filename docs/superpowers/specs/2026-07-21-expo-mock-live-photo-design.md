# expo-mock-live-photo 设计规格

## 目标

新建 `expo-mock-live-photo` Expo Module。组件接收一张图片和一个视频，在 iOS 与 Android 上模拟 Live Photo 的播放体验。

最低支持 React Native 0.75.5。iOS 使用 Swift，Android 使用 Kotlin。仓库使用 Bun 管理依赖和运行测试，使用 Biome 执行 lint 与格式化。仓库包含一个使用 Expo SDK 52 的 Example development build。

## 包边界

- 根包名为 `expo-mock-live-photo`。
- 使用 Expo Modules API 实现原生视图。
- 普通 bare React Native 项目可以使用，但必须已安装 Expo Modules 基础设施。
- 组件不能在 Expo Go 中运行；Example 使用 prebuild 生成的 development build。
- 首版仅导出 `MockLivePhoto` 组件和相关 TypeScript 类型。
- 不提供命令式 ref、外部 `play()`/`pause()`、循环播放或系统媒体控制。

## 公共 API

```tsx
<MockLivePhoto
  source={require('./cover.jpg')}
  videoSource={{ uri: videoUri }}
  muted
  resizeMode="cover"
  style={styles.livePhoto}
  onLoad={handleLoad}
  onPlaybackStart={handlePlaybackStart}
  onPlaybackEnd={handlePlaybackEnd}
  onError={handleError}
/>
```

Props：

- `source: ImageSourcePropType`：封面图片，支持 React Native `require()`、网络 URI 和本地 URI。
- `videoSource: { uri: string }`：视频地址，支持原生播放器可读取的网络 URI、本地 `file://` URI 和内容 URI。
- `muted?: boolean`：默认 `true`。
- `resizeMode?: 'cover' | 'contain'`：图片和视频使用同一缩放模式，默认 `cover`。
- `style?: StyleProp<ViewStyle>`：组件尺寸和外观样式。
- `onLoad?: () => void`：图片和视频均准备完成时触发。
- `onPlaybackStart?: () => void`：首次自动播放、暂停后恢复或自然结束后从头重播时触发。
- `onPlaybackEnd?: () => void`：视频自然播放完成并恢复封面时触发。
- `onError?: (error: { code: string; message: string }) => void`：资源准备或播放失败时触发。

JS 包装层直接使用 React Native `Image` 显示 `source`，复用 React Native 对 `ImageSourcePropType`、网络加载、缓存和请求取消的处理。原生视图只接收视频 URI，不重复实现图片下载器。

## 原生实现

### iOS

Swift 视图继承 `ExpoView`，使用 `AVPlayer` 和 `AVPlayerLayer` 播放视频。只在 UIKit 要求的位置使用主线程，并在视图销毁或资源变化时移除通知并释放播放器。

### Android

Kotlin 视图继承 `ExpoView`，使用 `TextureView` 承载系统 `MediaPlayer` 输出。视图销毁或资源变化时释放 `MediaPlayer` 与 Surface，不引入额外视频播放依赖。

JS 组件将 React Native `Image` 覆盖在原生视频视图上。图片和视频都准备完成后，JS 通过仅供组件内部使用的 `play`、`pause` 和 `reset` 原生命令驱动播放器。图片层在播放开始时隐藏，在自然结束时重新显示。任一资源变化时执行 `reset`；公共 API 不暴露命令式 ref。

## 状态与交互

单个组件实例遵循以下状态流：

1. 显示封面并加载图片与视频。
2. 两个资源均准备完成后触发 `onLoad`，并自动播放一次视频。
3. 视频自然播放完成后隐藏视频层、回到封面并触发 `onPlaybackEnd`。
4. 用户点击组件任意位置切换播放与暂停。自然播放结束后的下一次点击从头播放。
5. 暂停时保留当前视频帧，不恢复封面。
6. 只有自然播放完成时才恢复封面。

每次状态实际进入播放态时都触发 `onPlaybackStart`，包括首次自动播放、暂停后恢复以及自然结束后从头重播。重复的播放命令不会重复触发事件。

自动播放按组件实例计算，仅在首次挂载并准备完成后执行一次。组件卸载再挂载时是新实例，会再次自动播放。`source` 或 `videoSource` 变化时重置资源和状态，并为新资源执行一次自动播放。

App 进入后台时暂停视频。回到前台后不自动恢复，等待用户点击继续。

## 错误处理

- 图片或视频加载、准备、播放失败均不得抛出 JS 异常、产生原生 fatal exception 或导致应用崩溃。
- JS 包装层对原生错误统一调用 `console.error`，并在调用方提供 `onError` 时同时回调 `{ code, message }`。
- 视频失败时保留可用封面。
- 图片失败时不启动视频自动播放，组件保持稳定的空视图状态。
- 点击尚未准备好的组件不执行操作，也不抛错。
- 错误码使用少量稳定字符串，至少区分 `IMAGE_LOAD_ERROR`、`VIDEO_LOAD_ERROR` 和 `PLAYBACK_ERROR`。
- 资源变化或卸载时取消旧请求并递增内部资源版本；来自旧版本的准备、完成或错误回调必须忽略。
- 同一资源版本的同一种失败只记录和上报一次。

## Example

`example/` 使用 Expo SDK 52，并通过 workspace 引用根包。Example 内置一张本地封面图片和一个短视频，展示：

- 挂载后自动播放一次；
- 播放结束恢复封面；
- 点击播放、暂停和恢复；
- `muted` 开关；
- 错误通过 `console.error` 和页面内非阻塞状态展示。

运行使用 Bun：

```sh
cd example
bun expo prebuild
bun expo run:ios
bun expo run:android
```

## 验证

- Bun 单元测试覆盖 JS 图片/视频就绪协调、默认 Props、图片覆盖层状态和错误转发不抛异常。
- iOS 与 Android 原生单元测试使用纯状态转换逻辑，不加载真实媒体，覆盖首次播放、暂停、恢复、自然结束、重播和旧资源回调忽略。
- 播放器与 Surface 的实际释放通过原生生命周期实现、平台构建和 Example 手动卸载/重载验证，不为测试额外引入播放器抽象。
- 执行 TypeScript 类型检查、Biome check 和 Bun test。
- 验证 Expo SDK 52 prebuild、iOS build 与 Android build。
- 使用 Example 手动验证首播、结束回封面、点击暂停/恢复和静音切换。

## 文档与非目标

README 只包含安装方式、bare React Native 的 Expo Modules 前置条件、Props、基本示例和 Example 运行命令。

首版不包含 CI、发布流水线、Storybook、多个示例页面、图片与视频配对元数据生成、保存到系统 Photos、真正的 `PHLivePhoto` 资源创建或 Android 等价格式。
