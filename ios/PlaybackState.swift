enum PlaybackPhase: Equatable {
  case idle
  case ready
  case playing
  case paused
  case ended
  case failed
}

struct PlaybackState: Equatable {
  enum Event {
    case reset
    case ready(Int)
    case started(Int)
    case pause
    case ended(Int)
    case failed(Int)
  }

  private(set) var phase: PlaybackPhase = .idle
  private(set) var version = 0
  private var nextReplayToken = 0
  private var pendingReplayToken: Int?

  mutating func reduce(_ event: Event) {
    switch event {
    case .reset:
      version += 1
      phase = .idle
      pendingReplayToken = nil
    case .ready(let eventVersion) where eventVersion == version && phase == .idle:
      phase = .ready
    case .started(let eventVersion)
      where eventVersion == version && (phase == .ready || phase == .paused || phase == .ended):
      phase = .playing
      pendingReplayToken = nil
    case .pause:
      pendingReplayToken = nil
      if phase == .playing {
        phase = .paused
      }
    case .ended(let eventVersion) where eventVersion == version && phase != .failed:
      phase = .ended
      pendingReplayToken = nil
    case .failed(let eventVersion) where eventVersion == version:
      phase = .failed
      pendingReplayToken = nil
    default:
      break
    }
  }

  mutating func requestReplay(version eventVersion: Int) -> Int? {
    guard eventVersion == version, phase == .ended, pendingReplayToken == nil else { return nil }
    nextReplayToken += 1
    pendingReplayToken = nextReplayToken
    return nextReplayToken
  }

  mutating func consumeReplay(version eventVersion: Int, token: Int) -> Bool {
    guard eventVersion == version, phase == .ended, pendingReplayToken == token else { return false }
    pendingReplayToken = nil
    return true
  }
}
