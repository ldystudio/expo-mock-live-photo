import { requireNativeViewManager } from 'expo-modules-core';
import type { ComponentType, RefAttributes } from 'react';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';

type EmptyEvent = NativeSyntheticEvent<Record<string, never>>;
type ErrorEvent = NativeSyntheticEvent<{ code: string; message: string }>;

export type MockLivePhotoNativeViewRef = {
  play(): Promise<void>;
  pause(): Promise<void>;
  reset(): Promise<void>;
};

export type MockLivePhotoNativeViewProps = ViewProps &
  RefAttributes<MockLivePhotoNativeViewRef> & {
    videoUri: string;
    muted: boolean;
    resizeMode: 'cover' | 'contain';
    onVideoReady: (event: EmptyEvent) => void;
    onPlaybackStart: (event: EmptyEvent) => void;
    onPlaybackPause: (event: EmptyEvent) => void;
    onPlaybackEnd: (event: EmptyEvent) => void;
    onError: (event: ErrorEvent) => void;
  };

export const MockLivePhotoNativeView: ComponentType<MockLivePhotoNativeViewProps> =
  requireNativeViewManager('ExpoMockLivePhoto');
