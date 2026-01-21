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
- **No Login Required**: Application launches directly without authentication
- **API Key Input**: Simple text field to enter OpenRouter API key
- **Balance Display**: Shows current OpenRouter balance (€ 123.00 static dummy value for demo)
- **Quit Option**: Clear quit button to close the application

### 3.2 Data Persistence
- **Local Storage**: API key stored in local `.env` file
- **Auto-load**: Application should load saved API key on subsequent launches
- **Security**: `.env` file must be excluded from version control

### 3.3 Technical Requirements
- **Platform**: macOS only
- **Language**: Swift/Objective-C or cross-platform framework (Electron/Tauri)
- **Dependencies**: Minimal external dependencies
- **Build**: Single executable or simple installer

## 4. Functional Specifications

### 4.1 API Key Management
```
Flow:
1. User launches app
2. If .env file exists with OPENROUTER_API_KEY:
   - Load and display balance
3. Else:
   - Show API key input field
   - User enters key
   - Save to .env file
   - Display balance
```

### 4.2 Balance Display
- **Static Value**: € 123.00 (demo mode)
- **Format**: Currency formatted (€ XXX.XX)
- **Refresh**: Manual refresh option (future enhancement)

### 4.3 Quit Functionality
- **Button**: "Quit" or "Exit" button
- **Confirmation**: Optional confirmation dialog
- **Cleanup**: No cleanup required (stateless)

## 5. Non-Functional Requirements

### 5.1 Security
- API key stored locally only
- No network calls for authentication
- `.env` file permissions: 600 (read/write owner only)

### 5.2 Performance
- Launch time: < 2 seconds
- Memory usage: Minimal (< 50MB)

### 5.3 Usability
- Single-window interface
- Clear visual hierarchy
- Intuitive controls

## 6. Future Enhancements (Out of Scope)

- [ ] Real API integration with OpenRouter
- [ ] Balance refresh functionality
- [ ] Multiple API key support
- [ ] Usage statistics
- [ ] Cross-platform support (Windows/Linux)
- [ ] Auto-update mechanism
- [ ] Settings/preferences panel

## 7. Acceptance Criteria

- [ ] Application launches without login
- [ ] API key can be entered and saved to `.env`
- [ ] Saved API key loads on subsequent launches
- [ ] Balance display shows € 123.00
- [ ] Quit button closes the application
- [ ] `.env` file is created in application directory
- [ ] `.env` file is excluded from version control

## 8. Dependencies

- None specified for MVP

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API key exposure | High | Local storage only, proper file permissions |
| macOS compatibility | Medium | Test on latest macOS versions |
| User confusion (demo vs real) | Low | Clear labeling of demo mode |

## 10. Timeline

- **MVP Development**: 1-2 days
- **Testing**: 0.5 days
- **Total**: 1.5-2.5 days

---

**Approval:**  
Product Owner: ___________________  
Date: ___________________