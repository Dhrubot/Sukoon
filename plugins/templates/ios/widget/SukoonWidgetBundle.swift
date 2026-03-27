import WidgetKit
import SwiftUI

@main
struct SukoonWidgetBundle: WidgetBundle {
    var body: some Widget {
        SukoonWidget()
        SukoonAccessoryWidget()
        if #available(iOS 16.2, *) {
            SukoonLiveActivity()
        }
    }
}
