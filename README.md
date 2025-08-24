# Secret Key Manager

A secure web application for managing secret keys, API keys, and environment variables with Google OAuth authentication and client-side encryption.

## Features

- 🔐 **Google OAuth Authentication**: Secure login with automatic account creation
- 🛡️ **Client-side Encryption**: Zero-knowledge architecture with AES-256-GCM encryption
- 📁 **Organized Storage**: Hierarchical folder structure for different environments
- 🔑 **API Key Management**: Store and manage API keys with expiration tracking
- 🌍 **Environment Variables**: Secure storage of environment-specific configurations
- 📊 **Access Logging**: Comprehensive audit trail for all operations
- 📱 **Responsive Design**: Mobile-first design with Tailwind CSS

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Headless UI
- **State Management**: Zustand
- **Authentication**: Supabase Auth (Google OAuth)
- **Database**: Supabase (PostgreSQL)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Heroicons
- **Encryption**: Web Crypto API

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Google OAuth credentials

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd secret-key-manager
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

5. Start the development server:
```bash
npm run dev
```

## Project Structure

```
secret-key-manager/
├── credentials/                 # Secure credential storage (excluded from git)
│   ├── development/
│   │   ├── api-keys/
│   │   ├── database/
│   │   └── environment-variables/
│   ├── staging/
│   ├── production/
│   └── shared/
├── src/
│   ├── components/
│   │   ├── auth/               # Authentication components
│   │   ├── dashboard/          # Dashboard components
│   │   ├── secrets/            # Secret management components
│   │   ├── credentials/        # Credential management components
│   │   ├── settings/           # Settings components
│   │   └── ui/                 # Reusable UI components
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # API services and utilities
│   ├── stores/                 # Zustand stores
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Utility functions
├── public/
└── package.json
```

## Security Features

### Client-side Encryption
- All sensitive data is encrypted using AES-256-GCM before transmission
- Encryption keys are derived using PBKDF2 with 100,000 iterations
- Zero-knowledge architecture - server never sees plaintext data

### Access Control
- Row Level Security (RLS) policies in Supabase
- Users can only access their own data
- Comprehensive audit logging
- Session-based authentication with automatic refresh

### Credential Management
- Structured folder hierarchy for different environments
- Automatic expiration tracking for API keys
- Secure backup and rotation policies
- File permissions set to 600 for credential files

## Environment Setup

### Supabase Configuration

1. Create a new Supabase project
2. Enable Google OAuth in Authentication settings
3. Run the database migrations (see `/docs/database-schema.sql`)
4. Configure Row Level Security policies

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5173` (development)
   - `https://your-domain.com` (production)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Code Style

- ESLint + Prettier for code formatting
- TypeScript strict mode enabled
- Conventional commit messages
- Pre-commit hooks with Husky

## Security Guidelines

### Credential Storage

1. **Never commit credentials to version control**
2. Use environment-specific folders in `credentials/`
3. Encrypt all credential files at rest
4. Set proper file permissions (600)
5. Implement regular key rotation
6. Use secure backup strategies

### Development Best Practices

1. Always use HTTPS in production
2. Implement Content Security Policy (CSP)
3. Validate all inputs on both client and server
4. Use secure session management
5. Implement proper error handling
6. Regular security audits and dependency updates

## Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Google OAuth production credentials
- [ ] Supabase production database
- [ ] HTTPS certificate installed
- [ ] CSP headers configured
- [ ] Error monitoring setup
- [ ] Backup strategy implemented

### Recommended Hosting

- **Frontend**: Vercel, Netlify, or AWS S3 + CloudFront
- **Backend**: Supabase (managed)
- **Domain**: Custom domain with HTTPS

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation in `/docs`
- Review security guidelines

---

**⚠️ Security Notice**: This application handles sensitive data. Always follow security best practices and never commit credentials to version control.