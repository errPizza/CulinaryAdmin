import { useState } from 'react';
import { Building2, Copy, FileQuestion, KeyRound, KeySquare, MonitorSmartphone, Network, ScrollText, ShieldCheck, Store, Timer, UserPlus, UserX, Users, X } from 'lucide-react';
import * as api from './api';
import { NewPassword } from './gate';
import { Bar, Card, Dialog, Empty, Kpi, Masthead, Secret, SkeletonRows, State, Tile, day, daysLeft, moment, useLoad, useSubmit, useToast } from './ui';

const detailText = (d: unknown): string => d == null ? '' : typeof d !== 'object' ? String(d) : Array.isArray(d) ? d.map(detailText).join(', ') : Object.entries(d).map(([k, v]) => `${k}: ${detailText(v)}`).join(' · ');

// What each audit action means, in the words the panel uses elsewhere.
export const ACTIONS: Record<string, string> = {

    'license.create': 'Creó una licencia', 'license.edit': 'Editó una licencia', 'license.renew': 'Renovó una licencia', 'license.revoke': 'Revocó una licencia', 'license.delete': 'Eliminó una licencia',
    'license.reset_activation': 'Liberó el equipo de una licencia', 'license.hardware_change': 'Una sucursal cambió de hardware', 'license.sign': 'Firmó una licencia para la sucursal',
    'release.create': 'Empezó a subir una versión', 'release.complete': 'Subió una versión', 'release.sign': 'Firmó una versión', 'release.abort': 'Canceló una subida',
    'publication.create': 'Publicó una versión', 'publication.withdraw': 'Retiró una publicación', 'ticket.reply': 'Respondió un ticket', 'ticket.close': 'Cerró un ticket',
    'fault.resolve': 'Resolvió un fallo', 'fault.reopen': 'Reabrió un fallo', 'prices.update': 'Cambió los precios', 'owner.invite': 'Invitó a una cuenta de dueño', 'owner.delete': 'Borró una cuenta de dueño',
    'admin.enroll': 'Dio de alta un equipo', 'admin.confirm': 'Confirmó un equipo', 'admin.invite': 'Invitó a otro equipo', 'admin.delete': 'Borró un equipo', 'admin.login': 'Inició sesión',
    'admin.login_failed': 'Intento fallido de inicio de sesión', 'admin.password': 'Cambió su contraseña', 'admin.password_failed': 'Intento fallido de cambio de contraseña'

};
const LOG_FILTERS = [['', 'Todo'], ['license.', 'Licencias'], ['release.|publication.', 'Versiones'], ['admin.|owner.|prices.', 'Equipo']] as const;

export function Branches() {

    const { data, error } = useLoad(api.registry);
    const [selected, setSelected] = useState<string | null>(null);
    const toast = useToast();
    const all = data?.branches ?? [];
    const shown = all.find(b => b.branchId === selected) ?? null;
    const provision = shown && JSON.stringify({ tenantId: shown.tenantId, tenantName: shown.tenantName, branchId: shown.branchId, branchName: shown.branchName, siteId: shown.siteId, slug: shown.slug, certificateSha256: shown.certificateSha256, ownerName: '', ownerUsername: '', ownerPassword: '', ownerEnrollmentCode: '' }, null, 2);

    return <div className="page">

        <Masthead title="Sucursales" sub="Sucursales con su certificado mTLS para la central multiempresa. Las credenciales del dueño no pasan por aquí." />

        {error && <div className="error" role="alert">{error}</div>}

        <div className="kpis">

            <Kpi tone="violet" icon={Store} value={data ? all.length : '—'} label="Sucursales" />
            <Kpi tone="teal" icon={ShieldCheck} value={data ? all.filter(b => b.certificateSha256).length : '—'} label="Con certificado" />
            <Kpi tone="amber" icon={FileQuestion} value={data ? all.filter(b => !b.certificateSha256).length : '—'} label="Sin certificado" />
            <Kpi tone="blue" icon={Building2} value={data ? new Set(all.map(b => b.tenantId)).size : '—'} label="Empresas" />

        </div>

        <div className="with-side" style={{ gridTemplateColumns: 'minmax(0, 1fr) 440px' }}>

            <Card icon={Network} tone="violet" title="Registro" sub="Una sucursal aparece cuando activa su licencia y registra su certificado.">

                <div className="panel-body">{data && !all.length ? <Empty title="Sin sucursales registradas" text="Una sucursal aparece cuando activa su licencia y registra su certificado." /> : <div className="table-wrap"><table><thead><tr><th>Empresa</th><th>Sucursal</th><th>Sitio</th><th>Certificado</th><th>Licencia</th></tr></thead><tbody>

                    {!data && !error && <SkeletonRows cols={5} rows={3} />}
                    {all.map(b => <tr key={b.branchId} className="clickable" aria-selected={selected === b.branchId} onClick={() => setSelected(b.branchId)}><td><div className="cell-main">{b.tenantName}</div><div className="cell-sub"><code>{b.tenantId}</code></div></td><td>{b.branchName}</td><td><code>{b.siteId}</code></td><td>{b.certificateSha256 ? <code className="cell-sub">{b.certificateSha256.slice(0, 12)}…</code> : <span className="cell-sub">Sin registrar</span>}</td><td><State value={b.licenseStatus} /></td></tr>)}

                </tbody></table></div>}</div>

            </Card>

            {!shown ? <aside className="panel detail idle"><Empty title="Elige una sucursal" text="Aquí salen sus datos para aprovisionarla en la central." /></aside> : <aside className="panel detail" aria-label={'Sucursal ' + shown.branchName}>

                <header><Tile icon={Store} tone="violet" size={50} /><div><h2>{shown.branchName}</h2><p className="cell-sub">{shown.tenantName}</p></div><button className="btn quiet sm icon close" onClick={() => setSelected(null)} aria-label="Cerrar"><X size={16} /></button></header>
                <section><dl className="facts"><dt>Sitio</dt><dd><code>{shown.siteId}</code></dd><dt>Certificado</dt><dd>{shown.certificateSha256 ? <code>{shown.certificateSha256.slice(0, 12)}…{shown.certificateSha256.slice(-4)}</code> : 'Sin registrar'}</dd><dt>Funciones</dt><dd>{shown.features.map(f => api.FEATURES[f] ?? f).join(', ') || '—'}</dd></dl></section>
                {shown.certificateSha256 ? <section><h3>Datos para la central</h3>

                    <pre className="snippet">{provision}</pre>
                    <p className="cell-sub">Completa la contraseña y el código de alta del dueño y ejecuta <code>MesaNexo.Central --provision-tenant archivo.json</code>.</p>
                    <button className="btn primary" onClick={async () => { await navigator.clipboard.writeText(provision!); toast('Datos copiados'); }}><Copy size={16} />Copiar JSON</button>

                </section> : <section><p className="cell-sub">Hasta que la sucursal registre su certificado no hay datos para la central.</p></section>}

            </aside>}

        </div>

    </div>;
}

export function Team({ me, signedOut }: { me: string; signedOut: () => void }) {

    const admins = useLoad(api.admins), root = useLoad(api.rootKey), log = useLoad(() => api.audit());
    const [invited, setInvited] = useState<{ code: string; expiresAt: string } | null>(null), [removing, setRemoving] = useState<api.Admin | null>(null), [changing, setChanging] = useState(false), [kind, setKind] = useState('');
    const { busy, error, submit } = useSubmit(), toast = useToast();
    const entries = (log.data?.entries ?? []).filter(e => !kind || kind.split('|').some(k => e.action.startsWith(k)));
    const intermediate = root.data?.licenseIntermediate;
    const left = intermediate ? daysLeft(intermediate.expiresAt) : null;
    const week = log.data?.entries.filter(e => Date.now() - Date.parse(e.at) < 7 * 86_400_000).length;

    return <div className="page">

        <Masthead title="Equipo y seguridad" sub="Cada cuenta es un equipo con su llave. Para usar otra computadora, invítala y borra la anterior.">

            <button className="btn" onClick={() => setChanging(true)}><KeyRound size={16} />Cambiar contraseña</button>
            <button className="btn primary" disabled={busy} onClick={() => void submit(async () => setInvited(await api.invite(me)))}><UserPlus size={17} />Invitar a otro equipo</button>

        </Masthead>

        {(error || admins.error) && <div className="error" role="alert">{error || admins.error}</div>}

        <div className="kpis">

            <Kpi tone="violet" icon={MonitorSmartphone} value={admins.data ? admins.data.admins.filter(a => a.active).length : '—'} label="Equipos con llave" chip={admins.data?.admins.some(a => !a.active) ? <span className="chip flat">{admins.data.admins.filter(a => !a.active).length} sin confirmar</span> : undefined} />
            <Kpi tone="teal" icon={ShieldCheck} value="3" label="Factores al entrar" chip={<span className="chip up">llave · clave · código</span>} />
            <Kpi tone={left !== null && left <= 14 ? 'red' : 'amber'} icon={Timer} value={left !== null ? left : '—'} unit={left !== null ? 'días' : undefined} label="Llave de licencias" />
            <Kpi tone="blue" icon={ScrollText} value={week ?? '—'} label="Movimientos en 7 días" />

        </div>

        <div className="two loose">

            <div className="grid">

                <Card icon={Users} tone="violet" title="Equipos" sub="La llave no se puede exportar: vive en el equipo.">

                    <div className="panel-body"><div className="table-wrap"><table><thead><tr><th>Usuario</th><th>Equipo</th><th>Llave</th><th>Desde</th><th>Estado</th><th className="r"><span className="sr">Acciones</span></th></tr></thead><tbody>

                        {!admins.data && !admins.error && <SkeletonRows cols={6} rows={2} />}
                        {admins.data?.admins.map(a => <tr key={a.id}><td className="cell-main nowrap">{a.username}{a.username === me && <span className="cell-sub"> · tú</span>}</td><td className="nowrap">{a.deviceName}</td><td><code>{a.keyAlg}</code></td><td className="num nowrap">{day(a.createdAt)}</td><td><State value={a.active ? 'active' : 'pending'} label={a.active ? 'Activa' : 'Sin confirmar'} /></td><td className="r">{a.username !== me && <button className="btn sm danger" onClick={() => setRemoving(a)}><UserX size={14} />Borrar</button>}</td></tr>)}

                    </tbody></table></div></div>

                </Card>

                <Card icon={KeySquare} tone="red" title="Llave raíz pública" sub="La que Culinary Restaurant lleva incrustada al compilar (tools/build.ps1 -RootPublicKey). La privada no sale de la estación." actions={root.data && <code className="cell-sub">kid {root.data.kid}</code>}>

                    <div className="panel-body">{root.error ? <div className="error">{root.error}</div> : root.data ? <><pre className="snippet">{root.data.pem}</pre>{intermediate && <p className="cell-sub" style={{ marginTop: 10 }}>La llave intermedia de licencias (generación {intermediate.generation}) vence el {day(intermediate.expiresAt)}. Renuévala en la estación antes de esa fecha.</p>}</> : <div className="snippet" aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><Bar width="55%" /><Bar width="92%" small /><Bar width="80%" small /></div>}</div>

                </Card>

            </div>

            <Card icon={ScrollText} tone="violet" title="Bitácora" sub="Cada cambio hecho desde el panel y lo que firman las sucursales." actions={<div className="seg" role="group" aria-label="Filtrar bitácora">{LOG_FILTERS.map(([k, label]) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{label}</button>)}</div>}>

                <div className="panel-body">{log.error ? <div className="error">{log.error}</div> : log.data && !entries.length ? <Empty title="Sin movimientos" text="Aquí queda cada cambio hecho desde el panel." /> : <div className="table-wrap"><table><thead><tr><th>Cuándo</th><th>Quién</th><th>Acción</th></tr></thead><tbody>

                    {!log.data && <SkeletonRows cols={3} />}
                    {entries.map(e => <tr key={e.id}><td className="num nowrap">{moment(e.at)}</td><td>{admins.data?.admins.find(a => a.id === e.adminId)?.username ?? e.adminId?.slice(0, 8) ?? 'Sistema'}</td><td><div className={e.action.includes('revoke') || e.action.endsWith('_failed') ? '' : 'cell-main'} style={e.action.includes('revoke') || e.action.endsWith('_failed') ? { color: 'var(--red-ink)', fontWeight: 650 } : undefined}>{ACTIONS[e.action] ?? e.action}{e.target && <code className="cell-sub"> · {e.target.slice(0, 13)}</code>}</div>{e.detail != null && <div className="cell-sub">{detailText(e.detail)}</div>}</td></tr>)}

                </tbody></table></div>}</div>

            </Card>

        </div>

        {changing && <Dialog title="Cambiar contraseña" onClose={() => setChanging(false)}><p>Confirma con el código de tu app autenticadora. Al guardar se cierran todas tus sesiones y vuelves a entrar con la contraseña nueva.</p><NewPassword username={me} done={() => { setChanging(false); signedOut(); }} /></Dialog>}
        {invited && <Dialog title="Invitación creada" onClose={() => setInvited(null)} footer={<button className="btn primary" onClick={() => setInvited(null)}>Listo</button>}><p>Úsala en la otra computadora, en «Dar de alta este equipo». Sirve una vez y vence el {moment(invited.expiresAt)}.</p><Secret label="Código de invitación" value={invited.code} /></Dialog>}
        {removing && <Dialog title={`Borrar a ${removing.username}`} onClose={() => setRemoving(null)} busy={busy} footer={<><button className="btn quiet" onClick={() => setRemoving(null)}>Cancelar</button><button className="btn primary" disabled={busy} onClick={() => void submit(async () => { await api.removeAdmin(me, removing.id); setRemoving(null); toast('Cuenta borrada'); void admins.reload(); })}>Borrar cuenta</button></>}><p>El equipo «{removing.deviceName}» dejará de poder entrar al panel. Esta acción se firma con la llave de este equipo.</p>{error && <div className="error">{error}</div>}</Dialog>}

    </div>;
}
