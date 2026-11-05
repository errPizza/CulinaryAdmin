export type Plan = 'trial' | 'monthly' | 'annual' | 'permanent';
export type LicenseStatus = 'pending' | 'active' | 'expired' | 'revoked';
export type License = {

    id: string; tenantId: string; siteId: string; customer: string; branchName: string;
    plan: Plan; tier: Tier; addons: Addon[]; trialDays: number | null; features: string[]; limits: { maxUsers: number; maxTables: number; maxTerminals: number };
    revision: number; status: LicenseStatus; createdAt: string; activatedAt: string | null; expiresAt: string | null;
    validatedAt: string | null; revokedAt: string | null; revokeReason: string | null;
    binding: { kind: 'tpm' | 'fingerprint'; keyAlg: string } | null; centralCertificateSha256: string | null;

};
export type Message = { id: string; author: 'branch' | 'admin' | 'owner'; adminId: string | null; body: string; createdAt: string };
export type Ticket = { id: string; licenseId: string; customer?: string; branchName?: string; siteId?: string; subject: string; status: 'open' | 'answered' | 'closed'; createdAt: string; updatedAt: string; messages?: Message[]; ownerEmail?: string | null };
export type Fault = { id: string; licenseId: string; customer: string; branchName: string; siteId: string; source: string; severity: 'error' | 'critical'; what: string; affected: string; detail: string; context: Record<string, string>; version: string; platform: string; occurrences: number; firstAt: string; lastAt: string; status: 'open' | 'resolved'; resolvedAt: string | null; resolvedBy: string | null };
export type Release = { id: string; version: string; platform: string; filename: string; notes: string; status: 'uploading' | 'signing' | 'ready'; bytes: number | null; sha512: string | null; createdAt: string };
export type Publication = { id: string; releaseId: string; target: 'all' | { licenseIds: string[] }; createdAt: string; withdrawnAt: string | null };
export type Branch = { tenantId: string; tenantName: string; branchId: string; siteId: string; slug: string; branchName: string; certificateSha256: string | null; licenseStatus: LicenseStatus; features: string[] };
export type Admin = { id: string; username: string; deviceName: string; keyAlg: string; active: boolean; createdAt: string };
export type AuditEntry = { id: number; at: string; adminId: string | null; action: string; target: string | null; detail: unknown };
export const FEATURES: Record<string, string> = { reservations: 'Reservaciones', reviews: 'Evaluaciones', customerRequests: 'Solicitudes de clientes', printing: 'Impresión de comandas', courses: 'Servicio por tiempos', promotions: 'Promociones', multiBranch: 'Varias sucursales' };
export const PLANS: Record<Plan, string> = { trial: 'Prueba', monthly: 'Mensual', annual: 'Anual', permanent: 'De por vida' };
export type Tier = 'lite' | 'pro';
export type Addon = 'mobileOrdering' | 'deliveryHub' | 'webOrdering';
export const TIERS: Record<Tier, { label: string; terminals: number }> = { lite: { label: 'Lite', terminals: 2 }, pro: { label: 'Pro', terminals: 10 } };
export const ADDONS: Record<Addon, string> = { mobileOrdering: 'Comanderos móviles', deliveryHub: 'Delivery Hub', webOrdering: 'Web propia de pedidos' };
// Keep in step with COMBOS in CulinaryServer src/catalog.ts: the server prices a monthly license that matches one.
export const COMBOS: { id: 'pyme' | 'delivery'; label: string; tier: Tier; addons: Addon[] }[] = [
    { id: 'pyme', label: 'Combo PYME Digital', tier: 'lite', addons: ['mobileOrdering'] },
    { id: 'delivery', label: 'Combo Delivery Pro', tier: 'pro', addons: ['deliveryHub', 'webOrdering'] }
];

export class ApiError extends Error {

    constructor(public status: number, public code: string, message: string) { super(message); }

}

const b64url = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
const encoder = new TextEncoder();
type DeviceKey = { username: string; alg: 'Ed25519' | 'ES256'; keys: CryptoKeyPair };

function store<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {

    return new Promise((resolve, reject) => {

        const open = indexedDB.open('culinary-admin', 1);
        open.onupgradeneeded = () => open.result.createObjectStore('device');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => { const request = run(open.result.transaction('device', mode).objectStore('device')); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); };

    });

}
export const readDevice = () => store<DeviceKey | undefined>('readonly', s => s.get('current'));

const saveDevice = (device: DeviceKey) => store('readwrite', s => s.put(device, 'current'));

export const forgetDevice = () => store('readwrite', s => s.delete('current'));

async function newDevice(username: string): Promise<DeviceKey> {

    try { return { username, alg: 'Ed25519', keys: await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']) as CryptoKeyPair }; } catch {

        return { username, alg: 'ES256', keys: await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']) };
    }

}
async function sign(device: DeviceKey, data: Uint8Array) {

    const params = device.alg === 'Ed25519' ? { name: 'Ed25519' } : { name: 'ECDSA', hash: 'SHA-256' };

    return b64url(await crypto.subtle.sign(params, device.keys.privateKey, data as BufferSource));
}

export const serverUrl = () => localStorage.getItem('culinary-admin.server') || '';
export const setServerUrl = (url: string) => localStorage.setItem('culinary-admin.server', url.replace(/\/+$/, ''));

let token = sessionStorage.getItem('culinary-admin.token') || '';

export const signedIn = () => token !== '';

function remember(value: string) { token = value; if (value) sessionStorage.setItem('culinary-admin.token', value); else sessionStorage.removeItem('culinary-admin.token'); }

export let onSessionLost = () => {};
export function watchSession(handler: () => void) { onSessionLost = handler; }

async function send<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}, raw?: BodyInit): Promise<T> {

    const base = serverUrl();

    if (!base) throw new ApiError(0, 'no_server', 'Escribe primero la dirección de CulinaryServer');

    let response: Response;

    try {

        response = await fetch(base + path, { method, headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}), ...headers }, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });

    } catch { throw new ApiError(0, 'network', 'No hay conexión con CulinaryServer'); }

    const data = response.status === 204 ? {} : await response.json().catch(() => ({}));

    if (!response.ok) {

        const error = data?.error ?? {};

        if (response.status === 401 && token && !path.endsWith('/login')) { remember(''); onSessionLost(); }

        throw new ApiError(response.status, error.code ?? 'unknown', error.message ?? 'CulinaryServer rechazó la solicitud');

    }

    return data as T;
}

async function signed<T>(method: string, path: string, username: string, body: unknown, device?: DeviceKey): Promise<T> {

    const key = device ?? await readDevice();

    if (!key || key.username !== username) throw new ApiError(0, 'no_device', 'Este equipo no tiene la llave de esa cuenta');
   
    const { nonce } = await send<{ nonce: string }>('POST', '/admin/v1/challenges', { username });
    const bytes = encoder.encode(JSON.stringify(body ?? {}));
    const digest = hex(await crypto.subtle.digest('SHA-256', bytes));
    const input = encoder.encode(['culinary-request-v1', 'admin', method, path, username, nonce, digest].join('\n'));
  
    return send<T>(method, path, undefined, { 'content-type': 'application/json', 'x-culinary-subject': username, 'x-culinary-challenge': nonce, 'x-culinary-signature': await sign(key, input) }, bytes);
}

export async function enroll(p: { code: string; username: string; password: string; deviceName: string }) {

    const device = await newDevice(p.username);
    const spki = b64url(await crypto.subtle.exportKey('spki', device.keys.publicKey));
    const reply = await send<{ adminId: string; totp: { secret: string; uri: string } }>('POST', '/admin/v1/enroll', { ...p, key: { alg: device.alg, spki } });
    
    await saveDevice(device);

    return reply;
}

export const confirmEnrollment = (username: string, totp: string) => signed<{ adminId: string; username: string }>('POST', '/admin/v1/enroll/confirm', username, { totp });

export async function login(username: string, password: string, totp: string) {

    const reply = await signed<{ token: string; expiresAt: string; admin: { id: string; username: string } }>('POST', '/admin/v1/login', username, { password, totp });
    
    remember(reply.token);

    return reply;
}

export async function resetPassword(username: string, totp: string, newPassword: string) { await signed<{ ok: true }>('POST', '/admin/v1/password', username, { totp, newPassword }); remember(''); }
export async function logout() { try { await send('POST', '/admin/v1/logout', {}); } finally { remember(''); } }

export const me = () => send<{ admin: { id: string; username: string } }>('GET', '/admin/v1/me');
export const admins = () => send<{ admins: Admin[] }>('GET', '/admin/v1/admins');
export const invite = (username: string) => signed<{ code: string; expiresAt: string }>('POST', '/admin/v1/invites', username, {});
export const removeAdmin = (username: string, id: string) => signed<{ ok: true }>('DELETE', '/admin/v1/admins/' + id, username, {});
export const rootKey = () => send<{ kid: string; alg: string; publicKey: string; spki: string; pem: string; licenseIntermediate?: { kid: string; generation: number; notBefore: string; expiresAt: string } | null }>('GET', '/admin/v1/root-key');
export const audit = (before?: string) => send<{ entries: AuditEntry[] }>('GET', '/admin/v1/audit' + (before ? '?before=' + encodeURIComponent(before) : ''));

export type LicenseInput = { customer: string; branchName: string; siteId: string; tenantId?: string; plan: Plan; tier: Tier; addons: Addon[]; trialDays?: number; features: string[]; limits: { maxUsers: number; maxTables: number; maxTerminals?: number }; charge?: number };
export const licenses = () => send<{ licenses: License[] }>('GET', '/admin/v1/licenses');
export const createLicense = (input: LicenseInput) => send<{ license: License; activationCode: string }>('POST', '/admin/v1/licenses', input);
export const updateLicense = (id: string, patch: Partial<Omit<LicenseInput, 'tenantId'>> & { expiresAt?: string }) => send<{ license: License }>('PATCH', '/admin/v1/licenses/' + id, patch);
export const deleteLicense = (id: string) => send<{ ok: true }>('DELETE', '/admin/v1/licenses/' + id);
export const renewLicense = (id: string, until?: string, charge?: number) => send<{ license: License }>('POST', `/admin/v1/licenses/${id}/renew`, { ...(until ? { until } : {}), ...(charge !== undefined ? { charge } : {}) });
export const revokeLicense = (id: string, reason: string) => send<{ license: License }>('POST', `/admin/v1/licenses/${id}/revoke`, { reason });
export const resetActivation = (id: string, reason: string) => send<{ license: License; activationCode: string }>('POST', `/admin/v1/licenses/${id}/reset-activation`, { reason });

export const faults = (status?: string) => send<{ faults: Fault[] }>('GET', '/admin/v1/faults' + (status ? '?status=' + status : ''));
export const resolveFault = (id: string) => send<{ fault: Fault }>('POST', `/admin/v1/faults/${id}/resolve`, {});
export const reopenFault = (id: string) => send<{ fault: Fault }>('POST', `/admin/v1/faults/${id}/reopen`, {});

export const releases = () => send<{ releases: Release[] }>('GET', '/admin/v1/releases');
export const signRelease = (id: string, manifest: string) => send<{ release: Release }>('PUT', `/admin/v1/releases/${id}/manifest`, { manifest });
export const publications = () => send<{ publications: Publication[] }>('GET', '/admin/v1/publications');
export const withdraw = (id: string) => send<{ publication: Publication }>('POST', `/admin/v1/publications/${id}/withdraw`, {});
export const publish = (releaseId: string, target: Publication['target']) => send<{ publication: Publication }>('POST', '/admin/v1/publications', { releaseId, target });

const PART = 8 * 1024 * 1024;

export async function uploadRelease(meta: { version: string; platform: string; filename: string; notes: string }, file: File, progress: (sent: number) => void) {

    const { release } = await send<{ release: Release }>('POST', '/admin/v1/releases', meta);

    try {

        const parts: { partNumber: number; etag: string }[] = [];

        for (let offset = 0, n = 1; offset < file.size || n === 1; offset += PART, n++) {

            const chunk = file.slice(offset, offset + PART);
           
            parts.push(await send<{ partNumber: number; etag: string }>('PUT', `/admin/v1/releases/${release.id}/parts/${n}`, undefined, { 'content-type': 'application/octet-stream' }, chunk));
           
            progress(Math.min(file.size, offset + PART));
          
            if (offset + PART >= file.size) break;

        }

        return (await send<{ release: Release }>('POST', `/admin/v1/releases/${release.id}/complete`, { parts })).release;
    } catch (error) { await send('DELETE', '/admin/v1/releases/' + release.id).catch(() => {}); throw error; }

}

export const tickets = (status?: string) => send<{ tickets: Ticket[] }>('GET', '/admin/v1/tickets' + (status ? '?status=' + status : ''));
export const ticket = (id: string) => send<{ ticket: Ticket }>('GET', '/admin/v1/tickets/' + id);
export const reply = (id: string, message: string) => send<{ ticket: Ticket }>('POST', `/admin/v1/tickets/${id}/messages`, { message });
export const closeTicket = (id: string) => send<{ ticket: Ticket }>('POST', `/admin/v1/tickets/${id}/close`, {});
export const registry = () => send<{ branches: Branch[] }>('GET', '/admin/v1/registry');
export type OwnerRole = 'owner' | 'manager';
export type OwnerAccount = { id: string; email: string; role: OwnerRole; active: boolean; createdAt: string; licenseIds: string[] };
export const ROLES: Record<OwnerRole, string> = { owner: 'Dueño', manager: 'Gerente' };
export const ownerAccounts = (tenantId: string) => send<{ accounts: OwnerAccount[] }>('GET', '/admin/v1/owner-accounts?tenantId=' + encodeURIComponent(tenantId));
export const inviteOwner = (username: string, input: { tenantId: string; email: string; role: OwnerRole; licenseIds: string[] }) => signed<{ code: string; expiresAt: string }>('POST', '/admin/v1/owner-invites', username, input);
export const removeOwner = (username: string, id: string) => signed<{ ok: true }>('DELETE', '/admin/v1/owner-accounts/' + id, username, {});

// Money is in centavos of MXN without IVA, as CulinaryServer stores it.
export type TierPrices = { monthly: number; annual: number; permanent: number };
export type Prices = { tiers: Record<Tier, TierPrices>; addons: Record<Addon, number>; combos: Record<'pyme' | 'delivery', number> };
export type RevenueMonth = { month: string; lite: number; pro: number; addons: number; permanent: number; total: number };
export type Revenue = {
    currency: 'MXN'; timeZone: string; pricesAt: string | null; months: RevenueMonth[];
    recurring: { total: number; payingLicenses: number; perLicense: number; mix: { liteMonthly: number; liteAnnual: number; proMonthly: number; proAnnual: number; addons: number } };
    collected: { thisMonth: number; lastMonth: number };
    atRisk: { amount: number; licenses: { id: string; customer: string; branchName: string; expiresAt: string; amount: number }[] };
    top: { tenantId: string; customer: string; branches: number; monthly: number }[];
    perLicense: Record<string, { monthly: number; lastCharge: { at: string; kind: string; amount: number } | null }>;
};
export const prices = () => send<{ prices: Prices | null; updatedAt: string | null }>('GET', '/admin/v1/prices');
export const savePrices = (value: Prices) => send<{ prices: Prices; updatedAt: string }>('PUT', '/admin/v1/prices', value);
export const revenue = () => send<Revenue>('GET', '/admin/v1/revenue');

/** The same list price CulinaryServer charges for one period (src/revenue.ts periodPrice), to prefill the amount. */
export function periodPrice(p: Prices, plan: Plan, tier: Tier, addons: Addon[]): number | null {

    const monthlyAddons = addons.reduce((sum, a) => sum + p.addons[a], 0);

    if (plan === 'trial') return null;
    if (plan === 'permanent') return p.tiers[tier].permanent;
    if (plan === 'annual') return p.tiers[tier].annual + monthlyAddons * 12;

    const combo = COMBOS.find(c => c.tier === tier && c.addons.length === addons.length && c.addons.every(a => addons.includes(a)));

    return combo ? p.combos[combo.id] : p.tiers[tier].monthly + monthlyAddons;
}
