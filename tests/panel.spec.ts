import { expect, test, type Page, type Route } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// CulinaryServer's /admin/v1 answered from fixtures, so every screen and state renders without a worker.
// The real worker was exercised by hand against `wrangler dev`; this suite covers the panel's own behavior.
const shots = 'test-results/screens';
mkdirSync(shots, { recursive: true });
const now = Date.now(), iso = (days: number) => new Date(now + days * 86_400_000).toISOString();
const license = (id: string, customer: string, branchName: string, siteId: string, plan: string, status: string, expires: number | null, extra: object = {}) => ({ id, tenantId: 'grupo-' + siteId.split('-')[0], siteId, customer, branchName, plan, trialDays: plan === 'trial' ? 14 : null, features: ['printing', 'reservations'], revision: 3, status, createdAt: iso(-60), activatedAt: status === 'pending' ? null : iso(-30), expiresAt: (expires === null ? null : iso(expires)) as string | null, validatedAt: status === 'active' ? iso(0) : null, revokedAt: (status === 'revoked' ? iso(-3) : null) as string | null, revokeReason: (status === 'revoked' ? 'Cliente canceló el servicio' : null) as string | null, binding: status === 'pending' ? null : { kind: 'tpm', keyAlg: 'ES256' }, centralCertificateSha256: null, tier: 'lite', addons: [] as string[], ...extra, limits: { maxUsers: 15, maxTables: 30, maxTerminals: (extra as any).tier === 'pro' ? 10 : 2 } });
function fixtures() {

    return {
        licenses: [
            license('0b6c5c1e-3f0a-4d39-9f5e-1d2a8f3c7b10', 'Restaurante La Plaza', 'Centro', 'plaza-centro', 'monthly', 'active', 2),
            license('7d2e11a0-1b2c-4d5e-8f90-a1b2c3d4e5f6', 'Restaurante La Plaza', 'Satélite', 'plaza-satelite', 'annual', 'active', 230),
            license('3f91a7c2-5b6d-4e7f-8a9b-0c1d2e3f4a5b', 'Taquería Don Beto', 'Coyoacán', 'donbeto-coy', 'trial', 'active', 5),
            license('a20c4e88-6c7d-4e8f-9a0b-1c2d3e4f5a6b', 'Mariscos El Faro', 'Boca del Río', 'faro-boca', 'annual', 'pending', null),
            license('c58e0b13-7d8e-4f9a-8b1c-2d3e4f5a6b7c', 'Café Ámbar', 'Roma Norte', 'ambar-roma', 'annual', 'expired', -2),
            license('e1d49f02-8e9f-4a0b-9c1d-3e4f5a6b7c8d', 'Pizzería Nápoles', 'Polanco', 'napoles-pol', 'permanent', 'active', null),
            license('f2e5a013-9f0a-4b1c-8d2e-4f5a6b7c8d9e', 'Fonda Doña Lupe', 'Puebla', 'lupe-pue', 'monthly', 'revoked', -20),
            license('03f6b124-0a1b-4c2d-9e3f-5a6b7c8d9e0f', 'Cantina La 20', 'Centro', 'la20-centro', 'monthly', 'active', 25),
        ],
        tickets: <any[]>[{ id: 't1', licenseId: '0b6c5c1e-3f0a-4d39-9f5e-1d2a8f3c7b10', customer: 'Restaurante La Plaza', branchName: 'Centro', siteId: 'plaza-centro', subject: 'No imprime la comanda de cocina', status: 'open', createdAt: iso(-1), updatedAt: iso(-0.1), messages: [{ id: 'm1', author: 'branch', adminId: null, body: 'Desde la mañana la impresora de cocina no responde. Ya la reiniciamos.', createdAt: iso(-1) }] }],
        releases: [{ id: 'r1', version: '1.4.0', platform: 'win-x64', filename: 'culinary-1.4.0.exe', notes: 'Corrige la impresión de comandas', status: 'ready', bytes: 48213004, sha512: 'ab'.repeat(64), createdAt: iso(-4) }, { id: 'r2', version: '1.4.0', platform: 'linux-x64', filename: 'culinary-1.4.0.deb', notes: 'Servidor de sucursal', status: 'ready', bytes: 61211004, sha512: 'cd'.repeat(64), createdAt: iso(-4) }, { id: 'r3', version: '1.5.0', platform: 'win-x64', filename: 'culinary-1.5.0.exe', notes: 'Cobro con Clip', status: 'signing', bytes: 48300000, sha512: 'ef'.repeat(64), createdAt: iso(0) }],
        owners: <any[]>[{ id: 'o1', email: 'dueno@laplaza.mx', role: 'owner', active: true, createdAt: iso(-10), licenseIds: [] }],
        publications: [{ id: 'p1', releaseId: 'r1', target: 'all', createdAt: iso(-3), withdrawnAt: null }],
        prices: <any>null,
        revenue: revenue(),
        faults: <any[]>[{ id: 'f1', licenseId: '0b6c5c1e-3f0a-4d39-9f5e-1d2a8f3c7b10', customer: 'Restaurante La Plaza', branchName: 'Centro', siteId: 'plaza-centro', source: 'api', severity: 'critical', what: 'POST /api/action: NullReferenceException', affected: 'La operación payment.add no se pudo confirmar; quien la hizo debe reconciliarla', detail: 'System.NullReferenceException\n   at MesaNexo.Api.BranchService.Action()', context: { route: '/api/action', operationId: 'op-77', exception: 'NullReferenceException' }, version: '0.3.3', platform: 'linux-x64', occurrences: 4, firstAt: iso(-1), lastAt: iso(0), status: 'open', resolvedAt: null, resolvedBy: null }],
    };

}
function revenue() {

    const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(15); d.setMonth(d.getMonth() - 11 + i); const lite = 1_420_000 + i * 62_000, pro = 810_000 + i * 140_000, addons = 120_000 + i * 40_000, permanent = i === 4 ? 4_490_000 : i === 9 ? 2_490_000 : 0; return { month: d.toISOString().slice(0, 7), lite, pro, addons, permanent, total: lite + pro + addons + permanent }; });
    return { currency: 'MXN', timeZone: 'America/Mexico_City', pricesAt: iso(-20), months, recurring: { total: 5_002_000, payingLicenses: 5, perLicense: 1_000_400, mix: { liteMonthly: 1_798_000, liteAnnual: 749_000, proMonthly: 0, proAnnual: 1_408_000, addons: 1_047_000 } }, collected: { thisMonth: months[11].total, lastMonth: months[10].total }, atRisk: { amount: 179_800, licenses: [{ id: '0b6c5c1e-3f0a-4d39-9f5e-1d2a8f3c7b10', customer: 'Restaurante La Plaza', branchName: 'Centro', expiresAt: iso(2), amount: 89_900 }, { id: '03f6b124-0a1b-4c2d-9e3f-5a6b7c8d9e0f', customer: 'Cantina La 20', branchName: 'Centro', expiresAt: iso(25), amount: 89_900 }] }, top: [{ tenantId: 'grupo-plaza', customer: 'Restaurante La Plaza', branches: 2, monthly: 2_340_000 }, { tenantId: 'grupo-napoles', customer: 'Pizzería Nápoles', branches: 1, monthly: 1_180_000 }, { tenantId: 'grupo-la20', customer: 'Cantina La 20', branches: 1, monthly: 899_000 }], perLicense: { '0b6c5c1e-3f0a-4d39-9f5e-1d2a8f3c7b10': { monthly: 89_900, lastCharge: { at: iso(-28), kind: 'renewal', amount: 89_900 } }, '7d2e11a0-1b2c-4d5e-8f90-a1b2c3d4e5f6': { monthly: 74_917, lastCharge: { at: iso(-135), kind: 'sale', amount: 899_000 } } } };

}
async function mockServer(page: Page, signedIn = true, delay = 0) {

    const data = fixtures();
    const calls: { method: string; path: string; body: any }[] = [];
    await page.route('http://worker.test/**', async (route: Route) => {

        const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method();
        const body = request.postDataBuffer() ? JSON.parse(request.postDataBuffer()!.toString() || '{}') : null;
        calls.push({ method, path, body });
        if (delay) await new Promise(r => setTimeout(r, delay));
        const json = (value: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value), headers: { 'access-control-allow-origin': '*' } });
        if (path === '/admin/v1/me') return json({ admin: { id: 'a1', username: 'proveedor' } });
        if (path === '/admin/v1/licenses' && method === 'GET') return json({ licenses: data.licenses });
        if (path === '/admin/v1/licenses' && method === 'POST') { const created = license('11111111-2222-4333-8444-555555555555', body.customer, body.branchName, body.siteId, body.plan, 'pending', null, { features: body.features, tier: body.tier, addons: body.addons }); data.licenses.push(created); return json({ license: created, activationCode: 'K7Q2M-9XWZT-4HPLA-R3VNE' }, 201); }
        const match = path.match(/^\/admin\/v1\/licenses\/([^/]+)\/(renew|revoke|reset-activation)$/);
        if (match) { const l = data.licenses.find(x => x.id === match[1])!; if (match[2] === 'revoke') Object.assign(l, { status: 'revoked', revokedAt: iso(0), revokeReason: body.reason }); if (match[2] === 'renew') Object.assign(l, { expiresAt: iso(32), status: 'active' }); return json(match[2] === 'reset-activation' ? { license: l, activationCode: 'NEW22-CODE3-AFTER-RESET' } : { license: l }); }
        if (path.startsWith('/admin/v1/licenses/') && method === 'PATCH') { const l = data.licenses.find(x => path.endsWith(x.id))!; Object.assign(l, body); return json({ license: l }); }
        if (path.startsWith('/admin/v1/licenses/') && method === 'DELETE') { data.licenses = data.licenses.filter(x => !path.endsWith(x.id)); return json({ ok: true }); }
        if (path === '/admin/v1/faults') return json({ faults: data.faults.filter(x => !url.searchParams.get('status') || x.status === url.searchParams.get('status')) });
        if (path === '/admin/v1/faults/f1/resolve') { data.faults[0].status = 'resolved'; return json({ fault: data.faults[0] }); }
        if (path === '/admin/v1/faults/f1/reopen') { data.faults[0].status = 'open'; return json({ fault: data.faults[0] }); }
        if (path === '/admin/v1/tickets') return json({ tickets: data.tickets.filter(t => !url.searchParams.get('status') || t.status === url.searchParams.get('status')) });
        if (path === '/admin/v1/tickets/t1') return json({ ticket: data.tickets[0] });
        if (path === '/admin/v1/tickets/t1/messages') { data.tickets[0].messages.push({ id: 'm' + Date.now(), author: 'admin', adminId: 'a1', body: body.message, createdAt: iso(0) }); data.tickets[0].status = 'answered'; return json({ ticket: data.tickets[0] }, 201); }
        if (path === '/admin/v1/releases') return json({ releases: data.releases });
        if (path === '/admin/v1/releases/r3/manifest' && method === 'PUT') { const r = data.releases.find(x => x.id === 'r3')!; Object.assign(r, { status: 'ready', manifest: body.manifest }); return json({ release: r }); }
        if (path === '/admin/v1/publications') return json({ publications: data.publications });
        if (path === '/admin/v1/registry') return json({ branches: [{ tenantId: 'grupo-plaza', tenantName: 'Restaurante La Plaza', branchId: '0b6c5c1e-3f0a-4d39-9f5e-1d2a8f3c7b10', siteId: 'plaza-centro', slug: 'plaza-centro', branchName: 'Centro', certificateSha256: 'e3'.repeat(32), licenseStatus: 'active', features: ['multiBranch'] }] });
        if (path === '/admin/v1/admins') return json({ admins: [{ id: 'a1', username: 'proveedor', deviceName: 'Oficina', keyAlg: 'Ed25519', active: true, createdAt: iso(-90) }, { id: 'a2', username: 'soporte', deviceName: 'Laptop de soporte', keyAlg: 'ES256', active: true, createdAt: iso(-20) }] });
        if (path === '/admin/v1/root-key') return json({ kid: 'mXGQnb4LVMQOMwa3', alg: 'EdDSA', publicKey: 'x', spki: 'x', pem: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAGZgc2PccPv/TKOhGCEzfIzy01VFqUgJSJE/dmri8zg8=\n-----END PUBLIC KEY-----\n' });
        if (path === '/admin/v1/audit') return json({ entries: [{ id: 3, at: iso(-0.2), adminId: 'a1', action: 'license.renew', target: '0b6c5c1e-3f0a', detail: { until: iso(30).slice(0, 10), plan: 'monthly' } }, { id: 2, at: iso(-1), adminId: 'a2', action: 'ticket.reply', target: 't1', detail: null }, { id: 1, at: iso(-2), adminId: null, action: 'license.create', target: null, detail: { features: ['printing', 'reservations'], limits: { maxUsers: 15 } } }] });
        if (path === '/admin/v1/prices' && method === 'GET') return json({ prices: data.prices, updatedAt: data.prices ? iso(-1) : null });
        if (path === '/admin/v1/prices' && method === 'PUT') { data.prices = body; return json({ prices: body, updatedAt: iso(0) }); }
        if (path === '/admin/v1/revenue') return json(data.revenue);
        if (path === '/admin/v1/challenges') return json({ nonce: 'n' + calls.length });
        if (path === '/admin/v1/enroll') return json({ adminId: 'a1', totp: { secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/CulinaryAdmin:proveedor?secret=JBSWY3DPEHPK3PXP' } }, 201);
        if (path === '/admin/v1/enroll/confirm') return json({ adminId: 'a1', username: 'proveedor' });
        if (path === '/admin/v1/password') return json({ ok: true });
        if (path === '/admin/v1/login') return json({ token: 'fixture-token', expiresAt: iso(1), admin: { id: 'a1', username: 'proveedor' } });
        if (path === '/admin/v1/owner-accounts' && method === 'GET') return json({ accounts: url.searchParams.get('tenantId') === 'grupo-plaza' ? data.owners : [] });
        if (path.startsWith('/admin/v1/owner-accounts/') && method === 'DELETE') { data.owners = data.owners.filter(o => !path.endsWith(o.id)); return json({ ok: true }); }
        if (path === '/admin/v1/owner-invites') { data.owners.push({ id: 'o' + calls.length, email: body.email, role: body.role, active: false, createdAt: iso(0), licenseIds: body.licenseIds }); return json({ code: 'PLAZA-GEREN-TE123-ALTA9', expiresAt: iso(7) }, 201); }
        return json({ error: { code: 'not_found', message: 'No existe' } }, 404);

    });
    await page.addInitScript(([token]) => { localStorage.setItem('culinary-admin.server', 'http://worker.test'); if (token) sessionStorage.setItem('culinary-admin.token', token); }, [signedIn ? 'fixture-token' : '']);
    return calls;

}
const rail = (page: Page) => page.getByRole('navigation', { name: 'Secciones' });
const nav = (page: Page, name: string) => rail(page).getByRole('button', { name }).click();
const row = (page: Page, name: string | RegExp) => page.getByRole('row', { name });
const detail = (page: Page) => page.getByRole('complementary', { name: /^Licencia de/ });

test('summary: headline numbers, urgent licenses and the way into each section', async ({ page }) => {

    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width: 1600, height: 1000 });
    await mockServer(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '¡Bienvenido, proveedor!', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /Licencias activas/ })).toContainText('5');
    await expect(page.getByRole('button', { name: /Ingreso recurrente al mes/ })).toContainText('$50');
    const urgent = page.getByRole('region', { name: 'Licencias' });
    await expect(urgent.getByRole('row').nth(1)).toContainText('Café Ámbar');
    await expect(urgent.getByRole('row').nth(2)).toContainText('Vence en 2 días');
    await expect(page.getByText('Última actividad')).toBeVisible();
    await page.screenshot({ path: `${shots}/summary-1600.png` });
    await urgent.getByRole('row').nth(2).getByRole('button', { name: 'Ver' }).click();
    await expect(page.getByRole('heading', { name: 'Licencias', level: 1 })).toBeVisible();
    await expect(detail(page)).toContainText('Restaurante La Plaza');
    expect(errors).toEqual([]);

});
test('licenses: headline filters, table, search and the license detail', async ({ page }) => {

    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width: 1600, height: 1000 });
    await mockServer(page);
    await page.goto('/');
    await nav(page, 'Licencias');
    await expect(page.getByRole('heading', { name: 'Licencias', level: 1 })).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(9);
    await page.locator('.kpi', { hasText: 'Sin activar' }).click();
    await expect(page.getByRole('row')).toHaveCount(2);
    await page.getByRole('group', { name: 'Filtrar por estado' }).getByRole('button', { name: /Por vencer/ }).click();
    await expect(page.getByRole('row')).toHaveCount(3);
    await page.getByRole('group', { name: 'Filtrar por estado' }).getByRole('button', { name: /Todas/ }).click();
    await page.getByLabel('Buscar licencias').fill('plaza');
    await expect(page.getByRole('row')).toHaveCount(3);
    await page.getByLabel('Buscar licencias').fill('');
    await row(page, /Satélite/).click();
    await expect(detail(page)).toContainText('$749.17');
    await expect(detail(page)).toContainText('$8,990');
    await row(page, /Pizzería Nápoles/).click();
    await expect(detail(page).getByText('Sin vencimiento')).toBeVisible();
    await expect(detail(page).getByRole('button', { name: 'Renovar' })).toBeDisabled();
    await page.screenshot({ path: `${shots}/licenses-1600.png` });
    expect(errors).toEqual([]);

});
test('creating a license shows the ID and activation code once', async ({ page }) => {

    const calls = await mockServer(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Nueva licencia' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Nueva licencia' });
    await dialog.getByLabel('Cliente', { exact: true }).fill('Tortas El Güero');
    await dialog.getByLabel('Sucursal', { exact: true }).fill('Iztapalapa');
    await dialog.getByLabel(/Identidad de la sucursal/).fill('guero-izt');
    await dialog.getByLabel('RFC').fill('eku9003173c9');
    await dialog.getByLabel('Código postal fiscal').fill('42501');
    await dialog.getByLabel(/Razón social/).fill('escuela kemper urgate');
    await dialog.getByRole('combobox', { name: 'Régimen fiscal' }).selectOption('601');
    await dialog.getByRole('button', { name: 'Combo Delivery Pro' }).click();
    await expect(dialog.getByRole('combobox', { name: 'Nivel' })).toHaveValue('pro');
    await expect(dialog.getByLabel('Delivery Hub')).toBeChecked();
    await expect(dialog.getByLabel('Terminales fijas')).toHaveAttribute('placeholder', '10');
    await dialog.getByRole('combobox', { name: 'Periodo' }).selectOption('trial');
    await dialog.getByLabel('Días de prueba').fill('21');
    await dialog.getByLabel('Promociones').check();
    await expect(dialog.getByLabel('Facturación CFDI')).toBeChecked();
    await dialog.getByRole('button', { name: 'Ninguna' }).click();
    await dialog.getByLabel('Mapas').check();
    await dialog.getByLabel('Terminal bancaria').check();
    await page.screenshot({ path: `${shots}/license-create-1440.png` });
    await page.getByRole('button', { name: 'Crear licencia' }).click();
    const issued = page.getByRole('dialog', { name: 'Licencia creada' });
    await expect(issued.getByText('K7Q2M-9XWZT-4HPLA-R3VNE')).toBeVisible();
    await expect(issued.getByText('11111111-2222-4333-8444-555555555555')).toBeVisible();
    const sent = calls.find(c => c.method === 'POST' && c.path === '/admin/v1/licenses')!.body;
    expect(sent).toMatchObject({ siteId: 'guero-izt', plan: 'trial', tier: 'pro', addons: ['deliveryHub', 'webOrdering'], trialDays: 21, limits: { maxUsers: 15, maxTables: 30 } });
    expect(sent.fiscal).toEqual({ rfc: 'EKU9003173C9', name: 'ESCUELA KEMPER URGATE', postalCode: '42501', regime: '601' });
    expect(sent.limits.maxTerminals).toBeUndefined();
    expect(sent.features).toContain('promotions');
    expect(sent.integrations).toEqual(['maps', 'terminal']);
    await page.screenshot({ path: `${shots}/license-issued-1440.png` });

});
test('revoking asks for the site ID; renewing and releasing call the API', async ({ page }) => {

    const calls = await mockServer(page);
    await page.goto('/');
    await nav(page, 'Licencias');
    await row(page, /Taquería Don Beto/).click();
    await page.getByRole('button', { name: 'Renovar' }).click();
    await page.getByRole('dialog', { name: 'Renovar licencia' }).getByRole('button', { name: 'Renovar' }).click();
    await expect.poll(() => calls.some(c => c.path.endsWith('/renew'))).toBe(true);
    await page.getByRole('button', { name: 'Liberar equipo' }).click();
    await expect(page.getByRole('button', { name: 'Liberar y generar código' })).toBeDisabled();
    await page.getByLabel('Motivo (queda en la bitácora)').fill('Falló la placa');
    await page.getByRole('button', { name: 'Liberar y generar código' }).click();
    await expect(page.getByRole('dialog', { name: 'Equipo liberado' }).getByText('NEW22-CODE3-AFTER-RESET')).toBeVisible();
    await page.getByRole('button', { name: 'Ya los guardé' }).click();
    await page.getByRole('button', { name: 'Revocar' }).click();
    const revoke = page.getByRole('dialog', { name: 'Revocar licencia' });
    const go = revoke.getByRole('button', { name: 'Revocar para siempre' });
    await revoke.getByLabel('Motivo').fill('Cliente canceló');
    await expect(go).toBeDisabled();
    await revoke.getByLabel(/para confirmar/).fill('donbeto-coy');
    await page.screenshot({ path: `${shots}/license-revoke-1440.png` });
    await go.click();
    await expect.poll(() => calls.find(c => c.path.endsWith('/revoke'))?.body).toEqual({ reason: 'Cliente canceló' });

});
test('the site ID changes only while no machine holds the license', async ({ page }) => {

    const calls = await mockServer(page);
    await page.goto('/');
    await nav(page, 'Licencias');
    await row(page, /Taquería Don Beto/).click();
    await page.getByRole('button', { name: 'Editar licencia' }).click();
    await expect(page.getByRole('dialog', { name: 'Editar licencia' }).getByLabel(/siteId/)).toBeDisabled();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await detail(page).getByRole('button', { name: 'Cerrar' }).click();
    await row(page, /Mariscos El Faro/).click();
    await page.getByRole('button', { name: 'Editar licencia' }).click();
    const edit = page.getByRole('dialog', { name: 'Editar licencia' });
    await edit.getByLabel(/siteId/).fill('faro-boca-2');
    await edit.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect.poll(() => calls.find(c => c.method === 'PATCH')?.body.siteId).toBe('faro-boca-2');

});
test('deleting asks for the site ID and removes the license from the panel', async ({ page }) => {

    const calls = await mockServer(page);
    await page.goto('/');
    await nav(page, 'Licencias');
    await row(page, /Fonda Doña Lupe/).click();
    await page.getByRole('button', { name: 'Eliminar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Eliminar licencia' });
    const go = dialog.getByRole('button', { name: 'Eliminar' });
    await expect(go).toBeDisabled();
    await dialog.getByLabel(/para confirmar/).fill('lupe-pue');
    await page.screenshot({ path: `${shots}/license-delete-1440.png` });
    await go.click();
    await expect.poll(() => calls.some(c => c.method === 'DELETE' && c.path.endsWith('f2e5a013-9f0a-4b1c-8d2e-4f5a6b7c8d9e'))).toBe(true);
    await expect(row(page, /Fonda Doña Lupe/)).toHaveCount(0);

});
test('support, releases, branches and team pages', async ({ page }) => {

    const calls = await mockServer(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(rail(page).getByRole('button', { name: /Soporte/ }).locator('.count')).toHaveText('1');
    await nav(page, 'Soporte');
    await page.getByRole('button', { name: /No imprime la comanda/ }).click();
    await page.getByLabel('Respuesta').fill('Revisa que el servicio de impresión esté activo en Configuración.');
    await page.getByRole('button', { name: 'Responder' }).click();
    await expect(page.locator('.bubble.admin')).toContainText('servicio de impresión');
    await page.screenshot({ path: `${shots}/support-1440.png` });
    await nav(page, 'Versiones');
    await expect(page.getByRole('cell', { name: 'Todas las licencias' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Paquetes' }).getByText('Falta firma')).toBeVisible();
    await page.getByRole('button', { name: 'Firmar' }).click();
    await expect(page.locator('.station-command').first()).toContainText('--release-id r3 --version 1.5.0 --platform win-x64');
    await page.getByLabel('Firma que imprimió la estación').fill('eyJhbGciOiJFZERTQSJ9.eyJ2IjoxfQ.firma-de-la-estacion-de-prueba');
    await page.getByRole('button', { name: 'Guardar firma' }).click();
    await expect(page.getByText('Versión firmada y lista para publicar')).toBeVisible();
    expect(calls.some(c => c.method === 'PUT' && c.path === '/admin/v1/releases/r3/manifest')).toBe(true);
    await page.screenshot({ path: `${shots}/releases-1440.png` });
    await nav(page, 'Sucursales');
    await row(page, /plaza-centro/).click();
    await expect(page.locator('pre.snippet')).toContainText('"siteId": "plaza-centro"');
    await page.screenshot({ path: `${shots}/branches-1440.png` });
    await nav(page, 'Equipo y seguridad');
    await expect(page.getByText('kid mXGQnb4LVMQOMwa3')).toBeVisible();
    await expect(page.getByRole('cell', { name: /features: printing, reservations · limits: maxUsers: 15/ })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Sistema' })).toBeVisible();
    await page.screenshot({ path: `${shots}/team-1440.png`, fullPage: true });

});
test('a fault says what failed, what it affected and what is needed to fix it', async ({ page }) => {

    const calls = await mockServer(page);
    await page.goto('/');
    const nav = rail(page).getByRole('button', { name: /^Fallos/ });
    await expect(nav.locator('.count')).toHaveText('1');
    await nav.click();
    await row(page, /NullReferenceException/).click();
    const panel = page.locator('.fault');
    await expect(panel).toContainText('La operación payment.add no se pudo confirmar');
    await expect(panel).toContainText('plaza-centro');
    await expect(panel).toContainText('0.3.3 · linux-x64');
    await expect(panel).toContainText('4 veces');
    await expect(panel).toContainText('op-77');
    await expect(panel.locator('pre')).toContainText('BranchService.Action');
    await page.screenshot({ path: `${shots}/fallos.png` });
    await page.getByRole('button', { name: 'Marcar resuelto' }).click();
    await expect(page.getByText('Ninguna sucursal tiene fallos por revisar.')).toBeVisible();
    await expect(nav.locator('.count')).toHaveCount(0);
    await page.getByRole('button', { name: 'Resueltos' }).click();
    await row(page, /NullReferenceException/).click();
    await page.getByRole('button', { name: 'Reabrir' }).click();
    await expect.poll(() => calls.map(c => c.path)).toContain('/admin/v1/faults/f1/reopen');

});

test('lists show skeletons while they load', async ({ page }) => {

    await mockServer(page, true, 1500);
    await page.goto('/');
    await nav(page, 'Licencias');
    await expect(page.locator('.sk-row').first()).toBeVisible();
    await page.screenshot({ path: `${shots}/licenses-loading-1440.png` });
    await expect(row(page, /Pizzería Nápoles/)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.sk-row')).toHaveCount(0);
    await nav(page, 'Equipo y seguridad');
    await expect(page.locator('.sk-row').first()).toBeVisible();
    await expect(page.getByText('kid mXGQnb4LVMQOMwa3')).toBeVisible({ timeout: 10_000 });

});
test('a forgotten password is replaced with the device key and the authenticator code', async ({ page }) => {

    const calls = await mockServer(page, false);
    await page.goto('/');
    await page.getByLabel('Código de alta o invitación').fill('codigo-de-alta-de-prueba-123');
    await page.getByLabel(/^Usuario/).fill('proveedor');
    await page.getByLabel(/^Contraseña/).fill('contraseña muy larga 123');
    await page.getByLabel(/^Repite la contraseña/).fill('contraseña muy larga 123');
    await page.getByRole('button', { name: 'Dar de alta' }).click();
    await page.getByLabel('Código que muestra la app').fill('123456');
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await page.getByRole('button', { name: 'Olvidé mi contraseña' }).click();
    await expect(page.getByRole('heading', { name: 'Nueva contraseña' })).toBeVisible();
    await page.getByLabel(/^Contraseña nueva/).fill('otra contraseña larga 456');
    await page.getByLabel(/^Repítela/).fill('otra contraseña larga 456');
    await page.getByLabel('Código de 6 dígitos').fill('654 321');
    await page.screenshot({ path: `${shots}/password-reset-1440.png` });
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();
    await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
    const reset = calls.find(c => c.path === '/admin/v1/password');
    expect(reset?.body).toEqual({ totp: '654321', newPassword: 'otra contraseña larga 456' });

});
test('sign-in and phone layout fit without horizontal scroll', async ({ page }) => {

    await mockServer(page, false);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Da de alta este equipo' })).toBeVisible();
    await page.screenshot({ path: `${shots}/gate-1440.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await mockServer(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Bienvenido/, level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${shots}/summary-390.png`, fullPage: true });
    for (const name of ['Licencias', 'Ganancias', 'Versiones', 'Soporte', 'Fallos', 'Sucursales', 'Equipo y seguridad']) {
        await nav(page, name);
        await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name).toBe(true);
    }
    await page.screenshot({ path: `${shots}/team-390.png`, fullPage: true });

});
test('owner panel: accounts per business, signed invitation for a manager and removal', async ({ page }) => {

    const calls = await mockServer(page, false);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    // The device key the signed actions need is created by enrolling this browser, as on a real computer.
    await page.getByLabel('Código de alta o invitación').fill('codigo-de-alta-de-prueba-123');
    await page.getByLabel(/^Usuario/).fill('proveedor');
    await page.getByLabel(/^Contraseña/).fill('contraseña muy larga 123');
    await page.getByLabel(/^Repite la contraseña/).fill('contraseña muy larga 123');
    await page.getByRole('button', { name: 'Dar de alta' }).click();
    await page.getByLabel('Código que muestra la app').fill('123456');
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await page.getByLabel('Contraseña', { exact: true }).fill('contraseña muy larga 123');
    await page.getByLabel('Código de 6 dígitos').fill('234567');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await nav(page, 'Panel del dueño');
    await page.getByRole('combobox', { name: 'Negocio' }).selectOption({ label: 'Restaurante La Plaza' });
    await expect(page.getByRole('cell', { name: 'dueno@laplaza.mx' })).toBeVisible();
    await expect(page.locator('.owner-branches')).toContainText('Satélite');
    await page.getByRole('button', { name: 'Invitar' }).click();
    await page.getByLabel(/^Correo/).fill('gerente@laplaza.mx');
    await page.getByRole('group', { name: 'Rol' }).getByRole('button', { name: 'Gerente' }).click();
    await page.getByRole('button', { name: 'Crear invitación' }).click();
    await expect(page.getByRole('alert')).toContainText('al menos una sucursal');
    await page.getByLabel('Centro').check();
    await page.getByRole('button', { name: 'Crear invitación' }).click();
    await expect(page.getByText('PLAZA-GEREN-TE123-ALTA9')).toBeVisible();
    const invite = calls.find(c => c.path === '/admin/v1/owner-invites')!;
    expect(invite.body).toEqual({ tenantId: 'grupo-plaza', email: 'gerente@laplaza.mx', role: 'manager', licenseIds: ['0b6c5c1e-3f0a-4d39-9f5e-1d2a8f3c7b10'] });
    expect(calls[calls.indexOf(invite) - 1]?.path).toBe('/admin/v1/challenges');
    await page.screenshot({ path: `${shots}/owners-invite-1440.png` });
    await page.getByRole('button', { name: 'Listo' }).click();
    await expect(page.getByRole('row', { name: /gerente@laplaza.mx/ })).toContainText('Centro');
    await page.getByRole('row', { name: /gerente@laplaza.mx/ }).getByRole('button', { name: 'Borrar' }).click();
    await page.getByRole('button', { name: 'Borrar cuenta' }).click();
    await expect(page.getByRole('row', { name: /gerente@laplaza.mx/ })).toHaveCount(0);
    expect(calls.some(c => c.method === 'DELETE' && c.path.startsWith('/admin/v1/owner-accounts/'))).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${shots}/owners-390.png`, fullPage: true });

});

test('revenue: prices are set in pesos, sent in centavos, and the charge goes with a renewal', async ({ page }) => {

    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    const calls = await mockServer(page);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/');
    await nav(page, 'Ganancias');
    await expect(page.getByRole('heading', { name: 'Ganancias', level: 1 })).toBeVisible();
    await expect(page.getByText('Aún no hay precios')).toBeVisible();
    await expect(page.locator('.kpi', { hasText: 'Recurrente al mes' })).toContainText('$50,020');
    await expect(page.getByRole('img', { name: /Ingresos por mes/ })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Vencen en 30 días' })).toContainText('Cantina La 20');
    const save = page.getByRole('button', { name: 'Guardar precios' });
    await expect(save).toBeDisabled();
    await page.getByLabel('Lite mensual').fill('899');
    await page.getByLabel('Lite anual').fill('8,990');
    await page.getByLabel('Lite de por vida').fill('24900');
    await page.getByLabel('Pro mensual').fill('1690');
    await page.getByLabel('Pro anual').fill('16900');
    await page.getByLabel('Pro de por vida').fill('44900');
    await page.getByLabel('Comanderos móviles').fill('290');
    await page.getByLabel('Delivery Hub').fill('490.50');
    await page.getByLabel('Web propia de pedidos').fill('390');
    await page.getByLabel('Combo PYME Digital').fill('1099');
    await page.getByLabel('Combo Delivery Pro').fill('2390');
    await page.screenshot({ path: `${shots}/revenue-1600.png` });
    await save.click();
    await expect.poll(() => calls.find(c => c.method === 'PUT' && c.path === '/admin/v1/prices')?.body).toEqual({ tiers: { lite: { monthly: 89_900, annual: 899_000, permanent: 2_490_000 }, pro: { monthly: 169_000, annual: 1_690_000, permanent: 4_490_000 } }, addons: { mobileOrdering: 29_000, deliveryHub: 49_050, webOrdering: 39_000 }, combos: { pyme: 109_900, delivery: 239_000 } });
    await expect(page.getByText(/Vigentes desde el/)).toBeVisible();

    await nav(page, 'Licencias');
    await row(page, /Cantina La 20/).click();
    await detail(page).getByRole('button', { name: 'Renovar' }).click();
    const renew = page.getByRole('dialog', { name: 'Renovar licencia' });
    await expect(renew).toContainText('Precio de lista: $899');
    await renew.getByLabel('Cobro').fill('800');
    await renew.getByRole('button', { name: 'Renovar' }).click();
    await expect.poll(() => calls.find(c => c.path.endsWith('/renew'))?.body).toEqual({ charge: 80_000 });
    expect(errors).toEqual([]);

});
