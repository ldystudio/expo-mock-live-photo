import XCTest
@testable import ExpoMockLivePhotoPlaybackState

final class PlaybackStateTests: XCTestCase {
  func testPlaybackLifecycle() {
    var state = PlaybackState()
    state.reduce(.ready(0))
    state.reduce(.started(0))
    XCTAssertEqual(state.phase, .playing)
    state.reduce(.pause)
    XCTAssertEqual(state.phase, .paused)
    state.reduce(.ended(0))
    XCTAssertEqual(state.phase, .ended)
  }

  func testPlayAfterEndStartsPlaybackAgain() {
    var state = PlaybackState()
    state.reduce(.ready(0))
    state.reduce(.ended(0))
    state.reduce(.started(0))
    XCTAssertEqual(state.phase, .playing)
  }

  func testResetIgnoresOldVersionEvents() {
    var state = PlaybackState()
    state.reduce(.reset)
    state.reduce(.ready(0))
    state.reduce(.ended(0))
    state.reduce(.failed(0))
    XCTAssertEqual(state, PlaybackState(phase: .idle, version: 1))
  }
}
