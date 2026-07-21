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

  mutating func reduce(_ event: Event) {
    switch event {
    case .reset:
      version += 1
      phase = .idle
    case .ready(let eventVersion) where eventVersion == version && phase == .idle:
      phase = .ready
    case .started(let eventVersion)
      where eventVersion == version && (phase == .ready || phase == .paused || phase == .ended):
      phase = .playing
    case .pause where phase == .playing:
      phase = .paused
    case .ended(let eventVersion) where eventVersion == version && phase != .failed:
      phase = .ended
    case .failed(let eventVersion) where eventVersion == version:
      phase = .failed
    default:
      break
    }
  }
}
