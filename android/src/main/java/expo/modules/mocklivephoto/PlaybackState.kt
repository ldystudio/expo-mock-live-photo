package expo.modules.mocklivephoto

internal sealed interface PlaybackPhase {
  data object Idle : PlaybackPhase
  data object Ready : PlaybackPhase
  data object Playing : PlaybackPhase
  data object Paused : PlaybackPhase
  data object Ended : PlaybackPhase
  data object Failed : PlaybackPhase
}

internal sealed interface ReplayAction {
  data class Seek(val version: Int) : ReplayAction
  data class Start(val version: Int) : ReplayAction
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
  private var inFlightReplay: ReplayRequest? = null
  private var queuedReplay: ReplayRequest? = null

  fun reduce(event: Event) {
    when (event) {
      Event.Reset -> {
        version += 1
        phase = PlaybackPhase.Idle
        clearReplays()
      }
      is Event.Ready -> if (event.version == version && phase == PlaybackPhase.Idle) {
        phase = PlaybackPhase.Ready
      }
      is Event.Started -> if (event.version == version && when (phase) {
        PlaybackPhase.Ready, PlaybackPhase.Paused, PlaybackPhase.Ended -> true
        else -> false
      }) {
        phase = PlaybackPhase.Playing
        clearReplays()
      }
      Event.Pause -> {
        pendingReplayToken = null
        queuedReplay = null
        if (phase == PlaybackPhase.Playing) phase = PlaybackPhase.Paused
      }
      is Event.Ended -> if (event.version == version && phase != PlaybackPhase.Failed) {
        phase = PlaybackPhase.Ended
        pendingReplayToken = null
      }
      is Event.Failed -> if (event.version == version) {
        phase = PlaybackPhase.Failed
        clearReplays()
      }
    }
  }

  fun requestReplay(version: Int): ReplayAction? {
    if (version != this.version || phase != PlaybackPhase.Ended || pendingReplayToken != null) return null
    val request = ReplayRequest(version, ++nextReplayToken)
    pendingReplayToken = request.token
    if (inFlightReplay != null) {
      queuedReplay = request
      return null
    }
    inFlightReplay = request
    return ReplayAction.Seek(version)
  }

  fun completeReplaySeek(): ReplayAction? {
    val completed = inFlightReplay ?: return null
    inFlightReplay = null
    if (isPending(completed)) {
      pendingReplayToken = null
      queuedReplay = null
      return ReplayAction.Start(completed.version)
    }

    val next = queuedReplay
    queuedReplay = null
    if (next != null && isPending(next)) {
      inFlightReplay = next
      return ReplayAction.Seek(next.version)
    }
    return null
  }

  private fun isPending(request: ReplayRequest) =
    request.version == version && phase == PlaybackPhase.Ended && pendingReplayToken == request.token

  private fun clearReplays() {
    pendingReplayToken = null
    inFlightReplay = null
    queuedReplay = null
  }

  private data class ReplayRequest(val version: Int, val token: Int)
}
