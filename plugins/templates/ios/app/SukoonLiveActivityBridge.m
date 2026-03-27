#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SukoonLiveActivityBridge, NSObject)

RCT_EXTERN_METHOD(startLiveActivity:(NSString *)dataJson
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateLiveActivity:(NSString *)dataJson
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endLiveActivity:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
