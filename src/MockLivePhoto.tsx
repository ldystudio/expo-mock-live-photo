import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';

import type {
  MockLivePhotoError,
  MockLivePhotoProps,
} from './MockLivePhoto.types';
import {
  MockLivePhotoNativeView,
  type MockLivePhotoNativeViewRef,
} from './MockLivePhotoNativeView';
import {
  initialPlaybackState,
  type PlaybackAction,
  reducePlaybackState,
} from './playbackState';

/** Displays an image-backed video that behaves like a Live Photo. */
export function MockLivePhoto({
  source,
  videoSource,
  muted = true,
  resizeMode = 'cover',
  onLoad,
  onPlaybackStart,
  onPlaybackEnd,
  onError,
  ...viewProps
}: MockLivePhotoProps) {
  const nativeRef = useRef<MockLivePhotoNativeViewRef>(null);
  const stateRef = useRef(initialPlaybackState);
  const callbacksRef = useRef({
    onLoad,
    onPlaybackStart,
    onPlaybackEnd,
    onError,
  });
  callbacksRef.current = { onLoad, onPlaybackStart, onPlaybackEnd, onError };
  const sourceKey = JSON.stringify(source);
  const previousResources = useRef({ sourceKey, videoUri: videoSource.uri });
  const [state, setState] = useState(initialPlaybackState);

  const transition = useCallback((action: PlaybackAction) => {
    const next = reducePlaybackState(stateRef.current, action);
    stateRef.current = next;
    setState(next);

    if (next.errorToReport) {
      console.error(
        `[expo-mock-live-photo] ${next.errorToReport.code}: ${next.errorToReport.message}`,
      );
      callbacksRef.current.onError?.(next.errorToReport);
    }
    if (next.shouldNotifyLoad) {
      callbacksRef.current.onLoad?.();
    }
    if (next.command) {
      void nativeRef.current?.[next.command]().catch((cause: unknown) => {
        reportCommandError(cause, next.version, transition);
      });
    }
  }, []);

  useLayoutEffect(() => {
    const previous = previousResources.current;
    if (
      previous.sourceKey === sourceKey &&
      previous.videoUri === videoSource.uri
    ) {
      return;
    }
    previousResources.current = { sourceKey, videoUri: videoSource.uri };
    transition({ type: 'reset' });
    void nativeRef.current?.reset().catch((cause: unknown) => {
      reportCommandError(cause, stateRef.current.version, transition);
    });
  }, [sourceKey, transition, videoSource.uri]);

  const version = state.version;
  const reportError = (error: MockLivePhotoError) => {
    transition({ type: 'error', version, error });
  };

  return (
    <Pressable
      accessibilityRole="button"
      {...viewProps}
      onPress={() => transition({ type: 'press' })}
    >
      <MockLivePhotoNativeView
        key={version}
        ref={nativeRef}
        style={StyleSheet.absoluteFillObject}
        videoUri={videoSource.uri}
        muted={muted}
        resizeMode={resizeMode}
        onVideoReady={() => transition({ type: 'videoReady', version })}
        onPlaybackStart={() => {
          if (
            stateRef.current.version !== version ||
            stateRef.current.status === 'playing'
          )
            return;
          transition({ type: 'playing', version });
          callbacksRef.current.onPlaybackStart?.();
        }}
        onPlaybackEnd={() => {
          if (
            stateRef.current.version !== version ||
            stateRef.current.status === 'ended'
          )
            return;
          transition({ type: 'ended', version });
          callbacksRef.current.onPlaybackEnd?.();
        }}
        onError={({ nativeEvent }) => reportError(nativeEvent)}
      />
      <Image
        key={version}
        source={source}
        resizeMode={resizeMode}
        style={[
          StyleSheet.absoluteFillObject,
          !state.showCover && styles.hidden,
        ]}
        onLoad={() => transition({ type: 'imageReady', version })}
        onError={({ nativeEvent }) =>
          reportError({
            code: 'IMAGE_LOAD_ERROR',
            message: nativeEvent.error,
          })
        }
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
});

function reportCommandError(
  cause: unknown,
  version: number,
  transition: (action: PlaybackAction) => void,
) {
  transition({
    type: 'error',
    version,
    error: {
      code: 'PLAYBACK_ERROR',
      message: cause instanceof Error ? cause.message : String(cause),
    },
  });
}
