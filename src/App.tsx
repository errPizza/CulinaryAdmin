import { useEffect, useState } from 'react';
import { KeyRound, LifeBuoy, LogOut, Network, PackageOpen, ShieldCheck } from 'lucide-react';
import * as api from './api';
import { Gate } from './gate';
import { Licenses } from './licenses';
import { Releases } from './releases';
import { Support } from './support';
import { Branches, Team } from './team';
import { ToastProvider, daysLeft, useLoad } from './ui';

const PAGES = [['licenses', 'Licencias', KeyRound], ['releases', 'Versiones', PackageOpen], ['support', 'Soporte', LifeBuoy], ['branches', 'Sucursales', Network], ['team', 'Equipo y seguridad', ShieldCheck]] as const;
type Page = typeof PAGES[number][0];

export function App() {

    const [user, setUser] = useState<string | null>(null), [checked, setChecked] = useState(false);
    useEffect(() => { api.watchSession(() => setUser(null)); if (!api.signedIn()) { setChecked(true); return; } api.me().then(r => setUser(r.admin.username)).catch(() => {}).finally(() => setChecked(true)); }, []);
    if (!checked) return null;
    return <ToastProvider>{user ? <Shell user={user} signOut={async () => { await api.logout(); setUser(null); }} /> : <Gate onSignedIn={setUser} />}</ToastProvider>;

}
function Shell({ user, signOut }: { user: string; signOut: () => void }) {

    const [page, setPage] = useState<Page>(() => (sessionStorage.getItem('culinary-admin.page') as Page) || 'licenses');
    const licenses = useLoad(api.licenses), open = useLoad(() => api.tickets('open'));
    const counts: Partial<Record<Page, [number, boolean]>> = {
        licenses: [licenses.data?.licenses.filter(l => l.status === 'expired' || (l.status === 'active' && l.expiresAt && daysLeft(l.expiresAt)! <= 7)).length ?? 0, true],
        support: [open.data?.tickets.length ?? 0, true],
    };
    const go = (p: Page) => { setPage(p); sessionStorage.setItem('culinary-admin.page', p); };
    return <div className="shell">
        <nav className="rail" aria-label="Secciones">
            <div className="brand"><span className="brand-mark"><KeyRound size={17} /></span><div><b>CulinaryAdmin</b><small>Panel del proveedor</small></div></div>
            {PAGES.map(([key, label, Icon]) => { const [n, alert] = counts[key] ?? [0, false]; return <button key={key} className="nav" aria-current={page === key ? 'page' : undefined} onClick={() => go(key)}><Icon size={17} />{label}{n > 0 && <span className={'count' + (alert ? ' alert' : '')} aria-label={n + ' pendientes'}>{n}</span>}</button>; })}
            <div className="rail-foot"><span>{user}</span><button className="btn quiet sm" onClick={signOut} aria-label="Cerrar sesión"><LogOut size={15} /></button></div>
        </nav>
        <main className="main">
            {page === 'licenses' && <Licenses />}
            {page === 'releases' && <Releases />}
            {page === 'support' && <Support changed={() => void open.reload()} />}
            {page === 'branches' && <Branches />}
            {page === 'team' && <Team me={user} />}
        </main>
    </div>;

}
