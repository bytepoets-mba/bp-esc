# Product Requirements Document: OpenRouter Balance Checker

**Document ID:** PRD-001  
**Version:** 1.0  
**Status:** Draft  
**Date:** 2026-01-21  
**Author:** BYTEPOETS GmbH Internal Team

## 1. Overview

A minimal macOS desktop application for BYTEPOETS GmbH employees to check their OpenRouter API balance without requiring login credentials.

## 2. Target Audience

- BYTEPOETS GmbH employees only
- Internal use only - not for external distribution

## 3. Core Requirements

### 3.1 User Interface
- **No User Account Required**: Application launches directly without creating/managing user accounts
- **API Key Input**: Simple text field to enter OpenRouter API key
- **Balance Display**: Shows current OpenRouter balance
  - **MVP**: Static mock value (€ 123.00) for template demonstration
  - **Future**: Real API integration (see section 6)
- **Quit Option**: Clear quit button to close the application

### 3.2 Data Persistence
- **Local Storage**: API key stored in `~/.config/bpesc-balance/.env`
- **Auto-load**: Application should load saved API key on subsequent launches
- **Security**: 
  - Config directory created with proper permissions (755)
  - `.env` file with restricted permissions (600, owner read/write only)
  - Never committed to version control

### 3.3 Technical Requirements
- **Platform**: macOS (11.0+ Big Sur and later)
- **Framework**: Tauri (Rust + Web frontend)
- **Dependencies**: Minimal external dependencies
- **Build**: Single `.app` bundle for macOS
- **Template**: Designed as starter template for similar internal tools

## 4. Functional Specifications

### 4.1 API Key Management
```
Flow:
1. User launches app
2. Check for ~/.config/bpesc-balance/.env
3. If exists with OPENROUTER_API_KEY:
   - Load key
   - Display mock balance (MVP)
4. Else:
   - Show API key input field
   - User enters key
   - Create ~/.config/bpesc-balance/ (if needed)
   - Save to .env with 600 permissions
   - Display mock balance (MVP)
```

**Note**: No validation in MVP - any string accepted as "API key" for template purposes.

### 4.2 Balance Display
- **MVP**: Static mock value € 123.00 (hardcoded)
- **Format**: Currency formatted (€ XXX.XX)
- **Refresh**: Not implemented in MVP (future: real API calls)

### 4.3 Quit Functionality
- **Button**: "Quit" or "Exit" button
- **Confirmation**: Optional confirmation dialog
- **Cleanup**: No cleanup required (stateless)

## 5. Non-Functional Requirements

### 5.1 Security
- API key stored in `~/.config/bpesc-balance/.env` (outside app bundle)
- File permissions: 600 (owner read/write only)
- No network calls in MVP (mock data only)
- Future real API: HTTPS only, no credentials logging

### 5.2 Performance
- Launch time: < 2 seconds
- Memory usage: Minimal (< 50MB)

### 5.3 Usability
- Single-window interface
- Clear visual hierarchy
- Intuitive controls

## 6. Future Enhancements (Out of Scope for Template)

### Phase 2: Real API Integration
- [ ] OpenRouter API endpoint integration (`/api/v1/auth/key`)
- [ ] Balance refresh functionality
- [ ] API key validation (format + test call)
- [ ] Error handling (network failures, invalid keys, rate limits)
- [ ] Loading states and retry logic

### Phase 3: Advanced Features
- [ ] Multiple API key support
- [ ] Usage statistics and history
- [ ] Auto-update mechanism
- [ ] Settings/preferences panel

### Out of Scope
- Cross-platform support (Windows/Linux) - macOS only by design

## 7. Acceptance Criteria

- [ ] Application launches without user account/authentication
- [ ] API key can be entered and saved to `~/.config/bpesc-balance/.env`
- [ ] Config directory created with permissions 755, `.env` with 600
- [ ] Saved API key loads on subsequent launches
- [ ] Balance display shows mock value € 123.00
- [ ] Quit button closes the application cleanly
- [ ] Runs on macOS 11.0+ (Big Sur and later)
- [ ] Source `.env` excluded from version control

## 8. Dependencies

- None specified for MVP

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API key exposure | High | ~/.config storage with 600 perms, outside app bundle |
| macOS compatibility | Medium | Target 11.0+, test on Big Sur/Monterey/Ventura/Sonoma |
| User confusion (mock vs real) | Low | Clear "Demo Mode" or "Mock Data" label in UI |
| Tauri build complexity | Medium | Follow official Tauri docs, keep deps minimal |

## 10. Timeline

**Template MVP** (mock data, Tauri setup):
- **Tauri setup + UI**: 1 day
- **File I/O (~/.config)**: 0.5 days
- **Testing (macOS 11+)**: 0.5 days
- **Total**: 2 days

**Phase 2** (real API, future):
- **API integration**: 1-2 days
- **Error handling**: 0.5 days

---

**Approval:**  
Product Owner: ___________________  
Date: ___________________