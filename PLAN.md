# Astha Residency – Maintenance App Plan

## Goal
A simple, mobile-friendly web app to track building maintenance (income) and bills (expenses), wing by wing.

## Tech (kept simple)
| Part | Choice |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Login | Firebase Auth – **username + password**, accounts created by the Main Admin |
| Database | Cloud Firestore |
| Hosting | Firebase Hosting |

## Roles
| Role | Can do |
|---|---|
| **Main Admin** (`super_admin`) | Everything: wings, units, maintenance, income/expenses (wing + common), users & roles |
| **Wing Admin** (`wing_admin`) | Manage units, maintenance and income/expenses of **their own wing only**. View everything else |
| **Everyone (no login)** | View dashboard, maintenance status, expenses and reports. Login is only for admins (Menu → Admin login) |
| **Disabled** | Account exists but has no access |

The first Main Admin is created once in Firebase Console with the email set in `.env` (`VITE_SUPER_ADMIN_EMAIL`) and `firestore.rules`.
The Main Admin then creates every other user (username, password, role, wing) from the **Users** screen. Users can change their own password.

## Data (Firestore collections)
- `wings` – name (e.g. "A Wing")
- `units` – wingId, number, type (`flat` / `shop`), ownerName, usual monthly maintenance (₹)
- `unitContacts` – phone numbers, kept separate so only logged-in admins can read them
- `dues` – one record per unit per month: period (`2026-10`), amount, status (`paid`/`unpaid`), paidOn, mode
- `transactions` – type (`income` / `expense`), wingId (empty = common building), category, amount, date, mode, description
- `users` – name, email, role, wingId

## Look & language
Light, Dark or Auto theme and Gujarati / English, switchable from the menu (remembered on each device).

## Language
Gujarati (default) and English. Switch with the **ગુ / EN** button (login page, top bar, sidebar); the choice is remembered on each device.
All text lives in `src/i18n.jsx` – edit wording there or add another language.

## Screens
1. **Dashboard** – this month's collected vs pending, expenses, balance, 6‑month chart, wing filter
2. **Maintenance** – pick month → "Generate bills" → tap to mark Paid/Unpaid, see who is pending
3. **Income & Expenses** – add bills (electricity, security, lift, repairs…) and other income
4. **Wings & Units** – add wings, flats and shops with monthly maintenance amount
5. **Reports** – yearly month‑by‑month summary + pending dues list, export CSV
6. **Users** (Main Admin) – create users with username + password and assign roles

## Monthly workflow
1. **Maintenance → Monthly bills**: set this month's amount (it can differ every month; paid bills never change) and save to create the bills
2. Tap **+** → **Record payment** (or **Collect payment**): pick a flat that still owes, choose Cash / UPI / Bank / Cheque, done. The sheet returns to the list for the next flat
3. Tap **+** → **Add expense** for bills (electricity, security, lift…)
4. Everyone can see Dashboard & Reports

## Setting up a wing
**Wings & Units → Add wing**: enter the name, floors, flats per floor, shops and monthly amounts. All unit numbers (A-101 … A-404, Shop 1 …) are created at once.
