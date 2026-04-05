// constants/strings.ts
// Single source of truth for all user-facing static strings.
// Structured for future localization — swap this object for a locale-keyed
// variant (en, fil, etc.) and import the active locale where needed.

export const S = {
  // ── App ──────────────────────────────────────────────────────
  app: {
    name: "Lumenai",
    tagline: "DPN Thermal Screening",
    version: "v0.6.0",
    build: "600",
    versionFooter: "Lumenai · v0.6.0 · Build 600",
  },

  // ── Auth ─────────────────────────────────────────────────────
  auth: {
    signIn: "Sign In",
    signOut: "Sign Out",
    signOutConfirm: "Are you sure you want to sign out?",
    register: "Create Account",
    forgotPassword: "Forgot Password",
    updatePassword: "Update Password",
    changePassword: "Change Password",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    fullName: "Full Name",
    cancel: "Cancel",
    checkInbox: "Check your inbox for a confirmation email.",
    accountActivated: "Account Activated",
    emailConfirmed: "Your email has been confirmed. You can now sign in.",
    loginButton: "Login",
    loginFooter: "Lumenai · DPN Thermal Screening",
  },

  // ── Common actions ────────────────────────────────────────────
  actions: {
    save: "Save",
    saveToCloud: "Save to Cloud",
    discard: "Discard Result",
    delete: "Delete",
    deactivate: "Deactivate",
    confirm: "Confirm",
    cancel: "Cancel",
    close: "Close",
    retry: "Retry",
    refresh: "Refresh",
    upload: "Upload",
    sync: "Sync",
    accept: "Accept",
    reject: "Reject",
    proceed: "Proceed",
    newSession: "New Session",
    clear: "Clear",
    search: "Search",
    done: "Done",
    dismiss: "Dismiss",
  },

  // ── Navigation labels ─────────────────────────────────────────
  nav: {
    home: "Home",
    scan: "Scan",
    history: "History",
    settings: "Settings",
    device: "Device",
    patients: "Patients",
    users: "Users",
    clinics: "Clinics",
    overview: "Overview",
    notifications: "Notifications",
  },

  // ── Assessment ────────────────────────────────────────────────
  assessment: {
    title: "AI Assessment",
    processingTitle: "Analyzing Thermal Data",
    processingSubtitle:
      "Uploading and processing through the AI classification model...",
    stepUploading: "Uploading",
    stepProcessing: "Processing",
    stepClassifying: "Classifying",
    capturedFrames: "Captured Frames",
    leftFoot: "LEFT FOOT",
    rightFoot: "RIGHT FOOT",
    bilateralAnalysis: "Bilateral Asymmetry Analysis",
    bilateralSubtitle: "Values exceeding 2.2°C threshold are flagged",
    savedSuccess: "Session saved successfully",
    saveErrorNoSession: "No active session found. Please restart the screening.",
    saveErrorClassification: "Failed to save classification result.",
    saveErrorSession: "Failed to update session status.",
    saveErrorGeneric: "Something went wrong.",
  },

  // ── Live Feed ─────────────────────────────────────────────────
  liveFeed: {
    title: "Thermal Scan",
    cameraDisconnected: "Camera Disconnected",
    cameraDisconnectedSubtitle:
      "Connect your PureThermal device via USB and tap Connect",
    connect: "Connect Camera",
    disconnect: "Disconnect",
    captureLeft: "Capture Left Foot",
    captureRight: "Capture Right Foot",
    capturedLeft: "Left Captured",
    capturedRight: "Right Captured",
    proceedToAssessment: "Proceed to Assessment",
    lastResultTitle: "Last Session Result",
    resultPositive: "POSITIVE",
    resultNegative: "NEGATIVE",
    resultConfidence: "Confidence",
    resultFlagged: "Flagged Angiosomes",
    fps: "fps",
  },

  // ── History ───────────────────────────────────────────────────
  history: {
    title: "Session History",
    cloud: "Cloud",
    local: "Local",
    noSessions: "No sessions yet",
    noSessionsSubtitle: "Completed screening sessions will appear here.",
    noLocalCaptures: "No local captures",
    noLocalCapturesSubtitle: "Captures taken offline will appear here.",
    syncButton: "Sync to Cloud",
    unsynced: "Unsynced",
    positive: "Positive",
    negative: "Negative",
    sessions: "sessions",
  },

  // ── Sync ─────────────────────────────────────────────────────
  sync: {
    clinicTitle: "Upload Capture",
    patientTitle: "Pending Requests",
    captureLinkedNote:
      "The capture will be linked to the selected patient and remain on this device until deleted.",
    searchPatientPlaceholder: "Search by patient code",
    noPatientSelected: "No patient selected",
    syncSuccess: "Capture uploaded successfully.",
    syncError: "Upload failed. Please try again.",
    noRequests: "All caught up",
    noRequestsSubtitle: "No pending data requests from clinics.",
    acceptConfirmTitle: "Accept Request",
    acceptConfirmBody:
      "This will share your session data with the requesting clinic.",
    rejectConfirmTitle: "Reject Request",
    rejectConfirmBody:
      "Are you sure you want to reject this data request? This cannot be undone.",
    requestFrom: "Request from",
    sessionDate: "Session date",
  },

  // ── Patient Select ────────────────────────────────────────────
  patientSelect: {
    title: "Select Patient",
    searchPlaceholder: "Search by name or patient code",
    noResults: "No patients found",
    noResultsSubtitle: "Try a different search term.",
    proceedButton: "Proceed to Clinical Data",
  },

  // ── Clinical Data ─────────────────────────────────────────────
  clinicalData: {
    title: "Clinical Data",
    bloodGlucose: "Blood Glucose (mg/dL)",
    systolicBP: "Systolic BP (mmHg)",
    diastolicBP: "Diastolic BP (mmHg)",
    proceedButton: "Proceed to Live Scan",
    skipButton: "Skip for now",
  },

  // ── Settings ─────────────────────────────────────────────────
  settings: {
    title: "Settings",
    sectionAccount: "Account",
    sectionDevice: "Device",
    sectionDataSync: "Data & Sync",
    sectionApplication: "Application",
    sectionAbout: "About",
    sectionDanger: "Danger Zone",
    profile: "Profile",
    profileSubtitle: "Manage your account info",
    notifications: "Notifications",
    pairedDevice: "Paired Device",
    noPairedDevice: "No device paired",
    registerUsbDevice: "Register USB Device",
    autoReconnect: "Auto-Reconnect",
    autoUpload: "Auto-Upload",
    autoUploadSubtitle: "Upload sessions when connected",
    pendingUploads: "Pending Uploads",
    clearCache: "Clear Local Cache",
    clearCacheConfirmTitle: "Clear Local Cache",
    clearCacheConfirmBody:
      "This will remove all locally stored session data that hasn't been uploaded yet.",
    hapticFeedback: "Haptic Feedback",
    theme: "Theme",
    themeValue: "Arctic Mint · Auto",
    language: "Language",
    languageValue: "English",
    appVersion: "App Version",
    aiModel: "AI Model",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    contactSupport: "Contact Support",
    signOut: "Sign Out",
    signOutConfirmTitle: "Sign Out",
    deactivateAccount: "Deactivate Account",
    deactivateAccountSubtitle: "Deactivates your account — contact admin to restore",
    deactivateConfirmTitle: "Deactivate Account",
    deactivateConfirmBody:
      "Your account will be deactivated and you'll be signed out. You won't be able to log in until an admin reactivates it. Permanent deletion requires contacting an admin.",
    connected: "Connected",
    comingSoon: "Coming Soon",
    comingSoonBody: (feature: string) => `${feature} is not yet available.`,
  },

  // ── Device Pairing ────────────────────────────────────────────
  pairing: {
    title: "Device Pairing",
    connectionStatus: "Connection Status",
    ble: "BLE",
    wifi: "Wi-Fi",
    usbDevices: "USB Devices",
    registeredDevices: "Registered Devices",
    noDevicesRegistered: "No USB devices registered for this clinic.",
    registerNewDevice: "Register New Device",
    deviceCodePlaceholder: "Device code (e.g. DEV-001)",
    deviceCodeLabel: "Device Code",
    registerButton: "Register Device",
    registerSuccess: "Device registered successfully.",
    registerError: "Failed to register device. Please try again.",
    bleSection: "BLE Scanner (ESP32)",
    bleSectionSubtitle: "For Waveshare ESP32 thermal camera",
    scanForDevices: "Scan for BLE Devices",
    scanning: "Scanning...",
    availableDevices: "Available Devices",
    noDevicesFound: "No devices found",
    noDevicesFoundSubtitle:
      "Make sure your DPN Scanner is powered on and in range, then tap Scan.",
    pairSelected: "Pair Selected Device",
    pairing: "Pairing...",
    pairedBanner: "Device paired and data stream active",
  },

  // ── Mode Select ───────────────────────────────────────────────
  modeSelect: {
    title: "Start Screening",
    goOnline: "Go Online",
    goOnlineSubtitle: "Stream and save directly to cloud",
    onlineDesc: "Sign in to your account. Access patient records, sync results, and view full history.",
    workOffline: "Work Offline",
    workOfflineSubtitle: "Save locally and sync later",
    offlineDesc: "Capture thermal scans without an account. Data is saved locally on this device and can be synced later.",
    startCapture: "Start Capture",
    hint: "Offline data stays on this device until you sign in and sync it.",
  },

  // ── Offline ───────────────────────────────────────────────────
  offline: {
    liveFeedTitle: "Offline Scan",
    saveTitle: "Save Capture",
    patientLabelPlaceholder: "Patient label / ID",
    saveButton: "Save Locally",
  },

  // ── Errors & Feedback ─────────────────────────────────────────
  errors: {
    genericError: "Something went wrong. Please try again.",
    networkError: "Network error. Check your connection.",
    noActiveDevice: "No active device found for your clinic. Register a device first.",
    loadFailed: "Failed to load data.",
    saveFailed: "Failed to save. Please try again.",
  },

  // ── Disclaimer ────────────────────────────────────────────────
  disclaimer:
    "This system is a screening tool only and does not replace clinical diagnosis. " +
    "All results require clinical correlation by a qualified healthcare professional.",

  // ── Admin ─────────────────────────────────────────────────────
  admin: {
    overview: "Overview",
    users: "Users",
    clinics: "Clinics",
    activate: "Activate",
    deactivate: "Deactivate",
    activateConfirm: "Activate this account?",
    deactivateConfirm: "Deactivate this account?",
    updateFailed: "Update Failed",
    updateFailedBody: "Could not update account status. Please try again.",
  },
};
