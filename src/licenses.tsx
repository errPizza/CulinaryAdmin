import { useMemo, useState } from 'react';
import { CalendarClock, LayoutGrid, List, Plus, RotateCcw, Search, ShieldOff, Unlink, X } from 'lucide-react';
import * as api from './api';
import type { License, LicenseInput, Plan } from './api';
import { Dialog, Empty, Secret, SkeletonPlates, SkeletonRows, State, day, daysLeft, useLoad, useSubmit, useToast } from './ui';

const STATUSES = [['all', 'Todas'], ['active', 'Activas'], ['pending', 'Sin activar'], ['expired', 'Vencidas'], ['revoked', 'Revocadas']] as const;
const planLine = (l: License) => api.PLANS[l.plan] + (l.plan === 'trial' && l.trialDays ? ` ${l.trialDays} d` : '');
function expiry(l: License) {

    if (l.status === 'pending') return 'Sin activar';
    if (l.status === 'revoked') return 'Revocada ' + day(l.revokedAt);
    if (!l.expiresAt) return 'Sin vencimiento';
    const left = daysLeft(l.expiresAt)!;
    return left < 0 ? 'Venció ' + day(l.expiresAt) : left === 0 ? 'Vence hoy' : 'Vence ' + day(l.expiresAt);

}

export function Licenses() {

    const { data, error, reload } = useLoad(api.licenses);
    const [filter, setFilter] = useState('all'), [query, setQuery] = useState(''), [view, setView] = useState<'rack' | 'table'>(() => (localStorage.getItem('culinary-admin.view') as 'rack' | 'table') || 'rack');
    const [selected, setSelected] = useState<string | null>(null), [creating, setCreating] = useState(false), [issued, setIssued] = useState<{ license: License; activationCode: string; title: string } | null>(null);
    const all = data?.licenses ?? [];
    const shown = useMemo(() => all.filter(l => (filter === 'all' || l.status === filter) && (!query || [l.customer, l.branchName, l.siteId, l.tenantId].some(v => v.toLowerCase().includes(query.toLowerCase())))), [all, filter, query]);
    // Sooner first: what lapses in the next two weeks, then what already lapsed.
    const due = useMemo(() => all.filter(l => l.status !== 'revoked' && l.expiresAt && daysLeft(l.expiresAt)! <= 14).sort((a, b) => Date.parse(a.expiresAt!) - Date.parse(b.expiresAt!)).slice(0, 6), [all]);
    const current = all.find(l => l.id === selected) ?? null;
    const choose = (v: 'rack' | 'table') => { setView(v); localStorage.setItem('culinary-admin.view', v); };
    return <div className="page">
        <div className="page-head"><h1>Licencias</h1>
            <label style={{ position: 'relative', flex: '0 1 280px' }}><Search size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--muted)' }} /><input className="input" style={{ paddingLeft: 34 }} placeholder="Cliente, sucursal o sitio" value={query} onChange={e => setQuery(e.target.value)} aria-label="Buscar licencias" /></label>
            <button className="btn primary" onClick={() => setCreating(true)}><Plus size={16} />Nueva licencia</button></div>
        {error && <div className="error" role="alert">{error}</div>}
        {due.length > 0 && <section className="due" aria-label="Vencen pronto"><h2><CalendarClock size={14} />Vencen pronto</h2>{due.map(l => { const left = daysLeft(l.expiresAt)!; return <div className="due-row" key={l.id} role="button" tabIndex={0} onClick={() => setSelected(l.id)} onKeyDown={e => e.key === 'Enter' && setSelected(l.id)}><span className={'due-when' + (left < 0 ? ' late' : '')}>{left < 0 ? `venció hace ${-left} d` : left === 0 ? 'hoy' : `en ${left} d`} · {day(l.expiresAt)}</span><span className="due-what"><span>{l.customer} · {l.branchName}</span><span>{planLine(l)}</span></span></div>; })}</section>}
        <div className="page-head" style={{ gap: 10 }}>
            <div className="seg" role="group" aria-label="Filtrar por estado">{STATUSES.map(([k, label]) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}<span className="num">{k === 'all' ? all.length : all.filter(l => l.status === k).length}</span></button>)}</div>
            <span style={{ flex: 1 }} />
            <div className="seg" role="group" aria-label="Vista"><button aria-pressed={view === 'rack'} onClick={() => choose('rack')}><LayoutGrid size={14} />Casillero</button><button aria-pressed={view === 'table'} onClick={() => choose('table')}><List size={14} />Tabla</button></div></div>
        {!data && !error ? (view === 'rack' ? <SkeletonPlates /> : <div className="panel table-scroll"><table><thead><tr><th>Cliente</th><th>Sitio</th><th>Plan</th><th>Equipo</th><th>Vencimiento</th><th>Estado</th></tr></thead><tbody><SkeletonRows cols={6} /></tbody></table></div>)
            : data && !all.length ? <div className="panel"><Empty title="Aún no hay licencias" text="Crea la primera y entrega a tu cliente su identificador y código de activación." action={<button className="btn primary" onClick={() => setCreating(true)}><Plus size={16} />Nueva licencia</button>} /></div>
            : data && !shown.length ? <div className="panel"><Empty title="Nada coincide" text="Prueba con otro estado o búsqueda." /></div>
            : view === 'rack' ? <section className="rack" aria-label="Casillero de licencias">{shown.map(l => <div className={'hook ' + l.status + (selected === l.id ? ' selected' : '')} key={l.id}><button className={'plate ' + l.status} aria-pressed={selected === l.id} onClick={() => setSelected(l.id)}>
                <div className="who">{l.customer}</div><div className="where">{l.branchName} · <span className="num">{l.siteId}</span></div>
                <div className="foot"><State value={l.status} label={l.status === 'active' ? planLine(l) : undefined} /><span className="num">{l.status === 'active' ? (l.expiresAt ? day(l.expiresAt) : '∞') : l.status === 'expired' ? day(l.expiresAt) : ''}</span></div></button></div>)}</section>
            : <div className="panel table-scroll"><table><thead><tr><th>Cliente</th><th>Sitio</th><th>Plan</th><th>Equipo</th><th>Vencimiento</th><th>Estado</th></tr></thead><tbody>{shown.map(l => <tr key={l.id} className="clickable" onClick={() => setSelected(l.id)}><td><div className="cell-main">{l.customer}</div><div className="cell-sub">{l.branchName}</div></td><td><code>{l.siteId}</code></td><td>{planLine(l)}</td><td className="cell-sub">{l.binding ? (l.binding.kind === 'tpm' ? 'TPM' : 'Huella') : '—'}</td><td className="num">{expiry(l)}</td><td><State value={l.status} /></td></tr>)}</tbody></table></div>}
        {current && <LicenseDrawer license={current} close={() => setSelected(null)} changed={reload} issued={(r, title) => setIssued({ ...r, title })} />}
        {creating && <LicenseForm close={() => setCreating(false)} saved={r => { setCreating(false); void reload(); if (r.activationCode) setIssued({ license: r.license, activationCode: r.activationCode, title: 'Licencia creada' }); }} />}
        {issued && <Issued {...issued} close={() => setIssued(null)} />}
    </div>;

}
function Issued({ license, activationCode, title, close }: { license: License; activationCode: string; title: string; close: () => void }) {

    return <Dialog title={title} onClose={close} footer={<button className="btn primary" onClick={close}>Ya los guardé</button>}>
        <p>Entrega estos dos datos a <b style={{ color: 'var(--ink)' }}>{license.customer} · {license.branchName}</b>. El código solo se muestra ahora y sirve una vez; el plazo empieza al activar.</p>
        <Secret label="Identificador de licencia" value={license.id} />
        <Secret label="Código de activación" value={activationCode} />
    </Dialog>;

}
function LicenseDrawer({ license: l, close, changed, issued }: { license: License; close: () => void; changed: () => Promise<void>; issued: (r: { license: License; activationCode: string }, title: string) => void }) {

    const [dialog, setDialog] = useState<'edit' | 'renew' | 'revoke' | 'reset' | null>(null);
    const closed = l.status === 'revoked';
    return <div className="drawer-wrap" onClick={e => e.target === e.currentTarget && close()}><aside className="drawer" aria-label={'Licencia de ' + l.customer}>
        <header><div><h2 style={{ fontSize: 19 }}>{l.customer}</h2><p className="cell-sub">{l.branchName} · <code>{l.siteId}</code></p><div style={{ marginTop: 10 }}><State value={l.status} /></div></div><button className="btn quiet sm" onClick={close} aria-label="Cerrar"><X size={16} /></button></header>
        <section><dl className="facts">
            <dt>Plan</dt><dd>{planLine(l)}</dd><dt>Vencimiento</dt><dd>{expiry(l)}</dd><dt>Activada</dt><dd>{day(l.activatedAt)}</dd><dt>Última validación</dt><dd>{day(l.validatedAt)}</dd>
            <dt>Equipo</dt><dd>{l.binding ? `${l.binding.kind === 'tpm' ? 'TPM 2.0' : 'Huella de hardware'} · ${l.binding.keyAlg}` : 'Sin ligar'}</dd>
            <dt>Límites</dt><dd>{l.limits.maxUsers} usuarios · {l.limits.maxTables} mesas</dd><dt>Empresa</dt><dd><code>{l.tenantId}</code></dd><dt>Identificador</dt><dd><code>{l.id}</code></dd><dt>Revisión</dt><dd className="num">{l.revision}</dd>
            {l.revokeReason && <><dt>Motivo</dt><dd>{l.revokeReason}</dd></>}
        </dl></section>
        <section><h3>Funciones</h3><div className="chips">{l.features.length ? l.features.map(f => <span className="chip" key={f}>{api.FEATURES[f] ?? f}</span>) : <span className="cell-sub">Solo la operación base</span>}</div></section>
        {!closed && <section><h3>Acciones</h3><div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={() => setDialog('edit')}>Editar plan y funciones</button>
            <button className="btn" disabled={l.plan === 'permanent' || l.status === 'pending'} onClick={() => setDialog('renew')}><RotateCcw size={15} />Renovar</button>
            <button className="btn" disabled={l.status === 'pending'} onClick={() => setDialog('reset')}><Unlink size={15} />Liberar equipo</button>
            <button className="btn danger" onClick={() => setDialog('revoke')}><ShieldOff size={15} />Revocar</button></div>
            {l.plan === 'permanent' && <p className="cell-sub">La licencia permanente no se renueva: no vence.</p>}</section>}
        {dialog === 'edit' && <LicenseForm license={l} close={() => setDialog(null)} saved={() => { setDialog(null); void changed(); }} />}
        {dialog === 'renew' && <Renew license={l} close={() => setDialog(null)} done={() => { setDialog(null); void changed(); }} />}
        {dialog === 'revoke' && <Revoke license={l} close={() => setDialog(null)} done={() => { setDialog(null); void changed(); }} />}
        {dialog === 'reset' && <Reset license={l} close={() => setDialog(null)} done={r => { setDialog(null); void changed(); issued(r, 'Equipo liberado'); }} />}
    </aside></div>;

}
function LicenseForm({ license, close, saved }: { license?: License; close: () => void; saved: (r: { license: License; activationCode?: string }) => void }) {

    const [f, setF] = useState({ customer: license?.customer ?? '', branchName: license?.branchName ?? '', siteId: license?.siteId ?? '', tenantId: license?.tenantId ?? '', plan: license?.plan ?? 'trial' as Plan, trialDays: license?.trialDays ?? 14, features: license?.features ?? ['printing'], maxUsers: license?.limits.maxUsers ?? 15, maxTables: license?.limits.maxTables ?? 30, expiresAt: '' });
    const { busy, error, submit } = useSubmit(), toast = useToast();
    const text = (k: 'customer' | 'branchName' | 'siteId' | 'tenantId') => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }) });
    async function save() {

        const base = { customer: f.customer.trim(), branchName: f.branchName.trim(), plan: f.plan, features: f.features, limits: { maxUsers: Number(f.maxUsers), maxTables: Number(f.maxTables) }, ...(f.plan === 'trial' ? { trialDays: Number(f.trialDays) } : {}) };
        if (!license) { const input: LicenseInput = { ...base, siteId: f.siteId.trim(), ...(f.tenantId.trim() ? { tenantId: f.tenantId.trim() } : {}) }; saved(await api.createLicense(input)); return; }
        const patch: Parameters<typeof api.updateLicense>[1] = { ...base };
        if (license.plan === f.plan && license.plan === 'trial' && license.status !== 'pending') delete patch.trialDays;
        if (f.expiresAt) patch.expiresAt = new Date(f.expiresAt + 'T23:59:59').toISOString();
        saved(await api.updateLicense(license.id, patch));
        toast('Licencia actualizada; la sucursal la recibe en su siguiente renovación');

    }
    const planChanges = license && license.status !== 'pending' && license.plan !== f.plan;
    return <Dialog title={license ? 'Editar licencia' : 'Nueva licencia'} onClose={close} busy={busy} footer={<><button className="btn quiet" onClick={close} disabled={busy}>Cancelar</button><button className="btn primary" form="license-form" disabled={busy}>{busy ? 'Guardando…' : license ? 'Guardar cambios' : 'Crear licencia'}</button></>}>
        <form id="license-form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={e => { e.preventDefault(); void submit(save); }}>
            <div className="row"><label className="field">Cliente<input className="input" required maxLength={150} {...text('customer')} autoFocus /></label><label className="field">Sucursal<input className="input" required maxLength={150} {...text('branchName')} /></label></div>
            {!license && <div className="row"><label className="field">Identidad de la sucursal (siteId)<small>La que tiene su servidor de CulinaryOS</small><input className="input num" required pattern="[a-z0-9\-]{1,32}" {...text('siteId')} spellCheck={false} /></label><label className="field">Empresa (tenantId)<small>Opcional; agrupa sus sucursales</small><input className="input num" pattern="[a-z0-9\-]{1,64}" {...text('tenantId')} spellCheck={false} /></label></div>}
            <div className="row"><label className="field">Plan<select className="input" value={f.plan} onChange={e => setF({ ...f, plan: e.target.value as Plan })}>{Object.entries(api.PLANS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                {f.plan === 'trial' ? <label className="field">Días de prueba<input className="input num" type="number" min={1} max={365} required value={f.trialDays} onChange={e => setF({ ...f, trialDays: Number(e.target.value) })} /></label> : <span />}</div>
            {planChanges && <p className="cell-sub">Cambiar el plan de una licencia activada reinicia su plazo desde hoy.</p>}
            <fieldset style={{ border: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}><legend className="field" style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Funciones contratadas</legend><div className="checks">{Object.entries(api.FEATURES).map(([k, v]) => <label className="check" key={k}><input type="checkbox" checked={f.features.includes(k)} onChange={e => setF({ ...f, features: e.target.checked ? [...f.features, k] : f.features.filter(x => x !== k) })} />{v}</label>)}</div></fieldset>
            <div className="row"><label className="field">Usuarios máximos<input className="input num" type="number" min={1} max={10000} required value={f.maxUsers} onChange={e => setF({ ...f, maxUsers: Number(e.target.value) })} /></label><label className="field">Mesas máximas<input className="input num" type="number" min={1} max={10000} required value={f.maxTables} onChange={e => setF({ ...f, maxTables: Number(e.target.value) })} /></label></div>
            {license && license.plan !== 'permanent' && f.plan !== 'permanent' && <label className="field">Fijar vencimiento a mano<small>Opcional; gana sobre el plazo del plan</small><input className="input" type="date" min={new Date().toISOString().slice(0, 10)} value={f.expiresAt} onChange={e => setF({ ...f, expiresAt: e.target.value })} /></label>}
            {error && <div className="error" role="alert">{error}</div>}
        </form>
    </Dialog>;

}
function Renew({ license: l, close, done }: { license: License; close: () => void; done: () => void }) {

    const [mode, setMode] = useState<'period' | 'until'>('period'), [until, setUntil] = useState(''), { busy, error, submit } = useSubmit(), toast = useToast();
    const period = l.plan === 'monthly' ? 'un mes' : l.plan === 'annual' ? 'un año' : `${l.trialDays ?? ''} días de prueba`;
    return <Dialog title="Renovar licencia" onClose={close} busy={busy} footer={<><button className="btn quiet" onClick={close} disabled={busy}>Cancelar</button><button className="btn primary" disabled={busy || (mode === 'until' && !until)} onClick={() => void submit(async () => { await api.renewLicense(l.id, mode === 'until' ? new Date(until + 'T23:59:59').toISOString() : undefined); toast('Licencia renovada'); done(); })}>Renovar</button></>}>
        <p>{l.customer} · {l.branchName}. Vence {day(l.expiresAt)}. Se suma al vencimiento vigente o a hoy, lo que sea posterior.</p>
        <div className="seg" role="group"><button aria-pressed={mode === 'period'} onClick={() => setMode('period')}>Sumar {period}</button><button aria-pressed={mode === 'until'} onClick={() => setMode('until')}>Hasta una fecha</button></div>
        {mode === 'until' && <label className="field">Nueva fecha de vencimiento<input className="input" type="date" min={new Date().toISOString().slice(0, 10)} value={until} onChange={e => setUntil(e.target.value)} /></label>}
        {error && <div className="error" role="alert">{error}</div>}
    </Dialog>;

}
function Revoke({ license: l, close, done }: { license: License; close: () => void; done: () => void }) {

    const [reason, setReason] = useState(''), [confirm, setConfirm] = useState(''), { busy, error, submit } = useSubmit(), toast = useToast();
    return <Dialog title="Revocar licencia" onClose={close} busy={busy} footer={<><button className="btn quiet" onClick={close} disabled={busy}>Cancelar</button><button className="btn primary" disabled={busy || confirm.trim() !== l.siteId || !reason.trim()} onClick={() => void submit(async () => { await api.revokeLicense(l.id, reason.trim()); toast('Licencia revocada'); done(); })}>Revocar para siempre</button></>}>
        <p>La sucursal <b style={{ color: 'var(--ink)' }}>{l.customer} · {l.branchName}</b> quedará bloqueada en su siguiente contacto y la licencia ya no se podrá cambiar ni renovar. Para volver a darle servicio tendrás que crear otra.</p>
        <label className="field">Motivo<textarea className="input" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} required /></label>
        <label className="field">Escribe <code>{l.siteId}</code> para confirmar<input className="input num" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="off" spellCheck={false} /></label>
        {error && <div className="error" role="alert">{error}</div>}
    </Dialog>;

}
function Reset({ license: l, close, done }: { license: License; close: () => void; done: (r: { license: License; activationCode: string }) => void }) {

    const { busy, error, submit } = useSubmit();
    return <Dialog title="Liberar el equipo" onClose={close} busy={busy} footer={<><button className="btn quiet" onClick={close} disabled={busy}>Cancelar</button><button className="btn primary" disabled={busy} onClick={() => void submit(async () => done(await api.resetActivation(l.id)))}>Liberar y generar código</button></>}>
        <p>Úsalo cuando la sucursal cambió de servidor o de dos piezas de hardware. Se borran su llave, su huella y su registro mTLS, y se genera un código de activación nuevo. El equipo actual deja de renovar.</p>
        {error && <div className="error" role="alert">{error}</div>}
    </Dialog>;

}
