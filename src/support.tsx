import { useState } from 'react';
import { Send } from 'lucide-react';
import * as api from './api';
import { Bar, Empty, SkeletonList, State, moment, useLoad, useSubmit, useToast } from './ui';

const FILTERS = [['open', 'Esperando respuesta'], ['answered', 'Respondidos'], ['closed', 'Cerrados'], ['', 'Todos']] as const;

export function Support({ changed }: { changed: () => void }) {

    const [filter, setFilter] = useState<string>('open'), [selected, setSelected] = useState<string | null>(null);
    const list = useLoad(() => api.tickets(filter || undefined), [filter]);
    const detail = useLoad(() => selected ? api.ticket(selected) : Promise.resolve(null), [selected]);
    const [text, setText] = useState(''), { busy, error, submit } = useSubmit(), toast = useToast();
    const t = detail.data?.ticket;
    const refresh = () => { void list.reload(); void detail.reload(); changed(); };
    return <div className="page">
        <div className="page-head"><h1>Soporte</h1><div className="seg" role="group" aria-label="Filtrar tickets">{FILTERS.map(([k, label]) => <button key={k} aria-pressed={filter === k} onClick={() => { setFilter(k); setSelected(null); }}>{label}</button>)}</div></div>
        {list.error && <div className="error" role="alert">{list.error}</div>}
        <div className="split">
            <div className="panel" style={{ overflow: 'hidden' }}>{!list.data && !list.error ? <SkeletonList /> : list.data && !list.data.tickets.length ? <Empty title="Sin tickets" text={filter === 'open' ? 'Ninguna sucursal espera respuesta.' : 'Nada en este filtro.'} /> : list.data?.tickets.map(x => <button key={x.id} className="list-item" aria-current={selected === x.id} onClick={() => setSelected(x.id)}>
                <span className="top"><b>{x.subject}</b><State value={x.status} /></span><span className="cell-sub">{x.customer} · {x.branchName} · {moment(x.updatedAt)}</span></button>)}</div>
            <div className="panel">{selected && t?.id !== selected && !detail.error ? <div className="panel-body thread" aria-busy="true" aria-label="Cargando conversación"><Bar width="45%" /><Bar width="70%" small /><Bar width="55%" small /><Bar width="62%" small /></div> : !t ? <Empty title="Elige un ticket" text="La conversación con la sucursal aparece aquí." /> : <>
                <div className="panel-head"><div style={{ flex: 1 }}><h2>{t.subject}</h2><p className="cell-sub">{t.customer ?? ''} {t.branchName ? '· ' + t.branchName : ''}</p></div><State value={t.status} />{t.status !== 'closed' && <button className="btn sm" onClick={async () => { await api.closeTicket(t.id); toast('Ticket cerrado'); refresh(); }}>Cerrar</button>}</div>
                <div className="panel-body thread">{t.messages?.map(m => <div key={m.id} className={'bubble ' + m.author}><small>{m.author === 'admin' ? 'Soporte de Culinary' : t.branchName ?? 'Sucursal'} · {moment(m.createdAt)}</small><p>{m.body}</p></div>)}</div>
                {t.status !== 'closed' && <form className="panel-body" style={{ borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 10 }} onSubmit={e => { e.preventDefault(); void submit(async () => { await api.reply(t.id, text.trim()); setText(''); toast('Respuesta enviada; la sucursal la recibe en su siguiente sincronización'); if (filter === 'open') setFilter('answered'); refresh(); }); }}>
                    <label className="field">Respuesta<textarea className="input" maxLength={4000} value={text} onChange={e => setText(e.target.value)} required /></label>
                    {error && <div className="error" role="alert">{error}</div>}
                    <button className="btn primary" style={{ alignSelf: 'flex-end' }} disabled={busy || !text.trim()}><Send size={15} />Responder</button></form>}</>}</div>
        </div>
    </div>;

}
