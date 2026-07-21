import type { MockLivePhotoError } from './MockLivePhoto.types';

type PlaybackStatus = 'loading' | 'ready' | 'playing' | 'paused' | 'ended';

export type PlaybackCommand = 'play' | 'pause';

export type PlaybackState = {
  version: number;
  autoPlay: boolean;
  imageReady: boolean;
  videoReady: boolean;
  hasLoadError: boolean;
  status: PlaybackStatus;
  showCover: boolean;
  command: PlaybackCommand | null;
  shouldNotifyLoad: boolean;
  errorToReport: MockLivePhotoError | null;
  reportedErrorCodes: readonly string[];
};

type VersionedAction = { version: number };

export type PlaybackAction =
  | ({ type: 'imageReady' } & VersionedAction)
  | ({ type: 'videoReady' } & VersionedAction)
  | ({ type: 'playing' } & VersionedAction)
  | ({ type: 'nativePaused' } & VersionedAction)
  | ({ type: 'ended' } & VersionedAction)
  | ({ type: 'error'; error: MockLivePhotoError } & VersionedAction)
  | { type: 'paused' }
  | { type: 'press' }
  | { type: 'reset'; autoPlay?: boolean };

export function createInitialPlaybackState(autoPlay = true): PlaybackState {
  return {
    version: 0,
    autoPlay,
    imageReady: false,
    videoReady: false,
    hasLoadError: false,
    status: 'loading',
    showCover: true,
    command: null,
    shouldNotifyLoad: false,
    errorToReport: null,
    reportedErrorCodes: [],
  };
}

export const initialPlaybackState = createInitialPlaybackState();

export function reducePlaybackState(
  state: PlaybackState,
  action: PlaybackAction,
): PlaybackState {
  const next = {
    ...state,
    command: null,
    shouldNotifyLoad: false,
    errorToReport: null,
  };

  if ('version' in action && action.version !== state.version) {
    return next;
  }

  switch (action.type) {
    case 'imageReady':
    case 'videoReady': {
      const readiness =
        action.type === 'imageReady'
          ? { imageReady: true }
          : { videoReady: true };
      const ready = { ...next, ...readiness };
      if (
        state.status === 'loading' &&
        !state.hasLoadError &&
        ready.imageReady &&
        ready.videoReady
      ) {
        return {
          ...ready,
          status: 'ready',
          command: state.autoPlay ? 'play' : null,
          shouldNotifyLoad: true,
        };
      }
      return ready;
    }
    case 'playing':
      return { ...next, status: 'playing', showCover: false };
    case 'nativePaused':
      if (state.status === 'playing' || state.status === 'ready') {
        return { ...next, status: 'paused', showCover: false };
      }
      return next;
    case 'paused':
      return { ...next, status: 'paused' };
    case 'ended':
      return { ...next, status: 'ended', showCover: true };
    case 'press':
      if (state.status === 'playing') {
        return {
          ...next,
          status: 'paused',
          command: 'pause',
        };
      }
      if (
        state.imageReady &&
        state.videoReady &&
        !state.hasLoadError &&
        (state.status === 'ready' ||
          state.status === 'paused' ||
          state.status === 'ended')
      ) {
        return { ...next, command: 'play' };
      }
      return next;
    case 'error':
      if (state.reportedErrorCodes.includes(action.error.code)) {
        return next;
      }
      return {
        ...next,
        hasLoadError:
          state.hasLoadError || action.error.code.endsWith('_LOAD_ERROR'),
        errorToReport: action.error,
        reportedErrorCodes: [...state.reportedErrorCodes, action.error.code],
      };
    case 'reset':
      return {
        ...createInitialPlaybackState(action.autoPlay ?? state.autoPlay),
        version: state.version + 1,
      };
  }
}

export function createPlaybackErrorAction(
  cause: unknown,
  version: number,
): PlaybackAction {
  return {
    type: 'error',
    version,
    error: {
      code: 'PLAYBACK_ERROR',
      message: cause instanceof Error ? cause.message : String(cause),
    },
  };
}
