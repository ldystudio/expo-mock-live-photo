import { BlurView } from 'expo-blur';
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
  createInitialPlaybackState,
  createPlaybackErrorAction,
  type PlaybackAction,
  reducePlaybackState,
} from './playbackState';

/** Displays an image-backed video that behaves like a Live Photo. */
export function MockLivePhoto({
  source,
  videoSource,
  autoPlay = true,
  showLivePhotoBadge = true,
  livePhotoBadgeColor = '#ffffff',
  muted = true,
  resizeMode = 'cover',
  onLoad,
  onPlaybackStart,
  onPlaybackEnd,
  onError,
  ...viewProps
}: MockLivePhotoProps) {
  const nativeRef = useRef<MockLivePhotoNativeViewRef>(null);
  const mountedRef = useRef(true);
  const initialState = useRef(createInitialPlaybackState(autoPlay)).current;
  const stateRef = useRef(initialState);
  const callbacksRef = useRef({
    onLoad,
    onPlaybackStart,
    onPlaybackEnd,
    onError,
  });
  callbacksRef.current = { onLoad, onPlaybackStart, onPlaybackEnd, onError };
  const sourceKey = JSON.stringify(source);
  const previousResources = useRef({ sourceKey, videoUri: videoSource.uri });
  const [state, setState] = useState(initialState);

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
        if (!mountedRef.current) return;
        transition(createPlaybackErrorAction(cause, next.version));
      });
    }
  }, []);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
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
    transition({ type: 'reset', autoPlay });
    const resetVersion = stateRef.current.version;
    void nativeRef.current?.reset().catch((cause: unknown) => {
      if (!mountedRef.current) return;
      transition(createPlaybackErrorAction(cause, resetVersion));
    });
  }, [autoPlay, sourceKey, transition, videoSource.uri]);

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
        key={`native-${version}`}
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
        onPlaybackPause={() => transition({ type: 'nativePaused', version })}
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
        key={`image-${version}`}
        source={source}
        resizeMode={resizeMode}
        style={[styles.cover, !state.showCover && styles.hidden]}
        onLoad={() => transition({ type: 'imageReady', version })}
        onError={({ nativeEvent }) =>
          reportError({
            code: 'IMAGE_LOAD_ERROR',
            message: nativeEvent.error,
          })
        }
      />
      {showLivePhotoBadge && (
        <BlurView
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          tint="dark"
          intensity={35}
          experimentalBlurMethod="dimezisBlurView"
          style={styles.badge}
        >
          <Image
            accessible={false}
            source={require('../assets/live-photo.png')}
            style={[styles.badgeIcon, { tintColor: livePhotoBadgeColor }]}
          />
        </BlurView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 1,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  badgeIcon: {
    width: 22,
    height: 22,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  hidden: { opacity: 0 },
});
