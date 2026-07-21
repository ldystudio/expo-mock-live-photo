import type { ExpoMockLivePhotoViewProps } from './ExpoMockLivePhoto.types';

// ExpoMockLivePhotoView is not available on the web platform.
export default function ExpoMockLivePhotoView(
  _props: ExpoMockLivePhotoViewProps,
) {
  throw new Error(
    'ExpoMockLivePhotoView is not available on the web platform.',
  );
}
