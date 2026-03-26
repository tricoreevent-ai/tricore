# Hostinger Deployment

## Recommended Option

Use `Connect with GitHub`.

This repository already lives on GitHub at:

```text
https://github.com/tricoreevent-ai/tricore
```

`Connect with GitHub` is the better fit for this project than a one-time repository URL import because it makes repeated deployments simpler and keeps Hostinger tied to the branch you push.

## Hostinger Settings

- Repository: `tricoreevent-ai/tricore`
- Branch: `main` unless you intentionally deploy another branch
- Root directory: `/`
- Install command: `npm install`
- Build command: `npm run build`
- Start command: `npm start`
- Node.js version: `22.x`

## Environment Variables

Add the production values from `server/.env` inside the Hostinger Node.js app environment settings.

Minimum required values:

- `HOST`
- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `GOOGLE_CLIENT_ID`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`
- `SMTP_TO_RECIPIENTS`

Optional values:

- `GOOGLE_CLIENT_IDS`
- `CONTACT_FORWARD_EMAILS`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `MONGODB_ALLOW_MEMORY_FALLBACK`
- `MONGODB_SERVER_SELECTION_TIMEOUT_MS`

## Local Helper

Use `deploy.bat` from the repo root to:

1. Install dependencies if needed
2. Build the client
3. Push the current branch to GitHub when the folder is a git checkout
4. Write `hostinger-deploy.txt` with the Hostinger deployment values
