# Grocery POS Device Activation and Licence Management Guide

This guide explains how to generate an activation code, activate a POS device, find registered devices, disable or enable a device, and verify its current licence status using Cloudflare Workers and D1.

## 1. Open the Cloudflare D1 Database

1. Sign in to the Cloudflare Dashboard.
2. Open **Workers & Pages**.
3. Select **pos-license-worker**.
4. Under **Bindings**, find **D1 database**.
5. Click **pos-license-db**.
6. Open the **Console** tab.

## 2. Check the Database Table

Run this query to confirm that the `installations` table exists:

```sql
SELECT name
FROM sqlite_master
WHERE type = 'table'
ORDER BY name;
```

The result should contain:

```text
installations
```

## 3. Create an Activation Code

### Recommended method: Admin API

Create a request in Postman with the following details:

- Method: `POST`
- URL: `https://<your-worker>.workers.dev/api/v1/admin/installations`

Headers:

```text
X-Admin-Key: YOUR_ADMIN_API_KEY
Content-Type: application/json
```

Body — select **raw** and **JSON**:

```json
{
  "clientName": "Retail Shop A"
}
```

Example response:

```json
{
  "success": true,
  "activationCode": "POS-A1B2-C3D4-E5F6"
}
```

Copy the returned `activationCode`. It is required on the POS application's first-time activation screen.

## 4. Activate the POS Device

1. Install and open Grocery POS on the client's computer.
2. Wait for the device activation screen.
3. Enter the activation code generated for that client.
4. Click **Activate**.
5. The application sends the activation code and its device ID to the Cloudflare Worker.
6. After successful validation, the device becomes linked to that installation record.

An activation code should only be given to its intended client. Do not share the Admin API key with clients.

## 5. Find Registered Client Devices

Open the D1 **Console** and follow these steps carefully.

### Step 1: Run the device-list query

Paste only the following query into the console, and then click **Execute**:

```sql
SELECT
  id,
  client_name,
  device_id,
  enabled,
  activated_at,
  last_seen_at,
  created_at,
  updated_at
FROM installations
ORDER BY created_at DESC;
```

This is a read-only `SELECT` query. It displays the registered clients and does not change any device.

### Step 2: Find and copy the correct Device ID

The result will look similar to this:

| id  | client_name   | device_id           | enabled |
| --- | ------------- | ------------------- | ------- |
| 1   | Retail Shop A | `abc123-device-789` | 1       |

1. Find the required shop using the `client_name` column.
2. Confirm that it is the correct client.
3. Copy the complete value shown in the `device_id` column.
4. Do not copy the database `id`; you specifically need the `device_id`.

Status meanings:

- `enabled = 1`: the POS device is allowed to use the system.
- `enabled = 0`: the POS device is disabled.
- `device_id` is empty or `NULL`: the activation code has not yet been linked to a device.

## 6. Find One Client by Name

Replace `Retail Shop A` with the required client name:

```sql
SELECT
  id,
  client_name,
  device_id,
  enabled,
  activated_at,
  last_seen_at
FROM installations
WHERE client_name = 'Retail Shop A';
```

For a partial name search:

```sql
SELECT
  id,
  client_name,
  device_id,
  enabled,
  activated_at,
  last_seen_at
FROM installations
WHERE client_name LIKE '%Retail%'
ORDER BY created_at DESC;
```

## 7. Disable a POS Device Using D1 SQL

Run this query separately after completing Section 5. Do not paste the `SELECT` query and `UPDATE` query together.

### Step 1: Replace the placeholder

In the following query, replace only `PASTE-DEVICE-ID-HERE` with the Device ID copied from the results. Keep the Device ID inside the single quotation marks.

```sql
UPDATE installations
SET
  enabled = 0,
  updated_at = CURRENT_TIMESTAMP
WHERE device_id = 'PASTE-DEVICE-ID-HERE';
```

For example, if the copied Device ID is `abc123-device-789`, the completed query must be:

```sql
UPDATE installations
SET
  enabled = 0,
  updated_at = CURRENT_TIMESTAMP
WHERE device_id = 'abc123-device-789';
```

### Step 2: Execute the disable query

1. Check the `device_id` again before continuing.
2. Click **Execute**.
3. This changes `enabled` from `1` to `0` only for the matching device.
4. If the Device ID does not match any record, no device will be updated.

The disabled device will be rejected during its next remote licence validation. If the application is already running, the exact lock time depends on how often it checks the remote licence.

## 8. Verify That the Device Is Disabled

Replace `PASTE-DEVICE-ID-HERE` with the same Device ID and run:

```sql
SELECT
  client_name,
  device_id,
  enabled,
  updated_at
FROM installations
WHERE device_id = 'PASTE-DEVICE-ID-HERE';
```

The result must show:

```text
enabled = 0
```

## 9. Enable a POS Device Using D1 SQL

```sql
UPDATE installations
SET
  enabled = 1,
  updated_at = CURRENT_TIMESTAMP
WHERE device_id = 'CLIENT-DEVICE-ID';
```

Verify it:

```sql
SELECT
  client_name,
  device_id,
  enabled,
  updated_at
FROM installations
WHERE device_id = 'CLIENT-DEVICE-ID';
```

The result must show:

```text
enabled = 1
```

## 10. Disable a Device Using the Admin API

Create the following Postman request:

- Method: `PATCH`
- URL: `https://<your-worker>.workers.dev/api/v1/admin/installations/<CLIENT-DEVICE-ID>/status`

Headers:

```text
X-Admin-Key: YOUR_ADMIN_API_KEY
Content-Type: application/json
```

Body — select **raw** and **JSON**:

```json
{
  "enabled": false
}
```

Click **Send**. The selected device is now disabled.

## 11. Enable a Device Using the Admin API

Use the same `PATCH` URL and headers, but send:

```json
{
  "enabled": true
}
```

## 12. Check All Disabled Devices

```sql
SELECT
  id,
  client_name,
  device_id,
  activated_at,
  last_seen_at,
  updated_at
FROM installations
WHERE enabled = 0
ORDER BY updated_at DESC;
```

## 13. Check All Enabled Devices

```sql
SELECT
  id,
  client_name,
  device_id,
  activated_at,
  last_seen_at,
  updated_at
FROM installations
WHERE enabled = 1
ORDER BY updated_at DESC;
```

## 14. Check Activation Codes Waiting for Device Activation

```sql
SELECT
  id,
  client_name,
  enabled,
  created_at
FROM installations
WHERE device_id IS NULL OR device_id = ''
ORDER BY created_at DESC;
```

## 15. Important Security Rules

1. Never store `ADMIN_API_KEY` in the React renderer or commit it to GitHub.
2. Keep the Admin API key only in Cloudflare Worker secrets and trusted admin tools.
3. Confirm both `client_name` and `device_id` before disabling a device.
4. Do not use an online SHA-256 website for real activation codes, because it exposes the code to a third party.
5. Use the Admin API to generate activation codes whenever possible.
6. Do not manually delete a client record unless you intentionally want to remove its licence history.

## Quick SQL Reference

List devices:

```sql
SELECT id, client_name, device_id, enabled, activated_at, last_seen_at
FROM installations
ORDER BY created_at DESC;
```

Disable:

```sql
UPDATE installations
SET enabled = 0, updated_at = CURRENT_TIMESTAMP
WHERE device_id = 'CLIENT-DEVICE-ID';
```

Enable:

```sql
UPDATE installations
SET enabled = 1, updated_at = CURRENT_TIMESTAMP
WHERE device_id = 'CLIENT-DEVICE-ID';
```

Verify:

```sql
SELECT client_name, device_id, enabled, updated_at
FROM installations
WHERE device_id = 'CLIENT-DEVICE-ID';
```
