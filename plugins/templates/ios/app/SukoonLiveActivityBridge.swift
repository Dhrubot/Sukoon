import Foundation
import ActivityKit

// Duplicated from widget extension — must stay in sync
struct SukoonPrayerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var prayerName: String
        var countdownTargetISO: String
        var phase: String
        var progress: Double
        var prayerStatuses: [String]
        var prayerAccentKeys: [String]
    }
    var prayerNames: [String]
}

struct LiveActivityPayload: Codable {
    let prayerName: String
    let countdownTargetISO: String
    let phase: String
    let progress: Double
    let prayerStatuses: [String]
    let prayerAccentKeys: [String]
    let prayerNames: [String]
}

@objc(SukoonLiveActivityBridge)
class SukoonLiveActivityBridge: NSObject {

    @objc
    func startLiveActivity(_ dataJson: String,
                           resolve: @escaping RCTPromiseResolveBlock,
                           reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                reject("NOT_ENABLED", "Live Activities are not enabled", nil)
                return
            }
            guard let data = dataJson.data(using: .utf8),
                  let payload = try? JSONDecoder().decode(LiveActivityPayload.self, from: data) else {
                reject("PARSE_ERROR", "Invalid JSON payload", nil)
                return
            }

            // End any existing activities first
            Task {
                for activity in Activity<SukoonPrayerAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }

                let attributes = SukoonPrayerAttributes(prayerNames: payload.prayerNames)
                let state = SukoonPrayerAttributes.ContentState(
                    prayerName: payload.prayerName,
                    countdownTargetISO: payload.countdownTargetISO,
                    phase: payload.phase,
                    progress: payload.progress,
                    prayerStatuses: payload.prayerStatuses,
                    prayerAccentKeys: payload.prayerAccentKeys
                )

                do {
                    let content = ActivityContent(state: state, staleDate: nil)
                    let activity = try Activity.request(attributes: attributes, content: content, pushType: nil)
                    resolve(activity.id)
                } catch {
                    reject("START_ERROR", error.localizedDescription, error)
                }
            }
        } else {
            reject("UNSUPPORTED", "Live Activities require iOS 16.2+", nil)
        }
    }

    @objc
    func updateLiveActivity(_ dataJson: String,
                            resolve: @escaping RCTPromiseResolveBlock,
                            reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            guard let data = dataJson.data(using: .utf8),
                  let payload = try? JSONDecoder().decode(LiveActivityPayload.self, from: data) else {
                reject("PARSE_ERROR", "Invalid JSON payload", nil)
                return
            }

            let state = SukoonPrayerAttributes.ContentState(
                prayerName: payload.prayerName,
                countdownTargetISO: payload.countdownTargetISO,
                phase: payload.phase,
                progress: payload.progress,
                prayerStatuses: payload.prayerStatuses,
                prayerAccentKeys: payload.prayerAccentKeys
            )

            Task {
                let activities = Activity<SukoonPrayerAttributes>.activities
                if activities.isEmpty {
                    // No active activity — start one instead
                    let attributes = SukoonPrayerAttributes(prayerNames: payload.prayerNames)
                    do {
                        let content = ActivityContent(state: state, staleDate: nil)
                        let activity = try Activity.request(attributes: attributes, content: content, pushType: nil)
                        resolve(activity.id)
                    } catch {
                        reject("START_ERROR", error.localizedDescription, error)
                    }
                } else {
                    for activity in activities {
                        await activity.update(ActivityContent(state: state, staleDate: nil))
                    }
                    resolve(true)
                }
            }
        } else {
            reject("UNSUPPORTED", "Live Activities require iOS 16.2+", nil)
        }
    }

    @objc
    func endLiveActivity(_ resolve: @escaping RCTPromiseResolveBlock,
                         reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            Task {
                for activity in Activity<SukoonPrayerAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
                resolve(true)
            }
        } else {
            resolve(true)
        }
    }

    @objc
    static func requiresMainQueueSetup() -> Bool { false }
}
