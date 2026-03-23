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

function registerAndroidPackageInMainApplication(contents, packageClass) {
  const kotlinImport = `import com.talukders.sukoon.${packageClass}`;
  const javaImport = `import com.talukders.sukoon.${packageClass};`;
  const kotlinApplyAdd = `add(${packageClass}())`;
  const kotlinLegacyAdd = `packages.add(${packageClass}())`;
  const javaAdd = `packages.add(new ${packageClass}());`;

  if (contents.includes('PackageList(this).packages.apply {')) {
    let updated = insertImport(contents, kotlinImport);

    if (!updated.includes(kotlinApplyAdd)) {
      updated = updated.replace(
        /(PackageList\(this\)\.packages\.apply\s*\{\n)/,
        `$1          ${kotlinApplyAdd}\n`
      );
    }

    return updated;
  }

  if (contents.includes('fun getPackages()')) {
    let updated = insertImport(contents, kotlinImport);

    if (!updated.includes(kotlinLegacyAdd)) {
      updated = updated.replace(
        /(val packages = PackageList\(this\)\.packages)/,
        `$1\n            ${kotlinLegacyAdd}`
      );
    }

    return updated;
  }

  let updated = insertImport(contents, javaImport);

  if (!updated.includes(javaAdd)) {
    updated = updated.replace(
      /(protected List<ReactPackage> getPackages\(\) {[\s\S]*?return packages;)/,
      (match) => match.replace('return packages;', `          ${javaAdd}\n          return packages;`)
    );
  }

  return updated;
}

module.exports = {
  registerAndroidPackageInMainApplication,
};
