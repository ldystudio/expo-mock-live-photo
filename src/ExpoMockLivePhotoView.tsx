import { requireNativeView } from 'expo';
import type * as React from 'react';

import type { ExpoMockLivePhotoViewProps } from './ExpoMockLivePhoto.types';

const NativeView: React.ComponentType<ExpoMockLivePhotoViewProps> =
  requireNativeView('ExpoMockLivePhoto');

export default function ExpoMockLivePhotoView(
  props: ExpoMockLivePhotoViewProps,
) {
  return <NativeView {...props} />;
}
