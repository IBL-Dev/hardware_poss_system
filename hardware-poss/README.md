# Grocery POS - Desktop Application with Remote Licensing

An Electron application with React, TypeScript, and local SQLite, secured by a remote Cloudflare D1 licensing backend.

---

## 🛠️ Recommended Setup & Dev Environment

- **IDE**: VSCode (with ESLint and Prettier extensions enabled)
- **Node.js**: v18 or later

### Install Dependencies

```bash
npm install
```

### Run in Development

```bash
npm run dev
```

> **Why is there a White Screen on startup?**
>
> When running `npm run dev`, Electron starts concurrently with the Vite dev server. If Electron launches before the Vite dev server is fully ready, it loads a blank/white screen.
>
> **Solution**: Click on the white window and press **`Ctrl + R`** (Windows/Linux) or **`Cmd + R`** (Mac) to reload the window once the terminal indicates that the Vite server has started.

---

## ☁️ Cloudflare Worker Deployment (License Server)

The licensing backend uses a Cloudflare Worker connected to a D1 Database.

### 1. Initialize and Setup

Go to the worker directory:

```bash
cd cloud/pos-license-worker
```

Install wrangler CLI if you haven't already:

```bash
npm install -g wrangler
```

Login to your Cloudflare account:

```bash
wrangler login
```

### 2. Create and Migrate D1 Database

Create the database:

```bash
wrangler d1 create pos_license_db
```

_(Copy the database ID from the output and paste it into `cloud/pos-license-worker/wrangler.jsonc` under the `database_id` field)_

Apply migrations locally (for local development testing):

```bash
wrangler d1 migrations apply pos_license_db --local
```

Apply migrations to production (live Cloudflare database):

```bash
wrangler d1 migrations apply pos_license_db --remote
```

### 3. Deploy the Worker

Deploy the worker to Cloudflare:

```bash
wrangler deploy
```

Set the Admin Secret Key in Cloudflare:

```bash
wrangler secret put ADMIN_API_KEY
```

---

## 🎫 How to Get / Generate an Activation Code

To register a new POS terminal, you must generate a unique **Activation Code** (e.g., `POS-ABCD-EFGH-IJKL`). You can generate this using the Admin API or directly through the Cloudflare D1 SQL console.

### Option A: Using the Admin REST API (Recommended)

You can request a new activation code using any API client (e.g., Postman, curl, or standard fetch):

- **Method**: `POST`
- **URL**: `https://<your-worker>.workers.dev/api/v1/admin/installations`
- **Headers**:
  - `X-Admin-Key`: `<YOUR_ADMIN_API_KEY>`
  - `Content-Type`: `application/json`
- **Request Body**:
  ```json
  {
    "clientName": "Client Name or Store Name"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "activationCode": "POS-A1B2-C3D4-E5F6"
  }
  ```
  _Copy this `activationCode` and enter it into the POS first-time activation screen._

### Option B: Generating Manually via Cloudflare SQL Console

If you do not want to use the API, you can generate a code manually:

1. Choose an activation code with format: `POS-XXXX-XXXX-XXXX` (e.g., `POS-TEST-1234-5678`).
2. Generate its SHA-256 hash. (You can use an online SHA-256 tool).
3. Insert it into the D1 console:
   ```sql
   INSERT INTO installations (client_name, activation_code_hash, enabled)
   VALUES ('Client Name', 'your_sha256_hash_here', 1);
   ```

---

## 🔑 How to Enable / Disable POS Device Login

You can manage client installations directly through the Cloudflare Dashboard SQL Console or via Admin REST APIs.

### Option A: Using Cloudflare Dashboard SQL Console

Go to **Cloudflare Dashboard** -> **D1 Databases** -> Select your database -> **Console** and run these commands.

#### 1. List Registered Devices

To find a client's device ID:

```sql
SELECT id, client_name, device_id, enabled, activated_at, last_seen_at FROM installations ORDER BY created_at DESC;
```

#### 2. Disable a Client

To disable a specific client's access instantly (or lock their active POS runtime):

```sql
UPDATE installations SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE device_id = 'CLIENT-DEVICE-ID';
```

#### 3. Enable a Client

To allow client login and unlock the POS:

```sql
UPDATE installations SET enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE device_id = 'CLIENT-DEVICE-ID';
```

---

### Option B: Using the Admin REST API

Use a tool like Postman, curl, or a script using the custom header `X-Admin-Key` set to your `ADMIN_API_KEY`.

#### Create New Activation Code for a Client

- **Method**: `POST`
- **URL**: `https://<your-worker>.workers.dev/api/v1/admin/installations`
- **Headers**:
  - `X-Admin-Key: <YOUR_ADMIN_KEY>`
  - `Content-Type: application/json`
- **Body**:
  ```json
  {
    "clientName": "Retail Shop A"
  }
  ```

#### Enable / Disable Status

- **Method**: `PATCH`
- **URL**: `https://<your-worker>.workers.dev/api/v1/admin/installations/<CLIENT-DEVICE-ID>/status`
- **Headers**:
  - `X-Admin-Key: <YOUR_ADMIN_KEY>`
  - `Content-Type: application/json`
- **Body** (Disable):
  ```json
  {
    "enabled": false
  }
  ```
- **Body** (Enable):
  ```json
  {
    "enabled": true
  }
  ```

---

## 📦 Building the Production Windows Installer (.exe)

Compile and bundle the production assets and database sidecars:

```bash
npm run build:win
```

The final setup executable `Glosary POS-Setup-1.0.0.exe` will be generated in the `release/` folder.

---

## Install the EXE on Another Computer and Activate It

You do not need to build a different EXE for every computer. Build the installer once, then generate a new activation code for each computer/customer that needs to run the POS.

Important rules:

- Each computer needs its own activation code.
- One activation code can be used only one time.
- The new computer must have internet access during first activation.
- The Cloudflare Worker must be deployed and `SERVICE_ENABLED` must be `true`.
- Keep `ADMIN_API_KEY` private. Do not give it to the customer.

### 1. Build the Windows installer

Run this on the development computer:

```bash
npm run build:win
```

Copy this generated installer to the new computer:

```text
release/Glosary POS-Setup-1.0.0.exe
```

### 2. Generate an activation code for the new computer

Run this from your admin/development computer, not from the customer computer. Replace `YOUR_ADMIN_API_KEY` and `Customer Shop - PC 1`.

```powershell
$adminKey = "YOUR_ADMIN_API_KEY"
$body = @{
  clientName = "Customer Shop - PC 1"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "https://pos-license-worker.pos-license-worker.workers.dev/api/v1/admin/installations" `
  -Headers @{
    "X-Admin-Key" = $adminKey
    "Content-Type" = "application/json"
  } `
  -Body $body
```

The response will include an activation code:

```json
{
  "success": true,
  "activationCode": "POS-A1B2-C3D4-E5F6"
}
```

Give only the `activationCode` to the customer/operator.

### 3. Activate the POS on the new computer

1. Install `Glosary POS-Setup-1.0.0.exe` on the new computer.
2. Open the POS app.
3. The first screen will ask for an activation code.
4. Enter the generated code, for example `POS-A1B2-C3D4-E5F6`.
5. After successful activation, the app will open the login screen.

### 4. Generate codes for more computers

For a second computer, run the same admin API command again with a different `clientName`:

```powershell
$adminKey = "YOUR_ADMIN_API_KEY"
$body = @{
  clientName = "Customer Shop - PC 2"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "https://pos-license-worker.pos-license-worker.workers.dev/api/v1/admin/installations" `
  -Headers @{
    "X-Admin-Key" = $adminKey
    "Content-Type" = "application/json"
  } `
  -Body $body
```

Do not reuse the first computer's activation code.

### Activation troubleshooting

- `Invalid activation code.`: the code does not exist or was typed incorrectly.
- `This activation code has already been used.`: generate a new code for that computer.
- `This account has been locked. Please contact support.`: the Worker `SERVICE_ENABLED` value is `false`, or that device row is disabled in D1.
- `Internet connection is required to activate this POS system.`: connect the computer to the internet and try again.
