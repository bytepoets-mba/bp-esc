# Investigate and Fix hdiutil DMG Creation Failure

**Priority:** 0512  
**Hash:** 349429b  
**Status:** Backlog  
**Created:** 2026-01-23

---

## Problem Statement

The Tauri build process consistently fails during DMG creation with the error:
```
could not access /Volumes/BP-ESC_0.2.3_x64/rw.XXXXX.BP-ESC_0.2.3_x64.dmg - No space left on device
hdiutil: create failed - No space left on device
```

**Impact:** Cannot create distributable DMG files. The `.app` bundle builds successfully, but automated DMG packaging fails.

---

## System Environment

- **macOS Version:** 15.7.3 (Build 24G419)
- **Available Disk Space:** 53-59GB on main volume
- **Disk Usage:** 93% (638Gi used of 741Gi)
- **hdiutil Framework:** 671.140.2
- **Build Tool:** Tauri 2.x with `create-dmg` script (bundle_dmg.sh)

---

## Symptoms

1. **Error occurs during `hdiutil create` command:**
   ```bash
   hdiutil create -srcfolder /path/to/macos -volname BP-ESC_0.2.3_x64 \
     -fs HFS+ -fsargs '-c c=64,a=16,e=16' -format UDRW /path/to/output.dmg
   ```

2. **False "No space left on device" error** despite having 53-59GB available.

3. **Circular reference pattern:** Error message references temporary files inside the mounted volume path (e.g., `/Volumes/BP-ESC_0.2.3_x64/rw.XXXXX.dmg`), suggesting `hdiutil` is trying to create temp files inside its own mounted volume.

4. **Persistent across reboots:** Issue survives system restarts.

5. **Stale temporary DMG files:** Found leaked `rw.*.dmg` files in:
   - `/Users/markus/Code/bp-esc/target/release/bundle/macos/` (source folder)
   - `/Users/markus/Code/bp-esc/target/release/bundle/dmg/` (output folder)

---

## Troubleshooting Steps Attempted

### 1. Volume Cleanup
- **Action:** Ejected all stale DMG volumes from `/Volumes/`
- **Command:** `hdiutil detach -force /Volumes/dmg.*`
- **Result:** ❌ Failed - Error persisted after cleanup

### 2. Temporary File Cleanup
- **Action:** Removed all `rw.*.dmg` files from source and output directories
- **Command:** `rm -f target/release/bundle/*/rw.*.dmg`
- **Result:** ❌ Failed - New temp files created on next build, same error

### 3. Product Name Simplification
- **Action:** Changed `productName` from `"BYTEPOETS - ESC"` to `"BP-ESC"`
- **Rationale:** Long names with spaces/hyphens might confuse `hdiutil`
- **Files Modified:** `src-tauri/tauri.conf.json`
- **Result:** ⚠️ Partial - Volume name simplified but error persisted

### 4. DMG Size Buffer Increase
- **Action:** Increased extra space allocation from 20MB to 50MB
- **File:** `target/release/bundle/dmg/bundle_dmg.sh`
- **Line:** `DISK_IMAGE_SIZE=$(expr $DISK_IMAGE_SIZE + 50)`
- **Result:** ❌ Failed - Size wasn't the issue

### 5. Temporary Path Relocation
- **Action:** Changed temp DMG location from output dir to `/tmp`
- **Modification:** `DMG_TEMP_NAME="/tmp/rw.$$.${DMG_NAME}"`
- **Result:** ❌ Failed - Error message still referenced wrong path
- **Reverted:** User reverted this change

### 6. Force Detach All Disk Images
- **Action:** Detached all mounted disk images system-wide
- **Command:** `hdiutil info | grep "/dev/disk" | awk '{print $1}' | xargs -I {} hdiutil detach {} -force`
- **Result:** ⚠️ Partial - Ejected 5 leaked volumes (disk7-11), but disk6 was "Resource busy"

### 7. System Reboot
- **Action:** Full macOS restart
- **Result:** ❌ Failed - Error returned immediately after reboot

---

## Root Cause Analysis

### Primary Issue: Circular Mount Reference

The error message pattern reveals the core problem:

```
could not access /Volumes/BP-ESC_0.2.3_x64/rw.29987.BP-ESC_0.2.3_x64.dmg
```

**What's happening:**
1. `hdiutil create` generates a temporary writable DMG at:
   ```
   /path/to/output/rw.PID.BP-ESC_0.2.3_x64.dmg
   ```

2. `hdiutil` then **mounts** this temp DMG to `/Volumes/BP-ESC_0.2.3_x64/`

3. The script expects to write additional temp files, but `hdiutil` tries to write them **inside the mounted volume itself**, creating a circular reference.

4. The mounted volume is read-only or has restricted access, causing the "No space left on device" error (which is actually a permissions/access error masquerading as a space issue).

### Secondary Issue: Stale System State

**Evidence:**
- `hdiutil info` shows leaked disk images with PIDs from previous runs
- `/dev/disk6` is "Resource busy" and cannot be detached
- Error persists across reboots, suggesting kernel-level disk image subsystem corruption

**Hypothesis:**
macOS DiskImages framework (`/System/Library/PrivateFrameworks/DiskImages.framework`) has cached state or locked resources that prevent proper cleanup of failed DMG operations.

---

## Technical Deep Dive

### Script Behavior Analysis

The `bundle_dmg.sh` script (Tauri's vendored `create-dmg`) follows this flow:

1. **Create temp DMG:**
   ```bash
   hdiutil create -srcfolder "$SRC_FOLDER" -volname "$VOLUME_NAME" \
     -fs HFS+ -format UDRW "$DMG_TEMP_NAME"
   ```

2. **Mount temp DMG:**
   ```bash
   hdiutil attach -readwrite -noverify -noautoopen "$DMG_TEMP_NAME"
   ```

3. **Customize mounted volume** (add background, set icon positions, etc.)

4. **Unmount and compress:**
   ```bash
   hdiutil detach "$DEV_NAME"
   hdiutil convert "$DMG_TEMP_NAME" -format UDZO -o "$FINAL_DMG"
   ```

**Problem occurs at Step 1** - the temp DMG creation itself fails before it even gets to mounting.

---

## Current Workaround

**Build `.app` bundle only:**
```bash
CI=false devenv shell npx tauri build --bundles app
```

**Output location:**
```
/Users/markus/Code/bp-esc/target/release/bundle/macos/BP-ESC.app
```

**Manual DMG creation via Disk Utility:**
1. Open Disk Utility
2. File → New Image → Image from Folder
3. Select `BP-ESC.app`
4. Choose "compressed" format
5. Save as `BP-ESC_0.2.3_x64.dmg`

---

## Proposed Solutions (Ordered by Priority)

### Option 1: Use Alternative DMG Tool (node-appdmg) ⭐ Chosen Path
**Tool:** [node-appdmg](https://github.com/LinusU/node-appdmg)

**Rationale:**
This is the chosen strategy to escape `hdiutil` hell. It is significantly more stable for both local and CI environments.

#### ✅ CI Compatibility (GitHub Actions)
- **Works reliably** on `macos-13`, `macos-14`, and `macos-latest` runners.
- **Mandatory:** Fundamentally requires a macOS runner (cannot run on Linux/Windows).
- **Headless:** Works perfectly in GUI-less environments as it doesn't rely on Finder scripting.

#### 🧠 Why it behaves better in CI
- Avoids mounting loops.
- Manages temp files correctly outside the project directory.
- Does **not** rely on Finder or DiskImages background behavior.
- Doesn’t mount into your project directory.
- Works headless (Finder never involved).
- No DiskImages cache poisoning.

#### 🧪 Proven CI Setup
```yaml
- name: Build Tauri app (APP only)
  run: npm run tauri build -- --bundles app
- name: Build DMG via node-appdmg
  run: node scripts/build-dmg.js
```

#### 🔐 Signing & Notarization Workflow
1. `tauri build --bundles app`
2. `codesign` the `.app`
3. `node-appdmg` (does not break signatures)
4. `notarytool submit` the DMG

#### ⚠️ Critical Implementation Notes
- **Absolute Paths:** Always resolve absolute paths in the build script (e.g., `path.resolve('target/release/bundle/macos/BP-ESC.app')`).
- **Minimalist Design:** Avoid complex Finder background images in CI; stick to plain icons + Applications link for maximum reliability.

**Effort:** Medium (2-4 hours)

---

### Option 2: Kernel Extension Reset (Fallback)
**Commands:**
```bash
# Reset DiskImages framework cache
sudo rm -rf /Library/Caches/com.apple.DiskImages*
sudo rm -rf ~/Library/Caches/com.apple.DiskImages*

# Reset NVRAM (requires reboot)
sudo nvram -c

# Reset SMC (varies by Mac model - see Apple docs)
```

**Risk:** Medium - May affect other disk image operations temporarily  
**Effort:** Low (30 min + reboot)

---

### Option 3: Patch bundle_dmg.sh Script (Fallback)
**Root Cause:** Script assumes temp DMG can be created in output directory

**Fix:** Force temp files to use system temp directory with proper cleanup

```bash
# In bundle_dmg.sh, line ~315
DMG_TEMP_DIR=$(mktemp -d -t create-dmg.XXXXXX)
trap "rm -rf '$DMG_TEMP_DIR'" EXIT
DMG_TEMP_NAME="$DMG_TEMP_DIR/rw.$$.${DMG_NAME}"
```

**Caveat:** This was attempted and reverted - may need deeper investigation

**Effort:** Medium (requires debugging why `/tmp` approach failed)

---

### Option 4: Increase Kernel Limits (Fallback)
**Check current limits:**
```bash
launchctl limit maxfiles
sysctl kern.maxfiles
sysctl kern.maxfilesperproc
```

**Increase if needed:**
```bash
sudo launchctl limit maxfiles 65536 200000
```

**Persistence:** Add to `/Library/LaunchDaemons/limit.maxfiles.plist`

**Effort:** Low (15 min)

---

### Option 5: Disable DMG Bundling (Temporary)
**Modify `tauri.conf.json`:**
```json
{
  "bundle": {
    "targets": ["app"]
  }
}
```

**Update build script:**
```json
// package.json
{
  "scripts": {
    "build": "npm run build:frontend && tauri build --bundles app && ./scripts/fix-dylib.sh"
  }
}
```

**Distribute `.app` in `.zip` instead of `.dmg`**

**Effort:** Minimal (5 min)  
**Downside:** Less polished distribution format

---

## Investigation Tasks

- [ ] Run `fs_usage -w -f filesys hdiutil` during build to trace all filesystem operations
- [ ] Check `dmesg` and `Console.app` for kernel-level DiskImages errors
- [ ] Test with a minimal `hdiutil create` command on a tiny test folder
- [ ] Verify `/Library/Caches/DiskImages/` for stale shadow files
- [ ] Check if APFS snapshot interference (Time Machine?) is causing locks
- [ ] Test on a different Mac to confirm it's machine-specific
- [ ] Profile with `dtrace` to see where the ENOSPC error originates

---

## References

- [create-dmg GitHub Issues](https://github.com/create-dmg/create-dmg/issues)
- [hdiutil man page](https://ss64.com/osx/hdiutil.html)
- [Tauri Custom Bundlers](https://tauri.app/v1/guides/building/macos/)
- [macOS DiskImages Framework](https://developer.apple.com/documentation/diskarbitration)

---

## Success Criteria

✅ DMG creation succeeds without errors  
✅ Build script completes end-to-end with single command  
✅ No manual intervention required for distribution builds  
✅ Solution is reproducible across different environments

---

## Notes

- The `.app` bundle builds successfully every time - the issue is **only** with DMG packaging
- Disk space is not the actual issue despite the error message
- This appears to be a macOS system-level issue with the `hdiutil` subsystem
- User has successfully built DMGs in the past on this machine (implied by the error being recent)
- **node-appdmg** is the preferred path for stability in local and CI environments.
