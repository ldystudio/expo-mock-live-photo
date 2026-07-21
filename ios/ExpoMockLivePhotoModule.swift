import ExpoModulesCore

public class ExpoMockLivePhotoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoMockLivePhoto")

    View(ExpoMockLivePhotoView.self) {
      Events("onVideoReady", "onPlaybackStart", "onPlaybackEnd", "onError")

      Prop("videoUri") { (view, value: String) in
        view.setVideoUri(value)
      }
      Prop("muted") { (view, value: Bool) in
        view.setMuted(value)
      }
      Prop("resizeMode") { (view, value: String) in
        view.setResizeMode(value)
      }

      AsyncFunction("play") { (view: ExpoMockLivePhotoView) in
        view.play()
      }
      AsyncFunction("pause") { (view: ExpoMockLivePhotoView) in
        view.pause()
      }
      AsyncFunction("reset") { (view: ExpoMockLivePhotoView) in
        view.reset()
      }
    }
  }
}
