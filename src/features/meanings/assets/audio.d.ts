// Type declaration for bundled audio assets.
//
// Metro returns a numeric asset id from require()/import-of .m4a, which is
// what expo-audio's useAudioPlayer accepts. Expo provides this default for
// images via expo/tsconfig.base, but not for arbitrary audio — declare it
// once here so all .m4a imports in the meanings module are typed cleanly.

declare module '*.m4a' {
  const asset: number;
  export default asset;
}
