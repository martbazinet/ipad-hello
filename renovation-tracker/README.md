# Renovation Tracker

A local-only web app for tracking renovation work room by room: estimated and actual material and labor costs, contractor quotes, progress, and photos/PDFs. Amounts are in CAD, with GST/HST and provincial tax shown separately.

## iPad version

This copy is the iPad (offline, installable) version, published with GitHub Pages at
https://martbazinet.github.io/ipad-hello/renovation/

Install on the iPad: open that URL in Safari, then Share → Add to Home Screen. After that it works with no internet connection.

Publish a change:

```bash
cd ~/ipad-hello/renovation-tracker
npm run build      # type-checks, then writes the app to ~/ipad-hello/renovation/
cd ~/ipad-hello && git add -A && git commit -m "Update renovation tracker" && git push
```

Open the app once while online to pick up the new version. It downloads in the background and applies on the next launch.

Moving data between the Mac and the iPad: Settings & backup → Export backup on one device, AirDrop the file, then Import backup on the other. On iPad, Export opens the share sheet (Save to Files, AirDrop, Mail).

## Run it on the Mac

```bash
cd ~/ipad-hello/renovation-tracker
npm install        # first time only
npm run dev
```

Open http://localhost:5173. The server only listens on this Mac.

To build a production copy: `npm run build`, then `npm run preview`.

## How it works

- **Rooms** contain **tasks**. Each task has an estimate, an actual (spent) amount, a status and a completion percentage. Material and labor are tracked separately.
- **Quotes** belong to a task and have a type:
  - **Contractor**: material and labor amounts.
  - **Supplier** (hardware or materials store): one materials amount.
  - **Rental** (equipment such as a dumpster or floor sander): one rental amount, counted with materials.

  Each quote also has a company, contact, date, notes and attachments. You can accept one quote of each type per task. Accepting a quote moves any previously accepted quote of the same type back to pending. If an accepted contractor quote includes materials and an accepted supplier quote also covers materials, the task shows a warning that materials may be counted twice.
- **Costs** are shown side by side: estimated, accepted quotes, actual, and a forecast. For each task, the forecast is worked out separately for material and labor: the accepted quotes for that part if there are any, otherwise the estimate. Once the task is done, it uses the actual cost. If you have already spent more than the forecast, it uses the actual amount.
- **Schedule**: each task has planned and actual start and end dates. Actual dates fill in when you start or finish a task, and you can edit them. Tasks are flagged **Overdue** when the planned end has passed and they aren't done, and **Late start** when the planned start has passed and they haven't started. Quotes can have a "valid until" date and show as expired once it passes.
- **Calendar**: a month view of tasks (colored by room), appointments and quote expiry dates, with a room filter and a list of the next 30 days. Click a day to add an appointment (contractor visit, delivery, inspection, deadline or other).
- **Timeline**: one bar per task, grouped by room. The outlined bar is the planned period and fills with the task's completion. The thin bar under it shows when the work actually happened. A red line marks today.
- **Dashboard schedule**: the planned finish date, items that need attention, and the next 14 days.
- **Tax**: enter every amount before tax. Choose your province under *Settings & backup*. Rates are preset and can be edited.
- **Progress** for a room or the house is the average completion of its tasks.

## Where the data is stored

- Rooms, tasks, quotes and settings are stored in the browser's localStorage.
- Photos and PDFs are stored in the browser's IndexedDB, because localStorage only holds about 5 MB.

Both are tied to this browser and to the `http://localhost:5173` address. If you clear the browser's site data, use another browser, or run the app on a different port, you won't see your data. Use **Settings & backup → Export backup** regularly. The JSON backup includes all photos and PDFs, and **Import backup** restores it.
