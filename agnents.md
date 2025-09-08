# 🤖 Copilot Agent Guidelines – AI Email Summarizer SaaS (Backend Only)

This repository contains the **Backend (NestJS)** for an **AI SaaS app**: an **Email Summarizer & Prioritizer**.  
The **Frontend (Next.js)** lives in a **separate repository**.  
Package manager: **Yarn**.

---

## 🎯 Backend Goals

- Handle **user authentication** via **Google OAuth2**.
- Fetch **emails from Gmail API**.
- Summarize & prioritize emails using **OpenAI API**.
- Store users, emails, and daily summaries in **Postgres**.
- Expose **REST APIs** (secured with JWT) for the frontend.
- Automate **daily digests** with cron jobs.

---

## 🛠 Tech Stack & Standards

- **NestJS 11** (core framework).
- **TypeORM + Postgres** for persistence.
- **Passport + JWT** for authentication.
- **@nestjs/schedule** for cron jobs.
- **@nestjs/swagger** for API docs.
- **Yarn** as the package manager.

### Modules

- **AuthModule** → Google OAuth2, JWT issuance.
- **UserModule** → manage users, refresh tokens.
- **EmailModule** → Gmail API integration, email storage.
- **AiSummaryModule** → AI summarization via OpenAI API.
- **SchedulerModule** → daily cron job to fetch + summarize emails.

---

## 📝 Code Guidelines

- Use **TypeScript** throughout.
- Follow **NestJS conventions**:
  - `Modules` contain `Controllers`, `Services`, and `Entities`.
  - Use **DTOs** + `class-validator` for validation.
- Naming conventions:
  - Entities → PascalCase (`User`, `EmailMessage`).
  - Tables → snake_case (`users`, `email_messages`).
  - DTOs → suffix with `Dto` (`CreateUserDto`).
- All services should follow **single responsibility principle**.
- Always expose APIs with **Swagger decorators**.
- Use **ConfigModule** for env variables.
- Prefer `async/await` (no `.then`).

---

## 🔐 Security & Privacy

- Store **Gmail refresh tokens** securely (encrypted in DB).
- Do not log raw email bodies.
- All endpoints must be **JWT-guarded**, except `/auth/*`.
- CORS configuration is not handled here → frontend will be in another repo.

---

## ✅ Development Workflow

1. Install dependencies with **Yarn** (`yarn install`).
2. Start development: `yarn start:dev`.
3. Run linting: `yarn lint`.
4. Run tests: `yarn test` / `yarn test:watch`.
5. Build project: `yarn build`.
6. Generate Swagger docs → `/api/docs`.
7. Deploy to **Railway / Render / AWS Lambda**.

---

## 🧭 Copilot Guidance

- Always **suggest NestJS-first solutions** (modules, guards, services).
- Use **Yarn commands** (`yarn add`, `yarn remove`) for dependencies.
- Prefer **TypeORM entities & migrations** for database work.
- When suggesting auth, use **Google OAuth + JWT**.
- When suggesting scheduling, use **@nestjs/schedule**.
- When suggesting AI integration, use **OpenAI API** with structured JSON output.

---
