import { useContext, useState } from 'react';
import { CheckCheck, KeyRound, SendHorizontal } from 'lucide-react';
import * as api from './api';
import { expiryLabel, licenseState } from './summary';
import { Bar, Empty, Masthead, ShellContext, SkeletonList, State, ago, day, intent, moment, useLoad, useSubmit, useToast } from './ui';

const FILTERS = [['open', 'Esperando respuesta'], ['answered', 'Respondidos'], ['closed', 'Cerrados'], ['', 'Todos']] as const;

export function Support({ changed }: { changed: () => void }) {

    const { go } = useContext(ShellContext);
    const [filter, setFilter] = useState<string>('open'), [selected, setSelected] = useState<string | null>(null);
    const list = useLoad(() => api.tickets(filter || undefined), [filter]);
    const detail = useLoad(() => selected ? api.ticket(selected) : Promise.resolve(null), [selected]);
    const lic = useLoad(api.licenses);
    const [text, setText] = useState(''), { busy, error, submit } = useSubmit(), toast = useToast();
    const t = detail.data?.ticket;
    const license = t && lic.data?.licenses.find(l => l.id === t.licenseId);
    const refresh = () => { void list.reload(); void detail.reload(); changed(); };

    return <div className="page">

        <Masthead title="Soporte" sub="Preguntas que mandan las sucursales desde Culinary Restaurant y los dueños desde Culinary Dueño."><div className="seg" role="group" aria-label="Filtrar tickets">{FILTERS.map(([k, label]) => <button key={k} aria-pressed={filter === k} onClick={() => { setFilter(k); setSelected(null); }}>{label}</button>)}</div></Masthead>

        {list.error && <div className="error" role="alert">{list.error}</div>}

        <div className="support">

            <section className="panel" style={{ overflow: 'hidden' }} aria-label="Tickets">{!list.data && !list.error ? <SkeletonList /> : list.data && !list.data.tickets.length ? <Empty title="Sin tickets" text={filter === 'open' ? 'Ninguna sucursal espera respuesta.' : 'Nada en este filtro.'} /> : list.data?.tickets.map(x => <button key={x.id} className="list-item" aria-current={selected === x.id} onClick={() => setSelected(x.id)}>

                <span className="top"><b>{x.customer ?? 'Sucursal'}{x.branchName ? ' · ' + x.branchName : ''}{x.ownerEmail !== undefined && <span className="tag" style={{ marginLeft: 6 }}>Dueño</span>}</b><State value={x.status} /><time>{ago(x.updatedAt)}</time></span><p>{x.subject}</p></button>)}</section>

            <section className="panel" aria-label="Conversación">{selected && t?.id !== selected && !detail.error ? <div className="thread" aria-busy="true" aria-label="Cargando conversación"><Bar width="45%" /><Bar width="70%" small /><Bar width="55%" small /><Bar width="62%" small /></div> : !t ? <Empty title="Elige un ticket" text="La conversación con la sucursal aparece aquí." /> : <>

                <div className="panel-head" style={{ borderBottom: '1px solid var(--line)' }}><div><h2>{t.subject}</h2><p>{t.ownerEmail !== undefined && <>Desde Culinary Dueño · {t.ownerEmail ?? 'cuenta borrada'} · </>}{t.customer ?? ''}{t.branchName ? ' · ' + t.branchName : ''}{t.siteId ? <> · <code>{t.siteId}</code></> : null}</p></div>{t.status !== 'closed' && <button className="btn sm" onClick={async () => { await api.closeTicket(t.id); toast('Ticket cerrado'); refresh(); }}><CheckCheck size={15} />Cerrar ticket</button>}</div>
                <div className="thread">{t.messages?.map(m => <div key={m.id} className={'bubble ' + (m.author === 'owner' ? 'branch' : m.author)}><p>{m.body}</p><small>{m.author === 'admin' ? 'Soporte de Culinary' : m.author === 'owner' ? 'Dueño' + (t.ownerEmail ? ' · ' + t.ownerEmail : '') : t.branchName ?? 'Sucursal'} · {moment(m.createdAt)}</small></div>)}</div>

                {t.status !== 'closed' && <form className="reply" onSubmit={e => { e.preventDefault(); void submit(async () => { await api.reply(t.id, text.trim()); setText(''); toast(t.ownerEmail !== undefined ? 'Respuesta enviada; el dueño la ve en Culinary Dueño' : 'Respuesta enviada; la sucursal la recibe en su siguiente sincronización'); if (filter === 'open') setFilter('answered'); refresh(); }); }}>

                    <textarea className="input" aria-label="Respuesta" placeholder="Escribe tu respuesta" maxLength={4000} value={text} onChange={e => setText(e.target.value)} required />
                    {error && <div className="error" role="alert">{error}</div>}
                    <div className="split-line"><span className="cell-sub">{t.ownerEmail !== undefined ? 'El dueño lo ve en la sección Mensajes de Culinary Dueño.' : 'La sucursal lo ve en su bandeja de soporte.'}</span><button className="btn primary" disabled={busy || !text.trim()}><SendHorizontal size={16} />Responder</button></div>

                </form>}</>}</section>

            <aside className="panel detail side" aria-label="Sucursal del ticket">{!license ? <p className="cell-sub">Al elegir un ticket ves aquí la licencia de la sucursal.</p> : <>

                <h3>Sucursal</h3>
                <dl className="facts" style={{ gridTemplateColumns: '96px minmax(0, 1fr)' }}><dt>Cliente</dt><dd>{license.customer}</dd><dt>Estado</dt><dd><State value={licenseState(license)} label={expiryLabel(license)} /></dd><dt>Vence</dt><dd className="num">{license.expiresAt ? day(license.expiresAt) : license.plan === 'permanent' ? 'Sin vencimiento' : '—'}</dd><dt>Plan</dt><dd><span className={'tag ' + license.tier}>{api.TIERS[license.tier].label}</span> {api.PLANS[license.plan]}</dd><dt>Validó</dt><dd>{ago(license.validatedAt)}</dd></dl>
                <section><button className="btn primary" onClick={() => { intent.set('license:' + license.id); go('licenses'); }}><KeyRound size={16} />Abrir licencia</button></section>

            </>}</aside>

        </div>

    </div>;
}
