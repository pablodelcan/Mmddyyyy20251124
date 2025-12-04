# Account Deletion Implementation Guide

## Overview

When you get access to Supabase, you'll need to implement account deletion functionality. This guide explains what data needs to be deleted and what you need to do.

## What Data Needs to Be Deleted

Based on your current codebase, here's all the user data stored per user:

### In KV Store (Database Table: `kv_store_d6a7a206`)

Each user has data stored with these key patterns:
- `todos:${userId}` - All tasks/todos
- `dateOfBirth:${userId}` - User's date of birth
- `expectedLifespan:${userId}` - Expected lifespan setting
- `meditationDates:${userId}` - Meditation session dates
- `lastMeditationTime:${userId}` - Last meditation timestamp
- `totalMeditationMinutes:${userId}` - Total meditation minutes
- `weekNotes:${userId}` - Life in weeks notes
- `bucketList:${userId}` - Bucket list items
- `preferences:${userId}` - User preferences (email, weekly reports, etc.)
- `lastTaskTransferDate:${userId}` - Last task transfer date (internal)

### In Supabase Auth

- The user account itself (email, password, auth metadata)

## What You Need to Implement

### 1. Server-Side Endpoint (Edge Function)

Add a new endpoint in `src/supabase/functions/server/index.tsx`:

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

### 2. Client-Side Function (App.tsx)

Update the `handleSignOut` function or create a new `handleDeleteAccount` function:

```typescript
const handleDeleteAccount = async () => {
  if (!accessToken) return;

  try {
    // Get fresh session token
    const { data: { session } } = await supabase.auth.getSession();
    const freshToken = session?.access_token;

    if (!freshToken) {
      toast.error('Unable to delete account. Please try again.');
      return;
    }

    // Call delete endpoint
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-d6a7a206/delete-account`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${freshToken}`
        }
      }
    );

    if (response.ok) {
      // Clear local storage
      secureStorage.clear();
      
      // Reset all state
      setTodos({});
      setDateOfBirth(null);
      setMeditationDates([]);
      setLastMeditationTime(null);
      setWeekNotes({});
      setBucketList([]);
      
      // Sign out (which clears auth)
      await supabase.auth.signOut();
      setAccessToken(null);
      setUserId(null);
      
      toast.success('Account deleted successfully');
      setShowSettings(false);
    } else {
      const errorData = await response.json();
      toast.error(errorData.error || 'Failed to delete account');
    }
  } catch (err) {
    console.error('Failed to delete account:', err);
    toast.error('Failed to delete account. Please try again.');
  }
};
```

### 3. Update Settings Modal

Update the Delete Account button in `SettingsModal.tsx` to call the new function:

```typescript
<Button
  onClick={async () => {
    if (window.confirm('Are you sure you want to delete your account? You cannot recover it. This will permanently delete all your data.')) {
      await onDeleteAccount?.(); // New prop function
    }
  }}
  // ... rest of button styles
>
  Delete Account
</Button>
```

## Steps to Implement in Supabase

### Step 1: Add the Delete Endpoint

1. Open `src/supabase/functions/server/index.tsx`
2. Add the delete endpoint code (shown above)
3. Make sure to use `kv.mdel()` to delete all keys at once (more efficient)

### Step 2: Deploy the Edge Function

After adding the endpoint, you'll need to deploy it:

```bash
# Using Supabase CLI (if you have it set up)
supabase functions deploy make-server-d6a7a206

# Or use the Supabase Dashboard:
# 1. Go to Edge Functions in your Supabase dashboard
# 2. Upload/redeploy the function
```

### Step 3: Update Client Code

1. Add `handleDeleteAccount` function to `App.tsx`
2. Pass it as a prop to `SettingsModal`
3. Update the Delete Account button to use it

### Step 4: Test

1. Create a test account
2. Add some data (todos, preferences, etc.)
3. Delete the account
4. Verify:
   - All KV store keys are deleted
   - User is removed from Auth
   - Local storage is cleared

## Important Notes

1. **Service Role Key Required**: The delete endpoint uses `getSupabaseAdmin()` which requires the `SUPABASE_SERVICE_ROLE_KEY` environment variable. Make sure this is set in your Edge Function environment.

2. **Permissions**: The admin client has permission to delete users. Regular auth clients cannot delete users - only admins can.

3. **Data Recovery**: Once deleted, data cannot be recovered. Make sure the confirmation dialog is clear about this.

4. **Error Handling**: The endpoint should handle errors gracefully and return clear error messages.

5. **KV Store Cleanup**: Using `kv.mdel()` is more efficient than deleting keys one by one, as it does it in a single database operation.

## Database Table Reference

All user data is stored in: `kv_store_d6a7a206`

The table structure:
```sql
CREATE TABLE kv_store_d6a7a206 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);
```

All keys follow the pattern: `{type}:{userId}`

## Verification Checklist

When testing account deletion, verify:

- [ ] All KV store keys are deleted (check database table)
- [ ] User account is removed from Auth (check Auth users list)
- [ ] Client-side local storage is cleared
- [ ] User is signed out automatically
- [ ] Error handling works correctly
- [ ] Confirmation dialog appears before deletion

