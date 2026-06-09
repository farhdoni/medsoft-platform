package uz.aivita.app
import expo.modules.splashscreen.SplashScreenManager

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import android.content.pm.PackageManager
import expo.modules.ReactActivityDelegateWrapper
import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(null)
    // Required by react-native-health-connect: registers the ActivityResult launcher
    // for the Health Connect permissions dialog. Must be called before onStart().
    // resolveHcProviderPackage() detects correct package: Android 14+ uses system HC,
    // Android 9-13 uses standalone com.google.android.apps.healthdata.
    HealthConnectPermissionDelegate.setPermissionDelegate(this, resolveHcProviderPackage())
  }

  /**
   * Detects the correct Health Connect provider package at runtime.
   * Android 14+ (API 34+): HC is part of the OS → com.android.healthconnect.controller
   * Android 9-13: standalone app → com.google.android.apps.healthdata
   * Without this, requestPermission dialog silently returns empty on Android 14+.
   */
  private fun resolveHcProviderPackage(): String {
    for (pkg in listOf("com.google.android.apps.healthdata", "com.android.healthconnect.controller")) {
      try { packageManager.getPackageInfo(pkg, 0); return pkg }
      catch (_: PackageManager.NameNotFoundException) { }
    }
    return "com.google.android.apps.healthdata"
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
