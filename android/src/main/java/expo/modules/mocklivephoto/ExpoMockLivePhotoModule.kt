package expo.modules.mocklivephoto

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoMockLivePhotoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoMockLivePhoto")

    View(ExpoMockLivePhotoView::class) {
    }
  }
}
