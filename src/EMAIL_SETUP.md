# Email Notifications Setup Guide

This to-do app now includes **AI-powered email notifications** with daily digests and weekly reports!

## Features

### 📧 Daily Digest
- Sends every morning at your preferred time
- Lists all outstanding tasks for the day
- Clean, minimalist email design matching the Swiss aesthetic

### 📊 Weekly Report
- Sends every Sunday evening
- **AI-generated personalized 1-2 paragraph summary** of your week using GPT-4o-mini
- Brief overview of tasks completed from the past week
- Occasionally includes life perspective reminders (30% chance):
  - Age and weeks lived statistics
  - Recent week notes from your Life in Weeks view
  - Random bucket list item reminder
- Completion statistics and daily breakdown
- Casual, encouraging tone focused on progress

## Setup Instructions

### 1. Get API Keys

You'll need two API keys:

#### **Resend** (for sending emails)
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day)
3. Get your API key from the dashboard
4. Add it to the environment variable `RESEND_API_KEY` (you should have already been prompted)

#### **OpenAI** (for AI summaries)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an account or sign in
3. Navigate to API keys section
4. Create a new API key
5. Add it to the environment variable `OPENAI_API_KEY` (you should have already been prompted)

### 2. Configure Email Settings in the App

1. **Sign up** or **Sign in** to the app
2. Click the **Settings icon** (gear) in the header
3. Enter your email address
4. Toggle on **Daily Digest** and/or **Weekly Report**
5. Set your preferred time for daily emails
6. Click **Save**

### 3. Set Up Scheduled Functions (Cron Jobs)

To automate the email sending, you need to set up cron jobs. Here are your options:

#### Option A: Supabase Edge Functions Cron (Recommended)

Use Supabase's built-in cron functionality:

1. In your Supabase project dashboard
2. Go to **Edge Functions**
3. Set up scheduled functions:

**Daily Digest** (runs every day at 8:00 AM UTC):
```sql
-- Add to your Supabase SQL editor
SELECT cron.schedule(
  'send-daily-digest',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-d6a7a206/send-daily-digest',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

**Weekly Report** (runs every Sunday at 8:00 PM UTC):
```sql
SELECT cron.schedule(
  'send-weekly-report',
  '0 20 * * 0',
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-d6a7a206/send-weekly-report',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

#### Option B: External Cron Service

Use a service like [cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com):

**Daily Digest:**
- URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-d6a7a206/send-daily-digest`
- Method: POST
- Schedule: Daily at 8:00 AM (your timezone)

**Weekly Report:**
- URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-d6a7a206/send-weekly-report`
- Method: POST  
- Schedule: Every Sunday at 8:00 PM (your timezone)

#### Option C: Manual Testing

For testing, you can manually trigger the emails:

```bash
# Daily digest
curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-d6a7a206/send-daily-digest \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# Weekly report
curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-d6a7a206/send-weekly-report \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## AI Summary Examples

The weekly report uses GPT-4o-mini to generate personalized, casual 1-2 paragraph summaries. Examples:

**Task-focused:**
> "Solid week! You knocked out 12 of 14 tasks, hitting an 85% completion rate. Tuesday was your most productive day—whatever you did then, do more of that."

**With Life in Weeks perspective:**
> "You completed 8 tasks this week and stayed focused on priorities. By the way, you're at 1,456 weeks lived—remember that bucket list item about learning piano? Might be a good week to start."

**Encouraging tone:**
> "Made good progress this week with 6 tasks completed. You've lived through 2,184 weeks so far, and last month you noted 'summer trip with family' in your life view. Those moments matter—keep making them count."

## Email Previews

### Daily Digest Email
```
Good Morning

TUE, NOV 12

TODAY'S TASKS (3)
─────────────────
* Finish project proposal
Review design mockups
Call with client

Have a productive day!
```

### Weekly Report Email
```
WEEKLY REPORT

Your Week in Review

[AI-generated personalized summary here]

OVERALL
85%
12 of 14 tasks completed

DAILY BREAKDOWN
Mon  ████████░░ 80%
Tue  ██████████ 100%
Wed  ██████░░░░ 60%
...

Keep up the great work!
```

## Important Notes

- **Resend Free Tier**: 100 emails/day, 3,000/month
- **OpenAI Costs**: ~$0.001 per weekly summary (very cheap!)
- **Email Deliverability**: Test emails may go to spam initially
- **Time Zones**: Adjust cron schedules to match your timezone
- **Privacy**: This is a prototype - don't use production PII

## Troubleshooting

**Emails not sending?**
- Check that RESEND_API_KEY is set correctly
- Verify your email in Resend settings
- Check Supabase function logs

**AI summaries not working?**
- Verify OPENAI_API_KEY is set
- Check OpenAI API usage limits
- Review function logs for errors

**Wrong timezone?**
- Adjust cron schedule to UTC time
- Remember to account for DST changes