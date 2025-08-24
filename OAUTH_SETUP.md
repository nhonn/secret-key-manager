# OAuth Redirect URL Configuration

## Current Configuration

The application is configured to use the following OAuth redirect URL:

```
{DOMAIN}/auth/callback
```

Where `{DOMAIN}` is your application's domain.

## Development Environment

For local development, the redirect URL should be:
```
http://localhost:5174/auth/callback
```

## Production Environment

For production deployment, the redirect URL should be:
```
https://your-domain.com/auth/callback
```

## Supabase Configuration

### Steps to Configure OAuth in Supabase:

1. **Go to Supabase Dashboard**
   - Navigate to your project dashboard
   - Go to Authentication > Settings

2. **Configure Site URL**
   - Set the Site URL to your application's base URL
   - Development: `http://localhost:5174`
   - Production: `https://your-domain.com`

3. **Add Redirect URLs**
   - In the "Redirect URLs" section, add:
   - Development: `http://localhost:5174/auth/callback`
   - Production: `https://your-domain.com/auth/callback`

4. **Google OAuth Provider**
   - Enable Google provider in Authentication > Providers
   - Add your Google OAuth Client ID and Client Secret
   - Ensure the redirect URI in Google Console matches Supabase's callback URL

## Google OAuth Console Configuration

In your Google OAuth Console, add these authorized redirect URIs:

1. **Supabase Auth Callback** (primary):
   ```
   https://qjpgndiglfxdlbmblqaz.supabase.co/auth/v1/callback
   ```

2. **Application Callback** (if needed):
   ```
   http://localhost:5174/auth/callback
   https://your-domain.com/auth/callback
   ```

## Troubleshooting

### Common Issues:

1. **"Auth session missing!" Error**
   - Verify redirect URLs match exactly (including protocol)
   - Check that cookies are enabled in browser
   - Ensure no ad blockers are interfering

2. **"Invalid redirect URI" Error**
   - Double-check Google Console redirect URIs
   - Verify Supabase redirect URLs configuration
   - Ensure protocol (http/https) matches exactly

3. **Session Not Persisting**
   - Check browser storage settings
   - Verify Supabase client configuration
   - Ensure `persistSession: true` in Supabase client

## Code Implementation

The OAuth flow is implemented in:

- **Sign In**: `src/services/auth.ts` - `signInWithGoogle()` method
- **Callback Handling**: `src/pages/AuthCallback.tsx`
- **Routing**: `src/App.tsx` - `/auth/callback` route

### Key Configuration Points:

1. **AuthService.signInWithGoogle()**:
   ```typescript
   redirectTo: `${window.location.origin}/auth/callback`
   ```

2. **Route Configuration**:
   ```typescript
   <Route path="/auth/callback" element={<AuthCallback />} />
   ```

3. **Supabase Client**:
   ```typescript
   detectSessionInUrl: true,
   persistSession: true,
   autoRefreshToken: true
   ```