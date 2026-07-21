package expo.modules.mocklivephoto

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
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
    val token = state.requestReplay(0)
    assertNotNull(token)
    assertTrue(state.consumeReplay(0, token!!))
    state.reduce(PlaybackState.Event.Started(0))
    assertEquals(PlaybackPhase.Playing, state.phase)
  }

  @Test
  fun pauseAndResetCancelOldReplayTokens() {
    val state = endedState()
    val pausedToken = state.requestReplay(0)!!
    state.reduce(PlaybackState.Event.Pause)
    assertFalse(state.consumeReplay(0, pausedToken))

    val resetToken = state.requestReplay(0)!!
    state.reduce(PlaybackState.Event.Reset)
    assertFalse(state.consumeReplay(0, resetToken))
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

  private fun endedState() = PlaybackState().apply {
    reduce(PlaybackState.Event.Ready(0))
    reduce(PlaybackState.Event.Ended(0))
  }
}
