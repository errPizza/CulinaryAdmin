import { useEffect, useState } from 'react';
import { CalendarClock, ChartColumn, ChartPie, Check, Info, Repeat, ShieldAlert, Tags, Trophy, Wallet, Calculator } from 'lucide-react';
import * as api from './api';
import type { Addon, Prices } from './api';
import { Card, Empty, Kpi, Masthead, day, pesos, short, useLoad, useSubmit, useToast } from './ui';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const SERIES = [['lite', 'Lite', '#5b8def'], ['pro', 'Pro', '#e8c26a'], ['addons', 'Complementos', '#22c3a0'], ['permanent', 'De por vida', '#a37bff']] as const;
const MIX = [['proAnnual', 'Pro anual', '#e8c26a'], ['proMonthly', 'Pro mensual', '#c98f22'], ['liteAnnual', 'Lite anual', '#77a8ff'], ['liteMonthly', 'Lite mensual', '#3a6bd0'], ['addons', 'Complementos', '#22c3a0']] as const;
const EMPTY: Prices = { tiers: { lite: { monthly: 0, annual: 0, permanent: 0 }, pro: { monthly: 0, annual: 0, permanent: 0 } }, addons: { mobileOrdering: 0, deliveryHub: 0, webOrdering: 0 }, combos: { pyme: 0, delivery: 0 } };

/** A peso amount typed by hand, kept as text while editing and handed back in centavos. */
export function Money({ value, onChange, unit, label, autoFocus }: { value: number; onChange: (centavos: number) => void; unit?: string; label: string; autoFocus?: boolean }) {

    const format = (v: number) => v ? (v / 100).toLocaleString('es-MX', { minimumFractionDigits: v % 100 ? 2 : 0, maximumFractionDigits: 2 }) : '';
    const [text, setText] = useState(() => format(value));

    useEffect(() => { const parsed = Math.round(Number(text.replace(/[,\s$]/g, '')) * 100); if (parsed !== value) setText(format(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    return <label className="money"><span aria-hidden="true">$</span><input inputMode="decimal" aria-label={label} placeholder="0" value={text} autoFocus={autoFocus} onBlur={() => setText(format(value))} onChange={e => { const t = e.target.value; if (!/^[\d,.\s$]*$/.test(t)) return; setText(t); const n = Number(t.replace(/[,\s$]/g, '')); if (Number.isFinite(n)) onChange(Math.round(n * 100)); }} />{unit && <em>{unit}</em>}</label>;
}

export function Revenue() {

    const rev = useLoad(api.revenue), listed = useLoad(api.prices);
    const r = rev.data;
    const change = r && r.collected.lastMonth ? Math.round((r.collected.thisMonth - r.collected.lastMonth) / r.collected.lastMonth * 100) : null;
    const best = r?.top[0]?.monthly ?? 0;

    return <div className="page">

        <Masthead title="Ganancias" sub="Lo que dejan las licencias según los precios que tú pones. Montos en MXN, sin IVA." />

        {(rev.error || listed.error) && <div className="error" role="alert">{rev.error || listed.error}</div>}

        <div className="kpis">

            <Kpi tone="gold" icon={Repeat} value={r ? pesos(r.recurring.total) : '—'} label="Recurrente al mes" chip={r && <span className="chip flat">{r.recurring.payingLicenses} de pago</span>} series={r?.months.map(m => m.total)} />
            <Kpi tone="teal" icon={Wallet} value={r ? pesos(r.collected.thisMonth) : '—'} label="Cobrado este mes" chip={change !== null ? <span className={'chip ' + (change >= 0 ? 'up' : 'down')}>{change >= 0 ? '+' : ''}{change}%</span> : undefined} />
            <Kpi tone="blue" icon={Calculator} value={r ? pesos(r.recurring.perLicense) : '—'} label="Por licencia al mes" />
            <Kpi tone="red" icon={ShieldAlert} value={r ? pesos(r.atRisk.amount) : '—'} label="En riesgo a 30 días" chip={r && r.atRisk.licenses.length > 0 ? <span className="chip down">{r.atRisk.licenses.length}</span> : undefined} />

        </div>

        <div className="with-side" style={{ gridTemplateColumns: 'minmax(0, 1fr) 470px' }}>

            <div className="grid">

                <Card icon={ChartColumn} tone="gold" title="Ingresos por mes" sub="Lo cobrado al vender, renovar o cambiar de plan, por nivel." actions={<div className="legend">{SERIES.map(([, label, color]) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div>}>

                    <div className="panel-body">{r ? (r.months.some(m => m.total) ? <MonthChart months={r.months} /> : <Empty title="Aún no hay cobros" text={listed.data?.prices ? 'Se registran al crear, renovar o cambiar de plan una licencia de pago.' : 'Pon tus precios: desde entonces cada venta y renovación queda registrada.'} />) : <div style={{ height: 250 }} aria-busy="true" />}</div>

                </Card>

                <div className="two">

                    <Card icon={ChartPie} tone="blue" title="Mezcla del recurrente"><div className="panel-body">{r && r.recurring.total ? <Donut mix={r.recurring.mix} total={r.recurring.total} /> : <p className="cell-sub">Sin licencias de pago activas.</p>}</div></Card>

                    <Card icon={Trophy} tone="gold" title="Lo que más deja" actions={<span className="cell-sub">al mes</span>}>

                        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {r && !r.top.length && <p className="cell-sub">Sin licencias de pago activas.</p>}
                            {r?.top.map(t => <div key={t.tenantId}><div className="row" style={{ justifyContent: 'space-between', marginBottom: 6, flexWrap: 'nowrap' }}><span style={{ minWidth: 0, flex: 1 }}><span className="cell-main">{t.customer}</span> <span className="cell-sub">· {t.branches} {t.branches === 1 ? 'sucursal' : 'sucursales'}</span></span><span className="num" style={{ flex: 'none', minWidth: 0, color: 'var(--ink)' }}>{pesos(t.monthly)}</span></div><div className="bar-h"><i style={{ width: (t.monthly / best * 100) + '%' }} /></div></div>)}
                        </div>

                    </Card>

                </div>

                {r && r.atRisk.licenses.length > 0 && <Card icon={CalendarClock} tone="red" title="Vencen en 30 días" sub="Su siguiente periodo, si renuevan.">

                    <div className="panel-body"><div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Vence</th><th className="r">Siguiente periodo</th></tr></thead><tbody>{r.atRisk.licenses.map(l => <tr key={l.id}><td><div className="cell-main">{l.customer}</div><div className="cell-sub">{l.branchName}</div></td><td className="num nowrap">{day(l.expiresAt)}</td><td className="num r">{pesos(l.amount)}</td></tr>)}</tbody></table></div></div>

                </Card>}

            </div>

            {listed.data ? <PriceForm initial={listed.data.prices} updatedAt={listed.data.updatedAt} saved={() => { void listed.reload(); void rev.reload(); }} /> : <Card title="Precios de licencia"><div className="panel-body" style={{ height: 420 }} aria-busy="true" /></Card>}

        </div>

    </div>;
}

function MonthChart({ months }: { months: api.RevenueMonth[] }) {

    const W = 760, H = 250, L = 52, B = 28, T = 22, bw = 34, step = (W - L - 8) / months.length;
    const peak = Math.max(...months.map(m => m.total)), unit = 10 ** Math.floor(Math.log10(peak || 1)), max = Math.ceil(peak / unit / 2) * unit * 2 || 1;
    const y = (v: number) => T + (H - T - B) * (1 - v / max);
    const ticks = [0, .25, .5, .75, 1].map(f => f * max);

    return <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={'Ingresos por mes: ' + months.map(m => `${m.month} ${pesos(m.total)}`).join(', ')}>

        {ticks.map(v => <g key={v}><line x1={L} x2={W - 6} y1={y(v)} y2={y(v)} stroke="#2a2530" strokeDasharray={v ? '3 5' : undefined} /><text x={L - 10} y={y(v) + 4} fill="#6b6570" fontSize="11" textAnchor="end">{v ? short(v) : '0'}</text></g>)}
        {months.map((m, i) => {

            const x = L + step * i + (step - bw) / 2, last = i === months.length - 1;
            const parts = SERIES.map(([k, , color]) => [m[k], color] as const).filter(([v]) => v > 0);
            let acc = 0;

            return <g key={m.month}>
                {parts.map(([v, color], j) => { const y0 = y(acc), y1 = y(acc + v); acc += v; return <rect key={color} x={x} y={y1 + 1} width={bw} height={Math.max(0, y0 - y1 - 1.5)} rx={j === parts.length - 1 ? 5 : 1.5} fill={color} opacity={last ? 1 : .8}><title>{pesos(v)}</title></rect>; })}
                <text x={x + bw / 2} y={H - 8} fill={last ? '#f3f0ea' : '#948e98'} fontSize="11.5" fontWeight={last ? 700 : 500} textAnchor="middle">{MONTHS[Number(m.month.slice(5)) - 1]}</text>
                {last && m.total > 0 && <text x={x + bw / 2} y={y(m.total) - 8} fill="#f3f0ea" fontSize="12" fontWeight="700" textAnchor="middle">{short(m.total)}</text>}
            </g>;

        })}

    </svg>;
}

function Donut({ mix, total }: { mix: api.Revenue['recurring']['mix']; total: number }) {

    const r = 62, c = 2 * Math.PI * r;
    let offset = 0;

    return <div className="row" style={{ gap: 18, alignItems: 'center', flexWrap: 'nowrap' }}>

        <svg viewBox="0 0 170 170" width="150" height="150" style={{ flex: 'none', minWidth: 0 }} role="img" aria-label="Mezcla del recurrente">
            <circle cx="85" cy="85" r={r} fill="none" stroke="#221e28" strokeWidth="20" />
            {MIX.map(([k, , color]) => { const len = c * mix[k] / total; const el = len > 0 && <circle key={k} cx="85" cy="85" r={r} fill="none" stroke={color} strokeWidth="20" strokeDasharray={`${Math.max(0, len - 2)} ${c - len + 2}`} strokeDashoffset={-offset} transform="rotate(-90 85 85)" />; offset += len; return el; })}
            <text x="85" y="80" textAnchor="middle" fill="#948e98" fontSize="11">por mes</text>
            <text x="85" y="101" textAnchor="middle" fill="#f3f0ea" fontSize="20" fontWeight="800">{short(total)}</text>
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, minWidth: 0 }}>{MIX.map(([k, label, color]) => <div key={k} className="row" style={{ gap: 8, fontSize: 13, flexWrap: 'nowrap', alignItems: 'center' }}><i style={{ flex: 'none', minWidth: 0, width: 10, height: 10, borderRadius: 3, background: color }} /><span style={{ minWidth: 0 }}>{label}</span><span className="num" style={{ marginLeft: 'auto', flex: 'none', minWidth: 0, color: 'var(--ink)' }}>{Math.round(mix[k] / total * 100)}%</span></div>)}</div>

    </div>;
}

function PriceForm({ initial, updatedAt, saved }: { initial: Prices | null; updatedAt: string | null; saved: () => void }) {

    const [p, setP] = useState<Prices>(initial ?? EMPTY);
    const { busy, error, submit } = useSubmit(), toast = useToast();
    const dirty = JSON.stringify(p) !== JSON.stringify(initial ?? EMPTY);
    const tier = (t: 'lite' | 'pro', k: keyof api.TierPrices) => (v: number) => setP({ ...p, tiers: { ...p.tiers, [t]: { ...p.tiers[t], [k]: v } } });

    return <Card icon={Tags} tone="red" title="Precios de licencia" sub={updatedAt ? `Vigentes desde el ${day(updatedAt)}.` : 'Aún no hay precios: con ellos se registra cada cobro.'}>

        <form className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={e => { e.preventDefault(); void submit(async () => { await api.savePrices(p); toast('Precios guardados; cuentan desde hoy'); saved(); }); }}>

            <div className="prices">
                <span className="h">Nivel</span><span className="h">Al mes</span><span className="h">Al año</span><span className="h">De por vida</span>
                {(['lite', 'pro'] as const).map(t => <div key={t} style={{ display: 'contents' }}><span className={'tag ' + t} style={{ justifySelf: 'start' }}>{api.TIERS[t].label}</span><Money label={`${api.TIERS[t].label} mensual`} value={p.tiers[t].monthly} onChange={tier(t, 'monthly')} /><Money label={`${api.TIERS[t].label} anual`} value={p.tiers[t].annual} onChange={tier(t, 'annual')} /><Money label={`${api.TIERS[t].label} de por vida`} value={p.tiers[t].permanent} onChange={tier(t, 'permanent')} /></div>)}
            </div>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 14, borderTop: '1px solid var(--line)' }}><h3>Complementos <span className="cell-sub" style={{ fontWeight: 500 }}>· por sucursal al mes</span></h3>
                <div className="price-rows">{(Object.keys(api.ADDONS) as Addon[]).map(a => <div key={a} style={{ display: 'contents' }}><span>{api.ADDONS[a]}</span><Money label={api.ADDONS[a]} value={p.addons[a]} onChange={v => setP({ ...p, addons: { ...p.addons, [a]: v } })} unit="/mes" /></div>)}</div>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 14, borderTop: '1px solid var(--line)' }}><h3>Combos <span className="cell-sub" style={{ fontWeight: 500 }}>· en plan mensual</span></h3>
                <div className="price-rows">{api.COMBOS.map(c => <div key={c.id} style={{ display: 'contents' }}><span>{c.label.replace('Combo ', '')} <span className="cell-sub">· {api.TIERS[c.tier].label} + {c.addons.map(a => api.ADDONS[a]).join(' + ')}</span></span><Money label={c.label} value={p.combos[c.id]} onChange={v => setP({ ...p, combos: { ...p.combos, [c.id]: v } })} unit="/mes" /></div>)}</div>
            </section>

            <div className="note"><Info size={16} /><p>Cuenta desde que guardas: lo ya cobrado conserva su precio. Anual = nivel anual + complementos × 12; de por vida es un pago del nivel. Las pruebas no cobran.</p></div>
            {error && <div className="error" role="alert">{error}</div>}

            <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}><button type="button" className="btn quiet" style={{ flex: 'none' }} disabled={!dirty || busy} onClick={() => setP(initial ?? EMPTY)}>Descartar</button><button className="btn primary" style={{ flex: 'none' }} disabled={!dirty || busy}><Check size={17} />{busy ? 'Guardando…' : 'Guardar precios'}</button></div>

        </form>

    </Card>;
}
