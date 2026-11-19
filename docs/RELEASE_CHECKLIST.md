# Halchal (হালচাল) — Android Production Release Checklist & Play Console Guide

This checklist guides the engineering team through compiling, signing, testing, and submitting the Android-first Flutter app for **Halchal** to the Google Play Store, adhering strictly to the privacy and security rules in `CLAUDE.md`.

---

## 1. Release Architecture & Budget Verification

| Metric / Requirement | Target Budget | Verified State | Notes |
| :--- | :--- | :--- | :--- |
| **Release APK Size** | `< 25 MB` per ABI | Target met via `--split-per-abi` | arm64-v8a and armeabi-v7a architectures |
| **Initial JS / Startup** | Sub-second cold start | Verified on low-RAM devices | Tactical HUD loads immediately; MapLibre is deferred |
| **Privacy Rule 1** | Zero Raw GPS Persistence | Verified in `offline_queue.dart` & `submit-report` | Ephemeral coordinates wiped immediately upon submit |
| **Privacy Rule 2** | Anonymity Between Users | Verified across all RPCs | `get_zone_status` exposes no telemetry or user IDs |
| **Privacy Rule 3** | Commercial Vendor Isolation | Verified | LPG cylinder prices only displayed as H3 zone aggregates |
| **Privacy Rule 4** | 72-Hour Data Purge | Automated pg_cron | Raw rows dropped automatically |

---

## 2. Release Keystore & App Signing

### 2.1 Generate Production Keystore
Generate a dedicated 2048-bit RSA release keystore:

```bash
keytool -genkey -v \
  -keystore halchal-release-key.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias halchal \
  -storetype JKS
```

### 2.2 Configure `android/key.properties`
Create `mobile/android/key.properties` (never commit this file to Git):

```properties
storePassword=<SECURE_STORE_PASSWORD>
keyPassword=<SECURE_KEY_PASSWORD>
keyAlias=halchal
storeFile=../../halchal-release-key.jks
```

### 2.3 Verify `mobile/android/app/build.gradle.kts`
Ensure release build references the signing configuration:

```kotlin
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String?
            keyPassword = keystoreProperties["keyPassword"] as String?
            storeFile = keystoreProperties["storeFile"]?.let { file(it) }
            storePassword = keystoreProperties["storePassword"] as String?
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
```

---

## 3. Google Play Integrity API Setup

To protect against bot manipulation, spoofed GPS attacks, and Sybil flooding during mass blackouts:

1. **Google Play Console Linkage:**
   - Navigate to **Release > App Integrity > Play Integrity API**.
   - Link your app to the production Google Cloud project (`halchal-bd`).
2. **Google Cloud Service Account:**
   - Create a service account with the role **Play Integrity Decryptor / Viewer**.
   - Generate a JSON service account key.
3. **Supabase Edge Function Secret:**
   - Deploy the service account credentials to Supabase Edge Function environment:
     ```bash
     supabase secrets set PLAY_INTEGRITY_PACKAGE_NAME="com.halchal.halchal_mobile"
     supabase secrets set PLAY_INTEGRITY_SERVICE_ACCOUNT_TOKEN="<OAUTH_ACCESS_TOKEN>"
     ```
4. **Attestation Gating:**
   - Android client passes Play Integrity token in the `attestation` payload of `submit-report`.
   - Server decodes the token, verifying `appRecognitionVerdict === 'PLAY_RECOGNIZED'` and `MEETS_DEVICE_INTEGRITY`.

---

## 4. Google Play Console Data Safety Form

Answers must align with the privacy architecture in `CLAUDE.md`:

### 4.1 Data Collection & Sharing Overview
- **Does your app collect or share any of the required user data types?**  
  👉 **Yes** (Location is collected ephemerally on citizen report tap).
- **Is all the user data collected by your app encrypted in transit?**  
  👉 **Yes** (All API communication uses HTTPS / TLS 1.3).
- **Do you provide a way for users to request that their data be deleted?**  
  👉 **Yes** (Automated 72-hour purge deletes raw report data; anonymous sessions can be reset).

### 4.2 Location Data Declaration
- **Approximate Location:**
  - **Collected:** Yes
  - **Shared:** No
  - **Ephemeral processing:** Yes (Processed in memory on device/server and discarded immediately)
  - **Required or Optional:** Required for reporting utility status; optional for browsing
  - **Purpose:** App functionality, Analytics (Hyperlocal H3 status aggregation)
- **Precise Location:**
  - **Collected:** Yes (Used solely to derive Uber H3 Resolution 8 cell index)
  - **Shared:** No
  - **Ephemeral processing:** **Yes** (Never persisted to database or logs)
  - **Required or Optional:** Required to submit a report
  - **Purpose:** App functionality (Fraud prevention and neighborhood confirmation)

### 4.3 Personal Info, Identifiers & Diagnostics
- **Name, Email, Phone Number, Physical Address:**  
  👉 **Not collected** (Halchal operates on anonymous sessions by default).
- **Device or other IDs:**  
  👉 **Collected:** Random UUID stored locally on device; hashed via HMAC-SHA256 with a server secret (`device_id_hash`) for CGNAT anti-spam rate limiting. Not linked to user identity.
- **Photos, Audio, Files, Contacts:**  
  👉 **Not collected**.

---

## 5. Aggressive OEM Battery Optimization Guidance

Devices popular in Bangladesh (Xiaomi, Samsung, Oppo, Vivo) run aggressive task killers (MIUI Cleaner, One UI Sleeping Apps, ColorOS background freezer). To guarantee critical push notifications and background offline queue retries:

1. **Manifest Permissions:**
   - `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` declared in `AndroidManifest.xml`.
2. **Onboarding / In-App Modal:**
   - `BatteryOptimizationDialog` provides Bengali step-by-step instructions:
     - **Xiaomi (MIUI/HyperOS):** Autostart enabled + Battery Saver set to "No restrictions".
     - **Samsung (One UI):** Add Halchal to "Never sleeping apps".
     - **Oppo/Realme (ColorOS):** Allow background activity.
     - **Vivo (Funtouch OS):** Enable high background power consumption.
3. **Direct System Intent:**
   - Direct button opens `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` for one-tap whitelist approval.

---

## 6. Build & Packaging Commands

### Generate Optimized Release APKs (Split per ABI)
```bash
cd mobile
flutter build apk --release --split-per-abi
```
Outputs:
- `build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`
- `build/app/outputs/flutter-apk/app-armeabi-v7a-release.apk`

### Generate Production App Bundle (.aab for Google Play)
```bash
cd mobile
flutter build appbundle --release
```
Output:
- `build/app/outputs/bundle/release/app-release.aab`
