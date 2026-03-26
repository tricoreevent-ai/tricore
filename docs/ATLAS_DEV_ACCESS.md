# Atlas Dev Access

This project can automatically add the current public IP address to the MongoDB Atlas project access list before `npm run dev` starts.

## One-time Atlas setup

1. Create an Atlas Admin API key with permissions to manage project network access.
2. In Atlas Organization Settings, review the setting named `Require IP Access List for the Atlas Administration API`.
3. For development, either disable that Atlas Administration API restriction or allow the IPs that will call the Atlas API for automation.

## Local configuration

Add the following values to `server/.env`:

```env
ATLAS_DEV_AUTO_ALLOW_CURRENT_IP=true
ATLAS_PROJECT_ID=your-atlas-project-id
ATLAS_PUBLIC_KEY=your-atlas-public-key
ATLAS_PRIVATE_KEY=your-atlas-private-key
```

You can also use project name resolution instead of the project ID:

```env
ATLAS_DEV_AUTO_ALLOW_CURRENT_IP=true
ATLAS_PROJECT_NAME=Project 0
ATLAS_ORG_ID=your-atlas-organization-id
ATLAS_PUBLIC_KEY=your-atlas-public-key
ATLAS_PRIVATE_KEY=your-atlas-private-key
```

Optional settings:

```env
ATLAS_DEV_ACCESS_COMMENT_PREFIX=tricore-dev-auto
ATLAS_DEV_ACCESS_DELETE_STALE=true
ATLAS_DEV_ACCESS_WAIT_TIMEOUT_MS=90000
```

## Behavior

- `npm run dev` runs `scripts/ensure-atlas-dev-access.mjs` before starting the server.
- If the current IP is missing, the script adds it to the Atlas project access list.
- If stale auto-managed IP entries exist, the script removes them.
- If Atlas automation is not configured, development continues normally and the app can still fall back to the in-memory MongoDB option.
