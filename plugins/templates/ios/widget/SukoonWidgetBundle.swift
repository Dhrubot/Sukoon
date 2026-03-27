import WidgetKit
import SwiftUI

@main
struct SukoonWidgetBundle: WidgetBundle {
    var body: some Widget {
        SukoonWidget()
        if #available(iOS 16.2, *) {
            SukoonLiveActivity()
        }
    }
}
