# Converting mmddyyyy to iOS App - Step by Step Guide

## Prerequisites

Before you start, make sure you have:
- ✅ A Mac computer (required for iOS development)
- ✅ macOS 13.0 or later
- ✅ At least 20GB of free disk space

## Step 1: Install Xcode (30-60 minutes)

1. Open the **App Store** on your Mac
2. Search for **"Xcode"**
3. Click **Get** or **Install** (it's free but large ~15GB)
4. Wait for it to download and install
5. Open **Xcode** once installed
6. Accept the license agreement
7. Xcode will install additional components - let it finish

**Verify installation:**
- Open **Terminal** (press Cmd+Space, type "Terminal")
- Type: `xcode-select --install`
- If it says "command line tools are already installed", you're good!

---

## Step 2: Install Homebrew (5 minutes)

Homebrew is a package manager for Mac that makes installing tools easier.

1. Open **Terminal**
2. Copy and paste this entire command:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
3. Press **Enter** and follow the prompts
4. Enter your Mac password when asked (you won't see it typing)
5. Wait for installation to complete

**Verify installation:**
```bash
brew --version
```
You should see a version number.

---

## Step 3: Install Node.js (5 minutes)

1. In **Terminal**, type:
```bash
brew install node
```
2. Wait for it to install

**Verify installation:**
```bash
node --version
npm --version
```
Both should show version numbers.

---

## Step 4: Download Your Project Files

1. Download all your project files to a folder on your Mac
2. Put them in an easy location like: `/Users/YourName/Desktop/mmddyyyy`
3. Make sure ALL files are there (App.tsx, components folder, etc.)

---

## Step 5: Install Project Dependencies (10 minutes)

1. Open **Terminal**
2. Navigate to your project folder:
```bash
cd ~/Desktop/mmddyyyy
```
(Replace with your actual path)

3. Install all the packages:
```bash
npm install
```
4. Wait for it to finish (might take 5-10 minutes)

5. Install Capacitor:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
```

---

## Step 6: Initialize Capacitor

1. In **Terminal** (still in your project folder), run:
```bash
npx cap init
```

2. When prompted:
   - **App name:** mmddyyyy
   - **App ID:** com.mmddyyyy.app
   - **Web asset directory:** dist

---

## Step 7: Build Your Web App

1. Build the production version:
```bash
npm run build
```

2. You should see a new **dist** folder appear in your project

---

## Step 8: Add iOS Platform

1. Add iOS to your project:
```bash
npx cap add ios
```

2. This creates an **ios** folder with your Xcode project

---

## Step 9: Sync Your Web App to iOS

Every time you make changes to your web app, run:
```bash
npm run build
npx cap sync ios
```

---

## Step 10: Open in Xcode

1. Open the iOS project:
```bash
npx cap open ios
```

2. Xcode will open with your project

---

## Step 11: Configure Your iOS Project in Xcode

1. In Xcode, click on **App** in the left sidebar (the blue icon at the top)
2. Under **Signing & Capabilities** tab:
   - Check **"Automatically manage signing"**
   - Select your **Team** (use your Apple ID - click "Add Account" if needed)
   - The bundle identifier should be: `com.mmddyyyy.app`

3. Under **General** tab:
   - Set **Display Name** to: **mmddyyyy**
   - Set **Minimum Deployments** to: **iOS 13.0**

---

## Step 12: Connect Your iPhone

1. Connect your iPhone to your Mac with a USB cable
2. On your iPhone, if prompted to "Trust This Computer", tap **Trust**
3. Enter your iPhone passcode

4. In Xcode, at the top near the play button, click the device dropdown
5. Select your iPhone from the list

---

## Step 13: Enable Developer Mode on iPhone

**For iOS 16 and later:**
1. On your iPhone, go to **Settings** → **Privacy & Security**
2. Scroll down to **Developer Mode**
3. Turn it **ON**
4. Your iPhone will restart
5. After restart, confirm you want to enable Developer Mode

---

## Step 14: Build and Run on Your iPhone! 🎉

1. In Xcode, click the **Play button** (▶) in the top left, or press **Cmd+R**
2. Xcode will build the app (first time takes 2-5 minutes)
3. The app will install on your iPhone
4. If you see an "Untrusted Developer" error on your iPhone:
   - Go to **Settings** → **General** → **VPN & Device Management**
   - Tap your Apple ID under "Developer App"
   - Tap **Trust**
   - Go back and open the app

---

## Step 15: Testing and Debugging

**To see console logs:**
1. In Xcode, go to **Window** → **Devices and Simulators**
2. Select your iPhone
3. Click **Open Console** to see app logs

**If the app crashes:**
1. Check the Xcode console for error messages
2. Make sure your Supabase backend is accessible from the iPhone
3. Make sure all environment variables are set

---

## Making Changes and Rebuilding

Whenever you update your web app code:

1. **Build the web app:**
```bash
npm run build
```

2. **Sync to iOS:**
```bash
npx cap sync ios
```

3. **Run in Xcode again** (press Cmd+R)

**Quick command for all three steps:**
```bash
npm run build && npx cap sync ios && npx cap open ios
```

---

## Common Issues and Solutions

### "No Team" Error in Xcode
- Click "Add Account" and sign in with your Apple ID (free)
- Select your account as the team

### "Failed to code sign"
- Make sure "Automatically manage signing" is checked
- Try creating a unique bundle ID like: `com.yourname.mmddyyyy`

### App shows blank white screen
- Check that `webDir: 'dist'` in capacitor.config.ts
- Make sure you ran `npm run build` before `npx cap sync`

### Can't see device in Xcode
- Unplug and replug your iPhone
- Make sure you tapped "Trust" on the iPhone
- Restart Xcode

### "Unable to install" error
- Delete the app from your iPhone if it exists
- In Xcode: Product → Clean Build Folder (Shift+Cmd+K)
- Try building again

---

## Updating the Backend URLs

Since you're using Supabase, you need to make sure the app can reach your backend from your phone:

1. Your Supabase URL should already be publicly accessible
2. The environment variables in `/utils/supabase/info.tsx` should work
3. Test on your phone - if data doesn't load, check the Xcode console for network errors

---

## Next Steps: TestFlight (Optional)

If you want to share the app with others or install it without a cable:

1. Enroll in Apple Developer Program ($99/year)
2. Create an App Store Connect account
3. Upload your app via Xcode
4. Create a TestFlight beta
5. Share the TestFlight link

I can provide detailed steps for this if you want to go this route!

---

## Need Help?

If you get stuck at any step:
1. Copy the exact error message
2. Let me know which step you're on
3. I'll help you troubleshoot!

Good luck! 🚀
