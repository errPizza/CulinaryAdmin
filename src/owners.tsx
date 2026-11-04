import { useMemo, useState } from 'react';
import { Building2, Crown, Smartphone, Store, UserPlus, UserX, Users } from 'lucide-react';
import * as api from './api';
import { Card, Dialog, Empty, Kpi, Masthead, Secret, SkeletonRows, State, Tile, day, moment, useLoad, useSubmit, useToast } from './ui';

type Business = { tenantId: string; customer: string; branches: api.License[] };

/** A business is the licenses that share a tenantId; its accounts read Culinary Dueño. */
function businesses(licenses: api.License[]): Business[] {

    const all = new Map<string, Business>();

    for (const l of licenses) { const b = all.get(l.tenantId) ?? { tenantId: l.tenantId, customer: l.customer, branches: [] }; b.branches.push(l); all.set(l.tenantId, b); }

    return [...all.values()].sort((a, b) => a.customer.localeCompare(b.customer, 'es'));
}

export function Owners({ me }: { me: string }) {

    const licenses = useLoad(api.licenses);
    const all = licenses.data?.licenses ?? [];
    const list = useMemo(() => businesses(all), [licenses.data]); // eslint-disable-line react-hooks/exhaustive-deps
    const [tenant, setTenant] = useState('');
    const chosen = list.find(b => b.tenantId === tenant) ?? list[0];
    const accounts = useLoad(() => chosen ? api.ownerAccounts(chosen.tenantId) : Promise.resolve({ accounts: [] }), [chosen?.tenantId]);
    const [inviting, setInviting] = useState(false), [removing, setRemoving] = useState<api.OwnerAccount | null>(null);
    const { busy, error, submit } = useSubmit(), toast = useToast();
    const branchName = (id: string) => chosen?.branches.find(b => b.id === id)?.branchName ?? 'Sucursal eliminada';
    const live = all.filter(l => l.status !== 'revoked');

    return <div className="page">

        <Masthead title="Panel del dueño" sub="Cuentas de Culinary Dueño: el dueño ve todo su negocio y un gerente sólo las sucursales que le asignes."><button className="btn primary" disabled={!chosen} onClick={() => setInviting(true)}><UserPlus size={17} />Invitar</button></Masthead>

        {(licenses.error || accounts.error) && <div className="error" role="alert">{licenses.error || accounts.error}</div>}

        <div className="kpis">

            <Kpi tone="gold" icon={Building2} value={licenses.data ? list.length : '—'} label="Negocios" />
            <Kpi tone="gold" icon={Crown} value={licenses.data ? live.filter(l => l.tier === 'pro').length : '—'} label="Sucursales Pro" />
            <Kpi tone="blue" icon={Store} value={licenses.data ? live.filter(l => l.tier === 'lite').length : '—'} label="Sucursales Lite" />
            <Kpi tone="teal" icon={Smartphone} value={accounts.data ? accounts.data.accounts.length : '—'} label={chosen ? `Cuentas de ${chosen.customer}` : 'Cuentas'} />

        </div>

        {licenses.data && !list.length && <div className="panel"><Empty title="Sin negocios" text="Un negocio aparece cuando tiene al menos una licencia." /></div>}

        {chosen && <div className="with-side" style={{ gridTemplateColumns: '400px minmax(0, 1fr)' }}>

            <Card icon={Building2} tone="gold" title="Negocio" sub="Las sucursales que comparten empresa.">

                <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    <label className="field">Negocio<select className="input" value={chosen.tenantId} onChange={e => setTenant(e.target.value)}>{list.map(b => <option key={b.tenantId} value={b.tenantId}>{b.customer}</option>)}</select></label>
                    <div className="owner-branches" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{chosen.branches.map(b => <div className="keyplate" key={b.id} style={{ padding: '13px 16px' }}><div className="split-line"><div><b style={{ color: 'var(--ink)' }}>{b.branchName}</b><div className="num cell-sub">{b.siteId}</div></div><span className={'tag ' + b.tier}>{api.TIERS[b.tier].label}</span></div></div>)}</div>
                    <div className="two" style={{ gap: 10 }}>
                        <div className="stat"><span className="tag lite">Lite</span><p style={{ fontSize: 12.5, marginTop: 8 }}>Ventas, ticket promedio, comensales, ranking y más vendidos. Mes en curso y últimos 7 días.</p></div>
                        <div className="stat"><span className="tag pro">Pro</span><p style={{ fontSize: 12.5, marginTop: 8 }}>Todo el panel: productos, caja y personal, sin límite de fechas.</p></div>
                    </div>

                </div>

            </Card>

            <Card icon={Users} tone="gold" title="Cuentas" sub="Si alguien pierde su contraseña o su teléfono, borra su cuenta e invítalo de nuevo.">

                <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    <div className="table-wrap">{accounts.data && !accounts.data.accounts.length ? <Empty title="Sin cuentas" text="Invita al dueño para que vea sus ventas desde su teléfono o su computadora." /> : <table><thead><tr><th>Correo</th><th>Rol</th><th>Sucursales</th><th>Estado</th><th>Desde</th><th className="r"><span className="sr">Acciones</span></th></tr></thead><tbody>

                        {!accounts.data && !accounts.error && <SkeletonRows cols={6} rows={2} />}
                        {accounts.data?.accounts.map(a => <tr key={a.id}><td className="cell-main">{a.email}</td><td><span className={'tag' + (a.role === 'owner' ? ' pro' : '')}>{api.ROLES[a.role]}</span></td><td>{a.role === 'owner' ? 'Todas' : a.licenseIds.map(branchName).join(', ')}</td><td><State value={a.active ? 'active' : 'pending'} label={a.active ? 'Activa' : 'Sin confirmar'} /></td><td className="num nowrap">{day(a.createdAt)}</td><td className="r"><button className="btn sm danger" onClick={() => setRemoving(a)}><UserX size={14} />Borrar</button></td></tr>)}

                    </tbody></table>}</div>

                    <div className="note" style={{ alignItems: 'center' }}><Tile icon={Smartphone} tone="gold" size={46} /><p style={{ flex: 1 }}><b style={{ color: 'var(--ink)' }}>Invitación de un solo uso.</b> El código se muestra una vez; la persona crea su contraseña y su autenticador en Culinary Dueño, en Android o Windows.</p></div>

                </div>

            </Card>

        </div>}

        {inviting && chosen && <Invite me={me} business={chosen} close={() => setInviting(false)} done={() => void accounts.reload()} />}
        {removing && <Dialog title={`Borrar a ${removing.email}`} onClose={() => setRemoving(null)} busy={busy} footer={<><button className="btn quiet" onClick={() => setRemoving(null)}>Cancelar</button><button className="btn primary" disabled={busy} onClick={() => void submit(async () => { await api.removeOwner(me, removing.id); setRemoving(null); toast('Cuenta borrada'); void accounts.reload(); })}>Borrar cuenta</button></>}><p>Dejará de entrar a Culinary Dueño y se cierran sus sesiones. Para volver necesita una invitación nueva, con contraseña y autenticador nuevos. Esta acción se firma con la llave de este equipo.</p>{error && <div className="error">{error}</div>}</Dialog>}

    </div>;
}

function Invite({ me, business, close, done }: { me: string; business: Business; close: () => void; done: () => void }) {

    const [email, setEmail] = useState(''), [role, setRole] = useState<api.OwnerRole>('owner'), [picked, setPicked] = useState<string[]>([]);
    const [invited, setInvited] = useState<{ code: string; expiresAt: string } | null>(null);
    const { busy, error, submit } = useSubmit();

    if (invited) return <Dialog title="Invitación creada" onClose={close} footer={<button className="btn primary" onClick={close}>Listo</button>}>

        <p>Dáselo a {email.trim()} antes del {moment(invited.expiresAt)}: lo escribe en Culinary Dueño, en «Tengo un código de alta», y elige su contraseña y su autenticador. Sirve una sola vez.</p>
        <Secret label="Código de alta" value={invited.code} />

    </Dialog>;

    const send = () => submit(async () => {

        if (role === 'manager' && !picked.length) throw new Error('Elige al menos una sucursal para el gerente');

        setInvited(await api.inviteOwner(me, { tenantId: business.tenantId, email: email.trim(), role, licenseIds: role === 'manager' ? picked : [] }));
        done();

    });

    return <Dialog title={`Invitar a ${business.customer}`} onClose={close} busy={busy} footer={<><button className="btn quiet" onClick={close} disabled={busy}>Cancelar</button><button className="btn primary" form="owner-invite" disabled={busy}>{busy ? 'Creando…' : 'Crear invitación'}</button></>}>

        <form id="owner-invite" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={e => { e.preventDefault(); void send(); }}>

            <label className="field">Correo<small>Con él entra a Culinary Dueño</small><input className="input" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoFocus autoComplete="off" /></label>
            <div className="field" style={{ fontSize: 12.5, fontWeight: 600 }}>Rol<div className="seg" role="group" aria-label="Rol">{Object.entries(api.ROLES).map(([k, v]) => <button type="button" key={k} aria-pressed={role === k} onClick={() => setRole(k as api.OwnerRole)}>{v}</button>)}</div></div>
            {role === 'owner'
                ? <p className="cell-sub">Ve todas las sucursales del negocio, también las que se agreguen después.</p>
                : <fieldset style={{ border: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}><legend className="field" style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Sucursales que ve</legend><div className="checks">{business.branches.map(b => <label className="check" key={b.id}><input type="checkbox" checked={picked.includes(b.id)} onChange={e => setPicked(e.target.checked ? [...picked, b.id] : picked.filter(x => x !== b.id))} />{b.branchName}</label>)}</div></fieldset>}
            <p className="cell-sub">El panel muestra ventas por mesero con su nombre. Entrega al negocio el aviso de privacidad del panel antes de dar acceso.</p>
            {error && <div className="error" role="alert">{error}</div>}

        </form>

    </Dialog>;
}
