import Foundation
import WidgetKit

@objc(SukoonWidgetBridge)
class SukoonWidgetBridge: NSObject {

  private static let appGroup = "group.com.talukders.sukoon"

  @objc
  func setWidgetData(_ jsonString: String,
                     resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: SukoonWidgetBridge.appGroup) else {
      reject("APP_GROUP_ERROR", "Cannot access App Group UserDefaults", nil)
      return
    }
    defaults.set(jsonString, forKey: "widgetData")
    defaults.synchronize()
    resolve(true)
  }

  @objc
  func reloadWidgets(_ resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    resolve(true)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
