import type { ImageSourcePropType, ViewProps } from 'react-native';

/** Describes a resource or playback failure reported by {@linkcode MockLivePhotoProps.onError}. */
export type MockLivePhotoError = {
  /** Stable machine-readable error code. */
  code: string;
  /** Human-readable failure description. */
  message: string;
};

/** Describes the video displayed by {@linkcode MockLivePhotoProps}. */
export type VideoSource = {
  /** URI readable by the platform video player. */
  uri: string;
};

/** Props accepted by the {@linkcode MockLivePhoto} component. */
export interface MockLivePhotoProps extends ViewProps {
  /** Cover image displayed before and after playback. */
  source: ImageSourcePropType;
  /** Video paired with the cover image. */
  videoSource: VideoSource;
  /** Whether each new source pair plays automatically when ready. @default true */
  autoPlay?: boolean;
  /** Whether video audio is muted. @default true */
  muted?: boolean;
  /** How the image and video fit their bounds. @default 'cover' */
  resizeMode?: 'cover' | 'contain';
  /** Called once both resources are ready for each source pair. */
  onLoad?: () => void;
  /** Called whenever the video actually enters the playing state. */
  onPlaybackStart?: () => void;
  /** Called when the video reaches its natural end. */
  onPlaybackEnd?: () => void;
  /** Called once per error code for each source pair. */
  onError?: (error: MockLivePhotoError) => void;
}

// Imported only for the API documentation link above.
import type { MockLivePhoto } from './MockLivePhoto';
