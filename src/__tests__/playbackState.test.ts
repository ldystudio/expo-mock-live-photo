import { describe, expect, test } from 'bun:test';

import {
  createPlaybackErrorAction,
  initialPlaybackState,
  reducePlaybackState,
} from '../playbackState';

describe('playback state', () => {
  test('auto plays once after both resources become ready', () => {
    const imageReady = reducePlaybackState(initialPlaybackState, {
      type: 'imageReady',
      version: 0,
    });
    expect(imageReady.command).toBeNull();

    const ready = reducePlaybackState(imageReady, {
      type: 'videoReady',
      version: 0,
    });
    expect(ready.command).toBe('play');
    expect(ready.shouldNotifyLoad).toBe(true);

    const duplicate = reducePlaybackState(ready, {
      type: 'videoReady',
      version: 0,
    });
    expect(duplicate.command).toBeNull();
    expect(duplicate.shouldNotifyLoad).toBe(false);
  });

  test('keeps the cover hidden while playing or paused and restores it after ending', () => {
    const playing = reducePlaybackState(initialPlaybackState, {
      type: 'playing',
      version: 0,
    });
    expect(playing.showCover).toBe(false);

    const paused = reducePlaybackState(playing, { type: 'paused' });
    expect(paused.showCover).toBe(false);

    const ended = reducePlaybackState(paused, {
      type: 'ended',
      version: 0,
    });
    expect(ended.showCover).toBe(true);
  });

  test('ignores stale readiness and errors after reset', () => {
    const reset = reducePlaybackState(initialPlaybackState, { type: 'reset' });
    const staleReady = reducePlaybackState(reset, {
      type: 'videoReady',
      version: 0,
    });
    const staleError = reducePlaybackState(staleReady, {
      type: 'error',
      version: 0,
      error: { code: 'VIDEO_LOAD_ERROR', message: 'old resource' },
    });

    expect(staleError).toEqual(reset);
  });

  test('clears pending load and play effects when ignoring a stale event', () => {
    const imageReady = reducePlaybackState(initialPlaybackState, {
      type: 'imageReady',
      version: 0,
    });
    const ready = reducePlaybackState(imageReady, {
      type: 'videoReady',
      version: 0,
    });
    const stale = reducePlaybackState(ready, {
      type: 'ended',
      version: -1,
    });

    expect(stale).toEqual({
      ...ready,
      command: null,
      shouldNotifyLoad: false,
    });
  });

  test('clears a pending error when ignoring a stale event', () => {
    const failed = reducePlaybackState(initialPlaybackState, {
      type: 'error',
      version: 0,
      error: { code: 'VIDEO_LOAD_ERROR', message: 'failed' },
    });
    const stale = reducePlaybackState(failed, {
      type: 'videoReady',
      version: -1,
    });

    expect(stale).toEqual({ ...failed, errorToReport: null });
  });

  test('ignores a reset error created for an older resource version', () => {
    const firstReset = reducePlaybackState(initialPlaybackState, {
      type: 'reset',
    });
    const resetError = createPlaybackErrorAction(
      new Error('old reset failed'),
      firstReset.version,
    );
    const secondReset = reducePlaybackState(firstReset, { type: 'reset' });

    expect(reducePlaybackState(secondReset, resetError)).toEqual(secondReset);
  });

  test('reports an error code only once per resource version', () => {
    const first = reducePlaybackState(initialPlaybackState, {
      type: 'error',
      version: 0,
      error: { code: 'VIDEO_LOAD_ERROR', message: 'failed' },
    });
    const duplicate = reducePlaybackState(first, {
      type: 'error',
      version: 0,
      error: { code: 'VIDEO_LOAD_ERROR', message: 'failed again' },
    });

    expect(first.errorToReport?.message).toBe('failed');
    expect(duplicate.errorToReport).toBeNull();
    expect(duplicate.reportedErrorCodes).toEqual(['VIDEO_LOAD_ERROR']);
  });

  test('does not issue a command when pressed before ready', () => {
    const pressed = reducePlaybackState(initialPlaybackState, {
      type: 'press',
    });

    expect(pressed.command).toBeNull();
  });

  test('does not auto play after a resource load error', () => {
    const failed = reducePlaybackState(initialPlaybackState, {
      type: 'error',
      version: 0,
      error: { code: 'IMAGE_LOAD_ERROR', message: 'failed' },
    });
    const imageReady = reducePlaybackState(failed, {
      type: 'imageReady',
      version: 0,
    });
    const videoReady = reducePlaybackState(imageReady, {
      type: 'videoReady',
      version: 0,
    });

    expect(videoReady.command).toBeNull();
    expect(videoReady.shouldNotifyLoad).toBe(false);
  });
});
