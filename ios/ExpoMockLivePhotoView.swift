import ExpoModulesCore
import AVFoundation
import UIKit

final class ExpoMockLivePhotoView: ExpoView {
  let onVideoReady = EventDispatcher()
  let onPlaybackStart = EventDispatcher()
  let onPlaybackEnd = EventDispatcher()
  let onError = EventDispatcher()

  private let player = AVPlayer()
  private let playerLayer = AVPlayerLayer()
  private var state = PlaybackState()
  private var itemStatusObservation: NSKeyValueObservation?
  private var timeControlObservation: NSKeyValueObservation?
  private var itemNotifications: [NSObjectProtocol] = []
  private var backgroundNotification: NSObjectProtocol?
  private var playbackStartPending = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    playerLayer.player = player
    layer.addSublayer(playerLayer)

    timeControlObservation = player.observe(\.timeControlStatus, options: [.new]) { [weak self] player, _ in
      guard let self, player.timeControlStatus == .playing, self.playbackStartPending else { return }
      self.playbackStartPending = false
      self.state.reduce(.started(self.state.version))
      self.onPlaybackStart([:])
    }
    backgroundNotification = NotificationCenter.default.addObserver(
      forName: UIApplication.didEnterBackgroundNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.pause()
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    playerLayer.frame = bounds
  }

  func setVideoUri(_ value: String) {
    reset()
    let version = state.version
    guard let url = URL(string: value), url.scheme != nil else {
      fail(code: "VIDEO_LOAD_ERROR", message: "Invalid video URL", version: version)
      return
    }

    let item = AVPlayerItem(url: url)
    player.replaceCurrentItem(with: item)
    observe(item, version: version)
  }

  func setMuted(_ value: Bool) {
    player.isMuted = value
  }

  func setResizeMode(_ value: String) {
    playerLayer.videoGravity = value == "contain" ? .resizeAspect : .resizeAspectFill
  }

  func play() {
    guard player.currentItem != nil else {
      onError(["code": "PLAYBACK_ERROR", "message": "No video is loaded"])
      return
    }
    guard state.phase == .ready || state.phase == .paused || state.phase == .ended else { return }
    guard state.phase != .playing, !playbackStartPending else { return }

    playbackStartPending = true
    if state.phase == .ended {
      let version = state.version
      guard let replayToken = state.requestReplay(version: version) else {
        playbackStartPending = false
        return
      }
      player.seek(to: .zero) { [weak self] finished in
        guard
          let self,
          self.playbackStartPending,
          self.state.consumeReplay(version: version, token: replayToken)
        else { return }
        guard finished else {
          self.playbackStartPending = false
          self.onError(["code": "PLAYBACK_ERROR", "message": "Unable to restart video"])
          return
        }
        self.player.play()
      }
    } else {
      player.play()
    }
  }

  func pause() {
    playbackStartPending = false
    player.pause()
    state.reduce(.pause)
  }

  func reset() {
    state.reduce(.reset)
    playbackStartPending = false
    itemStatusObservation?.invalidate()
    itemStatusObservation = nil
    itemNotifications.forEach(NotificationCenter.default.removeObserver)
    itemNotifications.removeAll()
    player.pause()
    player.replaceCurrentItem(with: nil)
  }

  private func observe(_ item: AVPlayerItem, version: Int) {
    itemStatusObservation = item.observe(\.status, options: [.initial, .new]) { [weak self, weak item] observedItem, _ in
      guard let self, let item, item === observedItem, self.player.currentItem === item else { return }
      switch observedItem.status {
      case .readyToPlay:
        let previousPhase = self.state.phase
        self.state.reduce(.ready(version))
        if previousPhase == .idle, self.state.phase == .ready {
          self.onVideoReady([:])
        }
      case .failed:
        self.fail(
          code: "VIDEO_LOAD_ERROR",
          message: observedItem.error?.localizedDescription ?? "Unable to load video",
          version: version
        )
      case .unknown:
        break
      @unknown default:
        self.fail(code: "VIDEO_LOAD_ERROR", message: "Unknown video status", version: version)
      }
    }

    let center = NotificationCenter.default
    itemNotifications = [
      center.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main) { [weak self, weak item] _ in
        guard let self, let item, self.player.currentItem === item, self.state.version == version else { return }
        self.playbackStartPending = false
        let previousPhase = self.state.phase
        self.state.reduce(.ended(version))
        if previousPhase != .ended, self.state.phase == .ended {
          self.onPlaybackEnd([:])
        }
      },
      center.addObserver(forName: .AVPlayerItemFailedToPlayToEndTime, object: item, queue: .main) { [weak self, weak item] notification in
        guard let self, let item, self.player.currentItem === item else { return }
        let error = notification.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? Error
        self.fail(code: "PLAYBACK_ERROR", message: error?.localizedDescription ?? "Playback failed", version: version)
      }
    ]
  }

  private func fail(code: String, message: String, version: Int) {
    guard version == state.version else { return }
    let previousPhase = state.phase
    state.reduce(.failed(version))
    guard previousPhase != .failed else { return }
    playbackStartPending = false
    player.pause()
    onError(["code": code, "message": message])
  }

  deinit {
    itemStatusObservation?.invalidate()
    timeControlObservation?.invalidate()
    itemNotifications.forEach(NotificationCenter.default.removeObserver)
    if let backgroundNotification {
      NotificationCenter.default.removeObserver(backgroundNotification)
    }
    player.pause()
    player.replaceCurrentItem(with: nil)
  }
}
