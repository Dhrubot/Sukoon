const { withMainActivity } = require('@expo/config-plugins');

function insertImport(contents, importLine) {
  if (contents.includes(importLine)) {
    return contents;
  }

  const lines = contents.split('\n');
  let lastImportIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].startsWith('import ')) {
      lastImportIndex = index;
    }
  }

  if (lastImportIndex === -1) {
    return contents;
  }

  lines.splice(lastImportIndex + 1, 0, importLine);
  return lines.join('\n');
}

module.exports = function withAndroidImmersiveMode(config) {
  return withMainActivity(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    if (!contents.includes('private fun applyImmersiveNavigation()')) {
      contents = insertImport(contents, 'import android.view.View');
      contents = insertImport(contents, 'import android.view.WindowInsets');
      contents = insertImport(contents, 'import android.view.WindowInsetsController');

      contents = contents.replace(
        '    super.onCreate(null)\n',
        '    super.onCreate(null)\n    applyImmersiveNavigation()\n'
      );

      contents = contents.replace(
        /class MainActivity : ReactActivity\(\) \{\n/,
        `class MainActivity : ReactActivity() {\n  private fun applyImmersiveNavigation() {\n    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {\n      window.insetsController?.let { controller ->\n        controller.hide(WindowInsets.Type.navigationBars())\n        controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE\n      }\n    } else {\n      @Suppress("DEPRECATION")\n      window.decorView.systemUiVisibility = (\n        View.SYSTEM_UI_FLAG_LAYOUT_STABLE\n          or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION\n          or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN\n          or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION\n          or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY\n      )\n    }\n  }\n\n`
      );

      contents = contents.replace(
        /  override fun createReactActivityDelegate\(\): ReactActivityDelegate \{\n/,
        `  override fun onResume() {\n    super.onResume()\n    applyImmersiveNavigation()\n  }\n\n  override fun onWindowFocusChanged(hasFocus: Boolean) {\n    super.onWindowFocusChanged(hasFocus)\n    if (hasFocus) {\n      applyImmersiveNavigation()\n    }\n  }\n\n  override fun createReactActivityDelegate(): ReactActivityDelegate {\n`
      );
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
};
