# 📧 Gmail OAuth2 Integration Guide

## Where to Add Your Gmail OAuth2 Credentials

After obtaining your Gmail OAuth2 credentials from Google Cloud Console, add them to the backend environment file:

### File Location
```
/app/backend/.env
```

### Add These Lines
```env
# Gmail OAuth2 Configuration
GMAIL_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GMAIL_CLIENT_SECRET="your-client-secret-here"
GMAIL_REFRESH_TOKEN="your-refresh-token-here"
```

### Example:
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
JWT_SECRET_KEY="your-secret-key-change-in-production"

# Gmail OAuth2 Configuration (ADD THESE)
GMAIL_CLIENT_ID="123456789-abcdefgh.apps.googleusercontent.com"
GMAIL_CLIENT_SECRET="GOCSPX-abcdefghijklmnop"
GMAIL_REFRESH_TOKEN="1//0abcdefghijklmnopqrstuvwxyz"
```

## How to Obtain Gmail OAuth2 Credentials

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "Hostel Parcel Management"
4. Click "Create"

### Step 2: Enable Gmail API
1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on "Gmail API"
4. Click "Enable"

### Step 3: Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type
3. Click "Create"
4. Fill in required information:
   - App name: "Hostel Parcel Management"
   - User support email: Your email
   - Developer contact: Your email
5. Click "Save and Continue"
6. On "Scopes" page, click "Add or Remove Scopes"
7. Search for and add: `https://www.googleapis.com/auth/gmail.send`
8. Click "Save and Continue"
9. Add your email as a test user
10. Click "Save and Continue"

### Step 4: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Select "Desktop app" as application type
4. Name: "Hostel Parcel Desktop"
5. Click "Create"
6. Download the JSON file (contains Client ID and Client Secret)

### Step 5: Generate Refresh Token

#### Method 1: Using OAuth2 Playground (Easiest)
1. Go to [OAuth2 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret
5. Close the settings
6. In the left panel, scroll down to "Gmail API v1"
7. Select `https://www.googleapis.com/auth/gmail.send`
8. Click "Authorize APIs"
9. Sign in with your Google account
10. Click "Allow"
11. Click "Exchange authorization code for tokens"
12. Copy the "Refresh token" value

#### Method 2: Using Python Script
Create a file `generate_token.py`:

```python
from google_auth_oauthlib.flow import InstalledAppFlow
import json

# Your credentials from downloaded JSON
CLIENT_ID = 'your-client-id.apps.googleusercontent.com'
CLIENT_SECRET = 'your-client-secret'

# Create flow
flow = InstalledAppFlow.from_client_config(
    {
        "installed": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "redirect_uris": ["http://localhost"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    },
    scopes=['https://www.googleapis.com/auth/gmail.send']
)

# Run local server
creds = flow.run_local_server(port=0)

print("\n=== Your Refresh Token ===")
print(creds.refresh_token)
print("\nAdd this to backend/.env as GMAIL_REFRESH_TOKEN")
```

Run:
```bash
cd /app/backend
pip install google-auth-oauthlib
python generate_token.py
```

### Step 6: Add Credentials to .env
1. Open `/app/backend/.env`
2. Add the three values you obtained:
   ```env
   GMAIL_CLIENT_ID="your-client-id"
   GMAIL_CLIENT_SECRET="your-client-secret"  
   GMAIL_REFRESH_TOKEN="your-refresh-token"
   ```

### Step 7: Restart Backend
```bash
sudo supervisorctl restart backend
```

## Testing Email OTP

### Before Configuration
OTPs are printed to console logs:
```bash
# View backend logs
tail -f /var/log/supervisor/backend.out.log

# You'll see:
# Gmail not configured. OTP for student@iiitg.ac.in: 123456
```

### After Configuration
OTPs will be sent via email to students. You can still see them in logs for debugging.

## Security Notes

⚠️ **Important Security Practices:**

1. **Never commit credentials to Git**
   - The `.env` file is already in `.gitignore`
   - Never share your Client Secret or Refresh Token

2. **Use environment variables in production**
   - Store credentials securely in your deployment platform
   - Never hardcode in source files

3. **Rotate tokens periodically**
   - Generate new OAuth credentials every few months
   - Revoke old tokens in Google Cloud Console

4. **Limit OAuth scope**
   - Only use `gmail.send` scope (already configured)
   - Don't request unnecessary permissions

## Troubleshooting

### Error: "Invalid credentials"
- Verify Client ID and Secret are correct
- Check for extra spaces or quotes in .env file
- Ensure OAuth consent screen is configured

### Error: "Token expired"
- Refresh tokens shouldn't expire, but may be revoked
- Generate a new refresh token using the steps above
- Check that you used the correct scope

### Error: "Rate limit exceeded"
- Gmail API has sending limits
- For testing, this should be fine
- For production, consider implementing rate limiting

### OTPs still not sending
1. Check backend logs: `tail -f /var/log/supervisor/backend.out.log`
2. Verify credentials are loaded: Check for "Gmail configured" message
3. Test with curl to verify API is working
4. Ensure test email is added to OAuth consent screen test users

## Production Deployment

For production deployment:

1. **Publish OAuth Consent Screen**
   - Go to OAuth consent screen in Google Cloud Console
   - Click "Publish App"
   - Submit for verification (may take days)

2. **Use Service Account** (Alternative)
   - For unattended operation
   - Create Service Account in Google Cloud Console
   - Enable domain-wide delegation
   - Grant Gmail sending permission

3. **Consider Email Service**
   - For high volume, consider:
     - SendGrid
     - Amazon SES
     - Mailgun
   - Better deliverability and monitoring

## Alternative: SMTP with App Password (Simpler)

If OAuth2 is too complex, you can use Gmail SMTP with an App Password:

### Steps:
1. Enable 2FA on your Google account
2. Go to Google Account → Security → App Passwords
3. Generate an app password for "Mail"
4. Update `backend/server.py` to use SMTP instead of OAuth2

### Code Change:
Replace the `send_email_otp` function in `server.py` with:

```python
import smtplib
from email.mime.text import MIMEText

async def send_email_otp(email: str, otp_code: str):
    GMAIL_ADDRESS = "your-email@gmail.com"
    GMAIL_APP_PASSWORD = os.environ.get('GMAIL_APP_PASSWORD', '')
    
    if not GMAIL_APP_PASSWORD:
        print(f"Gmail not configured. OTP for {email}: {otp_code}")
        return True
    
    try:
        msg = MIMEText(f"Your OTP for parcel verification is: {otp_code}")
        msg['Subject'] = 'Hostel Parcel Management - OTP'
        msg['From'] = GMAIL_ADDRESS
        msg['To'] = email
        
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            smtp.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return True
```

Add to `.env`:
```env
GMAIL_APP_PASSWORD="your-16-character-app-password"
```

---

**Need Help?** Check the main README.md for more information or refer to [Google's OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2).
