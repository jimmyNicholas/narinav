# cPanel deployment for Narinav

## Node version

- **24.13.0** (pinned in `.nvmrc` and `package.json` `engines`).
- In cPanel, use **Setup Node.js App** and select Node 24.x (24.13.0 if available). Point the application root to the repo directory (or the directory that contains `package.json`).

## Environment variables

Set these in the Node.js app’s environment in cPanel:

- **NODE_ENV** = `production`
- **ANTHROPIC_API_KEY** = your Anthropic API key (keep it secret)

## Deploy steps

1. **Connect the repo** in cPanel **Git Version Control**: add this repository, branch (e.g. `main`), and the deploy path where the app should live.
2. **Enable auto-deploy** so each push runs the deployment tasks defined in `.cpanel.yml`.
3. **.cpanel.yml** tasks: `npm ci`, `npm run build`. After deploy, the app is ready to run from that directory.
4. **Start / run the app**: In **Setup Node.js App**, set the start script to `next start` (or use the default if it runs `npm start`). Ensure the app runs from the repo directory so it uses the built `.next` output.
5. **Application URL**: Use the URL cPanel assigns to the Node.js app (e.g. your domain or a subdomain).

## Summary

| Item            | Value / action                          |
|----------------|------------------------------------------|
| Node version   | 24.13.0                                  |
| Env vars       | `NODE_ENV=production`, `ANTHROPIC_API_KEY` |
| Build          | `npm ci` then `npm run build`            |
| Start          | `next start` (or `npm start`) from repo  |
