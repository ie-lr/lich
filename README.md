# LITRICH Family Management System

**LITRICH Systems** is an enterprise-grade, clean, offline-first Progressive Web Application (PWA) with Google Sheets and Google Apps Script cloud synchronization, SMART goal setting worksheets, financial budget tracking, reminder announcements, and one-click app installation for Android and iPhone devices.

The system interface is modeled directly after the **Firestone Systems** enterprise menu screen: a clean brushed-metallic header, crisp graphite-charcoal sidebar buttons, sharp rectangular layout, clean white system canvases, and zero emojis or decorative icons.

---

## System Overview & Architecture

### 1. Firestone-Inspired Interface & Clean System Design
- **Header Bar**: Displays the system designation ("LITRICH Systems"), real-time Google Sheet sync indicator, and a clean **INSTALL APP** button.
- **Left Navigation**: Beveled rectangular buttons modeled directly on the Firestone Liberia menu screen.
- **Clean White Workspace**: Crisp white cards, high-contrast text, clean borders, and a subtle transparent watermark.
- **No Emojis, No Icons**: All controls, tables, badges, and alerts use clean, professional typography and text labels.
- **Family Announcements Noticeboard**: Triggers on goal reminder dates and displays an alert in the dashboard noticeboard for **a week or more** until acknowledged or replaced by the next trigger.

### 2. SMART Goal Setting Worksheet
- **Goal Statement**: Concrete objective title.
- **Why is this goal important?**: Purpose and impact.
- **What is needed to accomplish this goal?**: Prerequisites and actions.
- **SMART Checklist**: Text checkboxes for *Specific, Measurable, Attainable, Relevant, Time-Bound*.
- **Financial Controls**:
  - Target Budget ($)
  - Initial Raised Amount ($)
  - Remaining Balance ($)
  - Planned Income Source
  - Achievable Target Date (Deadline)
  - Reminder Date and Notification Message
  - Status: `Pending`, `In Progress`, `Achieved`
- **Dynamic Calculation**:
  - Real-time balance: `Balance = Target Budget - Raised Amount`.
  - Automatically transitions status to `Achieved` when target budget is met.

### 3. Record Income with Goal Linking
- Record amount, source, date, and destination account (Joint Savings, Emergency Reserve, Checking, etc.).
- **Tie to Existing Goal**: Selecting an active goal instantly updates that goal's status:
  $$\text{Raised: \$XYZ} \quad \vert \quad \text{Balance: \$XYZ}$$

### 4. Record Expenses with "None" Option
- Record amount, purpose/category, and date.
- **Used From Dropdown**: Includes an explicit **"None (General Out of Pocket)"** option, in addition to savings accounts and recent income sources.
- Optional association to an active goal expenditure.

### 5. Tabular Data Views
- **Achieved Goals Table**: Completed milestones.
- **Pending Goals Table**: Queued future goals.
- **In Progress Goals Table**: Active goals with raised vs balance breakdown and progress bars.
- **All Goals Master Directory**: Consolidated view of all goals.
- **All Income Records**: Filterable ledger of family earnings and deposits.
- **All Expense Records**: Filterable ledger of expenditures.

### 6. PWA One-Click Installation (Android & iPhone)
- **Android / Chrome / Edge**: One-click install prompt adds the app directly to your phone screen.
- **iPhone / iPad (Safari)**: Built-in step-by-step modal guide showing how to tap **Share** > **Add to Home Screen**.

---

## How to Connect Database (Google Sheets) & Backend (Apps Script)

### Step 1: Create the Google Sheet Database
1. Open [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name it **"LITRICH Family System Database"**.

### Step 2: Add Backend Code
1. In the Google Sheet, click **Extensions** > **Apps Script**.
2. Delete any default code inside `Code.gs`.
3. Open `Code.gs` from this project folder, copy all code, and paste it into the editor.
4. Click **Save** (`Ctrl + S`).

### Step 3: Initialize Tables
1. From the function dropdown at the top of the Apps Script editor, select **`initializeAllSheets`** and click **Run**.
2. Accept the one-time Google permissions prompt.
3. Your Google Sheet will generate 4 formatted tables: `Goals`, `Income`, `Expenses`, and `Settings`.

### Step 4: Deploy as Web App
1. In Apps Script, click **Deploy** > **New deployment**.
2. Select type: **Web app**.
3. Set **Execute as**: `Me` and **Who has access**: `Anyone`.
4. Click **Deploy** and copy the **Web App URL**.

### Step 5: Connect in the Web App
1. Open the LITRICH Web App (`index.html`).
2. Go to **SYSTEM SETTINGS & SYNC** in the sidebar.
3. Paste the URL into **Google Apps Script Web App URL** and click **Connect & Sync Now**.

---

## Directory Structure

```text
LITRICH/
│
├── index.html              # Clean single-page application with Firestone UI
├── styles.css              # Enterprise styles, clean white system, metallic header
├── app.js                  # Business logic, goal tracking, reminders & Google Sheets API
├── manifest.json           # PWA configuration for mobile & desktop installation
├── sw.js                   # Service Worker for offline performance and caching
├── Code.gs                 # Google Apps Script backend for Google Sheets
├── favicon.ico             # Browser tab icon
├── README.md               # System documentation and deployment guide
│
└── assets/
    ├── logo.jpg            # Original couple logo emblem
    ├── couple-bg.jpg       # Clean watermark background image
    ├── icon-192.png        # 192x192 PWA App Icon
    ├── icon-512.png        # 512x512 PWA App Icon
    ├── apple-touch-icon.png# iOS Home Screen App Icon
    └── favicon.png         # Browser favicon
```
