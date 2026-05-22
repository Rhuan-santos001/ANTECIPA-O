import { useState, useEffect, useRef } from "react";

// ─── STORAGE KEYS (shared = todos users veem o mesmo) ─────────────
const SK = {
  produtos: "ecv6_produtos",
  users:    "ecv6_users",
  caps:     "ecv6_caps",
  hist:     "ecv6_hist",
};

// ─── DEFAULTS ─────────────────────────────────────────────────────
const DEFAULT_USERS = [
  { id:1, user:"admin",    pass:"admin123",  role:"admin",  active:true },
  { id:2, user:"producao", pass:"prod123",   role:"editor", active:true },
  { id:3, user:"viewer",   pass:"view123",   role:"viewer", active:true },
];
const SETORES = ["CORTE","COLADEIRA","USINAGEM","FURADEIRA","PINTURA"];
const CAPS_DEFAULT = { CORTE:500, COLADEIRA:400, USINAGEM:1000, FURADEIRA:1000, PINTURA:500 };
const ROLES = ["admin","editor","viewer"];
const STATUS_OPTS = ["AGUARDANDO","PRODUCAO","FINALIZADA"];
const SC = {
  AGUARDANDO: { bg:"#d97706", dot:"#fbbf24", text:"#fff" },
  PRODUCAO:   { bg:"#16a34a", dot:"#4ade80", text:"#fff" },
  FINALIZADA: { bg:"#2563eb", dot:"#60a5fa", text:"#fff" },
};
const SETOR_COLORS = {
  CORTE:     "#3b82f6",
  COLADEIRA: "#8b5cf6",
  USINAGEM:  "#06b6d4",
  FURADEIRA: "#f59e0b",
  PINTURA:   "#ec4899",
};
const DIAS_PT = ["DOM","SEG","TER","QUA","QUI","SEX","SAB"];

// ─── HELPERS ──────────────────────────────────────────────────────
let nid = 100, uid = 10;
function today(){ return new Date().toISOString().slice(0,10); }
function addDias(dateStr, n){
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}
function addWorkdays(dateStr, days){
  let d = new Date(dateStr+"T00:00:00"), added = 0;
  while(added < days){ d.setDate(d.getDate()+1); if(d.getDay()!==0&&d.getDay()!==6)added++; }
  return d.toISOString().slice(0,10);
}
function fmtBR(iso){ if(!iso)return"-"; const d=new Date(iso+"T00:00:00"); return d.toLocaleDateString("pt-BR"); }
function diaSem(iso){ const d=new Date(iso+"T00:00:00"); return DIAS_PT[d.getDay()]; }
function isWeekend(iso){ const d=new Date(iso+"T00:00:00"); return d.getDay()===0||d.getDay()===6; }
function isLate(iso){ if(!iso)return false; return new Date(iso+"T00:00:00")<new Date(); }
function isoRange(start, end){
  const res=[], d=new Date(start+"T00:00:00"), e=new Date(end+"T00:00:00");
  while(d<=e){ res.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1); }
  return res;
}

// Calcula previsão sequencial por setor
function calcPrevisoes(produto, caps){
  if(!produto.inicioCorte) return {};
  const prev = {};
  let dataAtual = produto.inicioCorte;
  for(const s of SETORES){
    const cap = caps[s] || 300;
    const qtd = parseInt(produto.qtdPecas) || 0;
    const dias = Math.max(1, Math.ceil(qtd / cap));
    const fim = addWorkdays(dataAtual, dias);
    prev[s] = { inicio: dataAtual, fim };
    dataAtual = addDias(fim, 1); // próximo setor começa no dia seguinte
  }
  return prev;
}

// ─── STORAGE ──────────────────────────────────────────────────────
async function sget(k, shared=true){ try{ const r=await window.storage.get(k, shared); return r?.value?JSON.parse(r.value):null; }catch{ return null; } }
async function sset(k, v, shared=true){ try{ await window.storage.set(k, JSON.stringify(v), shared); }catch{} }

// ═══════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════
function LoginScreen({ users, onLogin }){
  const[u,setU]=useState(""), [p,setP]=useState(""), [err,setErr]=useState("");
  function go(){
    const f=users.find(x=>x.user===u.trim()&&x.pass===p&&x.active);
    if(f) onLogin(f); else setErr("Usuário ou senha incorretos.");
  }
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a0f1e,#0f172a)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>
      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:16,padding:"42px 46px",width:330,boxShadow:"0 32px 80px rgba(0,0,0,.7)"}}>
        <div style={{textAlign:"center",marginBottom:30}}>
          <div style={{width:11,height:11,borderRadius:"50%",background:"#3b82f6",boxShadow:"0 0 14px #3b82f6",margin:"0 auto 14px"}}/>
          <div style={{fontSize:11,color:"#64748b",letterSpacing:3,marginBottom:5}}>SISTEMA DE CONTROLE</div>
          <div style={{fontSize:22,fontWeight:700,color:"#f1f5f9"}}>ESTUDO CURVAS</div>
        </div>
        {[["USUÁRIO","text",u,setU],["SENHA","password",p,setP]].map(([lbl,t,v,s])=>(
          <div key={lbl} style={{marginBottom:16}}>
            <label style={{fontSize:11,color:"#64748b",letterSpacing:1,display:"block",marginBottom:6}}>{lbl}</label>
            <input type={t} value={v} onChange={e=>{setErr("");s(e.target.value);}} onKeyDown={e=>e.key==="Enter"&&go()}
              style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,color:"#e2e8f0",padding:"10px 13px",fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
          </div>
        ))}
        {err&&<div style={{background:"#7f1d1d",color:"#fca5a5",borderRadius:7,padding:"9px 13px",fontSize:12,marginBottom:14,textAlign:"center"}}>{err}</div>}
        <button onClick={go} style={{width:"100%",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",border:"none",borderRadius:9,color:"#fff",padding:12,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:1}}>ENTRAR</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL USUARIOS
// ═══════════════════════════════════════════════════════════════════
function UsersModal({ users, setUsers, onClose }){
  const[form,setForm]=useState({user:"",pass:"",role:"editor",active:true});
  const[editing,setEditing]=useState(null);
  const[err,setErr]=useState("");
  function save(){
    if(!form.user.trim()||!form.pass.trim()){setErr("Preencha usuario e senha.");return;}
    if(editing!=null){ setUsers(p=>p.map(u=>u.id===editing?{...u,...form}:u)); }
    else{
      if(users.find(u=>u.user===form.user.trim())){setErr("Já existe.");return;}
      setUsers(p=>[...p,{id:uid++,...form,user:form.user.trim()}]);
    }
    setForm({user:"",pass:"",role:"editor",active:true});setEditing(null);setErr("");
  }
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400}}>
      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:14,width:520,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,.8)"}}>
        <div style={{padding:"18px 24px",borderBottom:"1px solid #1e293b",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#f1f5f9"}}>GESTÃO DE USUÁRIOS</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{overflowY:"auto",padding:"16px 24px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"#1e293b",borderRadius:10,padding:"16px",border:"1px solid #334155"}}>
            <div style={{fontSize:11,color:"#64748b",letterSpacing:2,marginBottom:12}}>{editing!=null?"EDITAR":"NOVO USUÁRIO"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              {[["USUÁRIO","user","text"],["SENHA","pass","password"]].map(([lbl,k,t])=>(
                <div key={k}>
                  <label style={{fontSize:10,color:"#64748b",display:"block",marginBottom:4}}>{lbl}</label>
                  <input type={t} value={form[k]} disabled={editing!=null&&k==="user"}
                    onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                    style={{width:"100%",background:"#0f172a",border:"1px solid #334155",borderRadius:7,color:"#e2e8f0",padding:"8px 10px",fontFamily:"inherit",fontSize:13,outline:"none",boxSizing:"border-box",opacity:editing!=null&&k==="user"?.5:1}}/>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
              <div style={{flex:1}}>
                <label style={{fontSize:10,color:"#64748b",display:"block",marginBottom:4}}>PERFIL</label>
                <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}
                  style={{width:"100%",background:"#0f172a",border:"1px solid #334155",borderRadius:7,color:"#e2e8f0",padding:"8px 10px",fontFamily:"inherit",fontSize:13,outline:"none"}}>
                  {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:6,marginTop:18,cursor:"pointer"}}>
                <input type="checkbox" checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))} style={{accentColor:"#3b82f6"}}/>
                <span style={{fontSize:12,color:"#94a3b8"}}>Ativo</span>
              </label>
            </div>
            {err&&<div style={{color:"#f87171",fontSize:12,marginBottom:8}}>{err}</div>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={save} style={{background:"linear-gradient(135deg,#2563eb,#1d4ed8)",border:"none",borderRadius:7,color:"#fff",padding:"8px 18px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                {editing!=null?"SALVAR":"ADICIONAR"}
              </button>
              {editing!=null&&<button onClick={()=>{setForm({user:"",pass:"",role:"editor",active:true});setEditing(null);}} style={{background:"#334155",border:"none",borderRadius:7,color:"#94a3b8",padding:"8px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>}
            </div>
          </div>
          {users.map(u=>(
            <div key={u.id} style={{background:"#1e293b",borderRadius:9,padding:"11px 14px",border:"1px solid #334155",display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:u.active?"#4ade80":"#475569"}}/>
              <div style={{flex:1}}>
                <span style={{fontSize:13,color:"#e2e8f0",fontWeight:700}}>{u.user}</span>
                <span style={{fontSize:11,color:"#64748b",marginLeft:8}}>{u.role}</span>
              </div>
              <button onClick={()=>{setForm({user:u.user,pass:u.pass,role:u.role,active:u.active});setEditing(u.id);}} style={{background:"#334155",border:"none",borderRadius:6,color:"#94a3b8",padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>EDITAR</button>
              <button onClick={()=>setUsers(p=>p.map(x=>x.id===u.id?{...x,active:!x.active}:x))} style={{background:"none",border:"1px solid #334155",borderRadius:6,color:u.active?"#fbbf24":"#4ade80",padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{u.active?"DESATIVAR":"ATIVAR"}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL CAPACIDADES
// ═══════════════════════════════════════════════════════════════════
function CapsModal({ caps, onSave, onClose }){
  const[local,setLocal]=useState({...caps});
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400}}>
      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:14,width:380,boxShadow:"0 32px 80px rgba(0,0,0,.8)"}}>
        <div style={{padding:"18px 24px",borderBottom:"1px solid #1e293b",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#f1f5f9"}}>CAPACIDADE POR SETOR</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontSize:12,color:"#64748b",marginBottom:4}}>Peças produzidas por dia útil em cada setor.</div>
          {SETORES.map(s=>(
            <div key={s} style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:13,color:SETOR_COLORS[s],fontWeight:700,width:110}}>{s}</span>
              <input type="number" value={local[s]||""} onChange={e=>setLocal(p=>({...p,[s]:parseInt(e.target.value)||0}))}
                style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:7,color:"#e2e8f0",padding:"8px 10px",fontFamily:"inherit",fontSize:14,outline:"none"}}/>
              <span style={{fontSize:11,color:"#64748b"}}>pcs/dia</span>
            </div>
          ))}
          <button onClick={()=>{onSave(local);onClose();}} style={{marginTop:8,background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:8,color:"#fff",padding:"10px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>SALVAR</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// POPUP DE PREVISÃO (hover no produto)
// ═══════════════════════════════════════════════════════════════════
function PrevisaoPopup({ produto, caps, x, y }){
  const prev = calcPrevisoes(produto, caps);
  return(
    <div style={{position:"fixed",left:Math.min(x+14,window.innerWidth-280),top:Math.max(y-10,8),zIndex:9999,background:"#0f172a",border:"1px solid #334155",borderRadius:12,padding:"14px 18px",width:260,boxShadow:"0 16px 48px rgba(0,0,0,.8)",pointerEvents:"none"}}>
      <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9",marginBottom:10}}>
        Produto <span style={{color:"#60a5fa"}}>#{produto.produto}</span>
        <span style={{fontSize:11,color:"#64748b",marginLeft:8}}>sem.{produto.semana}</span>
      </div>
      <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>{produto.qtdPecas} peças · {produto.quantidade} unid.</div>
      {SETORES.map(s=>{
        const p=prev[s];
        if(!p)return null;
        const late = isLate(p.fim) && produto.statusUsinagem!=="FINALIZADA";
        return(
          <div key={s} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
            <div style={{width:4,height:28,background:SETOR_COLORS[s],borderRadius:99,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:SETOR_COLORS[s],fontWeight:700,letterSpacing:1}}>{s}</div>
              <div style={{fontSize:12,color:late?"#f87171":"#94a3b8"}}>
                {fmtBR(p.inicio)} → {fmtBR(p.fim)}
                {late&&<span style={{marginLeft:6,fontSize:10,color:"#f87171"}}>⚠ atrasado</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TELA: GRADE DE PLANEJAMENTO (como a imagem)
// ═══════════════════════════════════════════════════════════════════
function GradePlanning({ produtos, caps, canEdit, onUpdate, session }){
  const[hover,setHover]=useState(null); // {produto, x, y}
  const[hoverCell,setHoverCell]=useState(null);
  const[inputCell,setInputCell]=useState(null); // {date, setor, slot}
  const[inputVal,setInputVal]=useState("");
  const inputRef=useRef(null);

  // Gera 60 dias a partir de hoje
  const startDate = addDias(today(), -7);
  const days = isoRange(startDate, addDias(startDate, 74));

  // Mapeia produto por data/setor
  // grade[date][setor] = [produto, produto, ...]  (múltiplos por célula)
  const grade = {};
  days.forEach(d=>{ grade[d]={}; SETORES.forEach(s=>{ grade[d][s]=[]; }); });
  produtos.forEach(p=>{
    const prev=calcPrevisoes(p, caps);
    SETORES.forEach(s=>{
      const info=prev[s];
      if(!info)return;
      const dayRange=isoRange(info.inicio, info.fim);
      // marca só o primeiro dia de cada setor na grade (início)
      const d=info.inicio;
      if(grade[d]&&grade[d][s]) grade[d][s].push(p);
    });
  });

  // Slots vazios por célula (3 slots, aceita múltiplos)
  function getSlotsForCell(date, setor){
    const alocados = grade[date]?.[setor] || [];
    return alocados;
  }

  function handleCellClick(date, setor){
    if(!canEdit)return;
    setInputCell({date, setor});
    setInputVal("");
    setTimeout(()=>inputRef.current?.focus(), 60);
  }

  function commitInput(){
    if(!inputCell||!inputVal.trim()){setInputCell(null);return;}
    const prodCode = inputVal.trim();
    const existing = produtos.find(p=>String(p.produto)===prodCode);
    if(existing){
      // Atualiza inicioCorte para a data clicada
      onUpdate(existing.id, "inicioCorte", inputCell.date, inputCell.setor);
    } else {
      // Cria produto novo com código
      onUpdate(null, "novo", inputCell.date, inputCell.setor, prodCode);
    }
    setInputCell(null);setInputVal("");
  }

  const SLOT_HEIGHT = 28;
  const ROW_HEIGHT = 36;
  const COL_W = 120;

  return(
    <div style={{flex:1,overflowAuto:"scroll",position:"relative"}}>
      {/* Popup hover */}
      {hover&&<PrevisaoPopup produto={hover.produto} caps={caps} x={hover.x} y={hover.y}/>}

      <div style={{overflowX:"auto",overflowY:"auto",maxHeight:"calc(100vh - 180px)"}}>
        <table style={{borderCollapse:"collapse",tableLayout:"fixed",minWidth: 80 + SETORES.length*COL_W}}>
          {/* HEADER */}
          <thead style={{position:"sticky",top:0,zIndex:10}}>
            <tr style={{background:"#0a0f1e"}}>
              <th style={{width:80,minWidth:80,padding:"10px 8px",textAlign:"center",borderBottom:"2px solid #1e293b",borderRight:"1px solid #1e293b",fontSize:11,color:"#475569"}}>DATA</th>
              {SETORES.map(s=>(
                <th key={s} style={{width:COL_W,minWidth:COL_W,padding:"10px 8px",textAlign:"center",borderBottom:"2px solid "+SETOR_COLORS[s],borderRight:"1px solid #1e293b",fontSize:12,fontWeight:700,color:SETOR_COLORS[s],letterSpacing:1}}>
                  {s}
                  <div style={{fontSize:10,color:"#475569",fontWeight:400,marginTop:2}}>{caps[s]||0} pcs/dia</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(date=>{
              const wknd=isWeekend(date);
              const isToday=date===today();
              return(
                <tr key={date} style={{background:isToday?"rgba(59,130,246,0.08)":wknd?"rgba(255,255,255,0.02)":"transparent"}}>
                  {/* Data */}
                  <td style={{padding:"4px 8px",borderBottom:"1px solid #0f172a",borderRight:"1px solid #1e293b",textAlign:"center",verticalAlign:"top",position:"sticky",left:0,background:isToday?"#0d1f3c":wknd?"#0d1117":"#0a0f1e",zIndex:2}}>
                    <div style={{fontSize:11,fontWeight:700,color:isToday?"#60a5fa":wknd?"#334155":"#64748b"}}>{diaSem(date)}</div>
                    <div style={{fontSize:12,color:isToday?"#93c5fd":wknd?"#334155":"#475569"}}>{fmtBR(date).slice(0,5)}</div>
                  </td>
                  {SETORES.map(setor=>{
                    const items = getSlotsForCell(date, setor);
                    const isInput = inputCell?.date===date&&inputCell?.setor===setor;
                    const isHoverCell = hoverCell?.date===date&&hoverCell?.setor===setor;
                    return(
                      <td key={setor}
                        onClick={()=>handleCellClick(date,setor)}
                        onMouseEnter={()=>setHoverCell({date,setor})}
                        onMouseLeave={()=>setHoverCell(null)}
                        style={{
                          padding:"3px 4px",
                          borderBottom:"1px solid #0f172a",
                          borderRight:"1px solid #1e293b",
                          verticalAlign:"top",
                          minHeight:ROW_HEIGHT,
                          cursor:canEdit?"pointer":"default",
                          background:isHoverCell&&canEdit?"rgba(59,130,246,0.06)":"transparent",
                          transition:"background 0.1s",
                          position:"relative",
                        }}>
                        {/* Produtos alocados */}
                        {items.map(p=>{
                          const prev=calcPrevisoes(p,caps);
                          const info=prev[setor];
                          const late=isLate(info?.fim);
                          const color=late?"#f87171":SETOR_COLORS[setor];
                          return(
                            <div key={p.id}
                              onMouseEnter={e=>{e.stopPropagation();setHover({produto:p,x:e.clientX,y:e.clientY});}}
                              onMouseMove={e=>{setHover({produto:p,x:e.clientX,y:e.clientY});}}
                              onMouseLeave={e=>{e.stopPropagation();setHover(null);}}
                              onClick={e=>e.stopPropagation()}
                              style={{
                                background:`${color}22`,
                                border:`1px solid ${color}55`,
                                borderRadius:5,
                                padding:"2px 7px",
                                marginBottom:2,
                                fontSize:12,
                                fontWeight:700,
                                color:color,
                                cursor:"default",
                                whiteSpace:"nowrap",
                                overflow:"hidden",
                                textOverflow:"ellipsis",
                              }}>
                              {p.produto}
                            </div>
                          );
                        })}
                        {/* Input inline */}
                        {isInput&&(
                          <input ref={inputRef} value={inputVal} onChange={e=>setInputVal(e.target.value)}
                            placeholder="Cód produto"
                            onBlur={commitInput}
                            onKeyDown={e=>{if(e.key==="Enter")commitInput();if(e.key==="Escape")setInputCell(null);}}
                            onClick={e=>e.stopPropagation()}
                            style={{width:"100%",background:"#0f172a",border:"1px solid #3b82f6",borderRadius:5,color:"#e2e8f0",padding:"3px 6px",fontFamily:"inherit",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                        )}
                        {/* Hint vazio */}
                        {canEdit&&!isInput&&items.length===0&&isHoverCell&&(
                          <div style={{fontSize:10,color:"#334155",textAlign:"center",paddingTop:4}}>+</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TELA: CADASTRO DE PRODUTOS
// ═══════════════════════════════════════════════════════════════════
function CadastroProdutos({ produtos, setProdutos, caps, canEdit, session }){
  const empty={produto:"",semana:"",quantidade:"",qtdPecas:"",inicioCorte:"",statusUsinagem:"AGUARDANDO"};
  const[form,setForm]=useState(empty);
  const[editId,setEditId]=useState(null);
  const[err,setErr]=useState("");
  const[search,setSearch]=useState("");
  const[filter,setFilter]=useState("TODOS");
  const[delConfirm,setDelConfirm]=useState(null);
  const[hoverPrev,setHoverPrev]=useState(null);

  function save(){
    if(!form.produto.trim()||!form.qtdPecas){setErr("Produto e Qtd Peças são obrigatórios.");return;}
    if(editId!=null){
      setProdutos(p=>p.map(x=>x.id===editId?{...x,...form}:x));
    } else {
      setProdutos(p=>[...p,{id:nid++,...form,criadoPor:session.user,criadoEm:new Date().toISOString()}]);
    }
    setForm(empty);setEditId(null);setErr("");
  }

  function startEdit(p){setForm({produto:p.produto,semana:p.semana,quantidade:p.quantidade,qtdPecas:p.qtdPecas,inicioCorte:p.inicioCorte,statusUsinagem:p.statusUsinagem});setEditId(p.id);}

  const visible=produtos.filter(p=>{
    const okS=filter==="TODOS"||p.statusUsinagem===filter;
    const q=search.toLowerCase();
    return okS&&(!q||String(p.produto).includes(q)||String(p.semana).includes(q));
  });

  const prev_calc = form.inicioCorte&&form.qtdPecas ? calcPrevisoes(form, caps) : null;

  return(
    <div style={{padding:"20px 28px",display:"flex",flexDirection:"column",gap:16,flex:1,overflowY:"auto"}}>
      {hoverPrev&&<PrevisaoPopup produto={hoverPrev.p} caps={caps} x={hoverPrev.x} y={hoverPrev.y}/>}

      {/* FORMULÁRIO */}
      {canEdit&&(
        <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:14,padding:"20px 22px"}}>
          <div style={{fontSize:11,color:"#64748b",letterSpacing:2,marginBottom:14}}>{editId!=null?"EDITAR PRODUTO":"CADASTRAR PRODUTO"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:14}}>
            {[
              ["CÓD. PRODUTO","produto","text"],
              ["SEMANA","semana","number"],
              ["QUANTIDADE","quantidade","number"],
              ["QTD PEÇAS","qtdPecas","number"],
              ["INÍCIO CORTE","inicioCorte","date"],
            ].map(([lbl,k,t])=>(
              <div key={k}>
                <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:5}}>{lbl}</label>
                <input type={t} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                  style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,color:"#e2e8f0",padding:"9px 11px",fontFamily:"inherit",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
            ))}
            <div>
              <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:5}}>STATUS</label>
              <select value={form.statusUsinagem} onChange={e=>setForm(f=>({...f,statusUsinagem:e.target.value}))}
                style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,color:"#e2e8f0",padding:"9px 11px",fontFamily:"inherit",fontSize:13,outline:"none"}}>
                {STATUS_OPTS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Preview previsão */}
          {prev_calc&&(
            <div style={{background:"#1e293b",borderRadius:10,padding:"12px 16px",marginBottom:14}}>
              <div style={{fontSize:10,color:"#64748b",letterSpacing:2,marginBottom:10}}>PREVISÃO DE ETAPAS</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {SETORES.map(s=>{
                  const p=prev_calc[s];
                  return(
                    <div key={s} style={{background:"#0f172a",borderRadius:8,padding:"8px 12px",flex:"1 1 auto",minWidth:120,borderLeft:"3px solid "+SETOR_COLORS[s]}}>
                      <div style={{fontSize:11,color:SETOR_COLORS[s],fontWeight:700,marginBottom:3}}>{s}</div>
                      <div style={{fontSize:12,color:"#94a3b8"}}>{fmtBR(p.inicio)}</div>
                      <div style={{fontSize:11,color:"#475569"}}>até {fmtBR(p.fim)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {err&&<div style={{color:"#f87171",fontSize:12,marginBottom:10}}>{err}</div>}
          <div style={{display:"flex",gap:8}}>
            <button onClick={save} style={{background:"linear-gradient(135deg,#2563eb,#1d4ed8)",border:"none",borderRadius:8,color:"#fff",padding:"9px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {editId!=null?"SALVAR ALTERAÇÕES":"CADASTRAR"}
            </button>
            {editId!=null&&<button onClick={()=>{setForm(empty);setEditId(null);setErr("");}} style={{background:"#334155",border:"none",borderRadius:8,color:"#94a3b8",padding:"9px 16px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>CANCELAR</button>}
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <input placeholder="Buscar produto ou semana..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{background:"#1e293b",border:"1px solid #334155",borderRadius:8,color:"#e2e8f0",padding:"8px 13px",fontFamily:"inherit",fontSize:13,outline:"none",width:220}}/>
        <div style={{display:"flex",gap:4}}>
          {["TODOS",...STATUS_OPTS].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{background:filter===s?(SC[s]?.bg||"#3b82f6"):"#1e293b",border:"1px solid #334155",color:filter===s?"#fff":"#94a3b8",borderRadius:7,padding:"7px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {s}
            </button>
          ))}
        </div>
        <span style={{marginLeft:"auto",fontSize:12,color:"#475569"}}>{visible.length} produto(s)</span>
      </div>

      {/* LISTA */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {visible.length===0&&<div style={{textAlign:"center",color:"#475569",padding:32,fontSize:14}}>Nenhum produto cadastrado.</div>}
        {visible.map(p=>{
          const prev=calcPrevisoes(p,caps);
          const fimFinal=prev["PINTURA"]?.fim;
          const late=isLate(fimFinal)&&p.statusUsinagem!=="FINALIZADA";
          const sc=SC[p.statusUsinagem]||SC["AGUARDANDO"];
          return(
            <div key={p.id}
              style={{background:"#0f172a",border:"1px solid "+(late?"#7f1d1d":"#1e293b"),borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,cursor:"default"}}
              onMouseEnter={e=>setHoverPrev({p,x:e.clientX,y:e.clientY})}
              onMouseMove={e=>setHoverPrev({p,x:e.clientX,y:e.clientY})}
              onMouseLeave={()=>setHoverPrev(null)}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <span style={{fontSize:16,fontWeight:800,color:"#f1f5f9"}}>#{p.produto}</span>
                  <span style={{fontSize:11,color:"#64748b"}}>Sem. {p.semana}</span>
                  <span style={{background:sc.bg,color:sc.text,borderRadius:5,padding:"2px 8px",fontSize:10,fontWeight:700}}>{p.statusUsinagem}</span>
                  {late&&<span style={{color:"#f87171",fontSize:12}}>⚠ ATRASADO</span>}
                </div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,color:"#64748b"}}>{p.qtdPecas} peças</span>
                  {p.inicioCorte&&<span style={{fontSize:12,color:"#64748b"}}>Início: {fmtBR(p.inicioCorte)}</span>}
                  {fimFinal&&<span style={{fontSize:12,color:late?"#f87171":"#64748b"}}>Previsão fim: {fmtBR(fimFinal)}</span>}
                </div>
                {/* Barra de progresso por setores */}
                <div style={{display:"flex",gap:3,marginTop:8}}>
                  {SETORES.map(s=>{
                    const info=prev[s];
                    const started=info&&new Date(info.inicio+"T00:00:00")<=new Date();
                    const done=info&&new Date(info.fim+"T00:00:00")<new Date();
                    return(
                      <div key={s} title={s} style={{flex:1,height:5,borderRadius:99,background:done?"#4ade80":started?SETOR_COLORS[s]:"#1e293b",transition:"background .3s"}}/>
                    );
                  })}
                </div>
              </div>
              {canEdit&&(
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>startEdit(p)} style={{background:"#1e293b",border:"1px solid #334155",borderRadius:7,color:"#94a3b8",padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>EDITAR</button>
                  <button onClick={()=>setDelConfirm(p.id)} style={{background:"none",border:"1px solid #7f1d1d",borderRadius:7,color:"#f87171",padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>DEL</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm delete */}
      {delConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:"26px 30px",textAlign:"center",maxWidth:300}}>
            <p style={{margin:"0 0 18px",fontSize:14,color:"#e2e8f0"}}>Remover este produto?</p>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button onClick={()=>setDelConfirm(null)} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:7,padding:"8px 18px",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Cancelar</button>
              <button onClick={()=>{setProdutos(p=>p.filter(x=>x.id!==delConfirm));setDelConfirm(null);}} style={{background:"#ef4444",border:"none",color:"#fff",borderRadius:7,padding:"8px 18px",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function Dashboard({ produtos, caps }){
  const total=produtos.length;
  const emProd=produtos.filter(p=>p.statusUsinagem==="PRODUCAO").length;
  const finalizados=produtos.filter(p=>p.statusUsinagem==="FINALIZADA").length;
  const atrasados=produtos.filter(p=>{const pv=calcPrevisoes(p,caps);return isLate(pv["PINTURA"]?.fim)&&p.statusUsinagem!=="FINALIZADA";}).length;
  const semInicio=produtos.filter(p=>!p.inicioCorte).length;
  const distSetor=SETORES.reduce((a,s)=>{a[s]=produtos.filter(p=>p.statusUsinagem!=="FINALIZADA"&&calcPrevisoes(p,caps)[s]&&!isLate(calcPrevisoes(p,caps)[s].fim)).length;return a;},{});

  const kpis=[
    {l:"TOTAL",v:total,c:"#60a5fa"},
    {l:"EM PRODUÇÃO",v:emProd,c:"#4ade80"},
    {l:"FINALIZADOS",v:finalizados,c:"#a78bfa"},
    {l:"ATRASADOS",v:atrasados,c:"#f87171"},
    {l:"SEM INÍCIO",v:semInicio,c:"#f59e0b"},
  ];

  return(
    <div style={{padding:"20px 28px",overflowY:"auto",flex:1}}>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}}>
        {kpis.map(k=>{
          const pct=total?Math.round((typeof k.v==="number"?k.v:0)/total*100):0;
          return(
            <div key={k.l} style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:"18px 22px",flex:"1 1 130px",position:"relative",overflow:"hidden"}}>
              <div style={{fontSize:30,fontWeight:800,color:k.c,lineHeight:1}}>{k.v}</div>
              <div style={{fontSize:11,color:"#475569",letterSpacing:2,marginTop:6,marginBottom:10}}>{k.l}</div>
              <div style={{background:"#1e293b",borderRadius:99,height:5,overflow:"hidden"}}>
                <div style={{width:pct+"%",height:"100%",background:k.c,borderRadius:99,opacity:.8,transition:"width .6s"}}/>
              </div>
              <div style={{fontSize:10,color:"#334155",marginTop:4}}>{pct}%</div>
              <div style={{position:"absolute",right:-16,top:-16,width:64,height:64,borderRadius:"50%",background:k.c,opacity:.04}}/>
            </div>
          );
        })}
      </div>

      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:14,padding:"18px 22px",marginBottom:20}}>
        <div style={{fontSize:11,color:"#475569",letterSpacing:2,marginBottom:14}}>CARGA POR SETOR (produtos ativos)</div>
        {SETORES.map(s=>{
          const n=distSetor[s]||0;
          const mx=Math.max(...Object.values(distSetor),1);
          const pct=Math.round(n/mx*100);
          return(
            <div key={s} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13,color:"#94a3b8",fontWeight:700}}>{s}</span>
                <span style={{fontSize:13,color:SETOR_COLORS[s],fontWeight:700}}>{n} prod. <span style={{color:"#475569",fontSize:11,fontWeight:400}}>({caps[s]} pcs/dia)</span></span>
              </div>
              <div style={{background:"#1e293b",borderRadius:99,height:10,overflow:"hidden"}}>
                <div style={{width:pct+"%",height:"100%",background:`linear-gradient(90deg,${SETOR_COLORS[s]}88,${SETOR_COLORS[s]})`,borderRadius:99,transition:"width .6s"}}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Próximos vencimentos */}
      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:14,padding:"18px 22px"}}>
        <div style={{fontSize:11,color:"#475569",letterSpacing:2,marginBottom:14}}>PRÓXIMOS VENCIMENTOS</div>
        {produtos
          .filter(p=>p.inicioCorte&&p.statusUsinagem!=="FINALIZADA")
          .map(p=>({p,fim:calcPrevisoes(p,caps)["PINTURA"]?.fim}))
          .filter(x=>x.fim)
          .sort((a,b)=>a.fim.localeCompare(b.fim))
          .slice(0,8)
          .map(({p,fim})=>{
            const late=isLate(fim);
            const daysLeft=Math.round((new Date(fim+"T00:00:00")-new Date())/86400000);
            return(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:"1px solid #0f172a"}}>
                <div style={{width:4,height:30,background:late?"#ef4444":"#3b82f6",borderRadius:99,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <span style={{fontSize:14,color:"#f1f5f9",fontWeight:700}}>#{p.produto}</span>
                  <span style={{fontSize:12,color:"#64748b",marginLeft:8}}>sem.{p.semana}</span>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:13,color:late?"#f87171":"#94a3b8",fontWeight:700}}>{fmtBR(fim)}</div>
                  <div style={{fontSize:11,color:late?"#f87171":"#475569"}}>{late?`${Math.abs(daysLeft)}d atrasado`:`${daysLeft}d restantes`}</div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
export default function App(){
  const[session,setSession]=useState(null);
  const[produtos,setProdutos]=useState([]);
  const[users,setUsers]=useState(DEFAULT_USERS);
  const[caps,setCaps]=useState(CAPS_DEFAULT);
  const[ready,setReady]=useState(false);
  const[aba,setAba]=useState("dashboard"); // dashboard | grade | cadastro
  const[modal,setModal]=useState(null); // null | users | caps
  const[sideHover,setSideHover]=useState(false);
  const[toast,setToast]=useState(null);

  const isAdmin=session?.role==="admin";
  const canEdit=session?.role==="admin"||session?.role==="editor";

  // ── Load (shared storage — todos users veem o mesmo) ──────────
  useEffect(()=>{
    (async()=>{
      const p=await sget(SK.produtos,true); if(p?.length){setProdutos(p);nid=Math.max(...p.map(x=>x.id))+1;}
      const u=await sget(SK.users,false); if(u?.length){setUsers(u);uid=Math.max(...u.map(x=>x.id))+1;}
      const c=await sget(SK.caps,true); if(c)setCaps(c);
      setReady(true);
    })();
  },[]);

  // ── Salva produtos e caps como SHARED ─────────────────────────
  useEffect(()=>{if(ready)sset(SK.produtos,produtos,true);},[produtos,ready]);
  useEffect(()=>{if(ready)sset(SK.caps,caps,true);},[caps,ready]);
  // users não são shared (segurança)
  useEffect(()=>{if(ready)sset(SK.users,users,false);},[users,ready]);

  function toast_(msg,type){setToast({msg,type:type||"ok"});setTimeout(()=>setToast(null),3000);}

  // Callback da grade (alocar produto na grade)
  function handleGradeUpdate(id, campo, date, setor, prodCode){
    if(campo==="inicioCorte"){
      setProdutos(p=>p.map(x=>x.id===id?{...x,inicioCorte:date}:x));
      toast_("Produto realocado");
    } else if(campo==="novo"){
      const nr={id:nid++,produto:prodCode,semana:"",quantidade:"",qtdPecas:"100",inicioCorte:date,statusUsinagem:"PRODUCAO",criadoPor:session.user,criadoEm:new Date().toISOString()};
      setProdutos(p=>[...p,nr]);
      toast_("Produto adicionado na grade");
    }
  }

  if(!ready) return <div style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",alignItems:"center",justifyContent:"center",color:"#64748b",fontFamily:"monospace",fontSize:16}}>Carregando...</div>;
  if(!session) return <LoginScreen users={users} onLogin={setSession}/>;

  const sideItems=[
    {icon:"📊",label:"DASHBOARD",id:"dashboard"},
    {icon:"📅",label:"GRADE",id:"grade"},
    {icon:"📦",label:"CADASTRO",id:"cadastro"},
    null, // divider
    {icon:"📋",label:"HISTÓRICO",id:"hist",action:()=>toast_("Em breve")},
    ...(isAdmin?[
      {icon:"👥",label:"USUÁRIOS",id:"users",action:()=>setModal("users")},
      {icon:"⚙",label:"CAPACIDADES",id:"caps",action:()=>setModal("caps")},
    ]:[]),
    null,
    {icon:"🚪",label:"SAIR",id:"sair",action:()=>setSession(null),danger:true},
  ];

  return(
    <div style={{minHeight:"100vh",height:"100vh",background:"linear-gradient(135deg,#0a0f1e,#0f172a)",fontFamily:"monospace",color:"#e2e8f0",display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* ── SIDEBAR ── */}
      <div onMouseEnter={()=>setSideHover(true)} onMouseLeave={()=>setSideHover(false)}
        style={{position:"fixed",left:0,top:0,height:"100vh",zIndex:200,display:"flex"}}>
        <div style={{width:6,background:"linear-gradient(180deg,#3b82f620,#3b82f650,#3b82f620)",borderRight:"1px solid #1e293b",cursor:"pointer"}}/>
        <div style={{width:sideHover?210:0,overflow:"hidden",transition:"width 0.22s cubic-bezier(.4,0,.2,1)",background:"rgba(6,10,22,0.98)",borderRight:"1px solid #1e293b",boxShadow:sideHover?"10px 0 40px rgba(0,0,0,.7)":"none",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"24px 18px 16px",borderBottom:"1px solid #1e293b",minWidth:210}}>
            <div style={{fontSize:9,color:"#64748b",letterSpacing:3,marginBottom:5}}>SISTEMA DE CONTROLE</div>
            <div style={{fontSize:16,fontWeight:700,color:"#f1f5f9",marginBottom:10}}>ESTUDO CURVAS</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:isAdmin?"#4ade80":canEdit?"#fbbf24":"#60a5fa"}}/>
              <span style={{fontSize:13,color:"#e2e8f0"}}>{session.user}</span>
              <span style={{fontSize:10,color:"#475569"}}>({session.role})</span>
            </div>
          </div>
          <div style={{flex:1,padding:"10px 0",display:"flex",flexDirection:"column",gap:1}}>
            {sideItems.map((item,i)=>
              item===null
                ? <div key={i} style={{height:1,background:"#1e293b",margin:"6px 0"}}/>
                : <button key={item.id} onClick={item.action||(()=>setAba(item.id))}
                    style={{background:aba===item.id?"rgba(59,130,246,0.15)":"none",border:"none",borderLeft:aba===item.id?"3px solid #3b82f6":"3px solid transparent",color:item.danger?"#f87171":aba===item.id?"#e2e8f0":"#94a3b8",padding:"11px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:10,textAlign:"left",whiteSpace:"nowrap",transition:"all .15s"}}>
                    <span style={{fontSize:15}}>{item.icon}</span>{item.label}
                  </button>
            )}
          </div>
          <div style={{padding:"12px 18px",borderTop:"1px solid #1e293b"}}>
            <div style={{fontSize:10,color:"#22c55e",letterSpacing:1}}>● DADOS SALVOS (compartilhado)</div>
          </div>
        </div>
      </div>

      {/* ── HEADER ── */}
      <div style={{borderBottom:"1px solid #1e293b",padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(15,23,42,.97)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{display:"flex",flexDirection:"column",gap:4,cursor:"pointer",opacity:.5,width:22}} onMouseEnter={()=>setSideHover(true)}>
            {[0,1,2].map(i=><div key={i} style={{height:2,background:"#64748b",borderRadius:2}}/>)}
          </div>
          <div>
            <div style={{fontSize:11,color:"#64748b",letterSpacing:3}}>SISTEMA DE CONTROLE</div>
            <div style={{fontSize:20,fontWeight:700,color:"#f1f5f9"}}>{aba==="dashboard"?"DASHBOARD":aba==="grade"?"GRADE DE PLANEJAMENTO":"CADASTRO DE PRODUTOS"}</div>
          </div>
        </div>
        {/* Tabs */}
        <div style={{display:"flex",gap:4}}>
          {[{id:"dashboard",l:"📊 Dashboard"},{id:"grade",l:"📅 Grade"},{id:"cadastro",l:"📦 Cadastro"}].map(t=>(
            <button key={t.id} onClick={()=>setAba(t.id)}
              style={{background:aba===t.id?"#1e3a5f":"#1e293b",border:"1px solid "+(aba===t.id?"#3b82f6":"#334155"),color:aba===t.id?"#93c5fd":"#64748b",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {aba==="dashboard"&&<Dashboard produtos={produtos} caps={caps}/>}
        {aba==="grade"&&<GradePlanning produtos={produtos} caps={caps} canEdit={canEdit} onUpdate={handleGradeUpdate} session={session}/>}
        {aba==="cadastro"&&<CadastroProdutos produtos={produtos} setProdutos={setProdutos} caps={caps} canEdit={canEdit} session={session}/>}
      </div>

      {/* ── MODAIS ── */}
      {modal==="users"&&<UsersModal users={users} setUsers={setUsers} onClose={()=>setModal(null)}/>}
      {modal==="caps"&&<CapsModal caps={caps} onSave={c=>{setCaps(c);toast_("Capacidades salvas");}} onClose={()=>setModal(null)}/>}

      {/* ── TOAST ── */}
      {toast&&<div style={{position:"fixed",bottom:22,right:22,zIndex:9999,background:toast.type==="err"?"#7f1d1d":"#16a34a",color:"#fff",borderRadius:10,padding:"12px 20px",fontSize:14,fontWeight:600,fontFamily:"inherit",boxShadow:"0 8px 32px rgba(0,0,0,.6)"}}>{toast.msg}</div>}
    </div>
  );
}
