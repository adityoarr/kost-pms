# Kost PMS Frontend — UI/UX refresh

This folder contains the frontend UI refresh for Kost PMS. It is based on the uploaded frontend project and keeps the existing API calls, authentication guards, routes, role checks, forms, and business logic intact.

## Main changes

- Replaced the starter homepage with a clearer entry point for managers and tenants.
- Updated document language to Indonesian and replaced starter metadata with Kost PMS metadata.
- Added a consistent light SaaS visual system: calmer backgrounds, improved surface borders/shadows, typography, focus states, and form controls.
- Improved table readability and horizontal scrolling on narrow screens.
- Added mobile spacing/touch target adjustments and a `prefers-reduced-motion` accessibility fallback.
- Preserved existing application routes and API integrations.

## Apply locally

1. Back up your current `frontend` directory.
2. Extract this ZIP.
3. Copy the contents of this folder into your local `frontend` directory, replacing files when prompted.
4. From the `frontend` directory run:
   ```bash
   npm ci
   npm run lint
   npm run build
   ```
5. Start locally with `npm run dev` and verify API connectivity/authentication against your environment.

No changes were made to GitHub.

## Notes

- Do not include `.env` files or API secrets in a shared ZIP.
- The design refresh intentionally avoids replacing the existing backend/API behavior with mock data.
- This environment did not have the project's dependencies installed, so build/lint validation could not be completed here. Run the commands above locally before deployment.


## Vercel build fix

The homepage copyright year is rendered by `src/components/current-year.tsx` on the client after hydration. This avoids evaluating `new Date()` while Next.js prerenders the `/` route with Cache Components enabled.
