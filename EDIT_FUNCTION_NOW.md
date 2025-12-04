# ✅ Ready to Edit! Step-by-Step Instructions

## 📁 You're Looking At:
- `index.tsx` - This is the main function file (the one we need to edit!)
- `kv_store.tsx` - This is a helper file (don't edit this one)

---

## 🎯 Step 1: Open `index.tsx`

**Click on `index.tsx`** to open it in the code editor.

---

## 🔍 Step 2: Find the End of the File

**Scroll down to the very end** of the `index.tsx` file.

You should see something like:
```typescript
});

Deno.serve(app.fetch);
```

The last line should be: `Deno.serve(app.fetch);`

---

## ✏️ Step 3: Add the Delete Endpoint Code

**Right BEFORE the line `Deno.serve(app.fetch);`**, add this code:

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

Deno.serve(app.fetch);
```

---

## 📝 Quick Copy-Paste Option

**OR, easier way:** 

Instead of manually adding, you can:
1. **Open** the file `src/supabase/functions/server/index.tsx` on your computer (in your code editor like VS Code)
2. **Copy the ENTIRE file** (Cmd+A, Cmd+C)
3. **Paste it** into the Supabase editor (replace everything)

This ensures you have the latest version with the delete endpoint already included!

---

## 🚀 Step 4: Save and Deploy

After adding the code:

1. **Look for a "Save" or "Deploy" button**
   - Usually at the top right
   - Or bottom of the editor
   
2. **Click "Deploy"**
   - Wait 10-30 seconds
   - You should see a success message ✅

---

## ✅ Step 5: Verify

After deployment:
- You should see a success message
- The function should show as "Active" or "Deployed"
- The timestamp should update to "Just now" or current time

---

## 🎯 What Should You Do?

**Tell me:**
1. Can you see the `index.tsx` file open in an editor?
2. Can you see the end of the file with `Deno.serve(app.fetch);`?
3. Do you see a "Save" or "Deploy" button?

Then I'll guide you through the exact steps! 🚀

