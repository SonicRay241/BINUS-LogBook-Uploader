# BINUS Logbook Uploader

A browser extension (Firefox + Chrome) that automatically fills your daily logbook entries on the BINUS
Activity Enrichment system from a CSV file.

## How It Works

1. Go to your Learning Plan page (`/LearningPlan/StudentIndex`)
2. Click the **📋 Upload CSV** button (appears bottom-right)
3. Select your `data.csv` file ([example link](https://docs.google.com/spreadsheets/d/1fTe0RsihOgQycQUhUCN9QCk-jai4QdcJB7ETbJTe9iU/edit?usp=sharing))
4. The extension calls the same API endpoints the website uses
5. Progress is shown in the floating panel
6. When done, **manually click the SUBMIT button** to send for approval

### What it does:
- ✅ Fills weekday entries from your CSV (Date, Clock In, Clock Out, Activity, Description)
- ✅ Marks Saturdays as **OFF** automatically
- ✅ Skips Sundays (already OFF on the site)
- ✅ Skips already-approved/submitted entries
- ✅ Shows real-time progress and a summary when done

## Installation (Firefox)
1. Open Firefox → `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Select `extension/manifest.json`
4. Active until you restart Firefox

### Permanent
1. Firefox → `about:addons` → gear icon → **"Install Add-on From File"**
2. Select the `.xpi` file

## Installation (Chrome)
1. Run `./package.sh` (produces `chrome/binus-logbook-uploader.zip`), then unzip it — Chrome rejects raw symlinked dirs for packing
2. Chrome → `chrome://extensions` → enable **Developer mode**
3. **Load unpacked** → select the unzipped folder (`chrome/` works too while links are intact)
4. For distribution, zip the unzipped folder contents and upload via the [Chrome Web Store](https://chrome.google.com/webstore/devconsole)

## CSV Format

Required columns (header names are flexible):

| Column      | Example                       |
|-------------|-------------------------------|
| Date        | `Tue, 1 Sep 2026`            |
| Clock In    | `8:26 AM`                    |
| Clock Out   | `5:31 PM`                    |
| Activity    | `Scraping & Dashboard`       |
| Description | `- Jalanin Scraper`          |

Here's an [example file](https://docs.google.com/spreadsheets/d/1fTe0RsihOgQycQUhUCN9QCk-jai4QdcJB7ETbJTe9iU/edit?usp=sharing).

## Notes

- **Project layout:** `shared/content.js` + `shared/icon.svg` are the single source of truth; `firefox/extension/` and `chrome/` hold only browser-specific manifests (and Chrome PNG icons) and symlink the shared files. `./package.sh` builds the `.xpi` and the Chrome `.zip`.
- Only activates on `activity-enrichment.apps.binus.ac.id/LearningPlan/StudentIndex`
- **You must be on the Log Book tab** (the button warns you otherwise)
- Do not navigate away while the upload is running
- Review entries after upload, then click **SUBMIT** manually