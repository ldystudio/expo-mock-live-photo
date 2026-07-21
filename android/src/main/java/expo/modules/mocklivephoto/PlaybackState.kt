package expo.modules.mocklivephoto

internal sealed interface PlaybackPhase {
  data object Idle : PlaybackPhase
  data object Ready : PlaybackPhase
  data object Playing : PlaybackPhase
  data object Paused : PlaybackPhase
  data object Ended : PlaybackPhase
  data object Failed : PlaybackPhase
}

internal class PlaybackState {
  sealed interface Event {
    data object Reset : Event
    data class Ready(val version: Int) : Event
    data class Started(val version: Int) : Event
    data object Pause : Event
    data class Ended(val version: Int) : Event
    data class Failed(val version: Int) : Event
  }

  var phase: PlaybackPhase = PlaybackPhase.Idle
    private set
  var version: Int = 0
    private set

  private var nextReplayToken = 0
  private var pendingReplayToken: Int? = null

  fun reduce(event: Event) {
    when (event) {
      Event.Reset -> {
        version += 1
        phase = PlaybackPhase.Idle
        pendingReplayToken = null
      }
      is Event.Ready -> if (event.version == version && phase == PlaybackPhase.Idle) {
        phase = PlaybackPhase.Ready
      }
      is Event.Started -> if (event.version == version && when (phase) {
        PlaybackPhase.Ready, PlaybackPhase.Paused, PlaybackPhase.Ended -> true
        else -> false
      }) {
        phase = PlaybackPhase.Playing
        pendingReplayToken = null
      }
      Event.Pause -> {
        pendingReplayToken = null
        if (phase == PlaybackPhase.Playing) phase = PlaybackPhase.Paused
      }
      is Event.Ended -> if (event.version == version && phase != PlaybackPhase.Failed) {
        phase = PlaybackPhase.Ended
        pendingReplayToken = null
      }
      is Event.Failed -> if (event.version == version) {
        phase = PlaybackPhase.Failed
        pendingReplayToken = null
      }
    }
  }

  fun requestReplay(version: Int): Int? {
    if (version != this.version || phase != PlaybackPhase.Ended || pendingReplayToken != null) return null
    return (++nextReplayToken).also { pendingReplayToken = it }
  }

  fun consumeReplay(version: Int, token: Int): Boolean {
    if (version != this.version || phase != PlaybackPhase.Ended || pendingReplayToken != token) return false
    pendingReplayToken = null
    return true
  }
}
