import { useState } from 'react';
import { HardDrive, Layers, PackageOpen, PenLine, RadioTower, Send, ShieldCheck, Undo2, Upload, X } from 'lucide-react';
import * as api from './api';
import type { Release } from './api';
import { Card, Dialog, Empty, Kpi, Masthead, SkeletonRows, State, day, intent, moment, useLoad, useSubmit, useToast } from './ui';

export const PLATFORMS: Record<string, [string, string]> = { 'linux-x64': ['Servidor CulinaryOS', '.deb'], 'win-x64': ['Terminal Windows', '.exe'], 'android-arm64': ['Android', '.apk'] };
export const size = (bytes: number | null) => bytes == null ? '—' : bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.ceil(bytes / 1024) + ' KB';

export function Releases() {

    const rel = useLoad(api.releases), pub = useLoad(api.publications), lic = useLoad(api.licenses);
    const [uploading, setUploading] = useState(() => intent.take('upload') !== null), [publishing, setPublishing] = useState<Release | null>(null), [signing, setSigning] = useState<Release | null>(null);
    const [platform, setPlatform] = useState(''), [selected, setSelected] = useState<string | null>(null);
    const toast = useToast();
    const name = (id: string) => { const l = lic.data?.licenses.find(x => x.id === id); return l ? `${l.customer} · ${l.branchName}` : id.slice(0, 8); };
    const reload = () => { void rel.reload(); void pub.reload(); };
    const releases = rel.data?.releases ?? [], live = (pub.data?.publications ?? []).filter(p => !p.withdrawnAt);
    const liveFor = (id: string) => live.filter(p => p.releaseId === id);
    const shown = releases.filter(r => !platform || r.platform === platform);
    const current = releases.find(r => r.id === selected) ?? null;
    const newest = releases.find(r => liveFor(r.id).some(p => p.target === 'all'));
    const withdraw = async (id: string) => { await api.withdraw(id); toast('Publicación retirada'); reload(); };
    const action = (r: Release) => r.status === 'signing' ? <button className="btn sm" onClick={e => { e.stopPropagation(); setSigning(r); }}><PenLine size={14} />Firmar</button> : r.status === 'ready' ? <button className="btn sm" onClick={e => { e.stopPropagation(); setPublishing(r); }}><Send size={14} />Publicar</button> : null;

    return <div className="page">

        <Masthead title="Versiones" sub="Sube un paquete, fírmalo en la estación y decide a qué licencias llega."><button className="btn primary" onClick={() => setUploading(true)}><Upload size={17} />Subir versión</button></Masthead>

        {(rel.error || pub.error) && <div className="error" role="alert">{rel.error || pub.error}</div>}

        <div className="kpis">

            <Kpi tone="violet" icon={Layers} value={rel.data ? releases.filter(r => r.status === 'ready' && !liveFor(r.id).length).length : '—'} label="Listas para publicar" />
            <Kpi tone="teal" icon={RadioTower} value={newest ? newest.version : '—'} label={newest ? `${PLATFORMS[newest.platform]?.[0] ?? newest.platform} · a todas` : 'Nada publicado a todas'} chip={pub.data && <span className="chip flat">{live.length} vigentes</span>} />
            <Kpi tone="amber" icon={PenLine} value={rel.data ? releases.filter(r => r.status === 'signing').length : '—'} label="Falta firma" />
            <Kpi tone="blue" icon={HardDrive} value={rel.data ? size(releases.reduce((a, r) => a + (r.bytes ?? 0), 0)).split(' ')[0] : '—'} unit={rel.data ? size(releases.reduce((a, r) => a + (r.bytes ?? 0), 0)).split(' ')[1] : undefined} label="Paquetes guardados" />

        </div>

        <div className="with-side">

            <div className="grid">

                <Card icon={PackageOpen} tone="violet" title="Paquetes" sub="Una sucursal recibe la versión más nueva de su plataforma que alguna publicación vigente le dirija." actions={<div className="seg" role="group" aria-label="Filtrar por plataforma"><button aria-pressed={!platform} onClick={() => setPlatform('')}>Todas</button>{Object.entries(PLATFORMS).map(([k, [label]]) => <button key={k} aria-pressed={platform === k} onClick={() => setPlatform(k)}>{label}</button>)}</div>}>

                    <div className="panel-body">{rel.data && !shown.length ? <Empty title="Aún no hay versiones" text="Sube el primer paquete .deb, .exe o .apk." /> : <div className="table-wrap"><table><thead><tr><th>Versión</th><th>Plataforma</th><th>Archivo</th><th>Tamaño</th><th>Estado</th><th className="r"><span className="sr">Acciones</span></th></tr></thead><tbody>

                        {!rel.data && !rel.error && <SkeletonRows cols={6} rows={3} />}
                        {shown.map(r => { const p = liveFor(r.id); return <tr key={r.id} className="clickable" aria-selected={selected === r.id} onClick={() => setSelected(r.id)}><td><div className="cell-main num">{r.version}</div><div className="cell-sub">{day(r.createdAt)}</div></td><td>{PLATFORMS[r.platform]?.[0] ?? r.platform}</td><td><code className="cell-sub">{r.filename}</code></td><td className="num nowrap">{size(r.bytes)}</td><td>{p.length ? <State value="ready" label={p.some(x => x.target === 'all') ? 'Publicada · todas' : 'Publicada'} /> : <State value={r.status} />}</td><td className="r">{action(r)}</td></tr>; })}

                    </tbody></table></div>}</div>

                </Card>

                <Card icon={RadioTower} tone="teal" title="Publicaciones" sub="Retirar una deja de ofrecerla; quien ya la instaló la conserva.">

                    <div className="panel-body">{pub.data && !pub.data.publications.length ? <Empty title="Nada publicado" text="Publica una versión lista para todas las licencias o para algunas." /> : <div className="table-wrap"><table><thead><tr><th>Versión</th><th>Para</th><th>Desde</th><th>Estado</th><th className="r"><span className="sr">Acciones</span></th></tr></thead><tbody>

                        {!pub.data && !pub.error && <SkeletonRows cols={5} rows={2} />}
                        {pub.data?.publications.map(p => { const r = releases.find(x => x.id === p.releaseId); return <tr key={p.id}><td className="num cell-main nowrap">{r ? `${r.version} · ${PLATFORMS[r.platform]?.[0] ?? r.platform}` : p.releaseId.slice(0, 8)}</td><td>{p.target === 'all' ? 'Todas las licencias' : p.target.licenseIds.map(name).join(', ')}</td><td className="num nowrap">{day(p.createdAt)}</td><td><State value={p.withdrawnAt ? 'closed' : 'ready'} label={p.withdrawnAt ? 'Retirada ' + day(p.withdrawnAt) : 'Vigente'} /></td><td className="r">{!p.withdrawnAt && <button className="btn sm danger" onClick={() => void withdraw(p.id)}><Undo2 size={14} />Retirar</button>}</td></tr>; })}

                    </tbody></table></div>}</div>

                </Card>

            </div>

            {current ? <aside className="panel detail" aria-label={'Versión ' + current.version}>

                <header><div><div className="split-line"><span className="num cell-sub">{current.platform}</span>{liveFor(current.id).length ? <State value="ready" label="Publicada" /> : <State value={current.status} />}</div><h2 style={{ marginTop: 6 }}>{PLATFORMS[current.platform]?.[0] ?? current.platform} {current.version}</h2><p className="cell-sub">Subida el {moment(current.createdAt)}</p></div><button className="btn quiet sm icon close" onClick={() => setSelected(null)} aria-label="Cerrar"><X size={16} /></button></header>
                <section><h3>Notas para la sucursal</h3><p style={{ whiteSpace: 'pre-wrap' }}>{current.notes || <span className="cell-sub">Sin notas.</span>}</p></section>
                <section><dl className="facts"><dt>Archivo</dt><dd><code>{current.filename}</code></dd><dt>Tamaño</dt><dd>{size(current.bytes)}</dd><dt>SHA-512</dt><dd><code title={current.sha512 ?? ''}>{current.sha512 ? current.sha512.slice(0, 12) + '…' + current.sha512.slice(-6) : '—'}</code></dd></dl></section>
                <section><h3>Publicada para</h3>{liveFor(current.id).length ? liveFor(current.id).map(p => <div key={p.id} className="split-line"><span>{p.target === 'all' ? 'Todas las licencias' : p.target.licenseIds.map(name).join(', ')}</span><button className="btn sm danger" onClick={() => void withdraw(p.id)}><Undo2 size={14} />Retirar</button></div>) : <p className="cell-sub">{current.status === 'ready' ? 'Aún no se publica.' : current.status === 'signing' ? 'Fírmala en la estación antes de publicarla.' : 'Termina de subirla para firmarla.'}</p>}</section>
                <section><div className="buttons">{current.status === 'ready' && <button className="btn primary" style={{ gridColumn: '1 / -1' }} onClick={() => setPublishing(current)}><Send size={16} />Publicar</button>}{current.status === 'signing' && <button className="btn primary" style={{ gridColumn: '1 / -1' }} onClick={() => setSigning(current)}><ShieldCheck size={16} />Firmar</button>}</div></section>

            </aside> : <aside className="panel detail idle"><Empty title="Elige una versión" text="Aquí ves sus notas, su huella y a quién se le publicó." /></aside>}

        </div>

        {uploading && <UploadDialog close={() => setUploading(false)} done={() => { setUploading(false); reload(); toast('Paquete subido; fírmalo en la estación'); }} />}
        {signing && <SignDialog release={signing} close={() => setSigning(null)} done={() => { setSigning(null); reload(); toast('Versión firmada y lista para publicar'); }} />}
        {publishing && <PublishDialog release={publishing} licenses={lic.data?.licenses ?? []} close={() => setPublishing(null)} done={() => { setPublishing(null); reload(); toast('Versión publicada'); }} />}

    </div>;
}

function UploadDialog({ close, done }: { close: () => void; done: () => void }) {

    const [f, setF] = useState({ version: '', platform: 'win-x64', notes: '' }), [file, setFile] = useState<File | null>(null), [sent, setSent] = useState(0);
    const { busy, error, submit } = useSubmit();
    const ext = PLATFORMS[f.platform][1];
   
    return <Dialog title="Subir versión" onClose={close} busy={busy} footer={<><button className="btn quiet" onClick={close} disabled={busy}>Cancelar</button><button className="btn primary" form="upload" disabled={busy || !file}>{busy ? 'Subiendo…' : 'Subir'}</button></>}>
       
        <form id="upload" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={e => { e.preventDefault(); void submit(async () => { if (!file!.name.endsWith(ext)) throw new Error(`Para ${PLATFORMS[f.platform][0]} el archivo debe ser ${ext}`); await api.uploadRelease({ ...f, filename: file!.name }, file!, setSent); done(); }); }}>
           
            <div className="row"><label className="field">Versión<input className="input num" required pattern="\d{1,5}\.\d{1,5}\.\d{1,5}" placeholder="1.4.0" value={f.version} onChange={e => setF({ ...f, version: e.target.value })} autoFocus /></label>
                
                <label className="field">Plataforma<select className="input" value={f.platform} onChange={e => setF({ ...f, platform: e.target.value })}>{Object.entries(PLATFORMS).map(([k, [label, x]]) => <option key={k} value={k}>{label} ({x})</option>)}</select></label></div>
           
            <label className="field">Notas para la sucursal<textarea className="input" maxLength={2000} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></label>
            <label className="field">Paquete {ext}<input className="input" type="file" accept={ext} required onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>
            
            {busy && file && <div className="progress" role="progressbar" aria-valuenow={Math.round(sent / file.size * 100)} aria-valuemin={0} aria-valuemax={100}><div style={{ width: (sent / file.size * 100) + '%' }} /></div>}
            {error && <div className="error" role="alert">{error}</div>}
        
        </form>

    </Dialog>;
}

// The release key never reaches the panel or the Worker: the station signs the exact file and the panel only relays it.
function SignDialog({ release, close, done }: { release: Release; close: () => void; done: () => void }) {

    const [manifest, setManifest] = useState(''), { busy, error, submit } = useSubmit();
    const command = `node scripts/sign-release.mjs --file "${release.filename}" --release-id ${release.id} --version ${release.version} --platform ${release.platform}`;

    return <Dialog title={`Firmar ${release.version}`} onClose={close} busy={busy} footer={<><button className="btn quiet" onClick={close} disabled={busy}>Cancelar</button><button className="btn primary" form="sign" disabled={busy || manifest.trim().length < 40}>{busy ? 'Comprobando…' : 'Guardar firma'}</button></>}>

        <form id="sign" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={e => { e.preventDefault(); void submit(async () => { await api.signRelease(release.id, manifest.trim()); done(); }); }}>

            <p>En la estación de firma, desde la carpeta de CulinaryServer y con el mismo archivo que subiste, ejecuta:</p>
            <code className="station-command">{command}</code>
            <p>Huella SHA-512 esperada: <code className="station-command">{release.sha512}</code></p>
            <label className="field">Firma que imprimió la estación<textarea className="input" rows={5} required spellCheck={false} value={manifest} onChange={e => setManifest(e.target.value)} autoFocus /></label>
            {error && <div className="error" role="alert">{error}</div>}

        </form>

    </Dialog>;
}

function PublishDialog({ release, licenses, close, done }: { release: Release; licenses: api.License[]; close: () => void; done: () => void }) {

    const [scope, setScope] = useState<'all' | 'some'>('all'), [chosen, setChosen] = useState<string[]>([]), { busy, error, submit } = useSubmit();
    const eligible = licenses.filter(l => l.status !== 'revoked');
    
    return <Dialog title={`Publicar ${release.version}`} onClose={close} busy={busy} footer={<><button className="btn quiet" onClick={close} disabled={busy}>Cancelar</button><button className="btn primary" disabled={busy || (scope === 'some' && !chosen.length)} onClick={() => void submit(async () => { await api.publish(release.id, scope === 'all' ? 'all' : { licenseIds: chosen }); done(); })}>Publicar</button></>}>
      
        <div className="seg" role="group"><button aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Todas las licencias</button><button aria-pressed={scope === 'some'} onClick={() => setScope('some')}>Licencias elegidas</button></div>
      
        {scope === 'all' ? <p>Incluye las licencias que se creen después. Solo las que estén activas pueden descargarla.</p>
           
           : <div className="checks">{eligible.map(l => <label className="check" key={l.id}><input type="checkbox" checked={chosen.includes(l.id)} onChange={e => setChosen(e.target.checked ? [...chosen, l.id] : chosen.filter(x => x !== l.id))} />{l.customer} · {l.branchName}</label>)}</div>}
      
        {error && <div className="error" role="alert">{error}</div>}
        
    </Dialog>;
}