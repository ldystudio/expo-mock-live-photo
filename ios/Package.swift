// swift-tools-version: 5.9

import PackageDescription

let package = Package(
  name: "ExpoMockLivePhotoPlaybackState",
  products: [
    .library(name: "ExpoMockLivePhotoPlaybackState", targets: ["ExpoMockLivePhotoPlaybackState"])
  ],
  targets: [
    .target(
      name: "ExpoMockLivePhotoPlaybackState",
      path: ".",
      exclude: ["ExpoMockLivePhoto.podspec", "ExpoMockLivePhotoModule.swift", "ExpoMockLivePhotoView.swift", "Tests"],
      sources: ["PlaybackState.swift"]
    ),
    .testTarget(
      name: "ExpoMockLivePhotoPlaybackStateTests",
      dependencies: ["ExpoMockLivePhotoPlaybackState"],
      path: "Tests"
    )
  ]
)
