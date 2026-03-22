"use client";
import { useState } from "react";

const API = "https://lojqmvpzdhayekzgwazw.supabase.co/functions/v1/analizar_terreno";
const KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvanFtdnB6ZGhheWVremd3YXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzQ1MzUsImV4cCI6MjA4OTcxMDUzNX0.CZpREN5V1i1D8TSNrdmGR0of4F_DuS6EqU9AE9a_eog";
type Tipo = "lineamientos"|"mercado"|"completo";
const fmt = (n:number)=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n);
const STEPS = ["Geocodificando…","Buscando zona…","Consultando PDU…","Analizando mercado…","Generando reporte…"];

export default function Page() {
  const [dir,setDir]=useState(""); const [m2,setM2]=useState(""); const [px,setPx]=useState("");
  const [tipo,setTipo]=useState<Tipo>("lineamientos"); const [step,setStep]=useState(0);
  const [loading,setLoading]=useState(false); const [res,setRes]=useState<any>(null); const [err,setErr]=useState("");

  async function run(){
    if(!dir||!m2||!px){setErr("Completa todos los campos.");return;}
    setErr("");setRes(null);setLoading(true);
    for(let i=0;i<STEPS.length;i++){setStep(i);await new Promise(r=>setTimeout(r,680));}
    try{
      const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${KEY}`},
        body:JSON.stringify({direccion:dir,metros2:parseFloat(m2),precio:parseFloat(px.replace(/,/g,"")),tipo_analisis:tipo})});
      const d=await r.json();
      if(d.ok)setRes(d); else setErr(d.error||"Error inesperado.");
    }catch{setErr("Error de conexión.");}
    finally{setLoading(false);}
  }

  const sem=res?.analisis?.semaforo;
  const semCol=sem==="VERDE"?"#15803d":sem==="AMARILLO"?"#d97706":sem==="ROJO"?"#dc2626":"#94a3b8";

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#F5F2EE;color:#1a1510;font-family:'Inter',-apple-system,sans-serif;}
        input,select,button,textarea{font-family:'Inter',-apple-system,sans-serif;}
        .serif{font-family:'Instrument Serif',Georgia,serif;}
        input::placeholder,textarea::placeholder{color:#b0a898;}
        .field{width:100%;background:#fff;border:1.5px solid #E8E2DA;border-radius:12px;padding:13px 16px;
          font-size:14px;color:#1a1510;outline:none;transition:border .2s,box-shadow .2s;}
        .field:focus{border-color:#2563a8;box-shadow:0 0 0 4px rgba(37,99,168,.08);}
        .field:disabled{background:#faf9f7;color:#b0a898;}
        .tag{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:100px;
          font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;
          border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0;}
        @keyframes up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .up{animation:up .4s ease forwards;}
        .row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
        @media(max-width:600px){.row{grid-template-columns:1fr;}}
        .kpi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
        @media(min-width:600px){.kpi-grid{grid-template-columns:repeat(4,1fr);}}
        .lbl{font-size:10px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#a09888;margin-bottom:6px;}
        .pill{display:inline-block;padding:5px 12px;border-radius:100px;font-size:12px;font-weight:500;
          background:#EEE9E3;color:#5a4f44;margin:4px 4px 0 0;}
        .step-dot{width:7px;height:7px;border-radius:50%;transition:background .3s,transform .3s;}
      `}</style>

      {/* NAV */}
      <header style={{position:"sticky",top:0,zIndex:20,background:"rgba(245,242,238,.92)",
        backdropFilter:"blur(12px)",borderBottom:"1px solid #E8E2DA",padding:"0 32px",
        height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="9" fill="#DBEAFE"/>
            <path d="M18 8L28 26H8Z" fill="none" stroke="#2563a8" strokeWidth="2.2" strokeLinejoin="round"/>
            <path d="M13 26Q18 16 23 26" fill="none" stroke="#2563a8" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="18" y1="20" x2="18" y2="26" stroke="#2563a8" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <span style={{fontSize:16,fontWeight:600,letterSpacing:"-.03em",color:"#1a1510"}}>
            un<span style={{color:"#2563a8"}}>earth</span>
          </span>
        </div>
        <span style={{fontSize:11,fontWeight:500,color:"#c0b8ae",letterSpacing:".07em"}}>MONTERREY</span>
      </header>

      <main style={{maxWidth:680,margin:"0 auto",padding:"72px 24px 120px"}}>

        {/* HERO */}
        {!res&&!loading&&(
          <div style={{marginBottom:56,textAlign:"center"}} className="up">
            <div className="tag" style={{background:"#DBEAFE",color:"#1d4ed8",marginBottom:28}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:"#2563a8"}}/>
              PDU Monterrey 2013–2025 · IA
            </div>
            <h1 className="serif" style={{fontSize:"clamp(42px,6vw,68px)",lineHeight:1,
              color:"#1a1510",marginBottom:20,fontWeight:400}}>
              Unearth your next<br/>
              <em style={{color:"#2563a8"}}>development.</em>
            </h1>
            <p style={{fontSize:16,color:"#7a6f64",lineHeight:1.7,maxWidth:400,margin:"0 auto"}}>
              Ingresa un terreno en Monterrey — la IA hace el resto. Zonificación, mercado y financiero en segundos.
            </p>
          </div>
        )}

        {/* FORM */}
        <div style={{background:"#fff",borderRadius:20,padding:"32px",
          boxShadow:"0 2px 20px rgba(0,0,0,.06)",border:"1px solid #EAE5DF",marginBottom:24}} className="up">

          <div style={{marginBottom:16}}>
            <div className="lbl">Dirección del terreno</div>
            <input className="field" value={dir} onChange={e=>setDir(e.target.value)} disabled={loading}
              placeholder="Ej: Mitla 418, Mitras Norte, Monterrey"/>
          </div>

          <div className="row" style={{marginBottom:20}}>
            <div>
              <div className="lbl">Superficie m²</div>
              <input className="field" value={m2} onChange={e=>setM2(e.target.value)}
                placeholder="300" type="number" disabled={loading}/>
            </div>
            <div>
              <div className="lbl">Precio MXN</div>
              <input className="field" value={px} onChange={e=>setPx(e.target.value)}
                placeholder="8,000,000" disabled={loading}/>
            </div>
            <div>
              <div className="lbl">Tipo de análisis</div>
              <select className="field" value={tipo} onChange={e=>setTipo(e.target.value as Tipo)} disabled={loading}
                style={{cursor:"pointer",background:"#fff"}}>
                <option value="lineamientos">Lineamientos</option>
                <option value="mercado">+ Mercado</option>
                <option value="completo">Completo</option>
              </select>
            </div>
          </div>

          {err&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,
            padding:"10px 14px",color:"#dc2626",fontSize:13,marginBottom:14}}>{err}</div>}

          <button onClick={run} disabled={loading}
            style={{width:"100%",background:loading?"#d4cfc8":"#1a1510",border:"none",borderRadius:12,
              padding:"15px 0",color:loading?"#7a6f64":"#fff",fontSize:14,fontWeight:600,
              cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",
              justifyContent:"center",gap:10,letterSpacing:"-.01em",transition:"background .15s"}}>
            {loading?<><span className="spin"/>{STEPS[step]}</>:"Analizar terreno →"}
          </button>

          {loading&&(
            <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:16}}>
              {STEPS.map((_,i)=>(
                <div key={i} className="step-dot"
                  style={{background:i<=step?"#2563a8":"#E8E2DA",
                    transform:i===step?"scale(1.4)":"scale(1)"}}/>
              ))}
            </div>
          )}
        </div>

        {/* RESULTADO */}
        {res&&!loading&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}} className="up">

            {/* Header */}
            <div style={{background:"#fff",borderRadius:20,padding:"28px 32px",
              border:"1px solid #EAE5DF",boxShadow:"0 2px 12px rgba(0,0,0,.05)",
              display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
              <div>
                <div className="lbl">Resultado</div>
                <div className="serif" style={{fontSize:30,color:"#1a1510",lineHeight:1.1,marginBottom:6}}>
                  {res.ubicacion.distrito}
                  <span style={{color:"#b0a898",fontWeight:400}}>, </span>
                  {res.ubicacion.delegacion}
                </div>
                <div style={{fontSize:13,color:"#9a8f84"}}>{res.ubicacion.direccion}</div>
              </div>
              {sem&&(
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 18px",
                  borderRadius:100,background:`${semCol}12`,border:`1.5px solid ${semCol}30`}}>
                  <div style={{width:9,height:9,borderRadius:"50%",background:semCol,
                    boxShadow:`0 0 8px ${semCol}`}}/>
                  <span style={{fontSize:12,fontWeight:700,color:semCol,letterSpacing:".08em"}}>{sem}</span>
                </div>
              )}
            </div>

            {/* KPIs */}
            <div className="kpi-grid">
              {[
                {l:"Zona",v:`${res.ubicacion.zona} · ${res.ubicacion.densidad}`},
                {l:"Precio / m²",v:fmt(res.terreno.precio_m2)},
                {l:"M² construibles",v:res.analisis?.lineamientos?.metros_construibles||"—"},
                {l:"Altura máx",v:res.analisis?.lineamientos?.altura_maxima||"—"},
              ].map(k=>(
                <div key={k.l} style={{background:"#fff",borderRadius:14,padding:"18px 20px",
                  border:"1px solid #EAE5DF",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
                  <div className="lbl">{k.l}</div>
                  <div style={{fontSize:k.v.length>12?13:17,fontWeight:700,color:"#1a1510",
                    letterSpacing:"-.02em",lineHeight:1.3}}>{k.v}</div>
                </div>
              ))}
            </div>

            {/* Análisis IA */}
            {(res.analisis?.resumen||res.analisis?.resumen_ejecutivo)&&(
              <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:16,padding:"24px 28px"}}>
                <div className="lbl" style={{color:"#2563a8"}}>Análisis IA</div>
                <p style={{fontSize:14,lineHeight:1.75,color:"#1e3a5f",margin:0}}>
                  {res.analisis.resumen||res.analisis.resumen_ejecutivo}
                </p>
              </div>
            )}

            {/* Lineamientos */}
            {res.analisis?.lineamientos&&(
              <div style={{background:"#fff",borderRadius:16,padding:"24px 28px",
                border:"1px solid #EAE5DF",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
                <div className="lbl">Lineamientos Urbanísticos</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:20,marginTop:4}}>
                  {Object.entries(res.analisis.lineamientos).map(([k,v])=>(
                    <div key={k}>
                      <div style={{fontSize:10,fontWeight:600,color:"#a09888",letterSpacing:".08em",
                        textTransform:"uppercase",marginBottom:5}}>{k.replace(/_/g," ")}</div>
                      <div style={{fontSize:13,color:"#1a1510",lineHeight:1.5}}>{String(v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Usos */}
            {res.analisis?.usos_principales_permitidos&&(
              <div style={{background:"#fff",borderRadius:16,padding:"24px 28px",
                border:"1px solid #EAE5DF",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
                <div className="lbl">Usos Permitidos</div>
                <div style={{marginTop:4}}>
                  {res.analisis.usos_principales_permitidos.map((u:string)=>(
                    <span className="pill" key={u}>{u}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Producto óptimo */}
            {res.analisis?.producto_optimo&&(
              <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:16,padding:"24px 28px"}}>
                <div className="lbl" style={{color:"#b45309"}}>Producto Óptimo</div>
                <div className="serif" style={{fontSize:22,color:"#1a1510",marginBottom:8,lineHeight:1.2}}>
                  {res.analisis.producto_optimo.tipo}
                </div>
                <p style={{fontSize:13,color:"#7c5e1e",lineHeight:1.65,margin:0}}>
                  {res.analisis.producto_optimo.justificacion}
                </p>
              </div>
            )}

            {/* Financiero */}
            {res.analisis?.financiero&&(
              <div style={{background:"#fff",borderRadius:16,padding:"24px 28px",
                border:"1px solid #EAE5DF",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
                <div className="lbl">Análisis Financiero</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:22,marginTop:8}}>
                  {[
                    {l:"Precio terreno",v:fmt(res.analisis.financiero.precio_terreno)},
                    {l:"Costo construcción",v:fmt(res.analisis.financiero.costo_construccion_estimado)},
                    {l:"Ingreso estimado",v:fmt(res.analisis.financiero.ingreso_total_estimado)},
                    {l:"Margen bruto",v:`${res.analisis.financiero.margen_bruto_pct}%`},
                    {l:"ROI",v:`${res.analisis.financiero.roi_estimado_pct}%`},
                    {l:"TIR",v:`${res.analisis.financiero.tir_estimada_pct}%`},
                  ].map(k=>(
                    <div key={k.l}>
                      <div style={{fontSize:10,fontWeight:600,color:"#a09888",letterSpacing:".08em",
                        textTransform:"uppercase",marginBottom:5}}>{k.l}</div>
                      <div style={{fontSize:20,fontWeight:700,color:"#1a1510",letterSpacing:"-.03em"}}>{k.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Red flags */}
            {res.analisis?.red_flags?.length>0&&(
              <div style={{background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:16,padding:"24px 28px"}}>
                <div className="lbl" style={{color:"#c2410c"}}>Red Flags</div>
                {res.analisis.red_flags.map((f:string,i:number)=>(
                  <div key={i} style={{display:"flex",gap:10,marginTop:10,fontSize:13,
                    color:"#7c2d12",lineHeight:1.55,alignItems:"flex-start"}}>
                    <span style={{color:"#f97316",fontWeight:700,flexShrink:0}}>!</span>{f}
                  </div>
                ))}
              </div>
            )}

            {/* Veredicto */}
            {res.analisis?.veredicto&&(
              <div style={{background:"#fff",borderRadius:16,padding:"28px 32px",
                border:`2px solid ${semCol}`,boxShadow:`0 0 0 4px ${semCol}10`}}>
                <div className="lbl">Veredicto</div>
                <div className="serif" style={{fontSize:36,color:semCol,lineHeight:1,marginBottom:14,marginTop:4}}>
                  {res.analisis.veredicto}
                </div>
                <p style={{fontSize:14,color:"#3a3228",lineHeight:1.7,margin:0}}>
                  {res.analisis.justificacion_veredicto}
                </p>
              </div>
            )}

            {/* Próximos pasos */}
            {res.analisis?.proximos_pasos?.length>0&&(
              <div style={{background:"#fff",borderRadius:16,padding:"24px 28px",
                border:"1px solid #EAE5DF",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
                <div className="lbl">Próximos Pasos</div>
                {res.analisis.proximos_pasos.map((p:string,i:number)=>(
                  <div key={i} style={{display:"flex",gap:14,marginTop:12,fontSize:13,
                    color:"#3a3228",lineHeight:1.6,alignItems:"flex-start"}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:"#EFF6FF",
                      border:"1.5px solid #BFDBFE",display:"flex",alignItems:"center",
                      justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,color:"#2563a8"}}>
                      {i+1}
                    </div>
                    {p}
                  </div>
                ))}
              </div>
            )}

            <button onClick={()=>{setRes(null);setDir("");setM2("");setPx("");}}
              style={{background:"transparent",border:"1.5px solid #E8E2DA",borderRadius:10,
                padding:"11px 0",color:"#9a8f84",fontSize:13,cursor:"pointer",
                fontWeight:500,marginTop:4,width:"100%",transition:"background .15s"}}
              onMouseOver={e=>(e.currentTarget.style.background="#F5F2EE")}
              onMouseOut={e=>(e.currentTarget.style.background="transparent")}>
              ← Nuevo análisis
            </button>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{borderTop:"1px solid #E8E2DA",padding:"22px 32px",
        display:"flex",justifyContent:"space-between",alignItems:"center",background:"#F5F2EE"}}>
        <span style={{fontSize:15,fontWeight:600,letterSpacing:"-.03em",color:"#1a1510"}}>
          un<span style={{color:"#2563a8"}}>earth</span>
        </span>
        <span style={{fontSize:11,color:"#b0a898",letterSpacing:".04em"}}>
          Monterrey, NL · {new Date().getFullYear()}
        </span>
      </footer>
    </>
  );
}