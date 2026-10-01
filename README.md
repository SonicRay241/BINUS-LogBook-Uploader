# BINUS Logbook Uploader

A Firefox extension that automatically fills your daily logbook entries on the BINUS
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

### Temporary
1. Open Firefox → `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Select `extension/manifest.json`
4. Active until you restart Firefox

### Permanent
2. Firefox → `about:addons` → gear icon → **"Install Add-on From File"**
3. Select the `.xpi` file

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

- Only activates on `activity-enrichment.apps.binus.ac.id/LearningPlan/StudentIndex`
- **You must be on the Log Book tab** (the button warns you otherwise)
- Do not navigate away while the upload is running
- Review entries after upload, then click **SUBMIT** manually