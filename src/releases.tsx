import { useState } from 'react';
import { PenLine, Send, Upload } from 'lucide-react';
import * as api from './api';
import type { Release } from './api';
import { Dialog, Empty, SkeletonRows, State, day, useLoad, useSubmit, useToast } from './ui';

const PLATFORMS: Record<string, [string, string]> = { 'linux-x64': ['Servidor CulinaryOS', '.deb'], 'win-x64': ['Terminal Windows', '.exe'], 'android-arm64': ['Android', '.apk'] };
const size = (bytes: number | null) => bytes == null ? '—' : bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.ceil(bytes / 1024) + ' KB';

export function Releases() {

    const rel = useLoad(api.releases), pub = useLoad(api.publications), lic = useLoad(api.licenses);
    const [uploading, setUploading] = useState(false), [publishing, setPublishing] = useState<Release | null>(null), [signing, setSigning] = useState<Release | null>(null);
    const toast = useToast();
    const name = (id: string) => { const l = lic.data?.licenses.find(x => x.id === id); return l ? `${l.customer} · ${l.branchName}` : id.slice(0, 8); };
    const reload = () => { void rel.reload(); void pub.reload(); };
    
    return <div className="page">

        <div className="page-head"><h1>Versiones</h1><button className="btn primary" onClick={() => setUploading(true)}><Upload size={16} />Subir versión</button>
          
            <p>El panel sube el paquete y calcula su huella; la firma se hace en la estación de firma, fuera de línea, y se pega aquí. Una sucursal recibe la versión más nueva de su plataforma que alguna publicación vigente le dirija.</p></div>
       
        {(rel.error || pub.error) && <div className="error" role="alert">{rel.error || pub.error}</div>}
       
        <div className="panel table-scroll">{rel.data && !rel.data.releases.length ? <Empty title="Aún no hay versiones" text="Sube el primer paquete .deb, .exe o .apk." /> : <table><thead><tr><th>Versión</th><th>Plataforma</th><th>Archivo</th><th>Tamaño</th><th>Subida</th><th>Estado</th><th /></tr></thead><tbody>
         
            {!rel.data && !rel.error && <SkeletonRows cols={7} rows={3} />}
            {rel.data?.releases.map(r => <tr key={r.id}><td><div className="cell-main num">{r.version}</div><div className="cell-sub">{r.notes}</div></td><td>{PLATFORMS[r.platform]?.[0] ?? r.platform}</td><td><code>{r.filename}</code></td><td className="num">{size(r.bytes)}</td><td className="num">{day(r.createdAt)}</td><td><State value={r.status} /></td><td style={{ textAlign: 'right' }}>{r.status === 'ready' && <button className="btn sm" onClick={() => setPublishing(r)}><Send size={14} />Publicar</button>}{r.status === 'signing' && <button className="btn sm" onClick={() => setSigning(r)}><PenLine size={14} />Firmar</button>}</td></tr>)}</tbody></table>}</div>
      
        <div className="panel table-scroll"><div className="panel-head"><h2>Publicaciones</h2></div>{pub.data && !pub.data.publications.length ? <Empty title="Nada publicado" text="Publica una versión lista para todas las licencias o para algunas." /> : <table><thead><tr><th>Versión</th><th>Para</th><th>Desde</th><th>Estado</th><th /></tr></thead><tbody>
           
            {!pub.data && !pub.error && <SkeletonRows cols={5} rows={2} />}
            {pub.data?.publications.map(p => { const r = rel.data?.releases.find(x => x.id === p.releaseId); return <tr key={p.id}><td className="num cell-main">{r ? `${r.version} · ${PLATFORMS[r.platform]?.[0] ?? r.platform}` : p.releaseId.slice(0, 8)}</td><td>{p.target === 'all' ? 'Todas las licencias' : p.target.licenseIds.map(name).join(', ')}</td><td className="num">{day(p.createdAt)}</td><td><State value={p.withdrawnAt ? 'closed' : 'ready'} label={p.withdrawnAt ? 'Retirada ' + day(p.withdrawnAt) : 'Vigente'} /></td><td style={{ textAlign: 'right' }}>{!p.withdrawnAt && <button className="btn sm danger" onClick={async () => { await api.withdraw(p.id); toast('Publicación retirada'); reload(); }}>Retirar</button>}</td></tr>; })}</tbody></table>}</div>
        
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