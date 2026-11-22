/**
 * LITRICH Family Management System - Backend Configuration
 * 
 * Configure your backend connection here in code (not in the User Interface).
 * If you deploy the Web App on GitHub Pages or run locally, set your Google Apps Script
 * Web App URL below.
 * 
 * If hosted directly inside Google Apps Script, the system automatically uses
 * native google.script.run with zero configuration required.
 */

const BACKEND_CONFIG = {
  // Enter your deployed Google Apps Script Web App URL here in backend code:
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbz5zx1d1kz6eeQ-ZTtgTZp7Kj4SU7WEvCFbRkYMe3YONRQAdJV0zt0bo-bt_akuFHkB/exec",

  // Enable automatic background sync on every change
  AUTO_SYNC: true,

  // App Metadata
  SYSTEM_NAME: "LITRICH Systems",
  CURRENCY: "$"
};
