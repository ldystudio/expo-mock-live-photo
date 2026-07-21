package_root = File.expand_path('..', __dir__)
local_package_url = "file://#{package_root}"

Pod::Spec.new do |s|
  s.name           = 'ExpoMockLivePhoto'
  s.version        = '0.1.0'
  s.summary        = 'Simulate Live Photo playback from an image and a video.'
  s.description    = 'Simulate Live Photo playback from an image and a video.'
  s.author         = { 'Liudy' => '1187551003@qq.com' }
  s.license        = { type: 'MIT', file: '../LICENSE' }
  s.homepage       = local_package_url
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: local_package_url }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.exclude_files = ["Package.swift", "Tests/**/*"]
end
