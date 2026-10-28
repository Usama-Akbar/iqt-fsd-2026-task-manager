# IQT-FSD-2026 — Step 4: Code Review & Architecture

## 1. What steps would you take to secure a web application?

I treat security as layers, so one failure isn't fatal:

- **Transport:** HTTPS everywhere, HSTS, and TLS terminated at a managed load balancer or CDN.
- **Authentication:** a proven provider or library (OAuth2/OIDC, bcrypt/argon2 for passwords), MFA for admins, short-lived access tokens with rotating refresh tokens stored in `HttpOnly`, `Secure`, `SameSite` cookies.
- **Authorization:** check ownership and role on every request on the server, never trusting IDs or flags from the client. Least privilege for the database user and cloud IAM roles.
- **Input handling:** validate every request against a schema (type, length, format), use parameterised queries or an ORM to prevent SQL/NoSQL injection, and encode output to prevent XSS. React escapes by default, so avoid `dangerouslySetInnerHTML`.
- **HTTP hardening:** security headers via Helmet (CSP, X-Frame-Options, nosniff), a strict CORS allow-list, CSRF protection for cookie-based sessions, request-size limits, and rate limiting on auth and write endpoints.
- **Secrets:** no secrets in code or in the frontend bundle. Use environment variables or a secrets manager (AWS Secrets Manager, Vault) and rotate them.
- **Dependencies:** `npm audit`, Dependabot or Snyk in CI, and pinned lockfiles.
- **Error handling and logging:** generic errors for clients, detailed structured logs on the server (never logging passwords or tokens), plus alerts on anomalies such as spikes in 401 or 500 responses.
- **Data:** encryption at rest, automated backups with tested restores, and minimal PII retention.
- **Process:** SAST/DAST in the pipeline, code reviews with a security checklist, and periodic penetration tests against the OWASP Top 10.

In this project: parameterised SQL, server-side validation, Helmet, a CORS allow-list, a 20 KB body limit, and generic 500 responses.

## 2. How would you improve the performance of a slow React application?

**Measure first.** I use React DevTools Profiler, Chrome Performance and Lighthouse to find whether the problem is load time, rendering, or the network, and I track Core Web Vitals (LCP, INP, CLS) in production.

**Load time / bundle size**
- Code-split routes and heavy components with `React.lazy` and `Suspense`.
- Analyse the bundle (`vite-bundle-visualizer`) and replace or tree-shake large libraries.
- Compress and resize images (WebP/AVIF, `loading="lazy"`), and serve assets from a CDN with long cache headers.
- Use SSR/SSG (e.g. Next.js) for content-heavy pages so the first paint doesn't wait on JavaScript.

**Rendering**
- Remove unnecessary re-renders: keep state local, split large contexts, and memoise expensive children with `React.memo`, `useMemo` and `useCallback` where the profiler shows a benefit.
- Use stable `key`s and never create components inside render.
- Virtualise long lists (`react-window` / TanStack Virtual).
- Debounce inputs, and use `useTransition` / `useDeferredValue` to keep typing responsive during heavy updates.
- Move CPU-heavy work to Web Workers.

**Data fetching**
- Use a cache layer (TanStack Query / SWR) to dedupe requests, cache responses and avoid waterfalls. Fetch in parallel and prefetch on hover.
- Paginate or filter on the server instead of shipping large payloads, and apply optimistic updates for snappy UX.
- Fix slow APIs at the source with indexes, caching and smaller responses.

**Verify:** re-profile after each change, and add performance budgets to CI (Lighthouse CI) so regressions are caught.

## 3. SQL vs NoSQL — differences and when to use each

| | SQL (PostgreSQL, MySQL) | NoSQL (MongoDB, DynamoDB, Redis, Cassandra) |
|---|---|---|
| Data model | Tables with fixed schema, rows and relations | Documents, key-value, wide-column or graph; flexible schema |
| Relationships | Foreign keys and JOINs | Usually embedded or denormalised; joins are limited |
| Consistency | Strong ACID transactions | Often eventual consistency (many now offer transactions) |
| Scaling | Primarily vertical, plus read replicas; sharding is harder | Designed for horizontal scaling and partitioning |
| Querying | Standard, powerful SQL; ad-hoc analytics | Query shapes optimised per access pattern |

**Use SQL when** the data is relational and integrity matters: orders, payments, inventory, users and permissions, reporting. It also fits when you need multi-row transactions, complex queries or ad-hoc analytics, or when the schema is fairly stable. That's why this task app uses PostgreSQL: structured records, constraints and simple, reliable CRUD.

**Use NoSQL when** the schema varies or evolves quickly (product catalogues with different attributes, CMS content), when you need very high write throughput or massive horizontal scale (event logs, IoT telemetry, activity feeds), or when access patterns are simple and known in advance (key lookups, sessions and caching in Redis, DynamoDB single-table designs). Graph databases suit highly connected data such as recommendations.

**In practice** many systems are polyglot: PostgreSQL as the system of record, Redis for caching and queues, and a search engine (Elasticsearch) for full-text search. PostgreSQL's JSONB also covers many "flexible document" needs without a second database.

## 4. How would you deploy a full-stack application to AWS, Azure or Google Cloud?

Example on **AWS** (the same pattern maps to Azure and GCP):

1. **Containerise:** a multi-stage Dockerfile builds the React app and runs the Express API as a non-root user. The image is pushed to **ECR**.
2. **Database:** **RDS PostgreSQL** in private subnets, Multi-AZ, automated backups and encryption at rest. Credentials live in **Secrets Manager** and are injected as environment variables.
3. **Backend:** **ECS Fargate** (or App Runner for simplicity) behind an **Application Load Balancer**, with auto-scaling on CPU and request count. Health checks hit `/api/health`. Security groups allow only ALB → app and app → DB.
4. **Frontend:** the static build goes to **S3** behind **CloudFront** (CDN, HTTPS via ACM, caching). Alternatively Express serves it, as in this repo.
5. **Networking and DNS:** a VPC with public and private subnets, **Route 53** for the domain, and **WAF** on CloudFront/ALB.
6. **CI/CD:** **GitHub Actions** runs lint and tests, builds and scans the image, pushes to ECR, runs DB migrations, and deploys to ECS with rolling or blue/green deployment. Infrastructure is defined as code in **Terraform** or CDK, with separate staging and production environments.
7. **Observability:** **CloudWatch** logs, metrics and alarms, plus tracing (X-Ray / OpenTelemetry) and uptime checks.

**Azure equivalent:** Container Registry → App Service or Container Apps, Azure Database for PostgreSQL, Static Web Apps or Front Door, Key Vault, and Azure Monitor.
**GCP equivalent:** Artifact Registry → Cloud Run, Cloud SQL, Cloud Storage + Cloud CDN, Secret Manager, and Cloud Logging.

For a small app like this one, a PaaS (Render, Railway, Cloud Run + Neon) gives the same result in minutes. The included `render.yaml` deploys the API, the UI and a managed PostgreSQL database together.
