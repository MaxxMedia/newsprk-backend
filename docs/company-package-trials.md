# Company package trials

Each company has one 30-day trial window, available to new and existing companies. All company recruiter logins share it. Subscription (Basic, Professional, Enterprise), banner, sponsored-content and recruitment packages can be selected. Changing the trial package uses the original end time; selecting Free ends the trial and consumes eligibility.

Trials create zero-amount TRIAL package purchases. They do not create Razorpay orders or automatically charge a customer. Revenue reports still count only PAID purchases. Payment verification activates the paid package and ends the matching category trial atomically. Paid duration starts at successful verification.

Expired trials return the company to its underlying paid subscription or Free. An existing active paid subscription is preserved, including legacy companies with no purchase history. Eligibility checks use the expiry timestamp on each read. An in-process worker runs at startup and every minute to update cached company plans and job visibility; restarting the backend catches overdue trials.

No expiry path deletes company rows, articles, team members, jobs, applications or uploads. Directory responses hide fields and excess items by plan. Saving that reduced editor retains premium fields and the hidden portion of saved arrays and descriptions. Buying a package restores the content that package permits. Jobs hidden by expiry are restored within the new quota, while manually closed jobs remain closed.

Banner and sponsored content continue through the existing admin fulfillment workflow. In the banner/post form, select the company's trial or paid package. Linked content disappears from public APIs when the package expires and returns on renewal. Banner renewal can change billing duration for the same placement. General editorial/site content can remain unlinked. Existing banners/posts remain unlinked unless an admin explicitly assigns a company package. External newsletter/social campaign delivery remains manual.

## Deploy on the DigitalOcean droplet

Deploy the backend before the frontend. Copy the new migration with the backend release. Take your normal database backup, then run from the backend directory using the droplet's production environment:

```sh
npm ci
npx prisma migrate deploy
npx prisma generate
npm test
```

Do not use `prisma migrate reset` or `db push --accept-data-loss`. If Prisma reports that the existing production database has not been baselined, stop and reconcile its migration history before deploying; do not mark migrations applied without checking their schema changes.

Restart the actual backend service you already use on the droplet (PM2, systemd or Docker). Confirm startup has no trial-worker/table errors. Deploy and restart the frontend using its existing build process:

```sh
npm ci
npm run build
```

The frontend's `NEXT_PUBLIC_API_URL` must target the backend deployment containing these routes. A local frontend pointing to the old production API cannot activate trials until that backend is updated.

The trial migration was applied to this backend's configured shared Neon database on 14 October 2026. Prisma queries for CompanyTrial and the new content/job fields passed, and existing record counts remained unchanged. This applies the database changes only; the updated backend and Prisma client still need deployment on the DigitalOcean droplet, followed by the frontend. Other database environments must apply the migration separately.

## Checks

Backend: `npm test` covers company-wide trial reuse, concurrent requests through serialized transaction mocks, all package categories, fixed switching dates, expiry at the exact boundary, paid-plan preservation, signed renewal, rollback, directory retention and closed jobs. These use in-memory database stubs and make no live payments or database writes.

Frontend: `npm run test:payments` and `npm run test:trials`. Source TypeScript validation excludes existing generated `.next` files.

After deployment, use a test company to check starting a trial, switching packages, displaying its end date and renewing. Verify reduced profiles hide premium data while the database and upload storage retain it. Check an expired trial cannot start again from another company login. Use Razorpay test mode for payment checks; do not make another live payment to test deployment.

## Local Windows note

The final Prisma generation attempt updated client metadata but could not replace the Windows query-engine DLL because another Node process holds it open (EPERM). Stop the local backend watcher, run `npx prisma generate` from the backend directory, then restart it after the database migration is available. Schema validation passed. No local process was stopped automatically.
