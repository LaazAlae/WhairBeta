# Whair Platform Testing Walkthrough

**Version:** Beta
**Last Updated:** March 2026
**For:** Nyree (CEO) & Alae (CTO)

---

## What is this guide?

This is your hands-on testing manual for the Whair platform. It walks you through each feature as a **creator would experience it**, not as a developer. Each section explains what the feature does, why it matters for creators, and exactly how to test it step-by-step.

Think of this as your tour guide through the app. By the end, you'll have tested every core feature and understand the full creator journey from enrollment to enforcement.

---

## 1. Account & Identity

### Sign Up

**What this does:**
Creates your Whair creator account. This is your identity on the platform, and everything you do — enrolling photos, detecting violations, filing takedowns — is tied to this account.

**Why it matters:**
Without an account, you can't protect your likeness. This is the foundation of everything. Your account is where all your evidence, case history, and provenance records live.

**How to test it:**
1. Open the Whair app in your browser
2. Click **"Get Started"** or **"Sign Up"**
3. Enter a valid email address (use a real one you can access)
4. Create a strong password (minimum 8 characters)
5. Click **"Create Account"**
6. Check your email inbox for a verification email
7. Click the verification link in the email
8. You should be redirected back to the app

**Expected result:**
You should see a green success message and land on the Dashboard. Your email is now verified and you're logged in.

---

### Log In

**What this does:**
Securely accesses your existing Whair account using your email and password.

**Why it matters:**
This is how you return to the platform to check on violations, review cases, or manage your identity after your initial setup.

**How to test it:**
1. If you're logged in, log out first (click your profile icon in the top right, then "Log Out")
2. Go to the app homepage
3. Click **"Log In"**
4. Enter the email and password you used to sign up
5. Click **"Sign In"**

**Expected result:**
You should be logged in and see your Dashboard with any enrolled assets or recent activity.

---

### Enroll Your Identity

**What this does:**
Registers 5 or more photos of your face as your reference images. These photos are hashed, cryptographically signed, and stored as your "proof of ownership" — like a digital fingerprint of your likeness.

**Why it matters:**
This is the core of the platform. These reference photos are what Whair uses to detect unauthorized uses of your face across the internet. Without enrollment, you can't run scans or file takedowns. Think of this as registering your trademark, but for your face.

**How to test it:**
1. Log in to your account
2. In the sidebar, click **Identity** > **Enroll**
3. You should see a file upload area with instructions to upload 5-10 clear face photos
4. Drag and drop 5+ photos of your face (or click to browse and select them)
   - Use clear, well-lit photos
   - Different angles work best (front-facing, profile, 3/4 view)
   - Make sure your face is visible and in focus
5. Once you've selected 5+ photos, the interface should advance to Step 2
6. Enter a **Display Name** (e.g., "Nyree Williams" or "Alae Boufarrachene")
7. Click **"Upload & Register"**
8. Watch the progress bar — it should show hashing and registration progress
9. Wait for the green success message

**Expected result:**
You should see a green checkmark icon and the message "Identity enrolled successfully!" The app should automatically redirect you to the Identity page where you can see all your enrolled photos in a grid. Each photo now has a cryptographic hash and provenance record.

---

### Manage Assets (View, Add, Delete)

**What this does:**
Shows all your enrolled reference photos in one place. You can view them, add more photos to strengthen your reference library, or delete photos you no longer want to use.

**Why it matters:**
Your reference library should evolve with you. As you update your look (new haircut, aging, different styling), you should add new photos so detection stays accurate. You can also remove outdated or low-quality photos.

**How to test it:**
1. Go to **Identity** > **Assets** in the sidebar
2. You should see a grid of all your enrolled photos
3. Hover over any photo to see options
4. **To delete a photo:**
   - Click the delete icon (trash can) on any photo
   - Confirm the deletion
   - The photo should disappear from the grid
5. **To add more photos:**
   - Click **"Add More Assets"** button
   - Upload 1 or more new photos
   - Enter your display name again (or confirm it's correct)
   - Click **"Upload & Register"**
   - The new photos should appear in your asset grid

**Expected result:**
Your asset grid updates in real-time. Deleted photos are removed. New photos appear after successful upload with their own hashes and provenance records.

---

### Edit Profile

**What this does:**
Updates your display name, which appears on all legal documents, takedown requests, and provenance records.

**Why it matters:**
Your display name is your legal identity on the platform. If you file a DMCA takedown, platforms see this name. It should match your real name or stage name for legal purposes.

**How to test it:**
1. Go to **Settings** in the sidebar
2. Scroll to the **Profile Information** section
3. You'll see your email (read-only — it can't be changed)
4. Find the **Display Name** field
5. Update your display name (try changing it to a variation or nickname)
6. Click **"Update Profile"**

**Expected result:**
You should see a green success message like "Profile updated successfully." Your new display name should now appear in the top right corner of the app and on any future evidence packets you generate.

---

## 2. Verification (Provenance)

### Sign an Asset

**What this does:**
Creates a cryptographic signature (hash) of any file you own. It's like getting a document notarized — it proves YOU owned this exact file at this exact timestamp, before anyone else used it.

**Why it matters:**
This is your proof of ownership. If someone claims they created your photo first, you can show this provenance record with a timestamp proving you owned it earlier. It's legally defensible evidence in court or DMCA cases.

**How to test it:**
1. Go to **Verification** > **Sign** in the sidebar
2. You should see a list or grid of your enrolled assets
3. Select any asset from the list (click the radio button or card)
4. Click **"Sign Asset"**
5. The system will generate a cryptographic hash and timestamp
6. Wait for the success message

**Expected result:**
You should see a confirmation that the asset has been signed, along with details like:
- The SHA-256 hash of the file
- The timestamp when it was signed
- A unique signature ID

This record is now stored on the blockchain (or Whair's provenance ledger) and can be verified by anyone.

---

### Verify an Asset

**What this does:**
Checks if any file has already been registered in the Whair system. Upload any image, and Whair will tell you if it matches a registered hash and who owns it.

**Why it matters:**
This is how you (or anyone else) can verify authenticity. If someone sends you a photo claiming it's theirs, you can upload it here and see if it matches your provenance record — or someone else's.

**How to test it:**
1. Go to **Verification** > **Verify** in the sidebar
2. Click **"Upload File"** or drag and drop an image
3. **Test Case A:** Upload one of your enrolled photos
   - You should see a match confirmation
   - It should show YOUR name as the owner
   - You should see the original signature date
4. **Test Case B:** Upload a random image from the internet
   - You should see "No match found" or "File not registered"

**Expected result:**
For your own enrolled photos, you get a green "VERIFIED" badge with your name and signature details. For random images, you get a message saying the file isn't registered in the system.

---

### View Signing History

**What this does:**
Shows a timeline of every asset you've signed, with timestamps, hashes, and signature IDs.

**Why it matters:**
This is your audit trail. If you ever need to prove ownership in a legal case, this is your evidence log. It shows exactly when you registered each file and creates an immutable record.

**How to test it:**
1. Go to **Verification** > **History** in the sidebar
2. You should see a table or timeline view of all signed assets
3. Each entry should show:
   - File name
   - Signature date/time
   - Hash value
   - Status (e.g., "Signed", "Verified")

**Expected result:**
You see a chronological list of all the assets you've signed, most recent first. You can click any entry to see full details like the SHA-256 hash and blockchain/ledger confirmation.

---

## 3. Detection

### Scan a URL

**What this does:**
Checks a specific webpage or social media post to see if it contains your face. You paste in the URL, and Whair scans the page, extracts images, and compares them to your enrolled reference photos.

**Why it matters:**
If you suspect someone posted your photo on Instagram, Twitter, or a blog, this is how you check. It gives you match confidence (e.g., 95%) and creates an incident record if there's a match.

**How to test it:**
1. Go to **Detection** > **Monitoring** in the sidebar
2. You should see a form with a URL input field
3. Enter a URL to test:
   - **Test Case A:** Enter a social media post URL that contains a photo of you (if you have one)
   - **Test Case B:** Enter a random blog URL to test "no match" scenario
4. Click **"Scan URL"**
5. Wait for the scan to complete (usually 5-15 seconds)

**Expected result:**
If the URL contains your face:
- You see a card showing the match confidence (e.g., 92%)
- A side-by-side comparison of your reference photo and the detected image
- Details like platform (Instagram, Twitter, etc.), source URL, and timestamp
- A new incident is created in your Incidents dashboard

If no match:
- You see a message like "No matches found on this page"

---

### Web Search (Reverse Image Search)

**What this does:**
Uses Google Cloud Vision to search the ENTIRE internet for your face. You select one of your enrolled photos, and Whair searches billions of web pages to find everywhere that image appears online.

**Why it matters:**
This is how you discover violations you didn't know about. Maybe your photo is on a stock photo site, in an AI training dataset, or reposted across social media. You can't protect your likeness if you don't know where it's being used. This is like having a robot constantly searching for your face 24/7.

**How to test it:**
1. Go to **Detection** > **Web Search** in the sidebar
2. You should see a grid of your enrolled reference photos
3. Click on any photo to select it (it should highlight with a blue border)
4. Click **"Search for this image"**
5. Wait for the search to complete (this can take 30-60 seconds as it queries Google's API)

**Expected result:**
You'll see a results page with several sections:

**Summary Stats:**
- Pages Found: How many web pages contain your image
- Exact Matches: Images that are pixel-perfect matches
- Partial Matches: Images that are cropped or modified versions
- New Incidents: How many violation incidents were created

**Image Labels:** Google's AI describes what's in your image (e.g., "person", "face", "portrait")

**Detected Entities:** People, brands, or concepts Google recognized (e.g., your name if you're famous)

**Pages Containing Your Image:** A list of every web page where your image was found, with:
- Page title
- URL (clickable)
- Number of exact/partial matches on that page

Each discovered page automatically creates an incident in your Incidents dashboard, which you can then enforce against.

---

### Review Incidents

**What this does:**
Shows all detected violations in one dashboard. Each incident is a card showing where your face was found, the match confidence, the platform, and a link to the source.

**Why it matters:**
This is your violation dashboard. It's where you triage threats — high-confidence matches get takedowns, low-confidence matches might be false positives you ignore. You can see at a glance how many active violations you have and prioritize the worst offenders.

**How to test it:**
1. Go to **Detection** > **Incidents** in the sidebar
2. You should see cards for each detected incident
3. Each card shows:
   - Match confidence (e.g., 95%)
   - Platform (Instagram, Twitter, Unknown, etc.)
   - Source URL (clickable to visit the violating page)
   - Thumbnail preview (if available)
   - Status badge (New, Reviewed, Takedown Filed, etc.)
4. **Click on any incident** to see the full details page

**Expected result:**
On the incident detail page, you should see:
- A side-by-side comparison of your reference photo vs. the detected image
- Full metadata (URL, platform, confidence, timestamp)
- Evidence screenshot (if captured)
- Action buttons: **"Create Takedown"** or **"Mark as False Positive"**

Incidents are sorted by confidence (highest first) so you can focus on the most obvious violations.

---

## 4. Enforcement

### Create Takedown

**What this does:**
Generates a complete DMCA takedown evidence packet. This is a legal document bundle that includes:
- Your identity and rights holder information
- The match evidence (your photo vs. their photo)
- Provenance proof (your signature hash and timestamp)
- The source URL and platform details

**Why it matters:**
Filing a DMCA takedown manually is confusing and time-consuming. You have to gather evidence, format it correctly, and fill out platform-specific forms. Whair does this FOR you in one click. It's like having a paralegal who automatically assembles your legal case.

**How to test it:**
1. Go to **Detection** > **Incidents**
2. Click on any incident with high match confidence (90%+)
3. On the incident detail page, click **"Create Takedown"**
4. You'll be taken to the Takedown creation page
5. Review the **Incident Evidence Summary** (source URL, platform, confidence, timestamp)
6. Click **"Generate Takedown Packet"**
7. Wait 5-10 seconds for the packet to generate

**Expected result:**
You should see:
- A green success banner: "Takedown packet generated successfully"
- **Evidence Packet Preview** section showing:
  - Rights Holder Info (your name, email, display name)
  - Infringement Details (source URL, platform, match confidence)
  - Provenance Proof (your signature hash, timestamp, blockchain record if applicable)
  - Match Evidence (side-by-side image comparison)
  - Legal Text (DMCA boilerplate, good faith statement)

This packet is everything a platform needs to process your takedown request. You can copy/paste sections into their forms.

---

### Submit to Platform

**What this does:**
Helps you file the actual takedown by opening the platform's DMCA form and letting you paste in the evidence. After you submit on the platform, you mark the case as "Submitted" in Whair to track its status.

**Why it matters:**
Every platform (Instagram, Twitter, Google, stock photo sites) has a different DMCA form. Whair routes you to the correct form and formats your evidence so it's ready to paste. Then it tracks whether the platform responded, approved, or denied your request.

**How to test it:**
1. After generating a takedown packet (see above), scroll to the **"Submit to Platform"** section
2. You should see a button like **"Go to Instagram Report Form"** or **"Go to Platform Report Form"** (depending on which platform the incident is from)
3. Click this button
4. A new tab opens with the platform's DMCA form (e.g., Instagram's Intellectual Property Violation form)
5. **In the platform form:**
   - Copy your evidence from the Whair packet
   - Paste into the platform's form fields (name, email, description, etc.)
   - Submit the form on the platform
6. **Back in Whair:**
   - Click **"Mark as Submitted"**
7. The case status updates to "Submitted"

**Expected result:**
The button changes to **"Marked as Submitted"** with a green checkmark. The case now appears in your **Enforcement > Cases** list with status "Submitted." You've successfully filed a DMCA takedown.

---

### Track Cases

**What this does:**
Shows all your active enforcement cases in one dashboard. Each case has a status (Draft, Submitted, Acknowledged, Content Removed, Denied) so you can see where it stands.

**Why it matters:**
You might file dozens of takedowns. This dashboard lets you monitor which platforms responded, which ignored you, and which removed the content. It's your case management system.

**How to test it:**
1. Go to **Enforcement** > **Cases** in the sidebar
2. You should see a list or cards of all cases you've created
3. Each case card shows:
   - Platform (Instagram, Twitter, etc.)
   - Source URL
   - Status badge (Draft, Submitted, Acknowledged, Resolved, etc.)
   - Date submitted
4. Click on any case to see its full timeline

**Expected result:**
The case detail page shows:
- All evidence (incident, provenance, rights holder info)
- A timeline of actions (Created → Submitted → Platform Acknowledged → Content Removed)
- Notes field (where you can add updates like "Platform responded on 3/14")
- Status update buttons (e.g., "Mark as Resolved" when the content is taken down)

---

## 5. Monetization

### Connect Stripe

**What this does:**
Links your Stripe account so you can get paid when people license your likeness. Stripe handles payments, tax forms, and bank transfers.

**Why it matters:**
Sometimes it's better to get paid than to file a takedown. If a brand used your face without permission, you can offer them a license for $500 instead of threatening legal action. This turns violations into revenue. But you need a payment processor to collect that money — that's Stripe.

**How to test it:**
1. Go to **Monetization** > **Connect** in the sidebar
2. You should see a **"Connect with Stripe"** button
3. Click it
4. You'll be redirected to Stripe's onboarding flow
5. **If you don't have a Stripe account:**
   - Create one by entering your business info, bank account, and tax details
   - Complete identity verification (Stripe may ask for your SSN or EIN)
6. **If you already have a Stripe account:**
   - Log in and authorize Whair to connect
7. After completing Stripe onboarding, you'll be redirected back to Whair

**Expected result:**
You should see a green checkmark and message: "Stripe account connected." Your **Monetization** dashboard now shows your balance, payout schedule, and license request options.

**Note:** This is an advanced feature. You need a real Stripe account to test this fully. For now, acknowledge that it exists and understand the value: it lets creators monetize violations instead of just removing them.

---

### License Decisions (Approve/Deny Requests)

**What this does:**
When someone wants to license your likeness, they submit a request through Whair. You see the request, set your price, and approve or deny it.

**Why it matters:**
This is how you turn unauthorized uses into revenue. Someone used your photo on their website? Instead of filing a takedown, offer them a retroactive license for $1,000. If they accept, you get paid. If they decline, you file the takedown. It's negotiation leverage.

**How to test it:**
1. Go to **Monetization** > **Licenses** in the sidebar
2. You should see a list of pending license requests (if any exist)
3. Each request shows:
   - Requester name/email
   - Usage description (e.g., "Use on company website for 1 year")
   - Requested terms (duration, exclusivity, territory)
4. **To approve:**
   - Set your price (e.g., $500)
   - Click **"Approve License"**
   - The requester gets a payment link
5. **To deny:**
   - Click **"Deny"**
   - Optionally add a reason (e.g., "This use conflicts with existing contract")

**Expected result:**
Approved licenses move to "Pending Payment" status. Once the requester pays via Stripe, the license moves to "Active" and you receive the payout (minus Stripe fees). Denied licenses are closed and archived.

**Note:** Full testing requires an end-to-end flow with a real license request. For now, acknowledge this feature exists and understand it's how creators monetize their likeness rights.

---

## 6. Settings

### Whitelist (Trusted Domains)

**What this does:**
Lets you add domains that are authorized to use your likeness. For example, if you have a personal website at `nyree.com`, you can whitelist it so Whair doesn't flag it as a violation.

**Why it matters:**
Without this, Whair would create incidents for your OWN website or your client's authorized uses. Whitelisting prevents false alarms and keeps your incident dashboard focused on real threats.

**How to test it:**
1. Go to **Settings** > **Whitelist** in the sidebar (or look for a "Whitelist" tab in Settings)
2. Click **"Add Domain"**
3. Enter a domain (e.g., `mywebsite.com` or `brandpartner.com`)
4. Click **"Save"**
5. Run a URL scan or web search
6. Any matches from whitelisted domains should NOT create incidents

**Expected result:**
Whitelisted domains appear in a list. When detection finds your face on a whitelisted domain, it displays a note like "Whitelisted — authorized use" instead of creating a violation incident.

**Note:** This is a supporting feature. Acknowledge it exists to prevent false positives from authorized partners.

---

### Security (Password, MFA)

**What this does:**
Lets you change your password and enable two-factor authentication (MFA) for extra account security.

**Why it matters:**
Your Whair account holds sensitive legal evidence and personal identity data. Strong security prevents unauthorized access.

**How to test it:**
1. Go to **Settings** > **Security** in the sidebar
2. **To change password:**
   - Click **"Change Password"**
   - Enter your current password
   - Enter a new password (twice)
   - Click **"Update Password"**
   - You should see a success message
3. **To enable MFA (if available):**
   - Click **"Enable Two-Factor Authentication"**
   - Scan the QR code with an authenticator app (Google Authenticator, Authy)
   - Enter the 6-digit code to confirm
   - Save backup codes

**Expected result:**
Password changes take effect immediately (you'll need the new password next time you log in). MFA requires a code from your phone app every time you log in from a new device.

**Note:** These are standard account security features. Acknowledge they work as expected.

---

### Scheduled Scans (Automated Monitoring)

**What this does:**
Runs automatic web searches on a schedule (daily, weekly, monthly) so you don't have to manually search for violations.

**Why it matters:**
You can't manually search for your face every day. Scheduled scans run in the background and alert you when new violations appear. It's like having a 24/7 security guard watching the internet for your likeness.

**How to test it:**
1. Go to **Monitoring** or **Settings** > **Scheduled Scans** (if available)
2. Click **"Create Scheduled Scan"**
3. Select a reference image to monitor
4. Choose a schedule (e.g., "Weekly on Mondays")
5. Click **"Save"**
6. Wait for the schedule to trigger (or manually trigger it if there's a "Run Now" option)

**Expected result:**
On the scheduled day/time, Whair automatically runs a web search for that reference image. Any new incidents are added to your Incidents dashboard and you get an email notification (if notifications are enabled).

**Note:** This is a long-term feature. You won't see results immediately, but acknowledge it exists and adds passive monitoring so creators don't have to remember to scan manually.

---

## Testing Checklist

Use this checklist to confirm you've tested every major feature:

- [ ] **Sign Up** — Created account, verified email
- [ ] **Log In** — Logged in successfully
- [ ] **Enroll Identity** — Uploaded 5+ face photos, entered display name, saw success confirmation
- [ ] **Manage Assets** — Viewed asset grid, deleted a photo, added new photos
- [ ] **Edit Profile** — Changed display name, saw update confirmation
- [ ] **Sign Asset** — Signed an asset, saw hash and timestamp
- [ ] **Verify Asset** — Uploaded enrolled photo (got verified), uploaded random image (no match)
- [ ] **View Signing History** — Saw timeline of signed assets
- [ ] **Scan URL** — Scanned a specific URL, saw match confidence or "no match"
- [ ] **Web Search** — Selected reference image, ran web search, saw results (pages found, incidents created)
- [ ] **Review Incidents** — Viewed incident dashboard, clicked an incident to see details
- [ ] **Create Takedown** — Generated takedown packet from an incident
- [ ] **Submit to Platform** — Opened platform form, marked case as submitted
- [ ] **Track Cases** — Viewed all cases, checked status updates
- [ ] **Connect Stripe** — (Optional) Connected Stripe account or acknowledged feature
- [ ] **License Decisions** — (Optional) Viewed pending licenses or acknowledged feature
- [ ] **Whitelist** — Added a trusted domain, confirmed it doesn't create incidents
- [ ] **Security** — Changed password successfully
- [ ] **Scheduled Scans** — Created or acknowledged automated monitoring

---

## Tips for Effective Testing

1. **Use Real Data:** Upload real photos of yourself (Nyree/Alae) so detection works accurately. Stock photos or random faces won't give you realistic match confidence.

2. **Test Edge Cases:** Try uploading only 4 photos (should fail), try an invalid URL (should show error), try a very long display name (should be rejected).

3. **Check Mobile:** Test key flows on your phone — enrollment, scanning, viewing incidents. Make sure the UI is responsive.

4. **Follow the Journey:** Go in order: Enroll → Verify → Detect → Enforce. Each pillar builds on the previous one.

5. **Look for Visual Feedback:** Every action should have a response — success banners, error messages, loading spinners. If you click a button and nothing happens, that's a bug.

6. **Read the Messages:** Success and error messages explain what happened. If something fails, the error should tell you why (e.g., "Display name must be at least 2 characters").

---

## Understanding the Four Pillars

As you test, keep these pillars in mind:

### Pillar 1: Verification (Provenance)
**Goal:** Prove you own your likeness before anyone uses it.
**Features:** Sign assets, verify ownership, view history.
**Value:** Legal proof of ownership with timestamps.

### Pillar 2: Detection
**Goal:** Find where your likeness is being used without permission.
**Features:** URL scan, web search, incident dashboard.
**Value:** Discover violations you didn't know about.

### Pillar 3: Enforcement
**Goal:** Remove unauthorized uses or stop violators.
**Features:** Generate takedown packets, submit to platforms, track cases.
**Value:** Streamline DMCA process from days to minutes.

### Pillar 4: Monetization
**Goal:** Turn violations into revenue.
**Features:** License requests, Stripe payouts, pricing decisions.
**Value:** Get paid instead of just playing whack-a-mole with takedowns.

---

## What Success Looks Like

After completing this guide, you should:

1. **Understand the creator journey** — from enrolling identity to filing takedowns
2. **Know the value of each feature** — not just what it does, but why it matters
3. **Have tested the core flows** — enrollment, detection, takedown creation
4. **Identified any bugs or UX issues** — anything that confused you or didn't work
5. **Feel confident demoing the app** — you can walk someone else through it

---

## Questions or Issues?

If you encounter bugs, confusing UX, or features that don't work as described, document them:

- What were you trying to do?
- What did you expect to happen?
- What actually happened?
- Can you reproduce it?

This guide is a living document. As the platform evolves, so will this testing walkthrough.

---

**Remember:** You're testing as a creator, not a developer. Focus on the experience, the clarity of the UI, and whether the value proposition is obvious. If something doesn't make sense to you, it won't make sense to creators either.

Good luck, and happy testing!
