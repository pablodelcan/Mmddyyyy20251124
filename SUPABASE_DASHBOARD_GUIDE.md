# 📖 Supabase Dashboard Guide - Step by Step

## ✅ Step 1: Code is Already Added!

The delete endpoint code has been added to:
- `src/supabase/functions/server/index.tsx`

**You don't need to edit this file directly.** We'll update it in Supabase dashboard.

---

## 🎯 Step 2: Access Supabase Dashboard

1. **Go to:** https://supabase.com/dashboard
2. **Sign in** with your credentials
3. **Select your project** (the one for mm/dd/yyyy app)

---

## 📍 Step 3: Navigate to Edge Functions

**In the Supabase Dashboard:**

1. Look at the **left sidebar** (vertical menu on the left)
2. Find and click **"Edge Functions"** 
   - It has a ⚡ lightning bolt icon
   - It's usually in the middle of the sidebar
   - If you don't see it, look under "Project Settings" or scroll down

**Visual path:**
```
Dashboard Home
├── Table Editor
├── Authentication  
├── Edge Functions ⚡  <-- CLICK HERE
├── Database
└── ...
```

---

## 🔍 Step 4: Find Your Function

**After clicking "Edge Functions":**

1. You'll see a list of functions (or an empty list if none exist)
2. Look for a function named: **`make-server-d6a7a206`**
3. **Click on it** to open it

**If you DON'T see the function:**
- The function might not be deployed yet
- We may need to create/deploy it first
- **Let me know and I'll help you create it**

---

## ✏️ Step 5: Edit the Function

**Once you click on `make-server-d6a7a206`:**

1. You'll see function details
2. Look for these buttons/tabs at the top:
   - **"Edit Function"** button
   - OR **"Code Editor"** tab
   - OR a **pencil/edit icon** ✏️
3. **Click it** to open the code editor

**What you'll see:**
- A code editor with the function's code
- The code should be in TypeScript/JavaScript
- You should see things like `import`, `app.get`, `app.post`, etc.

---

## 📝 Step 6: Add the Delete Endpoint

**In the code editor:**

The code should already have endpoints like:
- `app.get("/make-server-d6a7a206/todos", ...)`
- `app.post("/make-server-d6a7a206/todos", ...)`
- `app.post("/make-server-d6a7a206/signup", ...)`

**Find the LAST endpoint** (probably the signup one).

**Right BEFORE the last line** `Deno.serve(app.fetch);`, add this code:

```typescript
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
```

**OR, easier option:** 
- Just copy the ENTIRE file content from `src/supabase/functions/server/index.tsx` 
- And paste it into the Supabase editor
- This ensures you have the latest version with the delete endpoint already included!

---

## 🚀 Step 7: Deploy the Function

**After adding the code:**

1. Look for a **"Deploy"** or **"Save"** button
   - Usually at the top right of the editor
   - Or at the bottom
   - May say "Deploy Function" or "Update Function"

2. **Click "Deploy"**
   - Wait for deployment (usually 10-30 seconds)
   - You'll see a loading indicator
   - Then a success message like "Function deployed successfully"

3. **Verify deployment:**
   - You should see a green checkmark ✅
   - Or a success message
   - The function should show as "Active" or "Deployed"

---

## ✅ Step 8: Verify It Worked

**Check the function logs:**

1. Still in the Edge Functions section
2. Click on **"Logs"** or **"Invocations"** tab
3. You should see recent function calls (if any)

**Test the endpoint (optional):**

You can test if the endpoint exists by checking the function URL:
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-d6a7a206/delete-account
```

(Don't actually call it yet - we'll test it properly after connecting the button!)

---

## 🎯 What to Tell Me

**After you've done this, let me know:**

1. ✅ Can you see "Edge Functions" in the sidebar?
2. ✅ Do you see the `make-server-d6a7a206` function?
3. ✅ Did you add the delete endpoint code?
4. ✅ Did you deploy it successfully?

**If you get stuck anywhere, tell me:**
- What step you're on
- What you see (or don't see)
- Any error messages

I'll help you through it! 🚀

---

## 🔄 Alternative: If You Can't Find the Function

**If the function doesn't exist yet, we have two options:**

### Option A: Upload the Code
1. In Edge Functions, click **"Create Function"** or **"New Function"**
2. Name it: `make-server-d6a7a206`
3. Copy the ENTIRE content from `src/supabase/functions/server/index.tsx`
4. Paste it into the editor
5. Deploy

### Option B: Use Supabase CLI
If you have Supabase CLI installed, we can deploy from command line.

**Which option do you prefer?** Let me know what you see in your dashboard!

---

## 📸 Screenshots Would Help!

If possible, take screenshots of:
1. The Edge Functions page
2. The function code editor
3. Any error messages

This will help me guide you more precisely!

