import { useEffect, useMemo, useState } from 'react';
import { Crown, Headset, KeyRound, Layers, LayoutDashboard, LogOut, ShieldCheck, Store, TrendingUp, TriangleAlert } from 'lucide-react';
import * as api from './api';
import logo from './assets/logo.png';
import { Faults } from './faults';
import { Gate } from './gate';
import { Licenses } from './licenses';
import { Owners } from './owners';
import { Releases } from './releases';
import { Revenue } from './revenue';
import { Summary } from './summary';
import { Support } from './support';
import { Branches, Team } from './team';
import { ShellContext, ToastProvider, needsRenewal, useLoad, type PageKey } from './ui';

const PAGES: [PageKey, string, typeof KeyRound][] = [['summary', 'Resumen', LayoutDashboard], ['licenses', 'Licencias', KeyRound], ['revenue', 'Ganancias', TrendingUp], ['releases', 'Versiones', Layers], ['support', 'Soporte', Headset], ['faults', 'Fallos', TriangleAlert], ['branches', 'Sucursales', Store], ['owners', 'Panel del dueño', Crown], ['team', 'Equipo y seguridad', ShieldCheck]];
const PAGE_KEYS = PAGES.map(p => p[0]);

export function App() {

    const [user, setUser] = useState<string | null>(null), [checked, setChecked] = useState(false);

    useEffect(() => { api.watchSession(() => setUser(null)); if (!api.signedIn()) { setChecked(true); return; } api.me().then(r => setUser(r.admin.username)).catch(() => {}).finally(() => setChecked(true)); }, []);

    if (!checked) return null;

    return <ToastProvider>{user ? <Shell user={user} signOut={async () => { await api.logout(); setUser(null); }} signedOut={() => setUser(null)} /> : <Gate onSignedIn={setUser} />}</ToastProvider>;
}

function Shell({ user, signOut, signedOut }: { user: string; signOut: () => void; signedOut: () => void }) {

    const [page, setPage] = useState<PageKey>(() => { const saved = sessionStorage.getItem('culinary-admin.page') as PageKey; return PAGE_KEYS.includes(saved) ? saved : 'summary'; });
    const [query, setQuery] = useState('');
    const licenses = useLoad(api.licenses), open = useLoad(() => api.tickets('open')), failing = useLoad(() => api.faults('open'));
    const counts: Partial<Record<PageKey, number>> = {

        licenses: licenses.data?.licenses.filter(needsRenewal).length ?? 0,
        support: open.data?.tickets.length ?? 0,
        faults: failing.data?.faults.length ?? 0

    };
    const go = (p: PageKey) => { setPage(p); sessionStorage.setItem('culinary-admin.page', p); };
    const alerts = (counts.support ?? 0) + (counts.faults ?? 0);
    const shell = useMemo(() => ({ go, query, setQuery, alerts }), [query, alerts]); // eslint-disable-line react-hooks/exhaustive-deps
    const changed = () => { void licenses.reload(); void open.reload(); void failing.reload(); };

    return <ShellContext.Provider value={shell}><div className="shell">

        <nav className="rail" aria-label="Secciones">

            <div className="brand"><img src={logo} alt="" /><b>Culinary</b><small>Admin</small></div>

            {PAGES.map(([key, label, Icon]) => { const n = counts[key] ?? 0; return <button key={key} className="nav" aria-current={page === key ? 'page' : undefined} onClick={() => go(key)}><Icon size={19} strokeWidth={1.9} />{label}{n > 0 && <span className="count alert" aria-label={n + ' pendientes'}>{n}</span>}</button>; })}

            <div className="rail-foot">
                <div className="me"><span className="avatar" aria-hidden="true">{user.slice(0, 2).toUpperCase()}</span><div style={{ minWidth: 0 }}><b>{user}</b><small>Administrador</small></div></div>
                <button className="out" onClick={signOut}><LogOut size={18} />Cerrar sesión</button>
            </div>

        </nav>

        <main className="main">

            {page === 'summary' && <Summary me={user} />}
            {page === 'licenses' && <Licenses changed={changed} />}
            {page === 'revenue' && <Revenue />}
            {page === 'releases' && <Releases />}
            {page === 'support' && <Support changed={changed} />}
            {page === 'faults' && <Faults changed={changed} />}
            {page === 'branches' && <Branches />}
            {page === 'owners' && <Owners me={user} />}
            {page === 'team' && <Team me={user} signedOut={signedOut} />}

        </main>

    </div></ShellContext.Provider>;
}
