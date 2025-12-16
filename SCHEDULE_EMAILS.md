# 📅 How to Fix Scheduled Emails

The reason your emails aren't sending automatically is that Supabase needs to be explicitly told **when** to trigger them. The "Test" button works because you're triggering it manually, but there's no "timer" running yet.

We will use **pg_cron** (a built-in Supabase scheduler) to fix this.

## 🛠️ Step 1: Get Your Keys

You need two things from your Supabase Dashboard:

1.  **Project Reference ID**
    *   Go to **Settings (cog icon)** > **General**
    *   Copy the **Reference ID** (it's a random string like `npbyzgvsujrwlfhljgre`)

2.  **Service Role Key** (CRITICAL: Do not share this with users, only use it here)
    *   Go to **Settings** > **API**
    *   Look for `service_role` (secret) key
    *   Copy it (starts with `ey...`)

## 🛠️ Step 2: Prepare the SQL

1.  Open the file `setup_schedule.sql` in your editor.
2.  Replace all occurrences of `[YOUR_PROJECT_REF]` with your **Reference ID**.
3.  Replace all occurrences of `[YOUR_SERVICE_ROLE_KEY]` with your **Service Role Key**.

## 🛠️ Step 3: Run in Supabase

1.  Go to your Supabase Dashboard.
2.  Click on **SQL Editor** in the left sidebar.
3.  Click **"New Query"**.
4.  **Paste** the modified code from `setup_schedule.sql`.
5.  Click **"Run"**.

## ✅ Verification

After running it, you should see a "Success" message.

To confirm it's working:
1.  In the SQL Editor, delete the code you just ran.
2.  Type: `select * from cron.job;`
3.  Click Run.
4.  You should see two rows: `send-daily-digest` and `send-weekly-report`.

That's it! Your server will now wake up automatically at 10:00 AM UTC (which is morning in US/EU) to send emails to anyone who has them enabled.
