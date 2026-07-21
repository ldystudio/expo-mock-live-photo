// Reexport the native module. On web, it will be resolved to ExpoMockLivePhotoModule.web.ts
// and on native platforms to ExpoMockLivePhotoModule.ts

export * from './ExpoMockLivePhoto.types';
export { default } from './ExpoMockLivePhotoModule';
export { default as ExpoMockLivePhotoView } from './ExpoMockLivePhotoView';
