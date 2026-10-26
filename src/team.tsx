import { useState } from 'react';
import { KeyRound, UserPlus, UserX } from 'lucide-react';
import * as api from './api';
import { NewPassword } from './gate';
import { Bar, Dialog, Empty, Secret, SkeletonRows, State, day, moment, useLoad, useSubmit, useToast } from './ui';

const detailText = (d: unknown): string => d == null ? '' : typeof d !== 'object' ? String(d) : Array.isArray(d) ? d.map(detailText).join(', ') : Object.entries(d).map(([k, v]) => `${k}: ${detailText(v)}`).join(' · ');

export function Branches() {

    const { data, error } = useLoad(api.registry);
    const [shown, setShown] = useState<api.Branch | null>(null);

    return <div className="page">
       
        <div className="page-head"><h1>Sucursales</h1><p>Sucursales con su certificado mTLS para la central multiempresa. Las credenciales del dueño no pasan por aquí.</p></div>
        
        {error && <div className="error" role="alert">{error}</div>}
        
        <div className="panel table-scroll">{data && !data.branches.length ? <Empty title="Sin sucursales registradas" text="Una sucursal aparece cuando activa su licencia y registra su certificado." /> : <table><thead><tr><th>Empresa</th><th>Sucursal</th><th>Sitio</th><th>Certificado</th><th>Licencia</th><th /></tr></thead><tbody>
          
            {!data && !error && <SkeletonRows cols={6} rows={3} />}
            {data?.branches.map(b => <tr key={b.branchId}><td><div className="cell-main">{b.tenantName}</div><div className="cell-sub"><code>{b.tenantId}</code></div></td><td>{b.branchName}</td><td><code>{b.siteId}</code></td><td>{b.certificateSha256 ? <code>{b.certificateSha256.slice(0, 12)}…</code> : <span className="cell-sub">Sin registrar</span>}</td><td><State value={b.licenseStatus} /></td><td style={{ textAlign: 'right' }}><button className="btn sm" disabled={!b.certificateSha256} onClick={() => setShown(b)}>Datos de aprovisionamiento</button></td></tr>)}</tbody></table>}</div>
        
        {shown && <Dialog title="Aprovisionar en la central" onClose={() => setShown(null)}><p>Completa la contraseña y el código de alta del dueño y ejecuta <code>MesaNexo.Central --provision-tenant archivo.json</code>.</p>
           
        <pre className="snippet">{JSON.stringify({ tenantId: shown.tenantId, tenantName: shown.tenantName, branchId: shown.branchId, branchName: shown.branchName, siteId: shown.siteId, slug: shown.slug, certificateSha256: shown.certificateSha256, ownerName: '', ownerUsername: '', ownerPassword: '', ownerEnrollmentCode: '' }, null, 2)}</pre></Dialog>}
    
    </div>;
}

export function Team({ me, signedOut }: { me: string; signedOut: () => void }) {

    const admins = useLoad(api.admins), root = useLoad(api.rootKey), log = useLoad(() => api.audit());
    const [invited, setInvited] = useState<{ code: string; expiresAt: string } | null>(null), [removing, setRemoving] = useState<api.Admin | null>(null), [changing, setChanging] = useState(false);
    const { busy, error, submit } = useSubmit(), toast = useToast();
    
    return <div className="page">

        <div className="page-head"><h1>Equipo y seguridad</h1><button className="btn" onClick={() => setChanging(true)}><KeyRound size={16} />Cambiar contraseña</button><button className="btn primary" disabled={busy} onClick={() => void submit(async () => setInvited(await api.invite(me)))}><UserPlus size={16} />Invitar a otro equipo</button>
           
            <p>Cada cuenta es un equipo con su llave. Para usar otra computadora, invítala y borra la cuenta anterior.</p></div>
       
        {(error || admins.error) && <div className="error" role="alert">{error || admins.error}</div>}
       
        <div className="panel table-scroll"><table><thead><tr><th>Usuario</th><th>Equipo</th><th>Llave</th><th>Desde</th><th>Estado</th><th /></tr></thead><tbody>
            
            {!admins.data && !admins.error && <SkeletonRows cols={6} rows={2} />}
            {admins.data?.admins.map(a => <tr key={a.id}><td className="cell-main">{a.username}{a.username === me && <span className="cell-sub"> · tú</span>}</td><td>{a.deviceName}</td><td><code>{a.keyAlg}</code></td><td className="num">{day(a.createdAt)}</td><td><State value={a.active ? 'active' : 'pending'} label={a.active ? 'Activa' : 'Sin confirmar'} /></td><td style={{ textAlign: 'right' }}>{a.username !== me && <button className="btn sm danger" onClick={() => setRemoving(a)}><UserX size={14} />Borrar</button>}</td></tr>)}</tbody></table></div>
       
        <div className="panel"><div className="panel-head"><h2>Llave raíz pública</h2>{root.data && <code>kid {root.data.kid}</code>}</div><div className="panel-body"><p className="cell-sub" style={{ marginBottom: 10 }}>Es la que Culinary Restaurant lleva incrustada al compilar (tools/build.ps1 -RootPublicKey). La privada vive solo en el worker.</p>{root.error ? <div className="error">{root.error}</div> : root.data ? <pre className="snippet">{root.data.pem}</pre> : <div className="snippet" aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><Bar width="55%" /><Bar width="92%" small /><Bar width="80%" small /><Bar width="50%" /></div>}</div></div>
        <div className="panel table-scroll"><div className="panel-head"><h2>Bitácora</h2></div>{log.error ? <div className="panel-body"><div className="error">{log.error}</div></div> : log.data && !log.data.entries.length ? <Empty title="Sin movimientos" text="Aquí queda cada cambio hecho desde el panel." /> : <table><thead><tr><th>Cuándo</th><th>Quién</th><th>Acción</th><th>Sobre</th><th>Detalle</th></tr></thead><tbody>
         
            {!log.data && <SkeletonRows cols={5} />}
            {log.data?.entries.map(e => <tr key={e.id}><td className="num">{moment(e.at)}</td><td>{admins.data?.admins.find(a => a.id === e.adminId)?.username ?? e.adminId?.slice(0, 8) ?? 'Sistema'}</td><td><code>{e.action}</code></td><td><code>{e.target?.slice(0, 13)}</code></td><td className="cell-sub">{detailText(e.detail)}</td></tr>)}</tbody></table>}</div>
       
        {changing && <Dialog title="Cambiar contraseña" onClose={() => setChanging(false)}><p>Confirma con el código de tu app autenticadora. Al guardar se cierran todas tus sesiones y vuelves a entrar con la contraseña nueva.</p><NewPassword username={me} done={() => { setChanging(false); signedOut(); }} /></Dialog>}
        {invited && <Dialog title="Invitación creada" onClose={() => setInvited(null)} footer={<button className="btn primary" onClick={() => setInvited(null)}>Listo</button>}><p>Úsala en la otra computadora, en «Dar de alta este equipo». Sirve una vez y vence el {moment(invited.expiresAt)}.</p><Secret label="Código de invitación" value={invited.code} /></Dialog>}
        {removing && <Dialog title={`Borrar a ${removing.username}`} onClose={() => setRemoving(null)} busy={busy} footer={<><button className="btn quiet" onClick={() => setRemoving(null)}>Cancelar</button><button className="btn primary" disabled={busy} onClick={() => void submit(async () => { await api.removeAdmin(me, removing.id); setRemoving(null); toast('Cuenta borrada'); void admins.reload(); })}>Borrar cuenta</button></>}><p>El equipo «{removing.deviceName}» dejará de poder entrar al panel. Esta acción se firma con la llave de este equipo.</p>{error && <div className="error">{error}</div>}</Dialog>}
    
    </div>;
}
