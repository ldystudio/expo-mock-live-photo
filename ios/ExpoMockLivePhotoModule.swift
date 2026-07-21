import ExpoModulesCore

public class ExpoMockLivePhotoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoMockLivePhoto")

    View(ExpoMockLivePhotoView.self) {
    }
  }
}
