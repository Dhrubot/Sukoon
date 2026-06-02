const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');
const { registerAndroidPackageInMainApplication } = require('./withAndroidPackageRegistration');

const PKG = 'com.talukders.sukoon';
const JAVA_PATH_SEGMENTS = ['android', 'app', 'src', 'main', 'java', 'com', 'talukders', 'sukoon'];
const RES_PATH_SEGMENTS = ['android', 'app', 'src', 'main', 'res'];

const templatePath = (...parts) => path.join(__dirname, 'templates', ...parts);
const readTemplate = (...parts) => fs.readFileSync(templatePath(...parts), 'utf-8');

const writeFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
};

const withAndroidWidgetFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const root = config.modRequest.projectRoot;
      const javaDir = path.join(root, ...JAVA_PATH_SEGMENTS);
      const resDir = path.join(root, ...RES_PATH_SEGMENTS);

      const javaTemplates = {
        'SukoonWidgetBridge.java': ['android', 'java', 'SukoonWidgetBridge.java'],
        'SukoonWidgetPackage.java': ['android', 'java', 'SukoonWidgetPackage.java'],
        'SukoonWidgetGlanceSupport.kt': ['android', 'java', 'SukoonWidgetGlanceSupport.kt'],
        'SukoonSmallWidget.kt': ['android', 'java', 'SukoonSmallWidget.kt'],
        'SukoonMediumWidget.kt': ['android', 'java', 'SukoonMediumWidget.kt'],
      };

      Object.entries(javaTemplates).forEach(([name, parts]) => {
        writeFile(path.join(javaDir, name), readTemplate(...parts));
      });

      const staleJavaFiles = [
        'SukoonWidgetHelper.java',
        'SukoonSmallWidget.java',
        'SukoonMediumWidget.java',
      ];
      staleJavaFiles.forEach((name) => {
        const target = path.join(javaDir, name);
        if (fs.existsSync(target)) {
          fs.rmSync(target, { force: true });
        }
      });

      const resourceTemplates = {
        [path.join('drawable', 'widget_bg.xml')]: ['android', 'res', 'drawable', 'widget_bg.xml'],
        [path.join('drawable', 'widget_dot_active.xml')]: ['android', 'res', 'drawable', 'widget_dot_active.xml'],
        [path.join('drawable', 'widget_dot_current.xml')]: ['android', 'res', 'drawable', 'widget_dot_current.xml'],
        [path.join('drawable', 'widget_dot_inactive.xml')]: ['android', 'res', 'drawable', 'widget_dot_inactive.xml'],
        [path.join('drawable', 'widget_dot_missed.xml')]: ['android', 'res', 'drawable', 'widget_dot_missed.xml'],
        [path.join('layout', 'widget_small.xml')]: ['android', 'res', 'layout', 'widget_small.xml'],
        [path.join('layout', 'widget_medium.xml')]: ['android', 'res', 'layout', 'widget_medium.xml'],
        [path.join('xml', 'widget_small_info.xml')]: ['android', 'res', 'xml', 'widget_small_info.xml'],
        [path.join('xml', 'widget_medium_info.xml')]: ['android', 'res', 'xml', 'widget_medium_info.xml'],
        [path.join('values', 'widget_strings.xml')]: ['android', 'res', 'values', 'widget_strings.xml'],
      };

      Object.entries(resourceTemplates).forEach(([relativePath, parts]) => {
        writeFile(path.join(resDir, relativePath), readTemplate(...parts));
      });

      writeFile(
        path.join(root, 'android', 'app', 'build.gradle'),
        readTemplate('android', 'gradle', 'app-build.gradle')
      );
      writeFile(
        path.join(root, 'android', 'build.gradle'),
        readTemplate('android', 'gradle', 'project-build.gradle')
      );

      return config;
    },
  ]);
};

// Widgets are hidden in v1: the Glance providers + Kotlin classes still
// compile in (so the JS-side WidgetService is safe to keep calling), but
// android:enabled="false" prevents the OS from registering them as widget
// providers — they won't appear in the launcher's "Add widget" picker and
// any existing widget instances stop receiving updates.
//
// Re-enable in v1.1 by flipping WIDGETS_ENABLED below. Leave the Java/Kotlin
// + drawable templates in place either way; only the manifest entry gates
// surface visibility.
const WIDGETS_ENABLED = false;

const withAndroidWidgetManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    const receivers = app.receiver || [];

    const widgetReceivers = [
      {
        name: '.SukoonSmallWidget',
        resource: '@xml/widget_small_info',
      },
      {
        name: '.SukoonMediumWidget',
        resource: '@xml/widget_medium_info',
      },
    ];

    widgetReceivers.forEach(({ name, resource }) => {
      const existing = receivers.find((receiver) => receiver?.$?.['android:name'] === name);
      if (existing) {
        existing.$['android:exported'] = 'true';
        existing.$['android:enabled'] = WIDGETS_ENABLED ? 'true' : 'false';
        existing['intent-filter'] = [
          {
            action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
          },
        ];
        existing['meta-data'] = [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': resource,
            },
          },
        ];
        return;
      }

      receivers.push({
        $: {
          'android:name': name,
          'android:exported': 'true',
          'android:enabled': WIDGETS_ENABLED ? 'true' : 'false',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': resource,
            },
          },
        ],
      });
    });

    app.receiver = receivers;
    return config;
  });
};

const withAndroidWidgetPackageRegistration = (config) => {
  return withMainApplication(config, (config) => {
    config.modResults.contents = registerAndroidPackageInMainApplication(
      config.modResults.contents,
      'SukoonWidgetPackage'
    );
    return config;
  });
};

module.exports = function withAndroidWidget(config) {
  config = withAndroidWidgetFiles(config);
  config = withAndroidWidgetManifest(config);
  config = withAndroidWidgetPackageRegistration(config);
  return config;
};
