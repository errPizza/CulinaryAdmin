import { useContext, useMemo } from 'react';
import { ArrowRight, CalendarDays, Crown, Eye, FileWarning, Headset, KeyRound, Layers, LockKeyhole, MapPin, MessageCircle, MessageSquareMore, Plus, ShieldCheck, Store, TrendingUp, TriangleAlert, Upload, Users } from 'lucide-react';
import * as api from './api';
import { PLATFORMS, size } from './releases';
import { ACTIONS } from './team';
import { Card, Empty, Glyph, Kpi, Masthead, ShellContext, SkeletonRows, State, Tile, buckets, day, daysLeft, intent, moment, needsRenewal, short, useLoad, type PageKey, type Tone } from './ui';
import type { LucideIcon } from 'lucide-react';

export const licenseState = (l: api.License) => l.status === 'active' && l.expiresAt && daysLeft(l.expiresAt)! <= 7 ? 'expiring' : l.status;
export const expiryLabel = (l: api.License) => { const left = l.expiresAt ? daysLeft(l.expiresAt)! : null; return l.status === 'active' && left !== null && left <= 7 ? (left <= 0 ? 'Vence hoy' : `Vence en ${left} ${left === 1 ? 'día' : 'días'}`) : undefined; };

export function Summary({ me }: { me: string }) {

    const { go } = useContext(ShellContext);
    const lic = useLoad(api.licenses), rev = useLoad(api.revenue), open = useLoad(() => api.tickets('open')), failing = useLoad(() => api.faults('open'));
    const rel = useLoad(api.releases), pub = useLoad(api.publications), log = useLoad(() => api.audit()), reg = useLoad(api.registry), admins = useLoad(api.admins);
    const all = lic.data?.licenses ?? [];
    const active = all.filter(l => l.status === 'active');
    const urgent = useMemo(() => [...all.filter(needsRenewal).sort((a, b) => Date.parse(a.expiresAt!) - Date.parse(b.expiresAt!)), ...all.filter(l => !needsRenewal(l) && l.status !== 'revoked').sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))].slice(0, 4), [all]);
    const latest = log.data?.entries[0];
    const r = rev.data;
    const change = r && r.collected.lastMonth ? Math.round((r.collected.thisMonth - r.collected.lastMonth) / r.collected.lastMonth * 100) : null;
    const critical = failing.data?.faults.filter(f => f.severity === 'critical').length ?? 0;
    const businesses = new Set(all.map(l => l.tenantId)).size;
    const recent = all.filter(l => l.activatedAt && Date.now() - Date.parse(l.activatedAt) < 30 * 86_400_000).length;
    const waiting = open.data?.tickets.length ?? 0;
    const open_ = (page: PageKey, what?: string) => { if (what) intent.set(what); go(page); };
    const published = (id: string) => pub.data?.publications.find(p => p.releaseId === id && !p.withdrawnAt);

    const modules: [LucideIcon, Tone, string, string, LucideIcon, LucideIcon, string, PageKey][] = [

        [Headset, 'teal', 'Soporte', open.data ? (waiting ? `${waiting} ${waiting === 1 ? 'espera' : 'esperan'} respuesta.` : 'Nadie espera respuesta.') : 'Tickets de las sucursales.', MessageSquareMore, MessageCircle, 'Abrir soporte', 'support'],
        [TriangleAlert, 'red', 'Fallos', failing.data ? (critical ? `${critical} ${critical === 1 ? 'crítico' : 'críticos'} sin resolver.` : failing.data.faults.length ? `${failing.data.faults.length} sin resolver.` : 'Nada por revisar.') : 'Errores que reportan solas.', FileWarning, Eye, 'Ver reportes', 'faults'],
        [Store, 'violet', 'Sucursales', reg.data ? `${reg.data.branches.filter(b => b.certificateSha256).length} con certificado.` : 'Registro para la central.', Store, MapPin, 'Administrar', 'branches'],
        [Crown, 'gold', 'Panel del dueño', lic.data ? `${businesses} ${businesses === 1 ? 'negocio' : 'negocios'}.` : 'Cuentas de Culinary Dueño.', Crown, Users, 'Acceder', 'owners'],
        [ShieldCheck, 'violet', 'Equipo y seguridad', admins.data ? `${admins.data.admins.filter(a => a.active).length} equipos con llave.` : 'Accesos y bitácora.', LockKeyhole, Users, 'Gestionar', 'team']

    ];

    return <div className="page">

        <Masthead title={`¡Bienvenido, ${me}!`} sub="Licencias, ingresos, versiones y soporte de Culinary Restaurant en un solo lugar.">

            {latest && <div className="activity"><CalendarDays size={22} /><div><small>Última actividad</small><b>{moment(latest.at)} · {ACTIONS[latest.action] ?? latest.action}</b></div></div>}

        </Masthead>

        {(lic.error || rev.error) && <div className="error" role="alert">{lic.error || rev.error}</div>}

        <div className="kpis">

            <Kpi tone="red" icon={KeyRound} value={lic.data ? active.length : '—'} label="Licencias activas" onClick={() => go('licenses')} chip={recent > 0 ? <span className="chip up">+{recent} en 30 días</span> : undefined} series={lic.data ? buckets(all.map(l => l.activatedAt), 10, 7, true) : undefined} />
            <Kpi tone="gold" icon={TrendingUp} value={r ? short(r.recurring.total) : '—'} label="Ingreso recurrente al mes" onClick={() => go('revenue')} chip={change !== null ? <span className={'chip ' + (change >= 0 ? 'up' : 'down')}>{change >= 0 ? '+' : ''}{change}% cobrado</span> : undefined} series={r ? r.months.map(m => m.total) : undefined} />
            <Kpi tone="teal" icon={Headset} value={open.data ? open.data.tickets.length : '—'} label="Tickets abiertos" onClick={() => go('support')} series={open.data ? buckets(open.data.tickets.map(t => t.createdAt), 10) : undefined} />
            <Kpi tone="amber" icon={TriangleAlert} value={failing.data ? failing.data.faults.length : '—'} label="Fallos sin resolver" onClick={() => go('faults')} series={failing.data ? buckets(failing.data.faults.map(f => f.lastAt), 10) : undefined} />

        </div>

        <div className="two">

            <Card icon={KeyRound} tone="red" title="Licencias" sub="Las que vencen primero y las recién creadas." actions={<button className="btn primary" onClick={() => open_('licenses', 'new')}><Plus size={17} />Nueva licencia</button>}>

                <div className="panel-body"><div className="table-wrap">{lic.data && !urgent.length ? <Empty title="Aún no hay licencias" text="Crea la primera desde aquí." /> : <table><thead><tr><th>Cliente</th><th>Estado</th><th>Vencimiento</th><th className="r"><span className="sr">Acciones</span></th></tr></thead><tbody>

                    {!lic.data && !lic.error && <SkeletonRows cols={4} rows={3} />}
                    {urgent.map(l => <tr key={l.id}><td><div className="cell-main">{l.customer}</div><div className="cell-sub">{l.branchName}</div></td><td><State value={licenseState(l)} label={expiryLabel(l)} /></td><td className="num nowrap">{l.expiresAt ? day(l.expiresAt) : l.plan === 'permanent' ? 'Sin vencimiento' : '—'}</td><td className="r"><button className="btn sm" onClick={() => open_('licenses', 'license:' + l.id)}><Eye size={15} />Ver</button></td></tr>)}

                </tbody></table>}</div></div>
                <button className="more" onClick={() => go('licenses')}>Ver todas las licencias <ArrowRight size={15} /></button>

            </Card>

            <Card icon={Layers} tone="violet" title="Versiones" sub="Lo último que subiste y si ya se publicó." actions={<button className="btn primary" onClick={() => open_('releases', 'upload')}><Upload size={17} />Subir versión</button>}>

                <div className="panel-body"><div className="table-wrap">{rel.data && !rel.data.releases.length ? <Empty title="Aún no hay versiones" text="Sube el primer paquete .deb, .exe o .apk." /> : <table><thead><tr><th>Versión</th><th>Plataforma</th><th>Tamaño</th><th>Estado</th></tr></thead><tbody>

                    {!rel.data && !rel.error && <SkeletonRows cols={4} rows={3} />}
                    {rel.data?.releases.slice(0, 3).map(x => { const p = published(x.id); return <tr key={x.id}><td className="num cell-main">{x.version}</td><td>{PLATFORMS[x.platform]?.[0] ?? x.platform}</td><td className="num nowrap">{size(x.bytes)}</td><td>{p ? <State value="ready" label={p.target === 'all' ? 'Publicada · todas' : `Publicada · ${p.target.licenseIds.length}`} /> : <State value={x.status} />}</td></tr>; })}

                </tbody></table>}</div></div>
                <button className="more" onClick={() => go('releases')}>Ver todas las versiones <ArrowRight size={15} /></button>

            </Card>

        </div>

        <div className="mods">{modules.map(([icon, tone, title, text, art, btnIcon, btn, page]) => { const B = btnIcon; return <section key={title} className={'panel mod tone-' + tone} aria-label={title}>

            <div className="mod-t"><Glyph icon={icon} tone={tone} size={26} /><div><b>{title}</b><small>{text}</small></div></div>
            <div className="art"><Tile icon={art} tone={tone === 'violet' && page === 'team' ? 'steel' : tone} size={70} /></div>
            <button className="btn" onClick={() => go(page)}><B size={16} />{btn}</button>

        </section>; })}</div>


    </div>;
}
