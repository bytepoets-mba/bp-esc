# Setup macOS Signing and Notarization Pipeline

**Priority:** 0128  
**Hash:** 694f6f5  
**Status:** Backlog  
**Created:** 2026-01-23

---

## Objective

Establish a professional CI/CD pipeline that builds, signs, and notarizes the application for macOS, ensuring users can open the app without security warnings.

---

## 📋 Requirements Checklist

### 1. Apple Developer Account
- [ ] Active Apple Developer Program membership (Company/Organization type preferred).
- [ ] Role: Account Holder or Admin.

### 2. Signing Identity (Certificate)
- [ ] Certificate Type: **Developer ID Application**.
- [ ] Certificate downloaded and imported into local Keychain.
- [ ] Private key exported as `.p12` file.
- [ ] Base64 version of `.p12` created.

### 3. Notarization Credentials
- [ ] App-specific password generated for the Apple ID.
- [ ] Team ID identified (10-character alphanumeric).

### 4. GitHub Secrets Configuration
- [ ] `APPLE_CERTIFICATE`: Base64 encoded `.p12` file.
- [ ] `APPLE_CERTIFICATE_PASSWORD`: Password for the exported `.p12`.
- [ ] `APPLE_ID`: Apple ID email address.
- [ ] `APPLE_PASSWORD`: App-specific password.
- [ ] `APPLE_TEAM_ID`: Apple Developer Team ID.

---

## 🛠️ Step-by-Step Implementation Guide

### Phase 1: Local Certificate Setup

1.  **Generate Certificate Request (CSR):**
    -   Open `Keychain Access` > `Certificate Assistant` > `Request a Certificate from a Certificate Authority...`.
2.  **Create Certificate in Apple Developer Portal:**
    -   Go to [developer.apple.com/certificates](https://developer.apple.com/certificates).
    -   Create a new certificate: **Developer ID Application**.
    -   Upload the CSR.
3.  **Install Certificate:**
    -   Download the `.cer` file and double-click to install it into your `login` keychain.
4.  **Export for GitHub Actions:**
    -   In `Keychain Access`, find the certificate and its private key.
    -   Right-click > `Export 2 items...`.
    -   Save as `certificates.p12` with a strong password.

### Phase 2: Credentials Preparation

1.  **Generate App-Specific Password:**
    -   Go to [appleid.apple.com](https://appleid.apple.com).
    -   Generate a password specifically for "GitHub Actions - BP-ESC".
2.  **Find Team ID:**
    -   Visible in the top right corner of the [Apple Developer Portal](https://developer.apple.com/account).

### Phase 3: CI/CD Integration

1.  **GitHub Secrets:**
    -   Populate all 5 secrets in the repository settings.
2.  **Verify Workflow:**
    -   Run the `/build` command to trigger a tag push.
    -   Monitor the "Release" Action in GitHub.

---

## 🧱 Components & Tools

| Component | Responsibility |
| :--- | :--- |
| **Apple Notary Service** | Scans app for malware and issues tickets. |
| **`codesign`** | Cryptographically signs the app bundle. |
| **`notarytool`** | Submits the app to Apple for verification. |
| **`stapler`** | Attaches the notarization ticket to the app. |
| **GitHub Actions** | Orchestrates the entire process on every release tag. |

---

## ⚠️ Common Pitfalls

- **Incorrect Certificate Type:** Using "Apple Development" or "Mac App Distribution" instead of **Developer ID Application** (this is for outside-the-store distribution).
- **Entitlements:** For Tauri apps, ensure `com.apple.security.cs.allow-jit` and other Hardened Runtime entitlements are correctly configured if needed.
- **Base64 Encoding:** Using a `.p12` file directly in GitHub instead of its base64 representation.

---

## Success Criteria

✅ GitHub Action completes successfully for a tag.  
✅ DMG is uploaded to a GitHub Draft Release.  
✅ Downloaded app can be opened on a fresh Mac without "Unidentified Developer" warnings.  
✅ App shows "Apple checked it for malicious software and none was detected" in the security prompt.
