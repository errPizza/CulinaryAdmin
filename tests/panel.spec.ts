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
        releases: [{ id: 'r1', version: '1.4.0', platform: 'win-x64', filename: 'culinary-1.4.0.exe', notes: 'Corrige la impresión de comandas', status: 'ready', bytes: 48213004, sha512: 'ab'.repeat(64), createdAt: iso(-4) }, { id: 'r2', version: '1.4.0', platform: 'linux-x64', filename: 'culinary-1.4.0.deb', notes: 'Servidor de sucursal', status: 'ready', bytes: 61211004, sha512: 'cd'.repeat(64), createdAt: iso(-4) }],
        publications: [{ id: 'p1', releaseId: 'r1', target: 'all', createdAt: iso(-3), withdrawnAt: null }],
    };

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
        if (path === '/admin/v1/tickets') return json({ tickets: data.tickets.filter(t => !url.searchParams.get('status') || t.status === url.searchParams.get('status')) });
        if (path === '/admin/v1/tickets/t1') return json({ ticket: data.tickets[0] });
        if (path === '/admin/v1/tickets/t1/messages') { data.tickets[0].messages.push({ id: 'm' + Date.now(), author: 'admin', adminId: 'a1', body: body.message, createdAt: iso(0) }); data.tickets[0].status = 'answered'; return json({ ticket: data.tickets[0] }, 201); }
        if (path === '/admin/v1/releases') return json({ releases: data.releases });
        if (path === '/admin/v1/publications') return json({ publications: data.publications });
        if (path === '/admin/v1/registry') return json({ branches: [{ tenantId: 'grupo-plaza', tenantName: 'Restaurante La Plaza', branchId: '0b6c5c1e-3f0a-4d39-9f5e-1d2a8f3c7b10', siteId: 'plaza-centro', slug: 'plaza-centro', branchName: 'Centro', certificateSha256: 'e3'.repeat(32), licenseStatus: 'active', features: ['multiBranch'] }] });
        if (path === '/admin/v1/admins') return json({ admins: [{ id: 'a1', username: 'proveedor', deviceName: 'Oficina', keyAlg: 'Ed25519', active: true, createdAt: iso(-90) }, { id: 'a2', username: 'soporte', deviceName: 'Laptop de soporte', keyAlg: 'ES256', active: true, createdAt: iso(-20) }] });
        if (path === '/admin/v1/root-key') return json({ kid: 'mXGQnb4LVMQOMwa3', alg: 'EdDSA', publicKey: 'x', spki: 'x', pem: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAGZgc2PccPv/TKOhGCEzfIzy01VFqUgJSJE/dmri8zg8=\n-----END PUBLIC KEY-----\n' });
        if (path === '/admin/v1/audit') return json({ entries: [{ id: 3, at: iso(-0.2), adminId: 'a1', action: 'license.renew', target: '0b6c5c1e-3f0a', detail: { until: iso(30).slice(0, 10), plan: 'monthly' } }, { id: 2, at: iso(-1), adminId: 'a2', action: 'ticket.reply', target: 't1', detail: null }, { id: 1, at: iso(-2), adminId: null, action: 'license.create', target: null, detail: { features: ['printing', 'reservations'], limits: { maxUsers: 15 } } }] });
        if (path === '/admin/v1/challenges') return json({ nonce: 'n' + calls.length });
        if (path === '/admin/v1/enroll') return json({ adminId: 'a1', totp: { secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/CulinaryAdmin:proveedor?secret=JBSWY3DPEHPK3PXP' } }, 201);
        if (path === '/admin/v1/enroll/confirm') return json({ adminId: 'a1', username: 'proveedor' });
        if (path === '/admin/v1/password') return json({ ok: true });
        return json({ error: { code: 'not_found', message: 'No existe' } }, 404);

    });
    await page.addInitScript(([token]) => { localStorage.setItem('culinary-admin.server', 'http://worker.test'); if (token) sessionStorage.setItem('culinary-admin.token', token); }, [signedIn ? 'fixture-token' : '']);
    return calls;

}
const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name }).click();

test('licenses: rack, due strip, filters, table and the license drawer', async ({ page }) => {

    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockServer(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Licencias', level: 1 })).toBeVisible();
    const due = page.getByRole('region', { name: 'Vencen pronto' });
    await expect(due.locator('.due-when').first()).toContainText('venció hace 2 d');
    await expect(due).toContainText('Restaurante La Plaza · Centro');
    await expect(page.locator('.hook.active')).toHaveCount(5);
    await expect(page.locator('.hook.selected')).toHaveCount(0);
    await page.screenshot({ path: `${shots}/licenses-rack-1440.png` });
    await page.getByRole('group', { name: 'Filtrar por estado' }).getByRole('button', { name: /Sin activar/ }).click();
    await expect(page.locator('.plate')).toHaveCount(1);
    await page.getByRole('group', { name: 'Filtrar por estado' }).getByRole('button', { name: /Todas/ }).click();
    await page.getByRole('button', { name: 'Tabla' }).click();
    await expect(page.getByRole('row')).toHaveCount(9);
    await page.screenshot({ path: `${shots}/licenses-table-1440.png` });
    await page.getByRole('row', { name: /Pizzería Nápoles/ }).click();
    const drawer = page.getByRole('complementary', { name: 'Licencia de Pizzería Nápoles' });
    await expect(drawer.getByText('Sin vencimiento')).toBeVisible();
    await page.waitForTimeout(600);
    await expect(drawer.getByRole('button', { name: 'Renovar' })).toBeDisabled();
    await page.screenshot({ path: `${shots}/license-drawer-1440.png` });
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
    await dialog.getByRole('button', { name: 'Combo Delivery Pro' }).click();
    await expect(dialog.getByRole('combobox', { name: 'Nivel' })).toHaveValue('pro');
    await expect(dialog.getByLabel('Delivery Hub')).toBeChecked();
    await expect(dialog.getByLabel('Terminales fijas')).toHaveAttribute('placeholder', '10');
    await dialog.getByRole('combobox', { name: 'Periodo' }).selectOption('trial');
    await dialog.getByLabel('Días de prueba').fill('21');
    await dialog.getByLabel('Promociones').check();
    await page.screenshot({ path: `${shots}/license-create-1440.png` });
    await page.getByRole('button', { name: 'Crear licencia' }).click();
    const issued = page.getByRole('dialog', { name: 'Licencia creada' });
    await expect(issued.getByText('K7Q2M-9XWZT-4HPLA-R3VNE')).toBeVisible();
    await expect(issued.getByText('11111111-2222-4333-8444-555555555555')).toBeVisible();
    const sent = calls.find(c => c.method === 'POST' && c.path === '/admin/v1/licenses')!.body;
    expect(sent).toMatchObject({ siteId: 'guero-izt', plan: 'trial', tier: 'pro', addons: ['deliveryHub', 'webOrdering'], trialDays: 21, limits: { maxUsers: 15, maxTables: 30 } });
    expect(sent.limits.maxTerminals).toBeUndefined();
    expect(sent.features).toContain('promotions');
    await page.screenshot({ path: `${shots}/license-issued-1440.png` });

});
test('revoking asks for the site ID; renewing and releasing call the API', async ({ page }) => {

    const calls = await mockServer(page);
    await page.goto('/');
    await page.locator('.plate', { hasText: 'Taquería Don Beto' }).click();
    await page.getByRole('button', { name: 'Renovar' }).click();
    await page.getByRole('dialog', { name: 'Renovar licencia' }).getByRole('button', { name: 'Renovar' }).click();
    await expect.poll(() => calls.some(c => c.path.endsWith('/renew'))).toBe(true);
    await page.getByRole('button', { name: 'Liberar equipo' }).click();
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
test('support, releases, branches and team pages', async ({ page }) => {

    await mockServer(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Soporte/ }).locator('.count')).toHaveText('1');
    await nav(page, 'Soporte');
    await page.getByRole('button', { name: /No imprime la comanda/ }).click();
    await page.getByLabel('Respuesta').fill('Revisa que el servicio de impresión esté activo en Configuración.');
    await page.getByRole('button', { name: 'Responder' }).click();
    await expect(page.locator('.bubble.admin')).toContainText('servicio de impresión');
    await page.screenshot({ path: `${shots}/support-1440.png` });
    await nav(page, 'Versiones');
    await expect(page.getByRole('cell', { name: 'Todas las licencias' })).toBeVisible();
    await page.screenshot({ path: `${shots}/releases-1440.png` });
    await nav(page, 'Sucursales');
    await page.getByRole('button', { name: 'Datos de aprovisionamiento' }).click();
    await expect(page.locator('pre.snippet')).toContainText('"siteId": "plaza-centro"');
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await nav(page, 'Equipo y seguridad');
    await expect(page.getByText('kid mXGQnb4LVMQOMwa3')).toBeVisible();
    await expect(page.getByRole('cell', { name: /features: printing, reservations · limits: maxUsers: 15/ })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Sistema' })).toBeVisible();
    await page.screenshot({ path: `${shots}/team-1440.png`, fullPage: true });

});
test('lists show skeletons while they load', async ({ page }) => {

    await mockServer(page, true, 1500);
    await page.goto('/');
    await expect(page.locator('.sk-plate').first()).toBeVisible();
    await page.screenshot({ path: `${shots}/licenses-loading-1440.png` });
    await expect(page.locator('.plate').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.sk-plate')).toHaveCount(0);
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
    await expect(page.getByRole('heading', { name: 'Licencias', level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${shots}/licenses-390.png`, fullPage: true });

});
