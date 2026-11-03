import { useState } from 'react';
import { Check, Copy, RotateCcw } from 'lucide-react';
import * as api from './api';
import { Empty, SkeletonList, State, moment, useLoad, useSubmit, useToast } from './ui';

const FILTERS = [['open', 'Sin resolver'], ['resolved', 'Resueltos'], ['', 'Todos']] as const;
const SOURCES: Record<string, string> = { api: 'Servidor de la sucursal', worker: 'Proceso en segundo plano', client: 'Aplicación de escritorio', web: 'Interfaz', kiosk: 'Kiosco de CulinaryOS' };
const LABELS: Record<string, string> = { page: 'Pantalla', role: 'Rol', route: 'Ruta', action: 'Operación', operationId: 'Identificador de operación', command: 'Comando', exception: 'Excepción', category: 'Componente', os: 'Sistema', language: 'Idioma', seconds: 'Segundos abierta' };
const times = (n: number) => n === 1 ? '1 vez' : n.toLocaleString('es-MX') + ' veces';
// What a report carries as plain text, to paste into an issue or hand to whoever fixes it.
const asText = (f: api.Fault) => [`Qué falló: ${f.what}`, `Qué afectó: ${f.affected}`, `Sucursal: ${f.customer} · ${f.branchName} (${f.siteId})`, `Origen: ${SOURCES[f.source] ?? f.source}`, `Versión: ${f.version} · ${f.platform}`, `Ocurrió: ${times(f.occurrences)}, de ${f.firstAt} a ${f.lastAt}`, ...Object.entries(f.context).map(([k, v]) => `${LABELS[k] ?? k}: ${v}`), '', f.detail].join('\n');

export function Faults({ changed }: { changed: () => void }) {

    const [filter, setFilter] = useState<string>('open'), [selected, setSelected] = useState<string | null>(null);
    const list = useLoad(() => api.faults(filter || undefined), [filter]);
    const { busy, error, submit } = useSubmit(), toast = useToast();
    const f = list.data?.faults.find(x => x.id === selected);
    const change = (run: (id: string) => Promise<unknown>, done: string) => submit(async () => { await run(f!.id); toast(done); await list.reload(); changed(); });

    return <div className="page">

        <div className="page-head"><h1>Fallos</h1><div className="seg" role="group" aria-label="Filtrar fallos">{FILTERS.map(([k, label]) => <button key={k} aria-pressed={filter === k} onClick={() => { setFilter(k); setSelected(null); }}>{label}</button>)}</div></div>

        {list.error && <div className="error" role="alert">{list.error}</div>}

        <div className="split">

            <div className="panel" style={{ overflow: 'hidden' }}>{!list.data && !list.error ? <SkeletonList /> : list.data && !list.data.faults.length ? <Empty title="Sin fallos" text={filter === 'open' ? 'Ninguna sucursal tiene fallos por revisar.' : 'Nada en este filtro.'} /> : list.data?.faults.map(x => <button key={x.id} className="list-item" aria-current={selected === x.id} onClick={() => setSelected(x.id)}>

                <span className="top"><b>{x.what}</b><State value={x.status === 'open' ? x.severity : x.status} /></span><span className="cell-sub">{x.customer} · {x.branchName} · {times(x.occurrences)} · {moment(x.lastAt)}</span></button>)}</div>

            <div className="panel">{!f ? <Empty title="Elige un fallo" text="Aquí aparece qué falló, qué afectó y los datos para corregirlo." /> : <>

                <div className="panel-head"><div style={{ flex: 1, minWidth: 0 }}><h2>{f.what}</h2><p className="cell-sub">{f.customer} · {f.branchName}</p></div><State value={f.status === 'open' ? f.severity : f.status} /></div>

                <div className="panel-body fault">

                    <section><h3>Qué afectó</h3><p>{f.affected || 'La sucursal no indicó el efecto.'}</p></section>

                    <section><h3>Datos para revisarlo</h3><dl>
                        <dt>Sucursal</dt><dd>{f.siteId}</dd>
                        <dt>Origen</dt><dd>{SOURCES[f.source] ?? f.source}</dd>
                        <dt>Versión</dt><dd className="num">{f.version} · {f.platform}</dd>
                        <dt>Ocurrió</dt><dd>{times(f.occurrences)}</dd>
                        <dt>Primera vez</dt><dd>{moment(f.firstAt)}</dd>
                        <dt>Última vez</dt><dd>{moment(f.lastAt)}</dd>
                        {Object.entries(f.context).map(([k, v]) => <div key={k} className="dl-row"><dt>{LABELS[k] ?? k}</dt><dd>{v}</dd></div>)}
                    </dl></section>

                    {f.detail && <section><h3>Detalle técnico</h3><pre tabIndex={0}>{f.detail}</pre></section>}

                    {error && <div className="error" role="alert">{error}</div>}

                    <div className="fault-actions"><button className="btn" onClick={async () => { await navigator.clipboard.writeText(asText(f)); toast('Reporte copiado'); }}><Copy size={15} />Copiar reporte</button>
                        {f.status === 'open' ? <button className="btn primary" disabled={busy} onClick={() => change(api.resolveFault, 'Fallo resuelto; si vuelve a ocurrir se abrirá solo')}><Check size={15} />Marcar resuelto</button> : <button className="btn" disabled={busy} onClick={() => change(api.reopenFault, 'Fallo reabierto')}><RotateCcw size={15} />Reabrir</button>}</div>

                </div></>}</div>

        </div>

    </div>;
}
