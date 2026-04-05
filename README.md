# Patient Health Management System (AWS Serverless)

Secure EHR web app with **Cognito authentication**, **role-based access control**, **RDS metadata**, and **S3 encrypted report storage**.

## Repo layout

- `backend/` Lambda-style APIs (TypeScript)
- `frontend/` React web app (Vite)
- `infra/` Deployment templates and SQL schema

## Local development (backend)

1. Install deps:

```bash
cd backend
npm install
```

2. Create `backend/.env` (example keys):

```bash
COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-south-1

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=phms

S3_BUCKET=phms-reports-bucket
```

3. Apply DB schema (MySQL):

- Create a DB named `phms`
- Run `infra/schema.sql` against it

4. Run:

```bash
npm run dev
```

Backend runs at `http://localhost:4000`.

## Local development (frontend)

1. Install deps:

```bash
cd frontend
npm install
```

2. Create `frontend/.env` (copy from `frontend/.env.example`):

```bash
VITE_AWS_REGION=ap-south-1
VITE_COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_API_BASE_URL=http://localhost:4000
```

3. Run:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.

## API endpoints (current)

- `GET /me`
- `GET /patients` (Doctor)
- `POST /patients` (Doctor)
- `GET /patients/:id` (Doctor/Admin)
- `POST /patients/link-user` (Doctor/Admin) — links a `patient_id` to a Cognito Patient `sub`
- `POST /reports/presign-upload` (Doctor) — returns `report_id` + S3 PUT url
- `GET /reports` (Patient) — lists patient’s reports (metadata only)
- `GET /reports/:reportId/download` (Admin/Doctor/Patient) — returns S3 GET url if authorized

## Security notes

- **Auth**: JWT validation using Cognito JWKS.
- **RBAC**: Admin/Doctor/Patient enforced per route.
- **S3**: Uploads use **pre-signed URLs**; bucket should be **private** with **SSE** enabled.
- **RDS**: Use encryption at rest + least-privilege DB user.

