# Carmel Daily Check-In

A simple, calm daily self-monitoring tool for tracking school day experiences. Designed for quick completion (< 90 seconds) with accessibility in mind.

## Features

- **5 Quick Questions**: Overall day, focus, social interactions, emotional regulation, and an optional note
- **One Question Per Screen**: Reduces overwhelm and keeps focus
- **Auto-saves**: Progress saved locally in case of interruption
- **Google Sheets Sync**: Data automatically syncs to a Google Sheet for analysis
- **Works Offline**: All data saved locally as backup
- **Mobile-Friendly**: Designed for phones and tablets
- **PWA-Ready**: Can be added to home screen like an app

## Quick Start

### Option 1: Use GitHub Pages (Recommended)

1. Fork this repository
2. Go to Settings > Pages
3. Enable GitHub Pages from the `main` branch
4. Access at: `https://YOUR-USERNAME.github.io/carmel-checkin`

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR-USERNAME/carmel-checkin.git
cd carmel-checkin

# Serve locally (use any static server)
npx serve .
# or
python -m http.server 8000
```

## Google Sheets Setup

To sync check-in data to Google Sheets:

### Step 1: Create the Apps Script

1. Go to [Google Apps Script](https://script.google.com)
2. Click "New Project"
3. Delete any existing code
4. Copy the contents of `google-apps-script.js` and paste it in
5. Save the project (Ctrl+S) with a name like "Carmel Check-In Backend"

### Step 2: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon next to "Select type" and choose **Web app**
3. Configure:
   - **Description**: "Carmel Check-In v1"
   - **Execute as**: "Me"
   - **Who has access**: "Anyone"
4. Click **Deploy**
5. Click **Authorize access** and follow the prompts
6. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/ABC123.../exec`)

### Step 3: Connect the App

1. Open the Check-In app
2. Click the ⚙️ gear icon (bottom right)
3. Paste the Web app URL into the "Apps Script URL" field
4. Click **Save**
5. Click **Test Connection** to verify

### Step 4: Find Your Data

- A Google Sheet named "Carmel Daily Check-In Data" will be created in your Google Drive
- It contains two tabs:
  - **Check-In Data**: Raw data from each check-in
  - **Weekly Summary**: Auto-calculated averages

## File Structure

```
carmel-checkin/
├── index.html              # Main app HTML
├── css/
│   └── styles.css          # All styles
├── js/
│   ├── app.js              # App logic and state
│   └── storage.js          # Data storage (local + Sheets)
├── google-apps-script.js   # Backend code for Google Sheets
├── manifest.json           # PWA manifest
└── README.md               # This file
```

## Data Collected

Each check-in records:

| Field | Type | Description |
|-------|------|-------------|
| Date | Date | YYYY-MM-DD |
| Timestamp | ISO DateTime | Full timestamp |
| Overall Day | 1-5 | Overall rating with emoji |
| Academic Focus | 1-5 | Ability to focus on work |
| Social Interactions | Choice | Positive peer moments |
| Dysregulation Count | 0-5+ | Times felt might lose control |
| Coping Strategy | Choice | If used a calming strategy |
| Notes | Text | Optional free-form note |

## Export Options

From the Settings screen (⚙️), you can:

- **Export as CSV**: Download all local data as a spreadsheet
- **Export as JSON**: Download raw data for custom analysis
- **Sync to Google Sheets**: Push any unsynced entries

## Customization

### Changing Colors

Edit the CSS variables in `css/styles.css`:

```css
:root {
    --accent-primary: #5b8a72;    /* Main accent color */
    --bg-primary: #f7f6f3;        /* Background */
    /* ... */
}
```

### Adding Questions

1. Add a new screen section in `index.html`
2. Add the field to `app.state.responses` in `app.js`
3. Add screen flow in `app.flow` in `app.js`
4. Update the summary display in `app.showDoneSummary()`
5. Update Google Apps Script headers if syncing

## Troubleshooting

### Data not syncing to Google Sheets

1. Check that the Apps Script URL is correct (ends with `/exec`)
2. Try clicking "Test Connection" in Settings
3. Make sure the script is deployed as a Web app with "Anyone" access
4. Check the Apps Script execution log for errors

### App not loading

1. Clear browser cache and reload
2. Check browser console for errors (F12 → Console)
3. Ensure you're accessing via HTTPS (required for some features)

### Lost progress

- Check localStorage: In browser console, run `localStorage.getItem('carmel_checkin_entries')`
- Export from Settings before clearing browser data

## Privacy

- All data stays local by default
- Google Sheets sync is optional and goes to YOUR Google account
- No external analytics or tracking
- No data sent to any third parties

## License

MIT License - Feel free to modify and use as needed.

---

Built with care for daily self-monitoring and reflection.
