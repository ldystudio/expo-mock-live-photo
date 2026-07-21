package expo.modules.mocklivephoto

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoMockLivePhotoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoMockLivePhoto")

    View(ExpoMockLivePhotoView::class) {
      Events("onVideoReady", "onPlaybackStart", "onPlaybackPause", "onPlaybackEnd", "onError")

      Prop("videoUri") { view: ExpoMockLivePhotoView, value: String -> view.setVideoUri(value) }
      Prop("muted") { view: ExpoMockLivePhotoView, value: Boolean -> view.setMuted(value) }
      Prop("resizeMode") { view: ExpoMockLivePhotoView, value: String -> view.setResizeMode(value) }

      AsyncFunction("play") { view: ExpoMockLivePhotoView -> view.play() }
      AsyncFunction("pause") { view: ExpoMockLivePhotoView -> view.pause() }
      AsyncFunction("reset") { view: ExpoMockLivePhotoView -> view.reset() }

      OnViewDestroys { view -> view.reset() }
    }
  }
}
