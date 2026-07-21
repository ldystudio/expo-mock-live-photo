import { NativeModule, registerWebModule } from 'expo';

// ExpoMockLivePhotoModule is not available on the web platform.
class ExpoMockLivePhotoModule extends NativeModule {}

export default registerWebModule(
  ExpoMockLivePhotoModule,
  'ExpoMockLivePhotoModule',
);
