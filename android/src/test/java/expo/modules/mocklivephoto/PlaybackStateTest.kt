package expo.modules.mocklivephoto

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PlaybackStateTest {
  @Test
  fun playbackLifecycle() {
    val state = PlaybackState()
    state.reduce(PlaybackState.Event.Ready(0))
    state.reduce(PlaybackState.Event.Started(0))
    assertEquals(PlaybackPhase.Playing, state.phase)
    state.reduce(PlaybackState.Event.Pause)
    assertEquals(PlaybackPhase.Paused, state.phase)
    state.reduce(PlaybackState.Event.Ended(0))
    assertEquals(PlaybackPhase.Ended, state.phase)
  }

  @Test
  fun endedReplayConsumesItsToken() {
    val state = endedState()
    assertTrue(state.requestReplay(0) is ReplayAction.Seek)
    assertEquals(ReplayAction.Start(0), state.completeReplaySeek())
    state.reduce(PlaybackState.Event.Started(0))
    assertEquals(PlaybackPhase.Playing, state.phase)
  }

  @Test
  fun pauseAndResetCancelOldReplayTokens() {
    val state = endedState()
    state.requestReplay(0)
    state.reduce(PlaybackState.Event.Pause)
    assertEquals(null, state.completeReplaySeek())

    assertTrue(state.requestReplay(0) is ReplayAction.Seek)
    state.reduce(PlaybackState.Event.Reset)
    assertEquals(null, state.completeReplaySeek())
  }

  @Test
  fun canceledInFlightSeekAdvancesLatestReplayWithoutStartingEarly() {
    val state = endedState()
    assertTrue(state.requestReplay(0) is ReplayAction.Seek)
    state.reduce(PlaybackState.Event.Pause)

    assertEquals(null, state.requestReplay(0))
    assertEquals(ReplayAction.Seek(0), state.completeReplaySeek())
    assertEquals(ReplayAction.Start(0), state.completeReplaySeek())
  }

  @Test
  fun oldVersionCallbacksAreIgnored() {
    val state = PlaybackState()
    state.reduce(PlaybackState.Event.Reset)
    state.reduce(PlaybackState.Event.Ready(0))
    state.reduce(PlaybackState.Event.Started(0))
    state.reduce(PlaybackState.Event.Ended(0))
    state.reduce(PlaybackState.Event.Failed(0))
    assertEquals(PlaybackPhase.Idle, state.phase)
    assertEquals(1, state.version)
  }

  @Test
  fun detachReturnsToIdleWithoutChangingResourceVersion() {
    val state = endedState()
    state.requestReplay(0)

    state.reduce(PlaybackState.Event.Detach)

    assertEquals(PlaybackPhase.Idle, state.phase)
    assertEquals(0, state.version)
    assertEquals(null, state.completeReplaySeek())
    state.reduce(PlaybackState.Event.Ready(0))
    assertEquals(PlaybackPhase.Ready, state.phase)
  }

  private fun endedState() = PlaybackState().apply {
    reduce(PlaybackState.Event.Ready(0))
    reduce(PlaybackState.Event.Ended(0))
  }
}
