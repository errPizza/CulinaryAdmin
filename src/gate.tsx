import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { KeyRound } from 'lucide-react';
import * as api from './api';
import { Secret, useSubmit } from './ui';

type Step = { kind: 'server' } | { kind: 'login'; username: string } | { kind: 'reset'; username: string } | { kind: 'enroll' } | { kind: 'totp'; username: string; secret: string; uri: string };

// Three factors: this computer's key (WebCrypto, never exported), the password and the authenticator code.
export function Gate({ onSignedIn }: { onSignedIn: (username: string) => void }) {

    const [step, setStep] = useState<Step | null>(null);
    useEffect(() => { void (async () => { const device = await api.readDevice(); setStep(!api.serverUrl() ? { kind: 'server' } : device ? { kind: 'login', username: device.username } : { kind: 'enroll' }); })(); }, []);
    return <div className="gate">
        <aside className="gate-art" aria-hidden="true">
            <div className="brand"><span className="brand-mark"><KeyRound size={17} /></span><div><b>Culinary Admin</b><small>Panel del proveedor</small></div></div>
            <div><h1>Cada licencia, en su gancho.</h1><p>Emite, renueva y retira las licencias de tus clientes, atiende su soporte y publica actualizaciones desde un solo lugar.</p></div>
            <div className="gate-rack">{['', 'lit', '', 'out', '', '', 'out', ''].map((c, i) => <span key={i} className={c} />)}</div>
        </aside>
        <main className="gate-form">{step?.kind === 'server' && <Server next={() => void api.readDevice().then(d => setStep(d ? { kind: 'login', username: d.username } : { kind: 'enroll' }))} />}
            {step?.kind === 'login' && <Login username={step.username} onSignedIn={onSignedIn} other={() => setStep({ kind: 'enroll' })} server={() => setStep({ kind: 'server' })} forgot={() => setStep({ kind: 'reset', username: step.username })} />}
            {step?.kind === 'reset' && <><div><h2 style={{ fontSize: 22 }}>Nueva contraseña</h2><p style={{ color: 'var(--muted)', marginTop: 6 }}>La llave de este equipo y el código de tu app autenticadora confirman que eres <b style={{ color: 'var(--ink)' }}>{step.username}</b>.</p></div>
                <NewPassword username={step.username} done={() => setStep({ kind: 'login', username: step.username })} />
                <div className="links"><button className="btn quiet sm" onClick={() => setStep({ kind: 'login', username: step.username })}>Volver a iniciar sesión</button></div></>}
            {step?.kind === 'enroll' && <Enroll next={(username, secret, uri) => setStep({ kind: 'totp', username, secret, uri })} back={() => void api.readDevice().then(d => d && setStep({ kind: 'login', username: d.username }))} />}
            {step?.kind === 'totp' && <Confirm {...step} done={() => setStep({ kind: 'login', username: step.username })} />}
        </main>
    </div>;

}
function Server({ next }: { next: () => void }) {

    const [url, setUrl] = useState(api.serverUrl() || 'https://'), { busy, error, submit } = useSubmit();
    return <><div><h2 style={{ fontSize: 22 }}>Conecta con CulinaryServer</h2><p style={{ color: 'var(--muted)', marginTop: 6 }}>La dirección HTTPS de tu worker, por ejemplo https://culinary-server.tu-cuenta.workers.dev.</p></div>
        <form onSubmit={e => { e.preventDefault(); void submit(async () => { const parsed = new URL(url); if (parsed.protocol !== 'https:' && parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') throw new Error('Usa una dirección HTTPS'); api.setServerUrl(parsed.origin); next(); }); }}>
            <label className="field">Dirección de CulinaryServer<input className="input" value={url} onChange={e => setUrl(e.target.value)} required autoFocus spellCheck={false} /></label>
            {error && <div className="error" role="alert">{error}</div>}
            <button className="btn primary" disabled={busy}>Continuar</button>
        </form></>;

}
// Also used from «Equipo y seguridad» to change the password; either way every session closes afterwards.
export function NewPassword({ username, done }: { username: string; done: () => void }) {

    const [f, setF] = useState({ password: '', confirm: '', totp: '' }), { busy, error, submit } = useSubmit();
    const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
    return <form style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={e => { e.preventDefault(); void submit(async () => { if (f.password !== f.confirm) throw new Error('Las contraseñas no coinciden'); await api.resetPassword(username, f.totp.replace(/\s/g, ''), f.password); done(); }).then(ok => { if (!ok) setF(v => ({ ...v, totp: '' })); }); }}>
        <div className="row"><label className="field">Contraseña nueva<small>Mínimo 12 caracteres</small><input className="input" type="password" minLength={12} value={f.password} onChange={set('password')} required autoFocus autoComplete="new-password" /></label><label className="field">Repítela<small>&nbsp;</small><input className="input" type="password" value={f.confirm} onChange={set('confirm')} required autoComplete="new-password" /></label></div>
        <label className="field">Código de 6 dígitos<input className="input num" inputMode="numeric" pattern="[0-9 ]{6,7}" value={f.totp} onChange={set('totp')} required autoComplete="one-time-code" /></label>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
    </form>;

}
function Login({ username, onSignedIn, other, server, forgot }: { username: string; onSignedIn: (u: string) => void; other: () => void; server: () => void; forgot: () => void }) {

    const [password, setPassword] = useState(''), [totp, setTotp] = useState(''), { busy, error, submit } = useSubmit();
    return <><div><h2 style={{ fontSize: 22 }}>Inicia sesión</h2><p style={{ color: 'var(--muted)', marginTop: 6 }}>Este equipo firma por <b style={{ color: 'var(--ink)' }}>{username}</b>. Escribe tu contraseña y el código de tu app autenticadora.</p></div>
        <form onSubmit={e => { e.preventDefault(); void submit(async () => { await api.login(username, password, totp.replace(/\s/g, '')); setPassword(''); onSignedIn(username); }).then(ok => { if (!ok) setTotp(''); }); }}>
            <label className="field">Contraseña<input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus autoComplete="current-password" /></label>
            <label className="field">Código de 6 dígitos<input className="input num" inputMode="numeric" pattern="[0-9 ]{6,7}" value={totp} onChange={e => setTotp(e.target.value)} required autoComplete="one-time-code" /></label>
            {error && <div className="error" role="alert">{error}</div>}
            <button className="btn primary" disabled={busy}>{busy ? 'Comprobando…' : 'Entrar'}</button>
        </form>
        <div className="links"><button className="btn quiet sm" onClick={forgot}>Olvidé mi contraseña</button><button className="btn quiet sm" onClick={other}>Dar de alta otra cuenta en este equipo</button><button className="btn quiet sm" onClick={server}>Cambiar servidor</button></div></>;

}
function Enroll({ next, back }: { next: (username: string, secret: string, uri: string) => void; back: () => void }) {

    const [f, setF] = useState({ code: '', username: '', password: '', confirm: '', deviceName: 'Oficina' }), { busy, error, submit } = useSubmit();
    const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
    return <><div><h2 style={{ fontSize: 22 }}>Da de alta este equipo</h2><p style={{ color: 'var(--muted)', marginTop: 6 }}>Cada cuenta vive en un solo equipo. La primera usa el código de alta del worker; las demás, una invitación.</p></div>
        <form onSubmit={e => { e.preventDefault(); void submit(async () => { if (f.password !== f.confirm) throw new Error('Las contraseñas no coinciden'); const reply = await api.enroll({ code: f.code.trim(), username: f.username.trim(), password: f.password, deviceName: f.deviceName.trim() }); next(f.username.trim(), reply.totp.secret, reply.totp.uri); }); }}>
            <label className="field">Código de alta o invitación<input className="input num" value={f.code} onChange={set('code')} required autoFocus spellCheck={false} autoComplete="off" /></label>
            <div className="row"><label className="field">Usuario<small>Minúsculas, números, punto o guion</small><input className="input" value={f.username} onChange={set('username')} required pattern="[a-z0-9._\-]{3,32}" autoComplete="username" /></label><label className="field">Nombre del equipo<small>Para reconocerlo después</small><input className="input" value={f.deviceName} onChange={set('deviceName')} required maxLength={100} /></label></div>
            <div className="row"><label className="field">Contraseña<small>Mínimo 12 caracteres</small><input className="input" type="password" minLength={12} value={f.password} onChange={set('password')} required autoComplete="new-password" /></label><label className="field">Repite la contraseña<small>&nbsp;</small><input className="input" type="password" value={f.confirm} onChange={set('confirm')} required autoComplete="new-password" /></label></div>
            {error && <div className="error" role="alert">{error}</div>}
            <button className="btn primary" disabled={busy}>{busy ? 'Creando la llave del equipo…' : 'Dar de alta'}</button>
        </form>
        <div className="links"><button className="btn quiet sm" onClick={back}>Ya tengo cuenta en este equipo</button></div></>;

}
function Confirm({ username, secret, uri, done }: { username: string; secret: string; uri: string; done: () => void }) {

    const [qr, setQr] = useState(''), [totp, setTotp] = useState(''), { busy, error, submit } = useSubmit();
    useEffect(() => { void QRCode.toDataURL(uri, { margin: 0, width: 360 }).then(setQr); }, [uri]);
    return <><div><h2 style={{ fontSize: 22 }}>Vincula tu app autenticadora</h2><p style={{ color: 'var(--muted)', marginTop: 6 }}>Escanea el código con Google Authenticator, 1Password o similar. Solo se muestra esta vez.</p></div>
        <div className="qr">{qr && <img src={qr} alt="Código QR para la app autenticadora" />}</div>
        <Secret label="O escribe la clave a mano" value={secret} />
        <form onSubmit={e => { e.preventDefault(); void submit(async () => { await api.confirmEnrollment(username, totp.replace(/\s/g, '')); done(); }); }}>
            <label className="field">Código que muestra la app<input className="input num" inputMode="numeric" value={totp} onChange={e => setTotp(e.target.value)} required autoComplete="one-time-code" /></label>
            {error && <div className="error" role="alert">{error}</div>}
            <button className="btn primary" disabled={busy}>Confirmar</button>
        </form></>;

}
