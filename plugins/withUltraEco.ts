import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { withAndroidManifest, withDangerousMod, type ConfigPlugin } from "expo/config-plugins";

type ManifestValue = { $?: Record<string, string> };
type QueryIntent = {
  action?: ManifestValue[];
  category?: ManifestValue[];
};
type PackageQuery = { intent?: QueryIntent[] };

const blockedPermissions = [
  "android.permission.RECORD_AUDIO",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_MEDIA_AUDIO",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.VIBRATE",
];

function removeBlockedPermissions(xml: string) {
  return blockedPermissions.reduce((result, permission) => {
    const escaped = permission.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `<uses-permission\\b(?=[^>]*android:name=[\"']${escaped}[\"'])[^>]*\\/?>\\s*`,
      "g",
    );
    return result.replace(pattern, "");
  }, xml);
}

const withUltraEco: ConfigPlugin = (config) => {
  const withManifest = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest as Record<string, unknown>;
    const permissions = (manifest["uses-permission"] ?? []) as ManifestValue[];
    const requiredPermissions = [
      "android.permission.PACKAGE_USAGE_STATS",
      "android.permission.WRITE_SETTINGS",
    ];

    for (const permission of requiredPermissions) {
      if (!permissions.some((entry) => entry.$?.["android:name"] === permission)) {
        permissions.push({ $: { "android:name": permission } });
      }
    }
    manifest["uses-permission"] = permissions;

    const queries = (manifest.queries ?? []) as PackageQuery[];
    const hasLauncherQuery = queries.some((query) =>
      query.intent?.some(
        (intent) =>
          intent.action?.some(
            (action) => action.$?.["android:name"] === "android.intent.action.MAIN",
          ) &&
          intent.category?.some(
            (category) => category.$?.["android:name"] === "android.intent.category.LAUNCHER",
          ),
      ),
    );

    if (!hasLauncherQuery) {
      queries.push({
        intent: [
          {
            action: [{ $: { "android:name": "android.intent.action.MAIN" } }],
            category: [{ $: { "android:name": "android.intent.category.LAUNCHER" } }],
          },
        ],
      });
    }
    manifest.queries = queries;
    return mod;
  });

  return withDangerousMod(withManifest, ["android", async (mod) => {
    const manifests = [
      path.join(mod.modRequest.platformProjectRoot, "app/src/debug/AndroidManifest.xml"),
      path.join(mod.modRequest.platformProjectRoot, "app/src/debugOptimized/AndroidManifest.xml"),
    ];
    for (const manifestPath of manifests) {
      try {
        const current = await readFile(manifestPath, "utf8");
        const filtered = removeBlockedPermissions(current);
        if (filtered !== current) await writeFile(manifestPath, filtered, "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    return mod;
  }]);
};

export default withUltraEco;
