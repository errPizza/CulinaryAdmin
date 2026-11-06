import { useContext, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CircleX, ClockAlert, Cpu, Hourglass, Pencil, Plus, RefreshCw, ShieldOff, Trash2, X } from 'lucide-react';
import * as api from './api';
import type { Addon, License, LicenseInput, Plan, Prices, Tier } from './api';
import { Money } from './revenue';
import { expiryLabel, licenseState } from './summary';
import { Card, Dialog, Empty, Kpi, Masthead, Secret, ShellContext, SkeletonRows, State, buckets, day, daysLeft, intent, needsRenewal, pesos, useLoad, useSubmit, useToast } from './ui';

const STATUSES = [['all', 'Todas'], ['active', 'Activas'], ['expiring', 'Por vencer'], ['expired', 'Vencidas'], ['pending', 'Sin activar'], ['revoked', 'Revocadas']] as const;
type Filter = typeof STATUSES[number][0];
const planLine = (l: License) => api.PLANS[l.plan] + (l.plan === 'trial' && l.trialDays ? ` · ${l.trialDays} días` : '');
const matches = (l: License, f: Filter) => f === 'all' || (f === 'expiring' ? needsRenewal(l) && l.status === 'active' : l.status === f);
const PERIOD_DAYS: Record<Plan, number> = { trial: 14, monthly: 30.4, annual: 365, permanent: 0 };

function expiry(l: License) {

    if (l.status === 'pending') return 'Sin activar';
    if (l.status === 'revoked') return 'Revocada ' + day(l.revokedAt);
    if (!l.expiresAt) return 'Sin vencimiento';

    const left = daysLeft(l.expiresAt)!;

    return left < 0 ? 'Venció ' + day(l.expiresAt) : left === 0 ? 'Vence hoy' : 'Vence ' + day(l.expiresAt);
}

export function Licenses({ changed }: { changed: () => void }) {

    const { query } = useContext(ShellContext);
    const { data, error, reload } = useLoad(api.licenses), rev = useLoad(api.revenue), listed = useLoad(api.prices);
    const [filter, setFilter] = useState<Filter>('all');
    const [selected, setSelected] = useState<string | null>(() => intent.take('license:')), [creating, setCreating] = useState(() => intent.take('new') !== null), [issued, setIssued] = useState<{ license: License; activationCode: string; title: string } | null>(null);
    const all = data?.licenses ?? [];
    const q = query.trim().toLowerCase();
    const shown = useMemo(() => all.filter(l => matches(l, filter) && (!q || [l.customer, l.branchName, l.siteId, l.tenantId].some(v => v.toLowerCase().includes(q)))), [all, filter, q]);
    const current = all.find(l => l.id === selected) ?? null;
    const count = (f: Filter) => all.filter(l => matches(l, f)).length;
    const refresh = async () => { await reload(); void rev.reload(); changed(); };
    const prices = listed.data?.prices ?? null;

    useEffect(() => { if (selected && data && !current) setSelected(null); }, [data, selected, current]);

    return <div className="page">

        <Masthead title="Licencias" sub="Crea, renueva, revoca o libera el equipo de cada sucursal."><button className="btn primary" onClick={() => setCreating(true)}><Plus size={17} />Nueva licencia</button></Masthead>

        {error && <div className="error" role="alert">{error}</div>}

        <div className="kpis">

            <Kpi tone="teal" icon={BadgeCheck} value={data ? count('active') : '—'} label="Activas" onClick={() => setFilter('active')} series={data ? buckets(all.map(l => l.activatedAt), 10, 7, true) : undefined} />
            <Kpi tone="amber" icon={ClockAlert} value={data ? count('expiring') : '—'} label="Vencen en 7 días" onClick={() => setFilter('expiring')} />
            <Kpi tone="red" icon={CircleX} value={data ? count('expired') : '—'} label="Vencidas" onClick={() => setFilter('expired')} />
            <Kpi tone="violet" icon={Hourglass} value={data ? count('pending') : '—'} label="Sin activar" onClick={() => setFilter('pending')} />

        </div>

        <div className="with-side">

            <Card>

                <div className="panel-head"><div className="seg" role="group" aria-label="Filtrar por estado">{STATUSES.map(([k, label]) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}<span className="num">{count(k)}</span></button>)}</div>{q && <span className="cell-sub">Buscando «{query.trim()}»</span>}</div>

                <div className="panel-body">{data && !all.length ? <Empty title="Aún no hay licencias" text="Crea la primera y entrega a tu cliente su identificador y código de activación." action={<button className="btn primary" onClick={() => setCreating(true)}><Plus size={16} />Nueva licencia</button>} />
                    : data && !shown.length ? <Empty title="Nada coincide" text="Prueba con otro estado o búsqueda." />
                    : <div className="table-wrap"><table><thead><tr><th>Cliente · sucursal</th><th>Plan</th><th>Estado</th><th>Vencimiento</th><th className="r">Al mes</th></tr></thead><tbody>

                        {!data && !error && <SkeletonRows cols={5} />}
                        {shown.map(l => <tr key={l.id} className="clickable" aria-selected={selected === l.id} onClick={() => setSelected(l.id)}><td><div className="cell-main">{l.customer}</div><div className="cell-sub nowrap">{l.branchName} · <code>{l.siteId}</code></div></td><td className="nowrap"><span className={'tag ' + l.tier}>{api.TIERS[l.tier].label}</span> <span className="cell-sub">{planLine(l)}</span></td><td><State value={licenseState(l)} label={expiryLabel(l)} /></td><td className="num nowrap">{l.expiresAt ? day(l.expiresAt) : l.plan === 'permanent' && l.status !== 'revoked' ? 'Sin vencimiento' : '—'}</td><td className="num r">{rev.data?.perLicense[l.id]?.monthly ? pesos(rev.data.perLicense[l.id].monthly) : '—'}</td></tr>)}

                    </tbody></table></div>}</div>

            </Card>

            {current ? <LicenseDetail license={current} money={rev.data?.perLicense[current.id]} prices={prices} close={() => setSelected(null)} changed={refresh} issued={(r, title) => setIssued({ ...r, title })} deleted={() => { setSelected(null); void refresh(); }} />
                : <aside className="panel detail idle"><Empty title="Elige una licencia" text="Aquí ves su plazo, su equipo, lo que deja y sus acciones." /></aside>}

        </div>

        {creating && <LicenseForm prices={prices} close={() => setCreating(false)} saved={r => { setCreating(false); void refresh(); setSelected(r.license.id); if (r.activationCode) setIssued({ license: r.license, activationCode: r.activationCode, title: 'Licencia creada' }); }} />}
        {issued && <Issued {...issued} close={() => setIssued(null)} />}

    </div>;
}

function LicenseDetail({ license: l, money, prices, close, changed, issued, deleted }: { license: License; money?: api.Revenue['perLicense'][string]; prices: Prices | null; close: () => void; changed: () => Promise<void>; issued: (r: { license: License; activationCode: string }, title: string) => void; deleted: () => void }) {

    const [dialog, setDialog] = useState<'edit' | 'renew' | 'revoke' | 'reset' | 'delete' | null>(null);
    const closed = l.status === 'revoked';
    const left = l.expiresAt ? daysLeft(l.expiresAt)! : null;
    const period = l.plan === 'trial' ? (l.trialDays ?? 14) : PERIOD_DAYS[l.plan];

    return <aside className="panel detail" aria-label={'Licencia de ' + l.customer}>

        <header><div><div className="split-line"><span className="num cell-sub">Revisión {l.revision}</span><State value={licenseState(l)} label={expiryLabel(l)} /></div><h2 style={{ marginTop: 6 }}>{l.customer}</h2><p className="cell-sub">{l.branchName} · <code>{l.siteId}</code></p></div><button className="btn quiet sm icon close" onClick={close} aria-label="Cerrar"><X size={16} /></button></header>

        {left !== null && !closed && <div className="keyplate"><div className="split-line" style={{ alignItems: 'flex-end' }}><div><small>{left < 0 ? 'Venció' : 'Vence'}</small><div className={'when' + (left < 0 ? ' late' : '')}>{day(l.expiresAt)}</div></div><div style={{ textAlign: 'right' }}><small>{left < 0 ? 'Hace' : 'Quedan'}</small><div className="left">{Math.abs(left)} {Math.abs(left) === 1 ? 'día' : 'días'}</div></div></div>{left >= 0 && period > 0 && <div className="progress" style={{ marginTop: 12 }}><div style={{ width: Math.min(100, left / period * 100) + '%' }} /></div>}</div>}

        <section><dl className="facts">

            <dt>Datos fiscales</dt><dd>{l.fiscal ? <>{l.fiscal.rfc} · {l.fiscal.name}<div className="cell-sub">Régimen {l.fiscal.regime} · C.P. {l.fiscal.postalCode}</div></> : <span style={{ color: 'var(--red-ink)' }}>Incompletos: captúralos antes de activar o liberar el equipo</span>}</dd>
            <dt>Plan</dt><dd><span className={'tag ' + l.tier}>{api.TIERS[l.tier].label}</span> {planLine(l)}</dd>
            <dt>Deja al mes</dt><dd>{money?.monthly ? pesos(money.monthly) : '—'}</dd>
            <dt>Último cobro</dt><dd>{money?.lastCharge ? `${pesos(money.lastCharge.amount)} · ${day(money.lastCharge.at)}` : 'Sin cobros registrados'}</dd>
            <dt>Vencimiento</dt><dd>{expiry(l)}</dd><dt>Activada</dt><dd>{day(l.activatedAt)}</dd><dt>Última validación</dt><dd>{day(l.validatedAt)}</dd>
            <dt>Equipo</dt><dd>{l.binding ? `${l.binding.kind === 'tpm' ? 'TPM 2.0' : 'Huella de hardware'} · ${l.binding.keyAlg}` : 'Sin ligar'}</dd>
            <dt>Límites</dt><dd>{l.limits.maxTerminals} terminales · {l.limits.maxUsers} usuarios · {l.limits.maxTables} mesas</dd><dt>Empresa</dt><dd><code>{l.tenantId}</code></dd><dt>Identificador</dt><dd><code>{l.id}</code></dd>
            {l.revokeReason && <><dt>Motivo</dt><dd>{l.revokeReason}</dd></>}

        </dl></section>

        <section><h3>Complementos</h3><div className="chips">{l.addons.length ? l.addons.map(a => <span className="chip" key={a}>{api.ADDONS[a] ?? a}</span>) : <span className="cell-sub">Sin complementos</span>}</div></section>
        <section><h3>Funciones</h3><div className="chips">{l.features.length ? l.features.map(f => <span className="chip" key={f}>{api.FEATURES[f] ?? f}</span>) : <span className="cell-sub">Solo la operación base</span>}</div></section>

        <section><div className="buttons">

            {!closed && <>
                <button className="btn primary" disabled={l.plan === 'permanent' || l.status === 'pending'} onClick={() => setDialog('renew')}><RefreshCw size={16} />Renovar</button>
                <button className="btn" onClick={() => setDialog('edit')}><Pencil size={16} />Editar licencia</button>
                <button className="btn" disabled={l.status === 'pending'} onClick={() => setDialog('reset')}><Cpu size={16} />Liberar equipo</button>
                <button className="btn danger" onClick={() => setDialog('revoke')}><ShieldOff size={16} />Revocar</button></>}
            <button className="btn quiet" style={{ gridColumn: '1 / -1', color: 'var(--red-ink)' }} onClick={() => setDialog('delete')}><Trash2 size={16} />Eliminar</button></div>

            {!closed && l.plan === 'permanent' && <p className="cell-sub">La licencia de por vida no se renueva: no vence.</p>}</section>

        {dialog === 'edit' && <LicenseForm license={l} prices={prices} close={() => setDialog(null)} saved={() => { setDialog(null); void changed(); }} />}
        {dialog === 'renew' && <Renew license={l} prices={prices} close={() => setDialog(null)} done={() => { setDialog(null); void changed(); }} />}
        {dialog === 'revoke' && <Revoke license={l} close={() => setDialog(null)} done={() => { setDialog(null); void changed(); }} />}
        {dialog === 'reset' && <Reset license={l} close={() => setDialog(null)} done={r => { setDialog(null); void changed(); issued(r, 'Equipo liberado'); }} />}
        {dialog === 'delete' && <Delete license={l} close={() => setDialog(null)} done={deleted} />}

    </aside>;
}

/** What the customer pays now: the list price for this plan, which can be overwritten for a discount or a deal. */
function Charge({ amount, setAmount, list, periods = 1 }: { amount: number | null; setAmount: (v: number | null) => void; list: number | null; periods?: number }) {

    const suggested = list === null ? null : list * periods;

    return <label className="field" style={{ fontWeight: 650 }}>Cobro<small>{suggested === null ? 'Sin precio de lista: escribe lo que se cobró o déjalo vacío.' : `Precio de lista: ${pesos(suggested)}. Cámbialo si hubo descuento.`}</small><Money label="Cobro" value={amount ?? suggested ?? 0} onChange={v => setAmount(v)} unit="MXN" /></label>;
}

function Issued({ license, activationCode, title, close }: { license: License; activationCode: string; title: string; close: () => void }) {

    return <Dialog title={title} onClose={close} footer={<button className="btn primary" onClick={close}>Ya los guardé</button>}>
        
        <p>Entrega estos dos datos a <b style={{ color: 'var(--ink)' }}>{license.customer} · {license.branchName}</b>. El código solo se muestra ahora y sirve una vez; el plazo empieza al activar.</p>
        <Secret label="Identificador de licencia" value={license.id} />
        <Secret label="Código de activación" value={activationCode} />
    
    </Dialog>;
}

function LicenseForm({ license, prices, close, saved }: { license?: License; prices: Prices | null; close: () => void; saved: (r: { license: License; activationCode?: string }) => void }) {

    const [f, setF] = useState({ customer: license?.customer ?? '', branchName: license?.branchName ?? '', siteId: license?.siteId ?? '', tenantId: license?.tenantId ?? '', plan: license?.plan ?? 'trial' as Plan, tier: license?.tier ?? 'lite' as Tier, addons: license?.addons ?? [] as Addon[], trialDays: license?.trialDays ?? 14, features: license?.features ?? ['printing'], maxUsers: license?.limits.maxUsers ?? 15, maxTables: license?.limits.maxTables ?? 30, maxTerminals: license && license.limits.maxTerminals !== api.TIERS[license.tier].terminals ? String(license.limits.maxTerminals) : '', expiresAt: '', rfc: license?.fiscal?.rfc ?? '', fiscalName: license?.fiscal?.name ?? '', postalCode: license?.fiscal?.postalCode ?? '', regime: license?.fiscal?.regime ?? '' });
    const combo = api.COMBOS.find(c => c.tier === f.tier && c.addons.length === f.addons.length && c.addons.every(a => f.addons.includes(a)))?.id ?? '';
    const [charge, setCharge] = useState<number | null>(null);
    const { busy, error, submit } = useSubmit(), toast = useToast();
    const list = prices ? api.periodPrice(prices, f.plan, f.tier, f.addons) : null;
    const charges = f.plan !== 'trial' && (!license || license.plan !== f.plan);

    useEffect(() => setCharge(null), [f.plan, f.tier, f.addons.join()]);
    const text = (k: 'customer' | 'branchName' | 'siteId' | 'tenantId') => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }) });
   
    async function save() {

        const base = { customer: f.customer.trim(), branchName: f.branchName.trim(), plan: f.plan, tier: f.tier, addons: f.addons, features: f.features, limits: { maxUsers: Number(f.maxUsers), maxTables: Number(f.maxTables), ...(f.maxTerminals ? { maxTerminals: Number(f.maxTerminals) } : {}) }, ...(f.plan === 'trial' ? { trialDays: Number(f.trialDays) } : {}), ...(charges && charge !== null ? { charge } : {}) };
        
        const fiscal = { rfc: f.rfc.trim().toUpperCase(), name: f.fiscalName.trim(), postalCode: f.postalCode.trim(), regime: f.regime };

        if (!license) { const input: LicenseInput = { ...base, fiscal, siteId: f.siteId.trim(), ...(f.tenantId.trim() ? { tenantId: f.tenantId.trim() } : {}) }; saved(await api.createLicense(input)); return; }
       
        const patch: Parameters<typeof api.updateLicense>[1] = { ...base };

        if (f.siteId.trim() !== license.siteId) patch.siteId = f.siteId.trim();
        // A license from before the tax data was required can still be edited without it; once captured, all four go together.
        if (fiscal.rfc || fiscal.name || fiscal.postalCode || fiscal.regime) patch.fiscal = fiscal;

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
            {license && <label className="field">Identidad de la sucursal (siteId)<small>{license.binding ? 'Ligada a un equipo: libera el equipo para cambiarla' : 'La que muestra su servidor de CulinaryOS al activar'}</small><input className="input num" required pattern="[a-z0-9\-]{1,32}" {...text('siteId')} disabled={!!license.binding} spellCheck={false} /></label>}
           
            <fieldset style={{ border: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

                <legend className="field" style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Datos fiscales del negocio<small style={{ fontWeight: 400 }}>Tal como dice su Constancia de Situación Fiscal. Sin ellos no se activa la licencia ni se factura.</small></legend>
                <div className="row"><label className="field">RFC<input className="input num" required={!license || license.fiscalComplete} maxLength={13} pattern="[A-Za-zÑñ&]{3,4}[0-9]{6}[A-Za-z0-9]{3}" value={f.rfc} onChange={e => setF({ ...f, rfc: e.target.value.toUpperCase() })} spellCheck={false} /></label><label className="field">Código postal fiscal<input className="input num" required={!license || license.fiscalComplete} inputMode="numeric" pattern="[0-9]{5}" maxLength={5} value={f.postalCode} onChange={e => setF({ ...f, postalCode: e.target.value })} /></label></div>
                <label className="field">Razón social<small>En mayúsculas y sin el régimen societario: «ESCUELA KEMPER URGATE», no «… S.A. de C.V.»</small><input className="input" required={!license || license.fiscalComplete} maxLength={254} value={f.fiscalName} onChange={e => setF({ ...f, fiscalName: e.target.value.toUpperCase() })} /></label>
                <label className="field">Régimen fiscal<select className="input" required={!license || license.fiscalComplete} value={f.regime} onChange={e => setF({ ...f, regime: e.target.value })}><option value="">Elige el régimen…</option>{Object.entries(api.REGIMES).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}</select></label>

            </fieldset>
            <div className="field" style={{ fontSize: 12.5, fontWeight: 600 }}>Combo<div className="seg" role="group" aria-label="Combo"><button type="button" aria-pressed={!combo} onClick={() => setF({ ...f, addons: [] })}>Sin combo</button>{api.COMBOS.map(c => <button type="button" key={c.id} aria-pressed={combo === c.id} onClick={() => setF({ ...f, tier: c.tier, addons: c.addons })}>{c.label}</button>)}</div></div>
            <div className="row"><label className="field">Nivel<select className="input" value={f.tier} onChange={e => setF({ ...f, tier: e.target.value as Tier })}>{Object.entries(api.TIERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
             
                <label className="field">Periodo<select className="input" value={f.plan} onChange={e => setF({ ...f, plan: e.target.value as Plan })}>{Object.entries(api.PLANS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label></div>
            
            <div className="row">
               
                {f.plan === 'trial' ? <label className="field">Días de prueba<input className="input num" type="number" min={1} max={365} required value={f.trialDays} onChange={e => setF({ ...f, trialDays: Number(e.target.value) })} /></label> : <span />}
                
                <label className="field">Terminales fijas<small>Vacío: las del nivel ({api.TIERS[f.tier].terminals})</small><input className="input num" type="number" min={1} max={1000} placeholder={String(api.TIERS[f.tier].terminals)} value={f.maxTerminals} onChange={e => setF({ ...f, maxTerminals: e.target.value })} /></label></div>
            
            {planChanges && <p className="cell-sub">Cambiar el periodo de una licencia activada reinicia su plazo desde hoy.</p>}
            {charges && <Charge amount={charge} setAmount={setCharge} list={list} />}
            
            <fieldset style={{ border: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}><legend className="field" style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Complementos</legend><div className="checks">{Object.entries(api.ADDONS).map(([k, v]) => <label className="check" key={k}><input type="checkbox" checked={f.addons.includes(k as Addon)} onChange={e => setF({ ...f, addons: e.target.checked ? [...f.addons, k as Addon] : f.addons.filter(x => x !== k) })} />{v}</label>)}</div></fieldset>
            <fieldset style={{ border: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}><legend className="field" style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Funciones contratadas</legend><div className="checks">{Object.entries(api.FEATURES).map(([k, v]) => <label className="check" key={k}><input type="checkbox" checked={f.features.includes(k)} onChange={e => setF({ ...f, features: e.target.checked ? [...f.features, k] : f.features.filter(x => x !== k) })} />{v}</label>)}</div></fieldset>
            <div className="row"><label className="field">Usuarios máximos<input className="input num" type="number" min={1} max={10000} required value={f.maxUsers} onChange={e => setF({ ...f, maxUsers: Number(e.target.value) })} /></label><label className="field">Mesas máximas<input className="input num" type="number" min={1} max={10000} required value={f.maxTables} onChange={e => setF({ ...f, maxTables: Number(e.target.value) })} /></label></div>
           
            {license && license.plan !== 'permanent' && f.plan !== 'permanent' && <label className="field">Fijar vencimiento a mano<small>Opcional; gana sobre el plazo del plan</small><input className="input" type="date" min={new Date().toISOString().slice(0, 10)} value={f.expiresAt} onChange={e => setF({ ...f, expiresAt: e.target.value })} /></label>}
            {error && <div className="error" role="alert">{error}</div>}
        
        </form>

    </Dialog>;
}

function Renew({ license: l, prices, close, done }: { license: License; prices: Prices | null; close: () => void; done: () => void }) {

    const [mode, setMode] = useState<'period' | 'until'>('period'), [until, setUntil] = useState(''), [charge, setCharge] = useState<number | null>(null), { busy, error, submit } = useSubmit(), toast = useToast();
    const list = prices ? api.periodPrice(prices, l.plan, l.tier, l.addons) : null;
    const from = Math.max(Date.now(), l.expiresAt ? Date.parse(l.expiresAt) : 0);
    // Same count CulinaryServer charges for (src/revenue.ts periodsUntil): whole months or years, at least one.
    const periods = mode === 'until' && until && (l.plan === 'monthly' || l.plan === 'annual') ? Math.max(1, Math.round((Date.parse(until + 'T23:59:59') - from) / 86_400_000 / ((l.plan === 'monthly' ? 1 : 12) * 30.4375))) : 1;

    useEffect(() => setCharge(null), [periods]);
    const period = l.plan === 'monthly' ? 'un mes' : l.plan === 'annual' ? 'un año' : `${l.trialDays ?? ''} días de prueba`;
   
    return <Dialog title="Renovar licencia" onClose={close} busy={busy} footer={<><button className="btn quiet" onClick={close} disabled={busy}>Cancelar</button><button className="btn primary" disabled={busy || (mode === 'until' && !until)} onClick={() => void submit(async () => { await api.renewLicense(l.id, mode === 'until' ? new Date(until + 'T23:59:59').toISOString() : undefined, l.plan !== 'trial' && charge !== null ? charge : undefined); toast('Licencia renovada'); done(); })}>Renovar</button></>}>
        
        <p>{l.customer} · {l.branchName}. Vence {day(l.expiresAt)}. Se suma al vencimiento vigente o a hoy, lo que sea posterior.</p>
        <div className="seg" role="group"><button aria-pressed={mode === 'period'} onClick={() => setMode('period')}>Sumar {period}</button><button aria-pressed={mode === 'until'} onClick={() => setMode('until')}>Hasta una fecha</button></div>
        
        {mode === 'until' && <label className="field">Nueva fecha de vencimiento<input className="input" type="date" min={new Date().toISOString().slice(0, 10)} value={until} onChange={e => setUntil(e.target.value)} /></label>}
        {l.plan !== 'trial' && <Charge amount={charge} setAmount={setCharge} list={list} periods={periods} />}
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

function Delete({ license: l, close, done }: { license: License; close: () => void; done: () => void }) {

    const [confirm, setConfirm] = useState(''), { busy, error, submit } = useSubmit(), toast = useToast();
    const live = l.status !== 'revoked';

    return <Dialog title="Eliminar licencia" onClose={close} busy={busy} footer={<><button className="btn quiet" onClick={close} disabled={busy}>Cancelar</button><button className="btn primary" disabled={busy || confirm.trim() !== l.siteId} onClick={() => void submit(async () => { await api.deleteLicense(l.id); toast('Licencia eliminada'); done(); })}>Eliminar</button></>}>

        <p><b style={{ color: 'var(--ink)' }}>{l.customer} · {l.branchName}</b> dejará de salir en el panel y su siteId queda libre para otra licencia. {live ? 'También se revoca: si una sucursal la usa, se bloquea en su siguiente contacto.' : ''} Sus tickets y la bitácora se conservan.</p>
        <label className="field">Escribe <code>{l.siteId}</code> para confirmar<input className="input num" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="off" spellCheck={false} /></label>

        {error && <div className="error" role="alert">{error}</div>}

    </Dialog>;
}

function Reset({ license: l, close, done }: { license: License; close: () => void; done: (r: { license: License; activationCode: string }) => void }) {

    const { busy, error, submit } = useSubmit();
    const [reason, setReason] = useState('');

    return <Dialog title="Liberar el equipo" onClose={close} busy={busy} footer={<><button className="btn quiet" onClick={close} disabled={busy}>Cancelar</button><button className="btn primary" disabled={busy || !reason.trim()} onClick={() => void submit(async () => done(await api.resetActivation(l.id, reason)))}>Liberar y generar código</button></>}>

        <p>Úsalo cuando la sucursal cambió de servidor o de dos piezas de hardware. Se borran su huella y su registro mTLS, y se genera un código de activación nuevo. El equipo actual se bloquea en su siguiente contacto. Los datos de la sucursal no se tocan.</p>
        <label className="field">Motivo (queda en la bitácora)<input className="input" value={reason} onChange={e => setReason(e.target.value)} maxLength={500} autoComplete="off" /></label>

        {error && <div className="error" role="alert">{error}</div>}
   
    </Dialog>;
}