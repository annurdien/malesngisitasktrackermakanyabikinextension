# Males Ngisi Task Tracker Makanya Bikin Extension Buat Jira

A lightweight, serverless Chrome extension that automatically injects an "Add to Task Tracker" button directly into your Jira issues. Clicking the button sends the task details, status, and due date directly to a Google Sheet.

## Features
- **Seamless Jira Integration**: Works on both the Standard Issue View and the List (Navigator) Layout.
- **Smart Deduplication**: Automatically finds existing tasks and updates them in-place instead of creating duplicates.
- **Serverless**: Connects directly to Google Sheets API using a Service Account JSON.
- **Zero Dependencies**: Built with 100% Vanilla JS for speed and simplicity.

---

## Setup Tutorial

To get the extension working, you need to connect it to a Google Cloud Service Account so it has permission to edit your Google Sheet.

### Step 1: Create a Google Cloud Project & Enable the API
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a **New Project** (e.g., "Jira Task Tracker").
3. In the search bar at the top, search for **Google Sheets API**.
4. Click on it and hit **Enable**.

### Step 2: Create a Service Account (Your .json file)
1. In the Google Cloud Console, navigate to **IAM & Admin > Service Accounts** (from the left sidebar).
2. Click **+ Create Service Account** at the top.
3. Give it a name (e.g., `sheet-automation`) and click **Create and Continue**.
4. You don't need to assign any special roles, just click **Done**.
5. You'll now see your new service account in the list. Click the **three dots** (Actions) next to it, and select **Manage keys**.
6. Click **Add Key > Create new key**.
7. Choose **JSON** and click Create.
8. The `credentials.json` file will securely download to your computer. Keep this file safe!

### Step 3: Grant the Service Account Access to Your Sheet
The service account acts like a robot user. You need to invite it to your sheet just like a normal person.
1. Open the downloaded `credentials.json` file in a text editor.
2. Find the `"client_email"` line (it looks like `something@your-project.iam.gserviceaccount.com`). Copy this email address.
3. Open the Google Sheet you want to use as your Task Tracker.
4. Click the big **Share** button in the top right corner.
5. Paste the service account email and give it **Editor** permissions.
6. Click **Send**.

### Step 4: Install the Extension
1. Open Google Chrome and go to `chrome://extensions/`.
2. Toggle **Developer mode** ON (top right corner).
3. Click **Load unpacked** (top left).
4. Select the `malesngisitasktrackermakanyabikinextension` folder containing this codebase.
5. The extension will now appear in your browser!

### Step 5: Configure the Extension
1. Click the **Puzzle Piece** icon in Chrome and pin the **Jira Task Tracker** extension.
2. Click the extension icon and select **Options**.
3. **Credentials**: Open your `credentials.json` file, copy all the text, and paste it into the Credentials box.
4. **Spreadsheet URL**: Paste the full URL of your Google Sheet. The options page will automatically extract the Spreadsheet ID and Sheet ID for you.
5. Click **Save Settings**.

---

## Usage

1. Navigate to any issue in your Jira workspace.
2. You will see a new **Add to Task Tracker** button right next to the native Jira status buttons.
3. Click it! A modal will pop up asking for the Due Date.
4. Click **Confirm** and watch the confetti pop as the task is instantly synced to your Google Sheet!
