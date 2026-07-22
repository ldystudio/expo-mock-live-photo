require "json"

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoMockLivePhoto'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.author         = package['author']
  s.license        = { type: 'MIT', file: '../LICENSE' }
  s.homepage       = package['homepage']
  s.platforms      = { :ios => '13.4' }
  s.source         = { git: "https://github.com/ldystudio/expo-mock-live-photo" }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.exclude_files = ["Package.swift", "Tests/**/*"]
end
