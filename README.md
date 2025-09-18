# AI Email Summarizer Backend

A NestJS-based backend for an AI-powered email summarization and prioritization SaaS application.

## 🚀 Features

- **Google OAuth2 Authentication** - Secure login with Gmail access
- **Email Synchronization** - Automatically fetch emails from Gmail API
- **AI-Powered Summarization** - OpenAI integration for email summaries and prioritization
- **Daily Digest** - Automated daily summaries with cron jobs
- **RESTful API** - Well-documented endpoints with Swagger
- **PostgreSQL Database** - Robust data persistence with TypeORM
- **JWT Security** - Secure API endpoints

## 🛠 Tech Stack

- **NestJS 11** - Progressive Node.js framework
- **TypeORM + PostgreSQL** - Database and ORM
- **Passport + JWT** - Authentication and authorization
- **OpenAI API** - AI summarization
- **Google APIs** - Gmail integration
- **Swagger** - API documentation
- **TypeScript** - Type-safe development

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Yarn package manager
- Google Cloud Console project (for OAuth2)
- OpenAI API key

## 🔧 Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd email-summarizer-be
yarn install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Configure your `.env` file:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_postgres_password
DATABASE_NAME=email_summarizer

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Google OAuth2
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_FE_CALLBACK_URL=http://localhost:8000/auth/google/callback

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Application Configuration
PORT=8000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
```

### 3. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE email_summarizer;
```

The database tables will be created automatically when you start the application in development mode.

### 4. Google OAuth2 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API and Google+ API
4. Create OAuth2 credentials (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:8000/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env` file

### 5. OpenAI API Setup

1. Create an account at [OpenAI](https://platform.openai.com/)
2. Generate an API key
3. Add it to your `.env` file

## 🚦 Running the Application

### Development Mode

```bash
yarn start:dev
```

### Production Mode

```bash
yarn build
yarn start:prod
```

### Watch Mode

```bash
yarn start:debug
```

## 📚 API Documentation

Once the application is running, you can access:

- **API Documentation**: http://localhost:8000/api/docs
- **Health Check**: http://localhost:8000

## 🔗 API Endpoints

### Authentication

- `GET /auth/google` - Initiate Google OAuth login
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/profile` - Get current user profile

### Emails

- `POST /emails/sync` - Sync emails from Gmail
- `GET /emails` - Get user emails
- `POST /emails/:id/read` - Mark email as read

### Daily Summaries

- `GET /summaries` - Get daily summaries

## 🔄 Automated Tasks

The application includes several cron jobs:

- **Hourly Email Sync** - Fetches new emails for all users
- **Daily AI Summarization** (9 AM) - Summarizes unsummarized emails
- **Daily Summary Generation** (8 AM) - Creates daily digest

## 🧪 Testing

```bash
# Unit tests
yarn test

# Watch mode
yarn test:watch

# Coverage
yarn test:cov

# E2E tests
yarn test:e2e
```

## 📦 Building

```bash
yarn build
```

## 🔍 Linting

```bash
yarn lint
```

## 📝 Project Structure

```
src/
├── auth/              # Authentication module
├── user/              # User management
├── email/             # Email synchronization
├── ai-summary/        # AI summarization service
├── scheduler/         # Cron jobs and automation
├── summary/           # Daily summaries
├── entities/          # TypeORM entities
├── dto/              # Data transfer objects
└── config/           # Configuration files
```

## 🚀 Deployment

The application is ready for deployment on:

- **Railway**
- **Render**
- **AWS Lambda**
- **Heroku**
- **DigitalOcean**

Make sure to:

1. Set environment variables
2. Configure production database
3. Update CORS settings
4. Set up SSL/HTTPS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is private and proprietary.

---

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check database credentials in `.env`

2. **Google OAuth Error**
   - Verify OAuth2 credentials
   - Check authorized redirect URIs

3. **OpenAI API Error**
   - Verify API key is valid
   - Check API usage limits

### Logs

Application logs are available in the console when running in development mode.

---

**Happy Coding! 🎉**

---

📋 Proposed Modules:

1. SnapshotModule (Core functionality)
   Purpose: Handle daily snapshot creation, retrieval, and management
   Endpoints:
   GET /snapshots - Get user's snapshots (with pagination)
   GET /snapshots/:id - Get specific snapshot with items
   POST /snapshots - Create new snapshot (trigger manually)
   DELETE /snapshots/:id - Delete snapshot (admin/cleanup)
2. SnapshotItemModule (Item actions)
   Purpose: Handle individual snapshot item actions
   Endpoints:
   PATCH /snapshot-items/:id/mark-done - Mark item as done (non-destructive)
   PATCH /snapshot-items/:id/remove-inbox - Remove from Gmail inbox (destructive)
   GET /snapshot-items/:id/open-url - Get Gmail open URL
3. SenderModule (Filtering & management)
   Purpose: Manage senders for UI filtering and future personalization
   Endpoints:
   GET /senders - Get user's senders (for filter dropdown)
   GET /senders/:id/stats - Get sender statistics (future feature)
4. GmailModule (Email integration)
   Purpose: Handle Gmail API operations
   Endpoints:
   GET /gmail/unread - Get unread emails (for snapshot creation)
   POST /gmail/archive/:messageId - Archive email in Gmail
   POST /gmail/delete/:messageId - Delete email in Gmail
   GET /gmail/auth-status - Check OAuth status
5. AnalyticsModule (User interactions)
   Purpose: Track user interactions for KPIs and learning
   Endpoints:
   POST /analytics/interaction - Record user interaction
   GET /analytics/dashboard - Get user dashboard stats
   🤔 Questions for Discussion:
   Module Organization:
   Should SnapshotItemModule be separate or part of SnapshotModule?
   Should GmailModule be separate or integrated into SnapshotModule?
   Authentication:
   All endpoints should require JWT authentication, right?
   Should we use guards on module level or controller level?
   Existing Modules:
   I see you already have EmailModule, SchedulerModule, SummaryModule - should we refactor/integrate with these or keep separate?
   Priority Order:
   Which module should we start with? I suggest this order:

SnapshotModule (core functionality)
GmailModule (email integration)
SnapshotItemModule (user actions)
SenderModule (filtering)
AnalyticsModule (tracking)
DTOs & Validation:
Should we create DTOs for request/response validation?
Pagination strategy for snapshots list?
Which module would you like to start with and discuss in detail?

Claude Sonnet 4 • 1x
