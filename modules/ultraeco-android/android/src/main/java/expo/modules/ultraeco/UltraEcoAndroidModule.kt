package expo.modules.ultraeco

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Process
import android.provider.Settings
import android.app.role.RoleManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class UltraEcoAndroidModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("Android context is unavailable")

  override fun definition() = ModuleDefinition {
    Name("UltraEcoAndroid")

    AsyncFunction("getLaunchableApps") {
      val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      context.packageManager
        .queryIntentActivities(intent, PackageManager.MATCH_ALL)
        .asSequence()
        .mapNotNull { result ->
          val packageName = result.activityInfo?.packageName ?: return@mapNotNull null
          if (packageName == context.packageName) return@mapNotNull null
          mapOf(
            "packageName" to packageName,
            "name" to result.loadLabel(context.packageManager).toString()
          )
        }
        .distinctBy { it["packageName"] }
        .sortedBy { it["name"]?.lowercase() }
        .toList()
    }

    AsyncFunction("launchApp") { packageName: String ->
      val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName)
        ?: throw IllegalArgumentException("No hay una actividad de inicio disponible para esa aplicación")
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(launchIntent)
      true
    }

    Function("canWriteSettings") {
      Settings.System.canWrite(context)
    }

    AsyncFunction("openWriteSettings") {
      openSettingsIntent(
        Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS, Uri.parse("package:${context.packageName}"))
      )
    }

    Function("canAccessUsageStats") {
      hasUsageAccess()
    }

    AsyncFunction("openUsageSettings") {
      openSettingsIntent(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
    }

    AsyncFunction("getRecentForegroundApp") {
      if (!hasUsageAccess()) return@AsyncFunction null
      val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val end = System.currentTimeMillis()
      val events = try {
        manager.queryEvents(end - 60L * 60L * 1000L, end)
      } catch (_: SecurityException) {
        return@AsyncFunction null
      }
      val event = UsageEvents.Event()
      var latestPackage: String? = null
      var latestTime = 0L
      while (events.hasNextEvent()) {
        events.getNextEvent(event)
        if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED &&
          event.timeStamp > latestTime && event.packageName != context.packageName
        ) {
          latestPackage = event.packageName
          latestTime = event.timeStamp
        }
      }
      latestPackage?.let { packageName ->
        mapOf("packageName" to packageName, "timestamp" to latestTime)
      }
    }

    Function("isDefaultLauncher") {
      val roles = context.getSystemService(RoleManager::class.java)
      roles?.isRoleHeld(RoleManager.ROLE_HOME) == true
    }

    AsyncFunction("openHomeSettings") {
      val intent = Intent(Settings.ACTION_HOME_SETTINGS)
      if (intent.resolveActivity(context.packageManager) == null) {
        intent.action = Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS
      }
      openSettingsIntent(intent)
    }
  }

  private fun hasUsageAccess(): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    return appOps.checkOpNoThrow(
      AppOpsManager.OPSTR_GET_USAGE_STATS,
      Process.myUid(),
      context.packageName
    ) == AppOpsManager.MODE_ALLOWED
  }

  private fun openSettingsIntent(intent: Intent) {
    val activity = appContext.currentActivity
    if (activity != null) {
      activity.startActivity(intent)
    } else {
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }
  }
}
