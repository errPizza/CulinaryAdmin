import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { ApiError } from './api';

export const day = (v?: string | null) => v ? new Date(v).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const moment = (v?: string | null) => v ? new Date(v).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const daysLeft = (v?: string | null) => v ? Math.ceil((Date.parse(v) - Date.now()) / 86_400_000) : null;
export const message = (e: unknown) => e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Algo salió mal';

const STATE_LABELS: Record<string, string> = { active: 'Activa', pending: 'Sin activar', expired: 'Vencida', revoked: 'Revocada', open: 'Esperando respuesta', answered: 'Respondido', closed: 'Cerrado', uploading: 'Subiendo', ready: 'Lista' };
export function State({ value, label }: { value: string; label?: string }) { return <span className={'state ' + value}>{label ?? STATE_LABELS[value] ?? value}</span>; }

// Loads data, keeps the previous result while reloading, and exposes the error as text.
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

// A modal for tasks that need protected focus: creating, confirming an irreversible action, showing a one-time secret.
export function Dialog({ title, onClose, children, footer, busy }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; busy?: boolean }) {

    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => { ref.current?.showModal(); }, []);
    return <dialog ref={ref} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} aria-label={title}>
        <div className="dialog-head"><h2>{title}</h2><button className="btn quiet sm" onClick={onClose} disabled={busy} aria-label="Cerrar"><X size={16} /></button></div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-foot">{footer}</div>}
    </dialog>;

}

// Runs a submit, keeping the dialog open with the error until it succeeds.
export function useSubmit() {

    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const submit = useCallback(async (work: () => Promise<unknown>) => { if (busy) return false; setBusy(true); setError(''); try { await work(); return true; } catch (e) { setError(message(e)); return false; } finally { setBusy(false); } }, [busy]);
    return { busy, error, submit, setError };

}

export function Secret({ label, value }: { label: string; value: string }) {

    const [copied, setCopied] = useState(false);
    return <div className="secret"><small>{label}</small><div><code>{value}</code><button className="btn sm" type="button" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copiado' : 'Copiar'}</button></div></div>;

}

// Placeholders while a list loads; widths vary per row so they do not read as a solid block.
const WIDTHS = ['72%', '48%', '60%', '38%', '66%', '54%'];
export const Bar = ({ width, small }: { width: string; small?: boolean }) => <span className={'sk' + (small ? ' sm' : '')} style={{ width }} />;
export function SkeletonRows({ cols, rows = 4 }: { cols: number; rows?: number }) {

    return <>{Array.from({ length: rows }, (_, r) => <tr key={r} className="sk-row" aria-hidden="true">{Array.from({ length: cols }, (_, c) => <td key={c}><Bar width={WIDTHS[(r + c) % WIDTHS.length]} />{c === 0 && <Bar width="40%" small />}</td>)}</tr>)}</>;

}
export function SkeletonList({ rows = 4 }: { rows?: number }) {

    return <div aria-busy="true" aria-label="Cargando">{Array.from({ length: rows }, (_, r) => <div key={r} className="list-item" aria-hidden="true"><Bar width={WIDTHS[r % WIDTHS.length]} /><Bar width="35%" small /></div>)}</div>;

}
export function SkeletonPlates({ count = 6 }: { count?: number }) {

    return <section className="rack" aria-busy="true" aria-label="Cargando licencias">{Array.from({ length: count }, (_, i) => <div key={i} className="sk-plate" aria-hidden="true"><Bar width={WIDTHS[i % WIDTHS.length]} /><Bar width="45%" small /><span style={{ flex: 1 }} /><Bar width="30%" small /></div>)}</section>;

}

export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) { return <div className="empty"><h3>{title}</h3><p>{text}</p>{action}</div>; }
