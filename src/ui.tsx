import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Bell, Check, Copy, Search, Settings, X, type LucideIcon } from 'lucide-react';
import { ApiError } from './api';

export const day = (v?: string | null) => v ? new Date(v).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const moment = (v?: string | null) => v ? new Date(v).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const daysLeft = (v?: string | null) => v ? Math.ceil((Date.parse(v) - Date.now()) / 86_400_000) : null;
// A license that has expired, or will within a week, needs a renewal call.
export const needsRenewal = (l: { status: string; expiresAt: string | null }) => l.status === 'expired' || (l.status === 'active' && !!l.expiresAt && daysLeft(l.expiresAt)! <= 7);
// One page asks another to open something on arrival (a dialog, a row); the target takes it once.
export const intent = { set: (value: string) => sessionStorage.setItem('culinary-admin.intent', value), take: (prefix: string) => { const v = sessionStorage.getItem('culinary-admin.intent'); if (!v?.startsWith(prefix)) return null; sessionStorage.removeItem('culinary-admin.intent'); return v.slice(prefix.length); } };
export const ago = (v?: string | null) => { if (!v) return '—'; const m = Math.round((Date.now() - Date.parse(v)) / 60_000); return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : m < 2880 ? 'ayer' : day(v); };
// Centavos to pesos, with cents only when there are any.
export const pesos = (centavos: number) => '$' + (centavos / 100).toLocaleString('es-MX', { minimumFractionDigits: centavos % 100 ? 2 : 0, maximumFractionDigits: 2 });
export const short = (centavos: number) => { const p = centavos / 100; return p >= 1_000_000 ? '$' + (p / 1_000_000).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + ' M' : p >= 10_000 ? '$' + (p / 1000).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + ' k' : pesos(centavos); };
/** How many dates fall in each of the last `count` buckets of `size` days, oldest first; cumulative adds them up. */
export function buckets(dates: (string | null | undefined)[], count: number, size = 1, cumulative = false): number[] {

    const end = Date.now(), out = Array<number>(count).fill(0);
    let before = 0;

    for (const d of dates) { if (!d) continue; const i = count - 1 - Math.floor((end - Date.parse(d)) / (size * 86_400_000)); if (i >= 0 && i < count) out[i]++; else if (i < 0) before++; }
    if (cumulative) for (let i = 0, run = before; i < count; i++) { run += out[i]; out[i] = run; }

    return out;
}
export const message = (e: unknown) => e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Algo salió mal';

const STATE_LABELS: Record<string, string> = { expiring: 'Por vencer', active: 'Activa', pending: 'Sin activar', expired: 'Vencida', revoked: 'Revocada', open: 'Esperando respuesta', answered: 'Respondido', closed: 'Cerrado', uploading: 'Subiendo', signing: 'Falta firma', ready: 'Lista', error: 'Error', critical: 'Crítico', resolved: 'Resuelto' };

export function State({ value, label }: { value: string; label?: string }) { return <span className={'state ' + value}>{label ?? STATE_LABELS[value] ?? value}</span>; }
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {

    const [data, setData] = useState<T | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
    const run = useCallback(async () => { setLoading(true); try { setData(await load()); setError(''); } catch (e) { setError(message(e)); } finally { setLoading(false); } }, deps); // eslint-disable-line react-hooks/exhaustive-deps
   
    useEffect(() => { void run(); }, [run]);
    
    return { data, error, loading, reload: run };
}

const ToastContext = createContext<(text: string) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {

    const [text, setText] = useState(''), timer = useRef<number>(0);
    const show = useCallback((value: string) => { setText(value); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setText(''), 3600); }, []);
    
    return <ToastContext.Provider value={show}>{children}{text && <div className="toast" role="status"><Check size={16} color="var(--green)" />{text}</div>}</ToastContext.Provider>;
}

export function Dialog({ title, onClose, children, footer, busy }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; busy?: boolean }) {

    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => { ref.current?.showModal(); }, []);
   
    return <dialog ref={ref} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} aria-label={title}>
        
        <div className="dialog-head"><h2>{title}</h2><button className="btn quiet sm" onClick={onClose} disabled={busy} aria-label="Cerrar"><X size={16} /></button></div>
        <div className="dialog-body">{children}</div>
        
        {footer && <div className="dialog-foot">{footer}</div>}

    </dialog>;
}

export function useSubmit() {

    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const submit = useCallback(async (work: () => Promise<unknown>) => { if (busy) return false; setBusy(true); setError(''); try { await work(); return true; } catch (e) { setError(message(e)); return false; } finally { setBusy(false); } }, [busy]);
    
    return { busy, error, submit, setError };
}

export function Secret({ label, value }: { label: string; value: string }) {

    const [copied, setCopied] = useState(false);
   
    return <div className="secret"><small>{label}</small><div><code>{value}</code><button className="btn sm" type="button" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copiado' : 'Copiar'}</button></div></div>;
}

const WIDTHS = ['72%', '48%', '60%', '38%', '66%', '54%'];

export const Bar = ({ width, small }: { width: string; small?: boolean }) => <span className={'sk' + (small ? ' sm' : '')} style={{ width }} />;

export function SkeletonRows({ cols, rows = 4 }: { cols: number; rows?: number }) {

    return <>{Array.from({ length: rows }, (_, r) => <tr key={r} className="sk-row" aria-hidden="true">{Array.from({ length: cols }, (_, c) => <td key={c}><Bar width={WIDTHS[(r + c) % WIDTHS.length]} />{c === 0 && <Bar width="40%" small />}</td>)}</tr>)}</>;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {

    return <div aria-busy="true" aria-label="Cargando">{Array.from({ length: rows }, (_, r) => <div key={r} className="list-item" aria-hidden="true"><Bar width={WIDTHS[r % WIDTHS.length]} /><Bar width="35%" small /></div>)}</div>;
}

export type Tone = 'red' | 'violet' | 'teal' | 'amber' | 'gold' | 'blue' | 'steel';
export type PageKey = 'summary' | 'licenses' | 'revenue' | 'releases' | 'support' | 'faults' | 'branches' | 'owners' | 'team';
export type Shell = { go: (page: PageKey) => void; query: string; setQuery: (q: string) => void; alerts: number };

export const ShellContext = createContext<Shell>({ go: () => {}, query: '', setQuery: () => {}, alerts: 0 });

/** Page title with the search, the alert bell and the page's own actions on the right. */
export function Masthead({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {

    const { go, query, setQuery, alerts } = useContext(ShellContext);

    return <header className="masthead">

        <div className="head"><span className="bar" /><div><h1>{title}</h1><p>{sub}</p></div></div>
        <div className="mast-r">
            <div className="topbar">
                <label className="search"><Search size={18} /><input type="search" placeholder="Buscar cliente, sucursal o siteId" value={query} onChange={e => { setQuery(e.target.value); if (e.target.value) go('licenses'); }} aria-label="Buscar licencias" /></label>
                <button className="icon-btn" onClick={() => go('support')} aria-label={alerts ? `${alerts} pendientes en soporte y fallos` : 'Sin pendientes'}><Bell size={21} />{alerts > 0 && <span className="dot">{alerts}</span>}</button>
                <button className="icon-btn" onClick={() => go('team')} aria-label="Equipo y seguridad"><Settings size={21} /></button>
            </div>
            {children && <div className="actions">{children}</div>}
        </div>

    </header>;
}

export const Tile = ({ icon: Icon, tone, size = 62 }: { icon: LucideIcon; tone: Tone; size?: number }) => <span className={'tile tone-' + tone} style={{ width: size, height: size, borderRadius: size * .26 }} aria-hidden="true"><Icon size={size * .52} strokeWidth={2.2} /></span>;
export const Glyph = ({ icon: Icon, tone, size = 34 }: { icon: LucideIcon; tone: Tone; size?: number }) => <span className={'glyph tone-' + tone} aria-hidden="true"><Icon size={size} strokeWidth={1.9} /></span>;

const SPARK_COLORS: Record<Tone, string> = { red: '#ff4a60', violet: '#a37bff', teal: '#22c3a0', amber: '#f2a93b', gold: '#e8c26a', blue: '#77a8ff', steel: '#a8a2b3' };

export function Spark({ values, tone }: { values: number[]; tone: Tone }) {

    const id = useId(), w = 220, h = 50, max = Math.max(...values), min = Math.min(...values), color = SPARK_COLORS[tone];

    if (values.length < 2) return null;

    const d = values.map((v, i) => `${i ? 'L' : 'M'}${(i * w / (values.length - 1)).toFixed(1)} ${(h - 5 - (v - min) / (max - min || 1) * (h - 16)).toFixed(1)}`).join(' ');

    return <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".42" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs><path d={`${d} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} /><path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" /></svg>;
}

/** A headline number. With onClick it becomes a button that leads to where the number comes from. */
export function Kpi({ tone, icon, value, unit, label, chip, series, onClick }: { tone: Tone; icon: LucideIcon; value: ReactNode; unit?: string; label: string; chip?: ReactNode; series?: number[]; onClick?: () => void }) {

    const body = <>

        <Tile icon={icon} tone={tone} />
        <div><div className="v">{value}{unit && <small>{unit}</small>}</div><div className="l">{label}</div></div>
        {(chip || onClick) && <span className="corner">{chip ?? <span className="go"><ArrowRight size={15} strokeWidth={2.6} /></span>}</span>}
        {series && <Spark values={series} tone={tone} />}

    </>;

    return onClick ? <button className={'kpi tone-' + tone} onClick={onClick}>{body}</button> : <div className={'kpi tone-' + tone}>{body}</div>;
}

export function Card({ icon, tone, title, sub, actions, children, className = '', style }: { icon?: LucideIcon; tone?: Tone; title?: string; sub?: string; actions?: ReactNode; children: ReactNode; className?: string; style?: React.CSSProperties }) {

    return <section className={'panel ' + className} style={style} aria-label={title}>

        {title && <div className="panel-head">{icon && tone && <Glyph icon={icon} tone={tone} />}<div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{actions}</div>}
        {children}

    </section>;
}

export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) { return <div className="empty"><h3>{title}</h3><p>{text}</p>{action}</div>; }