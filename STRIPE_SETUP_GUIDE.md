# Stripe Setup Guide for mmddyyyy Pro Subscriptions

This guide walks you through setting up Stripe for the Pro subscription feature.

## Prerequisites

- A Stripe account (create one at [stripe.com](https://stripe.com))
- Access to your Supabase project dashboard
- Your app deployed (or running locally for testing)

---

## Step 1: Create Your Product and Prices in Stripe

1. **Go to Stripe Dashboard → Products**  
   [https://dashboard.stripe.com/products](https://dashboard.stripe.com/products)

2. **Click "+ Add product"**

3. **Fill in product details:**
   - **Name:** `Pro Subscription`
   - **Description:** `Access to Resolutions, Life in Weeks notes, and Weekly email summaries`

4. **Add the Monthly Price:**
   - Click "Add another price"
   - **Amount:** `$1.00`
   - **Billing period:** `Monthly`
   - **Description (optional):** `Monthly subscription`
   - **Free trial:** Enable and set to `3 months` (90 days)

5. **Add the Yearly Price:**
   - Click "Add another price"
   - **Amount:** `$10.00`
   - **Billing period:** `Yearly`
   - **Description (optional):** `Yearly subscription (save $2)`
   - **Free trial:** Enable and set to `3 months` (90 days)

6. **Save the product**

7. **Copy your Price IDs:**
   - Click on each price to view details
   - Copy the Price ID (format: `price_xxxxxxxxxxxxxxxxxx`)
   - You'll need both the monthly and yearly Price IDs

---

## Step 2: Create a Webhook Endpoint

1. **Go to Stripe Dashboard → Developers → Webhooks**  
   [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)

2. **Click "+ Add endpoint"**

3. **Enter your endpoint URL:**
   ```
   https://YOUR_SUPABASE_PROJECT_ID.supabase.co/functions/v1/make-server-d6a7a206/stripe-webhook
   ```
   Replace `YOUR_SUPABASE_PROJECT_ID` with your actual Supabase project ID.

4. **Select events to listen to:**
   Click "Select events" and choose:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. **Click "Add endpoint"**

6. **Copy the Signing Secret:**
   - After creating, click on the webhook endpoint
   - Under "Signing secret", click "Reveal" and copy it
   - Format: `whsec_xxxxxxxxxxxxxxxxxx`

---

## Step 3: Configure Supabase Edge Function Secrets

1. **Go to your Supabase Dashboard**  
   [https://supabase.com/dashboard](https://supabase.com/dashboard)

2. **Select your project → Settings → Edge Functions**  
   Or navigate to: Project Settings → Functions → Secrets

3. **Add the following secrets:**

| Secret Name | Value |
|-------------|-------|
| `STRIPE_SECRET_KEY` | Your Stripe restricted key (`rk_live_xxx...`) |
| `STRIPE_WEBHOOK_SECRET` | Your webhook signing secret (`whsec_xxx...`) |
| `STRIPE_PRICE_MONTHLY` | Your monthly price ID (`price_xxx...`) |
| `STRIPE_PRICE_YEARLY` | Your yearly price ID (`price_xxx...`) |

> **Note:** The restricted key you provided was `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`

---

## Step 4: Enable Customer Portal

1. **Go to Stripe Dashboard → Settings → Customer portal**  
   [https://dashboard.stripe.com/settings/billing/portal](https://dashboard.stripe.com/settings/billing/portal)

2. **Enable the customer portal**

3. **Configure allowed actions:**
   - ✅ Allow customers to cancel their subscription
   - ✅ Allow customers to update payment methods
   - ✅ Show billing history

4. **Save changes**

---

## Step 5: Testing with Stripe Test Mode

For testing before going live:

1. **Toggle to Test mode** in Stripe Dashboard (top-right switch)

2. **Create test products/prices** following the same steps above

3. **Use test API keys** (format: `sk_test_xxx...` and `pk_test_xxx...`)

4. **Use test cards:**
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future date and CVC

---

## Step 6: Deploy Edge Functions

After adding secrets to Supabase, redeploy your Edge Functions:

```bash
# From your project directory
supabase functions deploy make-server-d6a7a206
```

Or if using the Supabase dashboard, navigate to Edge Functions and deploy.

---

## Step 7: Testing the Flow

1. **Open your app** (localhost or deployed)

2. **Log in with a test account**

3. **Navigate to Life in Weeks → Click "Resolutions 2026"**
   - The paywall should appear

4. **Click "Start 3-Month Trial"**
   - You should be redirected to Stripe Checkout

5. **Complete checkout with a test card**

6. **After successful payment:**
   - Webhook fires → updates subscription in KV store
   - Redirected back to app with `?subscription=success`
   - Features should now be unlocked

---

## Troubleshooting

### Webhook not receiving events
- Check the webhook URL is correct
- Verify the webhook signing secret matches
- Check Supabase Edge Function logs for errors

### Checkout session not creating
- Verify `STRIPE_SECRET_KEY` is set correctly
- Check that Price IDs are valid
- Look at Edge Function logs for detailed errors

### Subscription status not updating
- Ensure webhook events are being received (check Stripe webhook logs)
- Verify the `supabase_user_id` is being passed in metadata

---

## Production Checklist

- [ ] Create live products/prices in Stripe
- [ ] Add live API keys to Supabase secrets
- [ ] Update webhook URL to production domain
- [ ] Test complete flow with real card
- [ ] Monitor webhook logs for first few subscriptions
