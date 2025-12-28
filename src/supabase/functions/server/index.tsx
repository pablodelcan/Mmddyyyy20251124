import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Create Supabase admin client
const getSupabaseAdmin = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

// Create Supabase client from user token
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );
};

// Verify user from access token
const verifyUser = async (accessToken: string | undefined) => {
  if (!accessToken) {
    console.log('[AUTH] No access token provided');
    return { error: 'No access token provided' };
  }

  console.log('[AUTH] Verifying token, length:', accessToken.length);

  // Create a client with the user's token in the Authorization header
  // This is the correct pattern for Edge Functions
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.log('[AUTH] Authorization error:', error?.message, error?.code);
    return { error: 'Unauthorized' };
  }

  console.log('[AUTH] User verified:', user.id);
  return { user };
};

// Health check endpoint
app.get("/make-server-d6a7a206/health", (c) => {
  return c.json({ status: "ok" });
});

// Debug endpoint to check environment variables
app.get("/make-server-d6a7a206/debug-env", async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { user, error } = await verifyUser(accessToken);

  if (error) {
    return c.json({ error }, 401);
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');

  return c.json({
    resend: {
      exists: !!resendKey,
      length: resendKey?.length || 0,
      prefix: resendKey?.substring(0, 7) || 'N/A',
      hasWhitespace: resendKey ? /\s/.test(resendKey) : false
    },
    openai: {
      exists: !!openaiKey,
      length: openaiKey?.length || 0,
      prefix: openaiKey?.substring(0, 7) || 'N/A'
    }
  });
});

// Helper function to get local date string (YYYY-MM-DD format)
// Can handle timezone offset from client
// timezoneOffset: positive = east of UTC (e.g., +480 for UTC+8)
const getLocalDateString = (date: Date, timezoneOffsetMinutes: number = 0): string => {
  // Convert UTC time to user's local time by ADDING the offset
  // Example: If it's 16:00 UTC and user is in UTC+8 (offset=480), 
  // we add 480 minutes to get 00:00 next day local time
  const adjustedDate = new Date(date.getTime() + (timezoneOffsetMinutes * 60 * 1000));
  const year = adjustedDate.getUTCFullYear();
  const month = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(adjustedDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to transfer incomplete tasks from past dates to today
const transferIncompleteTasks = (todosData: any, todayDate: string): { todos: any; hasChanges: boolean } => {
  if (!todosData || typeof todosData !== 'object') {
    return { todos: todosData || {}, hasChanges: false };
  }

  let hasChanges = false;
  const newTodos = { ...todosData };

  // Scan all past dates (only dates strictly before today)
  Object.keys(newTodos).forEach(dateKey => {
    // Only process past dates (before today, using string comparison)
    if (dateKey < todayDate && Array.isArray(newTodos[dateKey])) {
      // Use strict boolean comparison to ensure completed priority tasks are not transferred
      // This fixes a bug where priority tasks with completed=true were being treated as incomplete
      const incompleteTasks = newTodos[dateKey].filter((t: any) => t.completed !== true);

      if (incompleteTasks.length > 0) {
        hasChanges = true;

        // Remove incomplete tasks from past date (keep only truly completed tasks)
        newTodos[dateKey] = newTodos[dateKey].filter((t: any) => t.completed === true);

        // Add incomplete tasks to today (update date field)
        if (!newTodos[todayDate]) {
          newTodos[todayDate] = [];
        }
        // Get existing task IDs on today to prevent duplicates
        const existingTaskIds = new Set(newTodos[todayDate].map((t: any) => t.id));
        // Update the date field of transferred tasks to today and filter out any that already exist
        const transferredTasks = incompleteTasks
          .filter((t: any) => !existingTaskIds.has(t.id))
          .map((t: any) => ({
            ...t,
            date: todayDate,
            rolledOver: undefined // Remove rolledOver flag if present
          }));
        newTodos[todayDate] = [...transferredTasks, ...newTodos[todayDate]];
      }
    }
  });

  return { todos: newTodos, hasChanges };
};

// Get all todos for authenticated user
app.get("/make-server-d6a7a206/todos", async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { user, error } = await verifyUser(accessToken);

  if (error) {
    return c.json({ error }, 401);
  }

  try {
    let todosData = await kv.get(`todos:${user!.id}`) || {};
    const dateOfBirth = await kv.get(`dateOfBirth:${user!.id}`);
    const expectedLifespan = await kv.get(`expectedLifespan:${user!.id}`);
    const meditationDates = await kv.get(`meditationDates:${user!.id}`);
    const lastMeditationTime = await kv.get(`lastMeditationTime:${user!.id}`);
    const totalMeditationMinutes = await kv.get(`totalMeditationMinutes:${user!.id}`);
    const weekNotes = await kv.get(`weekNotes:${user!.id}`);
    const bucketList = await kv.get(`bucketList:${user!.id}`);

    // Get timezone offset from query parameter (optional, defaults to 0/UTC)
    // Format: timezoneOffset in minutes (e.g., -480 for PST which is UTC-8)
    // Note: JavaScript getTimezoneOffset() returns positive for behind UTC, so we negate it
    const timezoneOffsetParam = c.req.query('timezoneOffset');
    const timezoneOffsetMinutes = timezoneOffsetParam ? parseInt(timezoneOffsetParam, 10) : 0;

    // Get today's date in the user's local timezone
    const now = new Date();
    const todayDate = getLocalDateString(now, timezoneOffsetMinutes);

    // Transfer incomplete tasks from past dates to today
    // Check if we've already done the transfer today
    const lastTransferDate = await kv.get(`lastTaskTransferDate:${user!.id}`);
    if (!lastTransferDate || lastTransferDate !== todayDate) {
      const transferResult = transferIncompleteTasks(todosData, todayDate);

      // Save updated todos if there were changes
      if (transferResult.hasChanges) {
        todosData = transferResult.todos;
        await kv.set(`todos:${user!.id}`, todosData);
      }

      // Always update the last transfer date to prevent re-checking today
      // This is saved regardless of whether there were changes
      await kv.set(`lastTaskTransferDate:${user!.id}`, todayDate);
    }

    return c.json({
      todos: todosData,
      dateOfBirth: dateOfBirth || null,
      expectedLifespan: expectedLifespan || 80,
      meditationDates: meditationDates || [],
      lastMeditationTime: lastMeditationTime || null,
      totalMeditationMinutes: totalMeditationMinutes || 0,
      weekNotes: weekNotes || {},
      bucketList: bucketList || []
    });
  } catch (err) {
    console.log('Error fetching todos:', err);
    return c.json({ error: 'Failed to fetch todos' }, 500);
  }
});

// Save todos for authenticated user
app.post("/make-server-d6a7a206/todos", async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { user, error } = await verifyUser(accessToken);

  if (error) {
    return c.json({ error }, 401);
  }

  try {
    const body = await c.req.json();

    console.log('Attempting to save data for user:', user!.id);
    console.log('Data received:', {
      hasTodos: !!body.todos,
      todosKeys: body.todos ? Object.keys(body.todos).length : 0,
      hasDateOfBirth: body.dateOfBirth !== undefined,
      hasExpectedLifespan: body.expectedLifespan !== undefined,
      hasMeditationDates: body.meditationDates !== undefined,
      hasLastMeditationTime: body.lastMeditationTime !== undefined,
      hasTotalMeditationMinutes: body.totalMeditationMinutes !== undefined,
      hasWeekNotes: body.weekNotes !== undefined,
      hasBucketList: body.bucketList !== undefined
    });

    // Save all the data - only save non-null values
    if (body.todos !== null && body.todos !== undefined) {
      await kv.set(`todos:${user!.id}`, body.todos);
    }

    if (body.dateOfBirth !== null && body.dateOfBirth !== undefined) {
      await kv.set(`dateOfBirth:${user!.id}`, body.dateOfBirth);
    }

    if (body.expectedLifespan !== null && body.expectedLifespan !== undefined) {
      await kv.set(`expectedLifespan:${user!.id}`, body.expectedLifespan);
    }

    if (body.meditationDates !== null && body.meditationDates !== undefined) {
      await kv.set(`meditationDates:${user!.id}`, body.meditationDates);
    }

    if (body.lastMeditationTime !== null && body.lastMeditationTime !== undefined) {
      await kv.set(`lastMeditationTime:${user!.id}`, body.lastMeditationTime);
    }

    if (body.totalMeditationMinutes !== null && body.totalMeditationMinutes !== undefined) {
      await kv.set(`totalMeditationMinutes:${user!.id}`, body.totalMeditationMinutes);
    }

    if (body.weekNotes !== null && body.weekNotes !== undefined) {
      await kv.set(`weekNotes:${user!.id}`, body.weekNotes);
    }

    if (body.bucketList !== null && body.bucketList !== undefined) {
      await kv.set(`bucketList:${user!.id}`, body.bucketList);
    }

    // Save timezone offset if provided (for use in email digests)
    if (body.timezoneOffset !== null && body.timezoneOffset !== undefined) {
      // Get existing preferences and merge with timezone
      const existingPrefs = await kv.get(`preferences:${user!.id}`) || {};
      await kv.set(`preferences:${user!.id}`, {
        ...existingPrefs,
        timezoneOffset: body.timezoneOffset
      });
    }

    // Handle deleted task IDs - remove from server-side todos
    if (body.deletedTaskIds && Array.isArray(body.deletedTaskIds) && body.deletedTaskIds.length > 0) {
      const serverTodos = await kv.get(`todos:${user!.id}`) || {};
      let hasChanges = false;
      const deletedIdsSet = new Set(body.deletedTaskIds);

      // Remove deleted tasks from all dates
      Object.keys(serverTodos).forEach(dateKey => {
        if (Array.isArray(serverTodos[dateKey])) {
          const originalLength = serverTodos[dateKey].length;
          serverTodos[dateKey] = serverTodos[dateKey].filter((t: any) => !deletedIdsSet.has(t.id));
          if (serverTodos[dateKey].length !== originalLength) {
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        await kv.set(`todos:${user!.id}`, serverTodos);
        console.log('Removed deleted tasks from server:', body.deletedTaskIds.length);
      }
    }

    console.log('Data saved successfully for user:', user!.id);
    return c.json({ success: true });
  } catch (err) {
    console.error('Error saving todos - Full error:', err);
    console.error('Error message:', err instanceof Error ? err.message : String(err));
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    return c.json({
      error: 'Failed to save todos',
      details: err instanceof Error ? err.message : String(err)
    }, 500);
  }
});

// Get user preferences
app.get("/make-server-d6a7a206/preferences", async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { user, error } = await verifyUser(accessToken);

  if (error) {
    return c.json({ error }, 401);
  }

  try {
    const preferences = await kv.get(`preferences:${user!.id}`);
    return c.json({ preferences: preferences || {} });
  } catch (err) {
    console.log('Error fetching preferences:', err);
    return c.json({ error: 'Failed to fetch preferences' }, 500);
  }
});

// Save user preferences
app.post("/make-server-d6a7a206/preferences", async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { user, error } = await verifyUser(accessToken);

  if (error) {
    return c.json({ error }, 401);
  }

  try {
    const body = await c.req.json();
    console.log(`Saving preferences for user ${user!.id}:`, JSON.stringify(body.preferences));
    console.log(`weeklyReportEnabled: ${body.preferences.weeklyReportEnabled}, weeklyReportDay: ${body.preferences.weeklyReportDay}`);
    await kv.set(`preferences:${user!.id}`, body.preferences);
    return c.json({ success: true });
  } catch (err) {
    console.log('Error saving preferences:', err);
    return c.json({ error: 'Failed to save preferences' }, 500);
  }
});

// Generate simple weekly summary without AI
const generateWeeklySummary = async (weekData: any) => {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');

  if (!openaiKey) {
    // Fallback to simple message if no API key
    const rate = weekData.completionRate;
    if (rate >= 80) {
      return `Amazing work this week! You completed ${weekData.completedTasks} out of ${weekData.totalTasks} tasks with a ${rate}% completion rate. Keep up the great momentum!`;
    } else if (rate >= 60) {
      return `Good progress this week! You completed ${weekData.completedTasks} out of ${weekData.totalTasks} tasks. ${weekData.mostProductiveDay} was your most productive day.`;
    } else {
      return `You made progress this week with ${weekData.completedTasks} tasks completed. Every step forward counts!`;
    }
  }

  try {
    // Build the prompt for AI
    let prompt = `You are writing a casual, friendly weekly summary email for a minimalist to-do app called \"mmddyyyy\". Write 1-2 short paragraphs (max 4 sentences total) summarizing the user's week.

Task data from the past week:
- Completed ${weekData.completedTasks} out of ${weekData.totalTasks} tasks (${weekData.completionRate}% completion rate)
- Most productive day: ${weekData.mostProductiveDay}
${weekData.priorityTasksCompleted > 0 ? `- Completed ${weekData.priorityTasksCompleted} priority tasks` : ''}

Recent tasks:
${weekData.recentTasks}

Keep it casual, encouraging, and brief. Focus on what they accomplished.`;

    // Occasionally (30% chance) include life in weeks perspective
    if (weekData.lifeInWeeksData && Math.random() < 0.3) {
      prompt += `\n\nOptionally add a casual reminder about their life perspective:
- Age: ${weekData.lifeInWeeksData.age}
- Weeks lived: ${weekData.lifeInWeeksData.weeksLived.toLocaleString()}
- Life ${weekData.lifeInWeeksData.percentageLived.toFixed(1)}% complete

${weekData.lifeInWeeksData.recentWeekNote ? `Recently they noted: \"${weekData.lifeInWeeksData.recentWeekNote}\"` : ''}
${weekData.lifeInWeeksData.bucketListItem ? `Bucket list reminder: \"${weekData.lifeInWeeksData.bucketListItem}\"` : ''}

Weave this in naturally if you feel it fits—don't force it.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You write brief, casual, encouraging weekly summaries. Keep it to 1-2 short paragraphs maximum. Be conversational and friendly.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 200
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Great work this week! Keep up the momentum.';
  } catch (err) {
    console.log('Error generating AI summary:', err);
    return `You completed ${weekData.completedTasks} tasks this week. Keep moving forward!`;
  }
};

// Send daily digest email
app.post("/make-server-d6a7a206/send-daily-digest", async (c) => {
  const resendKey = Deno.env.get('RESEND_API_KEY');

  if (!resendKey) {
    return c.json({ error: 'RESEND_API_KEY not configured' }, 500);
  }

  try {
    // Get all users with daily digest enabled
    const allKeys = await kv.getByPrefix('preferences:');
    const now = new Date();

    for (const prefItem of allKeys) {
      const userId = prefItem.key.replace('preferences:', '');
      const prefs = prefItem.value;

      if (!prefs.email || !prefs.dailyDigestEnabled) continue;

      // Use user's stored timezone offset, default to 0 (UTC)
      const userTimezone = prefs.timezoneOffset || 0;
      const today = getLocalDateString(now, userTimezone);

      // Get user's todos
      const todosData = await kv.get(`todos:${userId}`);
      const todayTodos = (todosData?.[today] || []).filter((t: any) => !t.completed);

      if (todayTodos.length === 0) continue;

      // Generate email HTML
      const taskList = todayTodos.map((t: any) =>
        `<div style=\"padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);\">
          ${t.priority ? '<span style=\"color: #be8bad;\">*</span> ' : ''}${t.text}
        </div>`
      ).join('');

      const html = `
        <div style=\"font-family: 'Martina Plantijn', Georgia, serif; max-width: 375px; margin: 0 auto; padding: 40px 20px; background: #fdf5ed; color: rgba(0,0,0,0.9);\">
          <h1 style=\"text-transform: uppercase; letter-spacing: 0.1em; font-size: 14px; color: rgba(0,0,0,0.6); margin-bottom: 20px;\">
            Good Morning
          </h1>
          <h2 style=\"font-size: 20px; margin-bottom: 30px;\">
            ${today}
          </h2>
          <div style=\"margin-bottom: 20px;\">
            <p style=\"text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; color: rgba(0,0,0,0.6); margin-bottom: 10px;\">
              Today's Tasks (${todayTodos.length})
            </p>
            ${taskList}
          </div>
          <p style=\"font-size: 14px; color: rgba(0,0,0,0.6); margin-top: 30px;\">
            Have a productive day!
          </p>
        </div>
      `;

      // Send email via Resend
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: 'mmddyyyy <noreply@mmddyyyy.co>',
          to: prefs.email,
          subject: `Good morning - ${todayTodos.length} tasks for today`,
          html
        })
      });
    }

    return c.json({ success: true, message: 'Daily digests sent' });
  } catch (err) {
    console.log('Error sending daily digests:', err);
    return c.json({ error: 'Failed to send daily digests' }, 500);
  }
});

// Send weekly report email
app.post("/make-server-d6a7a206/send-weekly-report", async (c) => {
  const resendKey = Deno.env.get('RESEND_API_KEY');

  if (!resendKey) {
    return c.json({ error: 'RESEND_API_KEY not configured' }, 500);
  }

  try {
    // Get all users with weekly report enabled
    const allKeys = await kv.getByPrefix('preferences:');

    for (const prefItem of allKeys) {
      const userId = prefItem.key.replace('preferences:', '');
      const prefs = prefItem.value;

      if (!prefs.email || !prefs.weeklyReportEnabled) continue;

      // Use user's stored timezone offset, default to 0 (UTC)
      const userTimezone = prefs.timezoneOffset || 0;
      const now = new Date();

      // Calculate user's local time using their timezone offset
      const userLocalTime = new Date(now.getTime() - (userTimezone * 60 * 1000));
      const userDayOfWeek = userLocalTime.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

      // Check if today is the user's chosen day for weekly reports
      // weeklyReportDay: 0 = Sunday, 1 = Monday, etc. (matches JavaScript's getDay())
      const chosenDay = prefs.weeklyReportDay ?? 0; // Default to Sunday if not set
      if (userDayOfWeek !== chosenDay) {
        console.log(`Skipping user ${userId}: Today is ${userDayOfWeek}, user wants ${chosenDay}`);
        continue;
      }

      console.log(`Sending weekly report to user ${userId} on day ${chosenDay}`);

      // Get user's todos
      const todosData = await kv.get(`todos:${userId}`) || {};

      // Get last week's tasks (using user's timezone)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - i - 1); // Start from yesterday
        return getLocalDateString(date, userTimezone);
      });

      // Get this week's tasks (today + next 6 days, using user's timezone)
      const thisWeekDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() + i);
        return getLocalDateString(date, userTimezone);
      });

      // Collect completed tasks from last week
      const completedLastWeek: string[] = [];
      last7Days.forEach(dateKey => {
        const dayTodos = todosData[dateKey] || [];
        dayTodos.forEach((t: any) => {
          if (t.completed) {
            completedLastWeek.push(t.text);
          }
        });
      });

      // Collect outstanding tasks from this week
      const outstandingThisWeek: string[] = [];
      thisWeekDays.forEach(dateKey => {
        const dayTodos = todosData[dateKey] || [];
        dayTodos.forEach((t: any) => {
          if (!t.completed) {
            outstandingThisWeek.push(t.text);
          }
        });
      });

      // Skip if no tasks at all
      if (completedLastWeek.length === 0 && outstandingThisWeek.length === 0) continue;

      // Generate task lists HTML
      const outstandingList = outstandingThisWeek.length > 0
        ? outstandingThisWeek.map(task =>
          `<div style="padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">${task}</div>`
        ).join('')
        : '<div style="padding: 8px 0; color: rgba(0,0,0,0.4);">No outstanding tasks</div>';

      const completedList = completedLastWeek.length > 0
        ? completedLastWeek.map(task =>
          `<div style="padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1); text-decoration: line-through; color: rgba(0,0,0,0.5);">${task}</div>`
        ).join('')
        : '<div style="padding: 8px 0; color: rgba(0,0,0,0.4);">No completed tasks</div>';

      const html = `
        <div style="font-family: 'Courier', monospace; max-width: 375px; margin: 0 auto; padding: 40px 20px; background: #FBF8E8; color: rgba(0,0,0,0.9);">
          <h1 style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 14px; font-weight: bold; color: rgba(0,0,0,0.9); margin-bottom: 30px;">
            Weekly Report
          </h1>
          
          <div style="margin-bottom: 30px;">
            <p style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; font-weight: bold; color: rgba(0,0,0,0.6); margin-bottom: 12px;">
              Outstanding tasks this week
            </p>
            ${outstandingList}
          </div>

          <div>
            <p style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; font-weight: bold; color: rgba(0,0,0,0.6); margin-bottom: 12px;">
              Completed tasks last week
            </p>
            ${completedList}
          </div>
        </div>
      `;

      // Send email via Resend
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: 'mmddyyyy <noreply@mmddyyyy.co>',
          to: prefs.email,
          subject: `Weekly Report - ${outstandingThisWeek.length} outstanding, ${completedLastWeek.length} completed`,
          html
        })
      });
    }

    return c.json({ success: true, message: 'Weekly reports sent' });
  } catch (err) {
    console.log('Error sending weekly reports:', err);
    return c.json({ error: 'Failed to send weekly reports' }, 500);
  }
});

// Test weekly report endpoint - sends to specific email
app.post("/make-server-d6a7a206/test-weekly-report", async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { user, error } = await verifyUser(accessToken);

  if (error) {
    return c.json({ error }, 401);
  }

  let resendKey = Deno.env.get('RESEND_API_KEY');

  console.log('RESEND_API_KEY exists:', !!resendKey);
  console.log('RESEND_API_KEY length (before trim):', resendKey?.length || 0);

  // Trim whitespace and quotes that might have been added
  if (resendKey) {
    resendKey = resendKey.trim().replace(/^["']|["']$/g, '');
  }

  console.log('RESEND_API_KEY length (after trim):', resendKey?.length || 0);
  console.log('RESEND_API_KEY prefix:', resendKey?.substring(0, 7));

  if (!resendKey) {
    return c.json({ error: 'RESEND_API_KEY not configured' }, 500);
  }

  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // Get user preferences for timezone
    const userPrefs = await kv.get(`preferences:${user!.id}`) || {};
    const userTimezone = userPrefs.timezoneOffset || 0;
    const now = new Date();

    // Get user's todos
    const todosData = await kv.get(`todos:${user!.id}`) || {};

    // Get last week's tasks (using user's timezone)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i - 1); // Start from yesterday
      return getLocalDateString(date, userTimezone);
    });

    // Get this week's tasks (today + next 6 days, using user's timezone)
    const thisWeekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      return getLocalDateString(date, userTimezone);
    });

    // Collect completed tasks from last week
    const completedLastWeek: string[] = [];
    last7Days.forEach(dateKey => {
      const dayTodos = todosData[dateKey] || [];
      dayTodos.forEach((t: any) => {
        if (t.completed) {
          completedLastWeek.push(t.text);
        }
      });
    });

    // Collect outstanding tasks from this week
    const outstandingThisWeek: string[] = [];
    thisWeekDays.forEach(dateKey => {
      const dayTodos = todosData[dateKey] || [];
      dayTodos.forEach((t: any) => {
        if (!t.completed) {
          outstandingThisWeek.push(t.text);
        }
      });
    });

    // Generate task lists HTML
    const outstandingList = outstandingThisWeek.length > 0
      ? outstandingThisWeek.map(task =>
        `<div style="padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">${task}</div>`
      ).join('')
      : '<div style="padding: 8px 0; color: rgba(0,0,0,0.4);">No outstanding tasks</div>';

    const completedList = completedLastWeek.length > 0
      ? completedLastWeek.map(task =>
        `<div style="padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1); text-decoration: line-through; color: rgba(0,0,0,0.5);">${task}</div>`
      ).join('')
      : '<div style="padding: 8px 0; color: rgba(0,0,0,0.4);">No completed tasks</div>';

    const html = `
      <div style="font-family: 'Courier', monospace; max-width: 375px; margin: 0 auto; padding: 40px 20px; background: #FBF8E8; color: rgba(0,0,0,0.9);">
        <h1 style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 14px; font-weight: bold; color: rgba(0,0,0,0.9); margin-bottom: 30px;">
          Weekly Report (Test)
        </h1>
        
        <div style="margin-bottom: 30px;">
          <p style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; font-weight: bold; color: rgba(0,0,0,0.6); margin-bottom: 12px;">
            Outstanding tasks this week
          </p>
          ${outstandingList}
        </div>

        <div style="margin-bottom: 30px;">
          <p style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; font-weight: bold; color: rgba(0,0,0,0.6); margin-bottom: 12px;">
            Completed tasks last week
          </p>
          ${completedList}
        </div>
        
        <p style="font-size: 12px; color: rgba(0,0,0,0.4); margin-top: 40px; text-align: center; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 20px;">
          This is a test email. Enable weekly reports in settings to receive this every Sunday.
        </p>
      </div>
    `;

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`
      },
      body: JSON.stringify({
        from: 'mmddyyyy <noreply@mmddyyyy.co>',
        to: email,
        subject: `[Test] Weekly Report - ${outstandingThisWeek.length} outstanding, ${completedLastWeek.length} completed`,
        html
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.log('Resend API error response:', errorText);
      console.log('Resend API error status:', emailResponse.status);
      return c.json({
        error: 'Failed to send email via Resend',
        details: errorText,
        status: emailResponse.status
      }, 500);
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    return c.json({ success: true, message: 'Test email sent successfully' });
  } catch (err) {
    console.log('Error sending test weekly report:', err);
    return c.json({ error: 'Failed to send test weekly report', details: String(err) }, 500);
  }
});

// Sign up endpoint
app.post("/make-server-d6a7a206/signup", async (c) => {
  const supabase = getSupabaseAdmin();

  try {
    const body = await c.req.json();
    const { email, password, name } = body;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('Sign up error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ user: data.user });
  } catch (err) {
    console.log('Sign up error:', err);
    return c.json({ error: 'Failed to sign up' }, 500);
  }
});

// Delete user account and all data
app.delete("/make-server-d6a7a206/delete-account", async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { user, error } = await verifyUser(accessToken);

  if (error) {
    return c.json({ error }, 401);
  }

  try {
    const userId = user!.id;
    const supabase = getSupabaseAdmin();

    // 1. Delete all user data from KV store
    const keysToDelete = [
      `todos:${userId}`,
      `dateOfBirth:${userId}`,
      `expectedLifespan:${userId}`,
      `meditationDates:${userId}`,
      `lastMeditationTime:${userId}`,
      `totalMeditationMinutes:${userId}`,
      `weekNotes:${userId}`,
      `bucketList:${userId}`,
      `preferences:${userId}`,
      `lastTaskTransferDate:${userId}`
    ];

    await kv.mdel(keysToDelete);

    // 2. Delete the user from Supabase Auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return c.json({ error: 'Failed to delete user account' }, 500);
    }

    return c.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Error deleting account:', err);
    return c.json({
      error: 'Failed to delete account',
      details: err instanceof Error ? err.message : String(err)
    }, 500);
  }
});

// ===========================================
// STRIPE SUBSCRIPTION ENDPOINTS
// ===========================================

// Initialize Stripe
const getStripe = () => {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
  });
};

// Get subscription status for authenticated user
app.get("/make-server-d6a7a206/subscription-status", async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { user, error } = await verifyUser(accessToken);

  if (error) {
    return c.json({ error }, 401);
  }

  try {
    const subscription = await kv.get(`subscription:${user!.id}`);

    if (!subscription) {
      return c.json({
        stripeCustomerId: null,
        subscriptionId: null,
        status: null,
        currentPeriodEnd: null,
        trialEnd: null,
        priceId: null,
      });
    }

    return c.json(subscription);
  } catch (err) {
    console.error('Error fetching subscription status:', err);
    return c.json({ error: 'Failed to fetch subscription status' }, 500);
  }
});

// Sync Apple subscription from iOS
app.post("/make-server-d6a7a206/sync-apple-subscription", async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { user, error } = await verifyUser(accessToken);

  if (error) {
    return c.json({ error }, 401);
  }

  try {
    const body = await c.req.json();
    const { productId, transactionId, originalTransactionId, purchaseDate, expirationDate, isSubscribed } = body;

    if (!isSubscribed) {
      return c.json({ success: false, message: 'No active subscription' });
    }

    // Save Apple subscription to KV store
    await kv.set(`subscription:${user!.id}`, {
      stripeCustomerId: null, // Not applicable for Apple
      subscriptionId: originalTransactionId || transactionId,
      status: 'active', // StoreKit 2 only returns valid/verified transactions
      currentPeriodEnd: expirationDate || null,
      trialEnd: null, // Apple doesn't expose trial info the same way
      priceId: productId,
      platform: 'apple', // Mark as Apple subscription
      transactionId: transactionId,
      originalTransactionId: originalTransactionId,
      purchaseDate: purchaseDate,
    });

    console.log('Apple subscription synced for user:', user!.id, 'Product:', productId);

    return c.json({ success: true });
  } catch (err) {
    console.error('Error syncing Apple subscription:', err);
    return c.json({ error: 'Failed to sync subscription' }, 500);
  }
});

// Create Stripe checkout session
app.post("/make-server-d6a7a206/create-checkout-session", async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { user, error } = await verifyUser(accessToken);

  if (error) {
    return c.json({ error }, 401);
  }

  try {
    const stripe = getStripe();
    const body = await c.req.json();
    const { priceType } = body; // 'monthly' or 'yearly'

    // Get the appropriate price ID
    const priceId = priceType === 'yearly'
      ? Deno.env.get('STRIPE_PRICE_YEARLY')
      : Deno.env.get('STRIPE_PRICE_MONTHLY');

    if (!priceId) {
      return c.json({ error: `STRIPE_PRICE_${priceType.toUpperCase()} not configured` }, 500);
    }

    // Check if user already has a Stripe customer ID
    let existingSubscription = await kv.get(`subscription:${user!.id}`);
    let customerId = existingSubscription?.stripeCustomerId;

    // Get user email from Supabase
    const supabase = getSupabaseAdmin();
    const { data: userData } = await supabase.auth.admin.getUserById(user!.id);
    const userEmail = userData?.user?.email;

    // Create or retrieve customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          supabase_user_id: user!.id,
        },
      });
      customerId = customer.id;
    }

    // Calculate trial end date (3 months from now)
    const trialEnd = Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60); // 90 days

    // Create checkout session with trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_end: trialEnd,
        metadata: {
          supabase_user_id: user!.id,
        },
      },
      success_url: `${c.req.header('origin') || 'https://mmddyyyy.co'}?subscription=success`,
      cancel_url: `${c.req.header('origin') || 'https://mmddyyyy.co'}?subscription=canceled`,
      metadata: {
        supabase_user_id: user!.id,
      },
    });

    return c.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    return c.json({
      error: 'Failed to create checkout session',
      details: err instanceof Error ? err.message : String(err)
    }, 500);
  }
});

// Create Stripe customer portal session
app.post("/make-server-d6a7a206/create-portal-session", async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { user, error } = await verifyUser(accessToken);

  if (error) {
    return c.json({ error }, 401);
  }

  try {
    const stripe = getStripe();
    const subscription = await kv.get(`subscription:${user!.id}`);

    if (!subscription?.stripeCustomerId) {
      return c.json({ error: 'No subscription found' }, 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: c.req.header('origin') || 'https://mmddyyyy.co',
    });

    return c.json({ url: session.url });
  } catch (err) {
    console.error('Error creating portal session:', err);
    return c.json({
      error: 'Failed to create portal session',
      details: err instanceof Error ? err.message : String(err)
    }, 500);
  }
});

// Stripe webhook handler
app.post("/make-server-d6a7a206/stripe-webhook", async (c) => {
  const stripe = getStripe();
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  console.log('Webhook secret loaded:', webhookSecret ? `${webhookSecret.substring(0, 10)}...` : 'NOT FOUND');

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return c.json({ error: 'Webhook not configured' }, 500);
  }

  try {
    const body = await c.req.text();
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      return c.json({ error: 'No signature' }, 400);
    }

    let event: Stripe.Event;
    try {
      // Use async version for Deno/Supabase Edge Runtime compatibility
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return c.json({ error: 'Invalid signature' }, 400);
    }

    console.log('Stripe webhook event:', event.type);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;

        if (userId && session.subscription) {
          // Fetch the full subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

          await kv.set(`subscription:${userId}`, {
            stripeCustomerId: session.customer as string,
            subscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            priceId: subscription.items.data[0]?.price.id || null,
          });

          console.log('Subscription created for user:', userId);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          await kv.set(`subscription:${userId}`, {
            stripeCustomerId: subscription.customer as string,
            subscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            priceId: subscription.items.data[0]?.price.id || null,
          });

          console.log('Subscription updated for user:', userId, 'Status:', subscription.status);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          await kv.set(`subscription:${userId}`, {
            stripeCustomerId: subscription.customer as string,
            subscriptionId: subscription.id,
            status: 'canceled',
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            trialEnd: null,
            priceId: null,
          });

          console.log('Subscription canceled for user:', userId);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment succeeded for invoice:', invoice.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.supabase_user_id;

          if (userId) {
            await kv.set(`subscription:${userId}`, {
              stripeCustomerId: invoice.customer as string,
              subscriptionId: subscription.id,
              status: 'past_due',
              currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
              trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
              priceId: subscription.items.data[0]?.price.id || null,
            });

            console.log('Payment failed for user:', userId);
          }
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return c.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return c.json({
      error: 'Webhook handler failed',
      details: err instanceof Error ? err.message : String(err)
    }, 500);
  }
});

Deno.serve(app.fetch);