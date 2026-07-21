import { NativeModule, requireNativeModule } from 'expo';

declare class ExpoMockLivePhotoModule extends NativeModule {}

export default requireNativeModule<ExpoMockLivePhotoModule>(
  'ExpoMockLivePhoto',
);
