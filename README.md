# expo-mock-live-photo

A React Native component that pairs a cover image with optional automatic first playback and tap controls.

## Requirements

- React Native 0.75.5 or newer
- Expo Modules in an Expo development build or a bare React Native app
- iOS 13.4 or newer
- Android API 24 or newer

Expo Go does not include this native module. Use a development build.

## Installation

```bash
bun add expo-mock-live-photo
```

Bare React Native apps must first [install and configure Expo Modules](https://docs.expo.dev/bare/installing-expo-modules/). On iOS, install pods after adding the package.

## Usage

```tsx
import { MockLivePhoto } from 'expo-mock-live-photo';

export function Photo() {
  return (
    <MockLivePhoto
      source={require('./cover.jpg')}
      videoSource={{ uri: 'https://example.com/video.mp4' }}
      autoPlay={false}
      style={{ width: 320, height: 320 }}
      onError={(error) => console.warn(error.code, error.message)}
    />
  );
}
```

By default, each source pair automatically plays once after both resources are ready. Set `autoPlay={false}` to keep showing the cover until the user presses the component. Changing `source` or `videoSource.uri` creates a new resource version. Each version can auto-play once; changing only `autoPlay` does not start, pause, or reset the current version and is applied to the next resource version.

## Props

| Prop                     | Type                                                 | Default   | Description                                                                                                          |
| ------------------------ | ---------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `source`                 | `ImageSourcePropType`                                | Required  | Cover image displayed before and after playback.                                                                     |
| `videoSource`            | `{ uri: string }`                                    | Required  | URI readable by the platform video player.                                                                           |
| `autoPlay`               | `boolean`                                            | `true`    | Whether each new resource version plays automatically after both resources are ready.                                |
| `muted`                  | `boolean`                                            | `true`    | Whether video audio is muted.                                                                                        |
| `resizeMode`             | `'cover' \| 'contain'`                               | `'cover'` | How the image and video fit their bounds.                                                                            |
| `onLoad`                 | `() => void`                                         | -         | Called once both resources are ready for each source pair.                                                           |
| `onPlaybackStart`        | `() => void`                                         | -         | Called when automatic playback, resumed playback, or replay after an end actually enters the playing state.          |
| `onPlaybackEnd`          | `() => void`                                         | -         | Called when the video reaches its natural end.                                                                       |
| `onError`                | `(error: { code: string; message: string }) => void` | -         | Called once per error code for each source pair. Errors are also reported with `console.error`; they are not thrown. |
| React Native `ViewProps` | `ViewProps`                                          | -         | Standard view props, including `style`, accessibility, and test props.                                               |

On iOS the component uses `AVPlayer`; on Android it uses `MediaPlayer`. It simulates the playback interaction and does not create or save platform Live Photo assets.

## Example

The example uses Expo SDK 51 and requires a development build:

```bash
cd example
bun install
bun expo prebuild
bun expo run:ios
# or: bun expo run:android
```

## Development

```bash
bun install
bun test
bun run typecheck
bun run check
bun run build
```

## License

[MIT](LICENSE)
