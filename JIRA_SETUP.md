# Jira Integration Setup Guide

This guide will help you set up OAuth 2.0 authentication with Jira so users can connect their Jira accounts to the TicketWizard.

## Step 1: Create an Atlassian OAuth 2.0 App

1. Go to the [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Click "Create" and select "OAuth 2.0 integration"
3. Fill in your app details:
   - **Name**: Ticket Wizard (or your preferred name)
   - **Description**: AI-powered Jira ticket creation and refinement tool
   - **URL**: Your application URL (e.g., `https://yourdomain.com` or `http://localhost:3000` for development)

## Step 2: Configure OAuth Settings

1. In your newly created app, go to the "Settings" tab
2. Under "Permissions", click "Add" and select "Jira API"
3. Add the following scopes:
   - `read:jira-work` - Read Jira project and issue data
   - `write:jira-work` - Create and update issues
   - `manage:jira-project` - Access project information (optional, for better UX)

4. Under "Authorization", set the redirect URL:
   - **Development**: `http://localhost:3000/api/jira/auth/callback`
   - **Production**: `https://yourdomain.com/api/jira/auth/callback`

## Step 3: Get Your OAuth Credentials

1. In the app settings, note down:
   - **Client ID**: Found in the "Settings" tab
   - **Client Secret**: Click "Generate a client secret" if you haven't already

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update the values in `.env.local`:
   ```bash
   JIRA_CLIENT_ID=your_actual_client_id
   JIRA_CLIENT_SECRET=your_actual_client_secret
   JIRA_REDIRECT_URI=http://localhost:3000/api/jira/auth/callback
   NEXTAUTH_URL=http://localhost:3000
   ```

## Step 5: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to `http://localhost:3000/settings`
3. In the "Jira Connection" section:
   - Enter your Jira instance URL (e.g., `mycompany.atlassian.net`)
   - Click "Test" to verify the instance exists
   - Click "Connect to Jira" to start the OAuth flow
   - Authorize the app in the Atlassian OAuth page
   - You should be redirected back with a success message

## Step 6: Production Deployment

For production deployment:

1. Update your Atlassian app settings:
   - Add your production domain to authorized redirect URIs
   - Update the app URL to your production domain

2. Update your production environment variables:
   ```bash
   JIRA_CLIENT_ID=your_client_id
   JIRA_CLIENT_SECRET=your_client_secret
   JIRA_REDIRECT_URI=https://yourdomain.com/api/jira/auth/callback
   NEXTAUTH_URL=https://yourdomain.com
   ```

## Troubleshooting

### Common Issues

1. **"OAuth credentials not configured" error**
   - Make sure `JIRA_CLIENT_ID` and `JIRA_CLIENT_SECRET` are set in your environment

2. **"Invalid redirect URI" error**
   - Ensure the redirect URI in your Atlassian app exactly matches `JIRA_REDIRECT_URI`
   - Check for trailing slashes and http vs https

3. **"Access denied" error**
   - Verify that your app has the correct Jira API scopes
   - Make sure the user has access to the Jira instance

4. **"Instance not found" error**
   - Check that the Jira instance URL is correct
   - Ensure it's a Jira Cloud instance (not Server/Data Center)

### Testing with Different Jira Instances

The app supports any Jira Cloud instance. Users just need to:
1. Enter their instance URL (e.g., `company.atlassian.net`)
2. Complete the OAuth flow
3. Grant permissions to their specific Jira site

### API Rate Limits

Jira Cloud has rate limits:
- 10 requests per second per app per IP
- 300 requests per minute per app per IP

The implementation includes basic error handling for rate limits, but consider implementing exponential backoff for production use.

## Security Notes

- Never commit your `.env.local` file with real credentials
- Use strong, unique client secrets
- Regularly rotate your OAuth credentials
- Monitor your app's usage in the Atlassian Developer Console
- Consider implementing additional security measures like PKCE for enhanced security