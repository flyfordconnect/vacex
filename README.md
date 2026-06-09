# Resourcify — React App

## Project Structure

```
resourcify/
├── index.html                  Entry point
├── vite.config.js              Build config
├── staticwebapp.config.json    Azure SWA config — auth + security headers
├── package.json
└── src/
    ├── main.jsx                MSAL provider + app mount
    ├── App.jsx                 Router + auth guard
    ├── authConfig.js           ⚠ Fill in before deploying
    ├── styles/
    │   └── global.css          Design tokens + global styles
    ├── components/
    │   ├── Layout.jsx          Shared header + nav
    │   └── LoadingScreen.jsx   Auth loading state
    └── pages/
        ├── Schedule.jsx        /schedule — scheduling canvas (mock data)
        ├── Availability.jsx    /availability — Phase 1.5
        └── MyLeave.jsx         /myLeave — Phase 1.5
```

## Before deploying — required config

### 1. src/authConfig.js
Replace all placeholder values:
- `YOUR_CLIENT_ID` → App Registration Client ID
- `YOUR_TENANT_ID` → Vac-Ex tenant ID
- `YOUR_ORG` → Dataverse org name (from environment URL)
- `orgYOUR_ORG` → Dynamics CRM org identifier

### 2. staticwebapp.config.json
Replace:
- `YOUR_TENANT_ID` → Vac-Ex tenant ID

### 3. Azure Static Web App — Application Settings
Add these environment variables in the Azure portal:
- `AZURE_CLIENT_ID` → App Registration Client ID
- `AZURE_CLIENT_SECRET` → App Registration Client Secret

### 4. App Registration — Redirect URIs
Add the Azure Static Web App URL as an allowed redirect URI in the App Registration.

## Local development

```bash
npm install
npm run dev
```

Note: MSAL redirect auth requires the dev server URL to be registered
as a redirect URI in the App Registration.

## Build and deploy

```bash
npm run build
```

Deploy the `dist/` folder to Azure Static Web Apps.
The `staticwebapp.config.json` should be in the root of the deployed output.

## Routes

| Route | Purpose | Access |
|---|---|---|
| `/schedule` | Scheduling canvas | All authenticated Vac-Ex users |
| `/availability` | Team availability timeline | All authenticated — elevated actions for Leave Administrators group |
| `/myLeave` | Personal leave self-service | All authenticated Vac-Ex users |
