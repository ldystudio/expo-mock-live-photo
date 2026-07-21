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

  func testPlayAfterEndStartsPlaybackAgain() throws {
    var state = PlaybackState()
    state.reduce(.ready(0))
    state.reduce(.ended(0))
    let token = try XCTUnwrap(state.requestReplay(version: 0))
    XCTAssertTrue(state.consumeReplay(version: 0, token: token))
    state.reduce(.started(0))
    XCTAssertEqual(state.phase, .playing)
  }

  func testPauseCancelsPendingReplay() throws {
    var state = PlaybackState()
    state.reduce(.ready(0))
    state.reduce(.ended(0))
    let oldToken = try XCTUnwrap(state.requestReplay(version: 0))
    state.reduce(.pause)
    let newToken = try XCTUnwrap(state.requestReplay(version: 0))
    XCTAssertFalse(state.consumeReplay(version: 0, token: oldToken))
    XCTAssertTrue(state.consumeReplay(version: 0, token: newToken))
    XCTAssertEqual(state.phase, .ended)
  }

  func testResetIgnoresOldVersionEvents() {
    var state = PlaybackState()
    state.reduce(.reset)
    state.reduce(.ready(0))
    state.reduce(.ended(0))
    state.reduce(.failed(0))
    XCTAssertEqual(state.phase, .idle)
    XCTAssertEqual(state.version, 1)
  }
}
