interface Env {
	pos_license_db: D1Database;
	ADMIN_API_KEY: string;
	SERVICE_ENABLED?: string;
}

interface CreateInstallationBody {
	clientName?: string;
}

interface ActivateDeviceBody {
	activationCode?: string;
	deviceId?: string;
	deviceName?: string;
}

interface VerifyLicenseBody {
	deviceId?: string;
	deviceToken?: string;
	appVersion?: string;
}

interface UpdateStatusBody {
	enabled?: boolean;
}

interface ActivationRow {
	id: number;
	device_id: string | null;
}

interface LicenseRow {
	device_token_hash: string | null;
	enabled: number;
}

const ACCOUNT_LOCKED_MESSAGE = 'This account has been locked. Please contact support.';

/* ==========================================================
   RESPONSE HELPERS
========================================================== */

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
};

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			...CORS_HEADERS,
			'Content-Type': 'application/json',
		},
	});
}

async function readJson<T>(request: Request): Promise<T | null> {
	try {
		return (await request.json()) as T;
	} catch {
		return null;
	}
}

function isServiceEnabled(env: Env): boolean {
	return env.SERVICE_ENABLED?.trim().toLowerCase() !== 'false';
}

function serviceDisabledResponse(): Response {
	return jsonResponse({
		success: true,
		allowed: false,
		status: 'DISABLED',
		message: ACCOUNT_LOCKED_MESSAGE,
	});
}

/* ==========================================================
   SECURITY HELPERS
========================================================== */

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

async function sha256(value: string): Promise<string> {
	const encodedValue = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest('SHA-256', encodedValue);

	return bytesToHex(new Uint8Array(digest));
}

function secureHashCompare(firstHash: string, secondHash: string): boolean {
	if (firstHash.length !== secondHash.length) {
		return false;
	}

	let difference = 0;

	for (let index = 0; index < firstHash.length; index += 1) {
		difference |= firstHash.charCodeAt(index) ^ secondHash.charCodeAt(index);
	}

	return difference === 0;
}

async function validateAdminKey(request: Request, env: Env): Promise<boolean> {
	const providedKey = request.headers.get('X-Admin-Key') ?? '';

	if (!providedKey || !env.ADMIN_API_KEY) {
		return false;
	}

	const [providedHash, storedHash] = await Promise.all([sha256(providedKey), sha256(env.ADMIN_API_KEY)]);

	return secureHashCompare(providedHash, storedHash);
}

/* ==========================================================
   TOKEN GENERATION
========================================================== */

function generateActivationCode(): string {
	const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	const randomBytes = crypto.getRandomValues(new Uint8Array(12));

	const code = Array.from(randomBytes, (byte) => characters[byte % characters.length]).join('');

	return `POS-${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

function generateDeviceToken(): string {
	const randomBytes = crypto.getRandomValues(new Uint8Array(32));

	return bytesToHex(randomBytes);
}

function normalizeActivationCode(activationCode: string): string {
	return activationCode.trim().toUpperCase();
}

/* ==========================================================
   HEALTH
========================================================== */

function handleHealth(env: Env): Response {
	return jsonResponse({
		success: true,
		service: 'pos-license-worker',
		enabled: isServiceEnabled(env),
	});
}

/* ==========================================================
   CREATE INSTALLATION
========================================================== */

async function handleCreateInstallation(request: Request, env: Env): Promise<Response> {
	const isAdmin = await validateAdminKey(request, env);

	if (!isAdmin) {
		return jsonResponse(
			{
				success: false,
				message: 'Unauthorized admin request.',
			},
			401,
		);
	}

	const body = await readJson<CreateInstallationBody>(request);
	const clientName = body?.clientName?.trim();

	if (!clientName) {
		return jsonResponse(
			{
				success: false,
				message: 'clientName is required.',
			},
			400,
		);
	}

	const activationCode = generateActivationCode();
	const activationCodeHash = await sha256(activationCode);

	await env.pos_license_db
		.prepare(
			`
        INSERT INTO installations (
          client_name,
          activation_code_hash,
          enabled
        )
        VALUES (?1, ?2, 1)
      `,
		)
		.bind(clientName, activationCodeHash)
		.run();

	return jsonResponse(
		{
			success: true,
			activationCode,
		},
		201,
	);
}

/* ==========================================================
   ACTIVATE DEVICE
========================================================== */

async function handleActivateDevice(request: Request, env: Env): Promise<Response> {
	if (!isServiceEnabled(env)) {
		return jsonResponse({
			success: false,
			activated: false,
			status: 'DISABLED',
			message: ACCOUNT_LOCKED_MESSAGE,
		});
	}

	const body = await readJson<ActivateDeviceBody>(request);

	const activationCode = body?.activationCode?.trim();
	const deviceId = body?.deviceId?.trim();
	const deviceName = body?.deviceName?.trim();

	if (!activationCode || !deviceId || !deviceName) {
		return jsonResponse(
			{
				success: false,
				message: 'activationCode, deviceId and deviceName are required.',
			},
			400,
		);
	}

	const activationCodeHash = await sha256(normalizeActivationCode(activationCode));

	const installation = await env.pos_license_db
		.prepare(
			`
        SELECT id, device_id
        FROM installations
        WHERE activation_code_hash = ?1
        LIMIT 1
      `,
		)
		.bind(activationCodeHash)
		.first<ActivationRow>();

	if (!installation) {
		return jsonResponse(
			{
				success: false,
				activated: false,
				message: 'Invalid activation code.',
			},
			404,
		);
	}

	if (installation.device_id) {
		return jsonResponse(
			{
				success: false,
				activated: false,
				message: 'This activation code has already been used.',
			},
			409,
		);
	}

	const existingDevice = await env.pos_license_db
		.prepare(
			`
        SELECT id
        FROM installations
        WHERE device_id = ?1
        LIMIT 1
      `,
		)
		.bind(deviceId)
		.first<{ id: number }>();

	if (existingDevice) {
		return jsonResponse(
			{
				success: false,
				activated: false,
				message: 'This device is already registered.',
			},
			409,
		);
	}

	const deviceToken = generateDeviceToken();
	const deviceTokenHash = await sha256(deviceToken);

	await env.pos_license_db
		.prepare(
			`
        UPDATE installations
        SET
          device_id = ?1,
          device_name = ?2,
          device_token_hash = ?3,
          activated_at = CURRENT_TIMESTAMP,
          last_seen_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?4
          AND device_id IS NULL
      `,
		)
		.bind(deviceId, deviceName, deviceTokenHash, installation.id)
		.run();

	return jsonResponse({
		success: true,
		activated: true,
		deviceToken,
	});
}

/* ==========================================================
   VERIFY LICENSE
========================================================== */

async function handleVerifyLicense(request: Request, env: Env): Promise<Response> {
	if (!isServiceEnabled(env)) {
		return serviceDisabledResponse();
	}

	const body = await readJson<VerifyLicenseBody>(request);

	const deviceId = body?.deviceId?.trim();
	const deviceToken = body?.deviceToken?.trim();
	const appVersion = body?.appVersion?.trim() ?? null;

	if (!deviceId || !deviceToken) {
		return jsonResponse(
			{
				success: false,
				allowed: false,
				status: 'INVALID_REQUEST',
				message: 'deviceId and deviceToken are required.',
			},
			400,
		);
	}

	const installation = await env.pos_license_db
		.prepare(
			`
        SELECT device_token_hash, enabled
        FROM installations
        WHERE device_id = ?1
        LIMIT 1
      `,
		)
		.bind(deviceId)
		.first<LicenseRow>();

	if (!installation?.device_token_hash) {
		return jsonResponse(
			{
				success: false,
				allowed: false,
				status: 'INVALID_DEVICE',
				message: 'Device is not registered.',
			},
			401,
		);
	}

	const providedTokenHash = await sha256(deviceToken);

	if (!secureHashCompare(providedTokenHash, installation.device_token_hash)) {
		return jsonResponse(
			{
				success: false,
				allowed: false,
				status: 'INVALID_TOKEN',
				message: 'Invalid device token.',
			},
			401,
		);
	}

	await env.pos_license_db
		.prepare(
			`
        UPDATE installations
        SET
          last_seen_at = CURRENT_TIMESTAMP,
          app_version = ?1,
          updated_at = CURRENT_TIMESTAMP
        WHERE device_id = ?2
      `,
		)
		.bind(appVersion, deviceId)
		.run();

	if (installation.enabled !== 1) {
		return jsonResponse({
			success: true,
			allowed: false,
			status: 'DISABLED',
			message: ACCOUNT_LOCKED_MESSAGE,
		});
	}

	return jsonResponse({
		success: true,
		allowed: true,
		status: 'ACTIVE',
		message: 'POS system is active.',
	});
}

/* ==========================================================
   UPDATE DEVICE STATUS
========================================================== */

async function handleUpdateStatus(request: Request, env: Env, deviceId: string): Promise<Response> {
	const isAdmin = await validateAdminKey(request, env);

	if (!isAdmin) {
		return jsonResponse(
			{
				success: false,
				message: 'Unauthorized admin request.',
			},
			401,
		);
	}

	const body = await readJson<UpdateStatusBody>(request);

	if (typeof body?.enabled !== 'boolean') {
		return jsonResponse(
			{
				success: false,
				message: 'enabled must be true or false.',
			},
			400,
		);
	}

	const existingInstallation = await env.pos_license_db
		.prepare(
			`
        SELECT id
        FROM installations
        WHERE device_id = ?1
        LIMIT 1
      `,
		)
		.bind(deviceId)
		.first<{ id: number }>();

	if (!existingInstallation) {
		return jsonResponse(
			{
				success: false,
				message: 'Device was not found.',
			},
			404,
		);
	}

	await env.pos_license_db
		.prepare(
			`
        UPDATE installations
        SET
          enabled = ?1,
          updated_at = CURRENT_TIMESTAMP
        WHERE device_id = ?2
      `,
		)
		.bind(body.enabled ? 1 : 0, deviceId)
		.run();

	return jsonResponse({
		success: true,
		deviceId,
		enabled: body.enabled,
		status: body.enabled ? 'ACTIVE' : 'DISABLED',
	});
}

/* ==========================================================
   WORKER ROUTER
========================================================== */

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		try {
			if (request.method === 'OPTIONS') {
				return new Response(null, {
					status: 204,
					headers: CORS_HEADERS,
				});
			}

			const url = new URL(request.url);
			const path = url.pathname;

			if (request.method === 'GET' && path === '/health') {
				return handleHealth(env);
			}

			if (request.method === 'POST' && path === '/api/v1/admin/installations') {
				return handleCreateInstallation(request, env);
			}

			if (request.method === 'POST' && path === '/api/v1/device/activate') {
				return handleActivateDevice(request, env);
			}

			if (request.method === 'POST' && path === '/api/v1/license/verify') {
				return handleVerifyLicense(request, env);
			}

			const statusRouteMatch = path.match(/^\/api\/v1\/admin\/installations\/([^/]+)\/status$/);

			if (request.method === 'PATCH' && statusRouteMatch) {
				const deviceId = decodeURIComponent(statusRouteMatch[1]);

				return handleUpdateStatus(request, env, deviceId);
			}

			return jsonResponse(
				{
					success: false,
					message: 'Route not found.',
				},
				404,
			);
		} catch (error) {
			console.error('Worker error:', error);

			return jsonResponse(
				{
					success: false,
					message: 'Internal server error.',
				},
				500,
			);
		}
	},
};
