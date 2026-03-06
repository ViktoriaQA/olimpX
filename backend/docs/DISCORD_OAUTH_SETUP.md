# Discord OAuth Setup Guide

This guide explains how to set up Discord OAuth authentication for the CodeArena platform.

## 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name (e.g., "CodeArena")
3. Go to the "OAuth2" section
4. Set the redirect URI:
   - Development: `http://localhost:3001/auth/discord/callback`
   - Production: `https://your-domain.com/auth/discord/callback`
5. Copy the Client ID and Client Secret

## 2. Environment Variables

Add the following to your `.env` file:

```bash
# Discord OAuth Configuration
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
DISCORD_REDIRECT_URI=http://localhost:3001/auth/discord/callback
```

## 3. Database Schema

The Discord OAuth implementation uses the existing `custom_users` table with an additional `avatar_url` field:

```sql
ALTER TABLE custom_users ADD COLUMN avatar_url TEXT;
```

## 4. Features

### Discord Registration Flow
- Users can register/login using their Discord account
- Discord username and discriminator are used as nickname (e.g., "User#1234")
- Discord avatar is automatically imported
- Users are marked as verified (no email verification needed)

### OAuth Scopes
- `identify`: Get user's Discord ID, username, discriminator, and avatar
- `email`: Get user's email address

## 5. API Endpoints

### Get Discord Auth URL
```
GET /auth/discord/login
```
Returns the Discord OAuth authorization URL.

### Discord OAuth Callback
```
GET /auth/discord/callback?code=...
```
Handles the Discord OAuth callback and creates/updates user account.

## 6. Frontend Integration

The frontend already includes Discord login buttons in the authentication components:

- `AuthButtons` component displays Discord login button
- `useAuth` hook includes `loginWithDiscord()` function
- OAuth callback handling is automatic

## 7. Testing

1. Start the backend server
2. Start the frontend application
3. Navigate to `/auth`
4. Click the "Discord" button
5. Complete the Discord OAuth flow
6. Verify user is created and logged in

## 8. Security Considerations

- Discord users are automatically verified (email verification not required)
- Discord OAuth tokens are not stored, only used for initial authentication
- JWT tokens are generated and managed the same way as regular users

## 9. Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**
   - Ensure the redirect URI in Discord Developer Portal matches your environment variable
   - Check for typos in the URL

2. **Client ID/Secret Issues**
   - Verify the Discord application is properly configured
   - Check that the client ID and secret are correctly set in environment variables

3. **Avatar Not Loading**
   - Discord avatars may take time to load
   - Check that the avatar URL is correctly formatted

4. **Email Not Available**
   - Some Discord users may not have verified email addresses
   - The implementation requires email access for account creation

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

This will show detailed OAuth flow information in the server logs.
