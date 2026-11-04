import { useState } from 'react';
import { Activity, Bug, Check, Copy, OctagonAlert, RotateCcw, Store, TriangleAlert, X } from 'lucide-react';
import * as api from './api';
import { Card, Empty, Kpi, Masthead, SkeletonRows, State, ago, moment, useLoad, useSubmit, useToast } from './ui';

const FILTERS = [['open', 'Sin resolver'], ['resolved', 'Resueltos'], ['', 'Todos']] as const;
const SOURCES: Record<string, string> = { api: 'Servidor de la sucursal', worker: 'Proceso en segundo plano', client: 'Aplicación de escritorio', web: 'Interfaz', kiosk: 'Kiosco de CulinaryOS' };
const LABELS: Record<string, string> = { page: 'Pantalla', role: 'Rol', route: 'Ruta', action: 'Operación', operationId: 'Identificador de operación', command: 'Comando', exception: 'Excepción', category: 'Componente', os: 'Sistema', language: 'Idioma', seconds: 'Segundos abierta' };
const times = (n: number) => n === 1 ? '1 vez' : n.toLocaleString('es-MX') + ' veces';
// What a report carries as plain text, to paste into an issue or hand to whoever fixes it.
const asText = (f: api.Fault) => [`Qué falló: ${f.what}`, `Qué afectó: ${f.affected}`, `Sucursal: ${f.customer} · ${f.branchName} (${f.siteId})`, `Origen: ${SOURCES[f.source] ?? f.source}`, `Versión: ${f.version} · ${f.platform}`, `Ocurrió: ${times(f.occurrences)}, de ${f.firstAt} a ${f.lastAt}`, ...Object.entries(f.context).map(([k, v]) => `${LABELS[k] ?? k}: ${v}`), '', f.detail].join('\n');
const state = (f: api.Fault) => f.status === 'open' ? f.severity : f.status;

export function Faults({ changed }: { changed: () => void }) {

    const [filter, setFilter] = useState<string>('open'), [selected, setSelected] = useState<string | null>(null);
    const list = useLoad(() => api.faults(filter || undefined), [filter]), open = useLoad(() => api.faults('open'));
    const { busy, error, submit } = useSubmit(), toast = useToast();
    const f = list.data?.faults.find(x => x.id === selected);
    const change = (run: (id: string) => Promise<unknown>, done: string) => submit(async () => { await run(f!.id); toast(done); await list.reload(); void open.reload(); changed(); });
    const live = open.data?.faults ?? [];

    return <div className="page">

        <Masthead title="Fallos" sub="Errores que las sucursales reportan solas, agrupados por causa."><div className="seg" role="group" aria-label="Filtrar fallos">{FILTERS.map(([k, label]) => <button key={k} aria-pressed={filter === k} onClick={() => { setFilter(k); setSelected(null); }}>{label}</button>)}</div></Masthead>

        {list.error && <div className="error" role="alert">{list.error}</div>}

        <div className="kpis">

            <Kpi tone="red" icon={OctagonAlert} value={open.data ? live.filter(x => x.severity === 'critical').length : '—'} label="Críticos sin resolver" />
            <Kpi tone="amber" icon={TriangleAlert} value={open.data ? live.filter(x => x.severity === 'error').length : '—'} label="Errores sin resolver" />
            <Kpi tone="violet" icon={Store} value={open.data ? new Set(live.map(x => x.licenseId)).size : '—'} label="Sucursales afectadas" />
            <Kpi tone="teal" icon={Activity} value={open.data ? live.reduce((a, x) => a + x.occurrences, 0).toLocaleString('es-MX') : '—'} label="Repeticiones sin resolver" />

        </div>

        <div className="with-side" style={{ gridTemplateColumns: 'minmax(0, 1fr) 460px' }}>

            <Card icon={Bug} tone="red" title="Reportes" sub="Una fila por causa; si vuelve a pasar se suma y se reabre sola.">

                <div className="panel-body">{list.data && !list.data.faults.length ? <Empty title="Sin fallos" text={filter === 'open' ? 'Ninguna sucursal tiene fallos por revisar.' : 'Nada en este filtro.'} /> : <div className="table-wrap"><table><thead><tr><th>Gravedad</th><th>Qué pasó</th><th>Sucursal</th><th>Versión</th><th className="r">Veces</th><th>Última</th></tr></thead><tbody>

                    {!list.data && !list.error && <SkeletonRows cols={6} rows={3} />}
                    {list.data?.faults.map(x => <tr key={x.id} className="clickable" aria-selected={selected === x.id} onClick={() => setSelected(x.id)}><td><State value={state(x)} /></td><td><div className="cell-main">{x.what}</div><div className="cell-sub">{SOURCES[x.source] ?? x.source}</div></td><td>{x.customer} · {x.branchName}</td><td className="num">{x.version}</td><td className="num r">{x.occurrences.toLocaleString('es-MX')}</td><td className="num nowrap">{ago(x.lastAt)}</td></tr>)}

                </tbody></table></div>}</div>

            </Card>

            {!f ? <aside className="panel detail idle"><Empty title="Elige un fallo" text="Aquí aparece qué falló, qué afectó y los datos para corregirlo." /></aside> : <aside className="panel detail fault" aria-label={f.what}>

                <header><div><div className="split-line"><State value={state(f)} /><span className="num cell-sub">{times(f.occurrences)}</span></div><h2 style={{ marginTop: 8 }}>{f.what}</h2><p className="cell-sub">{f.customer} · {f.branchName} · <code>{f.siteId}</code></p></div><button className="btn quiet sm icon close" onClick={() => setSelected(null)} aria-label="Cerrar"><X size={16} /></button></header>

                <section><h3>Qué afectó</h3><p>{f.affected || 'La sucursal no indicó el efecto.'}</p></section>

                <section><dl className="facts">
                    <dt>Origen</dt><dd>{SOURCES[f.source] ?? f.source}</dd>
                    <dt>Versión</dt><dd className="num">{f.version} · {f.platform}</dd>
                    <dt>Primera vez</dt><dd>{moment(f.firstAt)}</dd>
                    <dt>Última vez</dt><dd>{moment(f.lastAt)}</dd>
                    {Object.entries(f.context).map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{LABELS[k] ?? k}</dt><dd>{v}</dd></div>)}
                </dl></section>

                {f.detail && <section><h3>Detalle técnico</h3><pre tabIndex={0}>{f.detail}</pre></section>}

                {error && <div className="error" role="alert">{error}</div>}

                <section><div className="buttons">
                    {f.status === 'open' ? <button className="btn primary" disabled={busy} onClick={() => change(api.resolveFault, 'Fallo resuelto; si vuelve a ocurrir se abrirá solo')}><Check size={16} />Marcar resuelto</button> : <button className="btn" disabled={busy} onClick={() => change(api.reopenFault, 'Fallo reabierto')}><RotateCcw size={16} />Reabrir</button>}
                    <button className="btn" onClick={async () => { await navigator.clipboard.writeText(asText(f)); toast('Reporte copiado'); }}><Copy size={16} />Copiar reporte</button>
                </div></section>

            </aside>}

        </div>

    </div>;
}
