"use client";
import { useState } from "react";

const API = "https://lojqmvpzdhayekzgwazw.supabase.co/functions/v1/analizar_terreno";
const KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvanFtdnB6ZGhheWVremd3YXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzQ1MzUsImV4cCI6MjA4OTcxMDUzNX0.CZpREN5V1i1D8TSNrdmGR0of4F_DuS6EqU9AE9a_eog";
type Tipo = "lineamientos"|"mercado"|"completo";
const fmt = (n:number)=>n?new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n):"—";
const STEPS=["Geocodificando…","Buscando zona…","Consultando PDU…","Investigando mercado…","Generando reporte…"];

export default function Page() {
  const [dir,setDir]=useState(""); const [m2,setM2]=useState(""); const [px,setPx]=useState("");
  const [tipo,setTipo]=useState<Tipo>("lineamientos"); const [prod,setProd]=useState("");
  const [step,setStep]=useState(0); const [loading,setLoading]=useState(false);
  const [res,setRes]=useState<any>(null); const [err,setErr]=useState("");
  const [needsProd,setNeedsProd]=useState(false);

  const needsProduct = tipo==="mercado"||tipo==="completo";

  async function run(productoOverride?:string){
    if(!dir||!m2||!px){setErr("Completa todos los campos.");return;}
    const producto = productoOverride||prod;
    if(needsProduct&&!producto){setErr("Indica qué quieres construir.");return;}
    setErr("");setRes(null);setNeedsProd(false);setLoading(true);
    for(let i=0;i<STEPS.length;i++){setStep(i);await new Promise(r=>setTimeout(r,700));}
    try{
      const body:any={direccion:dir,metros2:parseFloat(m2),precio:parseFloat(px.replace(/,/g,"")),tipo_analisis:tipo};
      if(producto)body.producto_deseado=producto;
      const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${KEY}`},body:JSON.stringify(body)});
      const d=await r.json();
      if(d.necesita_producto){setNeedsProd(true);setLoading(false);return;}
      if(d.ok)setRes(d); else setErr(d.error||"Error inesperado.");
    }catch{setErr("Error de conexión.");}
    finally{setLoading(false);}
  }

  const sem=res?.analisis?.semaforo;
  const semCol=sem==="VERDE"?"#15803d":sem==="AMARILLO"?"#d97706":sem==="ROJO"?"#dc2626":"#94a3b8";

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body{background:#F5F2EE;color:#1a1510;font-family:'Inter',-apple-system,sans-serif;}
      input,select,button{font-family:'Inter',-apple-system,sans-serif;}
      .serif{font-family:'Instrument Serif',Georgia,serif;}
      input::placeholder{color:#b0a898;}
      .f{width:100%;background:#fff;border:1.5px solid #E8E2DA;border-radius:12px;padding:13px 16px;font-size:14px;color:#1a1510;outline:none;transition:border .2s,box-shadow .2s;}
      .f:focus{border-color:#2563a8;box-shadow:0 0 0 4px rgba(37,99,168,.08);}
      .f:disabled{background:#faf9f7;color:#b0a898;}
      .lbl{font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#a09888;margin-bottom:7px;display:block;}
      @keyframes spin{to{transform:rotate(360deg)}}
      .spin{width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0;}
      @keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      .up{animation:up .4s ease forwards;}
      .row2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
      .row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
      @media(max-width:580px){.row2,.row3{grid-template-columns:1fr;}}
      .kgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
      @media(min-width:580px){.kgrid{grid-template-columns:repeat(4,1fr);}}
      .lgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:18px;}
      .pill{display:inline-block;padding:4px 11px;border-radius:100px;font-size:12px;font-weight:500;background:#EEE9E3;color:#5a4f44;margin:3px 3px 0 0;}
      .giro{font-size:12px;color:#3a3228;padding:5px 0;border-bottom:1px solid #F0EBE5;line-height:1.4;}
      .giro:last-child{border-bottom:none;}
      .dot{width:7px;height:7px;border-radius:50%;transition:all .3s;}
      .card{background:#fff;border:1px solid #EAE5DF;border-radius:16px;padding:24px 28px;box-shadow:0 1px 4px rgba(0,0,0,.04);}
    `}</style>

    {/* NAV */}
    <header style={{position:"sticky",top:0,zIndex:20,background:"rgba(245,242,238,.94)",backdropFilter:"blur(12px)",borderBottom:"1px solid #E8E2DA",padding:"0 32px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
          <rect width="36" height="36" rx="9" fill="#DBEAFE"/>
          <path d="M18 8L28 26H8Z" fill="none" stroke="#2563a8" strokeWidth="2.2" strokeLinejoin="round"/>
          <path d="M13 26Q18 16 23 26" fill="none" stroke="#2563a8" strokeWidth="1.6" strokeLinecap="round"/>
          <line x1="18" y1="20" x2="18" y2="26" stroke="#2563a8" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <span style={{fontSize:16,fontWeight:600,letterSpacing:"-.03em"}}>un<span style={{color:"#2563a8"}}>earth</span></span>
      </div>
      <span style={{fontSize:11,fontWeight:500,color:"#c0b8ae",letterSpacing:".07em"}}>MONTERREY</span>
    </header>

    <main style={{maxWidth:700,margin:"0 auto",padding:"64px 24px 100px"}}>

      {/* HERO */}
      {!res&&!loading&&!needsProd&&(
        <div style={{marginBottom:52,textAlign:"center"}} className="up">
          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"#DBEAFE",borderRadius:100,padding:"5px 14px",marginBottom:26}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#2563a8"}}/>
            <span style={{fontSize:11,fontWeight:700,color:"#1d4ed8",letterSpacing:".07em"}}>PDU MONTERREY 2013–2025 · IA</span>
          </div>
          <h1 className="serif" style={{fontSize:"clamp(40px,6vw,64px)",lineHeight:1,color:"#1a1510",marginBottom:18,fontWeight:400}}>
            Unearth your next<br/><em style={{color:"#2563a8"}}>development.</em>
          </h1>
          <p style={{fontSize:16,color:"#7a6f64",lineHeight:1.7,maxWidth:400,margin:"0 auto"}}>
            Ingresa un terreno en Monterrey — la IA hace el resto. Zonificación, mercado y financiero en segundos.
          </p>
        </div>
      )}

      {/* FORM */}
      {!needsProd&&(
        <div className="card up" style={{borderRadius:20,padding:"32px",boxShadow:"0 2px 20px rgba(0,0,0,.07)",marginBottom:24}}>
          <div style={{marginBottom:16}}>
            <label className="lbl">Dirección del terreno</label>
            <input className="f" value={dir} onChange={e=>setDir(e.target.value)} disabled={loading} placeholder="Mitla 418, Mitras Norte, Monterrey"/>
          </div>
          <div className="row3" style={{marginBottom:16}}>
            <div><label className="lbl">Superficie m²</label><input className="f" value={m2} onChange={e=>setM2(e.target.value)} placeholder="300" type="number" disabled={loading}/></div>
            <div><label className="lbl">Precio MXN</label><input className="f" value={px} onChange={e=>setPx(e.target.value)} placeholder="8,000,000" disabled={loading}/></div>
            <div><label className="lbl">Tipo de análisis</label>
              <select className="f" value={tipo} onChange={e=>{setTipo(e.target.value as Tipo);setProd("");}} disabled={loading} style={{cursor:"pointer",background:"#fff"}}>
                <option value="lineamientos">Lineamientos</option>
                <option value="mercado">Mercado</option>
                <option value="completo">Análisis completo</option>
              </select>
            </div>
          </div>
          {needsProduct&&(
            <div style={{marginBottom:16}}>
              <label className="lbl">¿Qué quieres construir?</label>
              <input className="f" value={prod} onChange={e=>setProd(e.target.value)} disabled={loading} placeholder="Ej: departamentos, locales comerciales, oficinas, casas…"/>
            </div>
          )}
          {err&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 14px",color:"#dc2626",fontSize:13,marginBottom:14}}>{err}</div>}
          <button onClick={()=>run()} disabled={loading}
            style={{width:"100%",background:loading?"#d4cfc8":"#1a1510",border:"none",borderRadius:12,padding:"15px 0",color:loading?"#7a6f64":"#fff",fontSize:14,fontWeight:600,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"background .15s"}}>
            {loading?<><span className="spin"/>{STEPS[step]}</>:"Analizar terreno →"}
          </button>
          {loading&&<div style={{display:"flex",justifyContent:"center",gap:8,marginTop:14}}>
            {STEPS.map((_,i)=><div key={i} className="dot" style={{background:i<=step?"#2563a8":"#E8E2DA",transform:i===step?"scale(1.5)":"scale(1)"}}/>)}
          </div>}
        </div>
      )}

      {/* RESULTADO */}
      {res&&!loading&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}} className="up">

          {/* Header */}
          <div className="card" style={{borderRadius:20,padding:"28px 32px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:14}}>
            <div>
              <div className="lbl">Resultado</div>
              <div className="serif" style={{fontSize:28,color:"#1a1510",lineHeight:1.1,marginBottom:5}}>
                {res.ubicacion.distrito}<span style={{color:"#b0a898"}}>, </span>{res.ubicacion.delegacion}
              </div>
              <div style={{fontSize:13,color:"#9a8f84"}}>{res.ubicacion.direccion}</div>
            </div>
            {sem&&(
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 18px",borderRadius:100,background:`${semCol}12`,border:`1.5px solid ${semCol}30`}}>
                <div style={{width:9,height:9,borderRadius:"50%",background:semCol,boxShadow:`0 0 8px ${semCol}`}}/>
                <span style={{fontSize:12,fontWeight:700,color:semCol,letterSpacing:".08em"}}>{sem}</span>
              </div>
            )}
          </div>

          {/* KPIs */}
          <div className="kgrid">
            {[
              {l:"Zona",v:`${res.ubicacion.zona} · ${res.ubicacion.densidad}`},
              {l:"Precio / m²",v:fmt(res.terreno.precio_m2)},
              {l:"M² construibles",v:res.lineamientos?.m2_construibles?`${res.lineamientos.m2_construibles.toLocaleString()} m²`:(res.lineamientos?.cus==="Libre"?"Libre/Dictamen":"—")},
              {l:"Altura máx",v:res.lineamientos?.altura_max||"—"},
            ].map(k=>(
              <div key={k.l} style={{background:"#fff",border:"1px solid #EAE5DF",borderRadius:12,padding:"16px 18px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                <div className="lbl">{k.l}</div>
                <div style={{fontSize:k.v.length>14?13:16,fontWeight:700,color:"#1a1510",letterSpacing:"-.02em",lineHeight:1.3}}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Lineamientos detalle */}
          {res.lineamientos&&(
            <div className="card">
              <div className="lbl">Lineamientos Urbanísticos — PDU Monterrey 2013-2025</div>
              <div className="lgrid" style={{marginTop:8}}>
                {[
                  {l:"COS",v:res.lineamientos.cos,s:"Coeficiente Ocupación"},
                  {l:"CUS",v:res.lineamientos.cus,s:"Coeficiente Utilización"},
                  {l:"CAV",v:res.lineamientos.cav,s:"Coeficiente Área Verde"},
                  {l:"Huella máx",v:res.lineamientos.huella_max_m2?`${res.lineamientos.huella_max_m2} m²`:"—",s:""},
                  {l:"M² construibles",v:res.lineamientos.m2_construibles?`${res.lineamientos.m2_construibles.toLocaleString()} m²`:(res.lineamientos.cus==="Libre"?"Libre":"—"),s:""},
                  {l:"Área verde mín",v:res.lineamientos.area_verde_min_m2?`${res.lineamientos.area_verde_min_m2} m²`:"—",s:""},
                  {l:"Densidad máx",v:res.lineamientos.densidad_max_viv_ha?`${res.lineamientos.densidad_max_viv_ha} viv/Ha`:(res.lineamientos.densidad_viv_ha?`${res.lineamientos.densidad_viv_ha} viv/Ha`:"—"),s:""},
                  {l:"Altura máxima",v:res.lineamientos.altura_max||"—",s:""},
                ].map(k=>(
                  <div key={k.l}>
                    <div style={{fontSize:10,fontWeight:700,color:"#a09888",letterSpacing:".08em",textTransform:"uppercase",marginBottom:4}}>{k.l}</div>
                    {k.s&&<div style={{fontSize:10,color:"#c0b8ae",marginBottom:3}}>{k.s}</div>}
                    <div style={{fontSize:14,fontWeight:600,color:"#1a1510"}}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Giros permitidos */}
          {res.giros?.permitidos?.length>0&&(
            <div className="card">
              <div className="lbl">Giros Permitidos ({res.giros.total_permitidos}) · Condicionados ({res.giros.total_condicionados})</div>
              <div style={{maxHeight:220,overflowY:"auto",marginTop:8}}>
                {res.giros.permitidos.slice(0,40).map((g:string,i:number)=>(
                  <div key={i} className="giro">
                    <span style={{color:"#15803d",fontWeight:700,marginRight:8}}>P</span>{g.split("—")[1]||g}
                  </div>
                ))}
                {res.giros.condicionados?.slice(0,15).map((g:string,i:number)=>(
                  <div key={`c${i}`} className="giro">
                    <span style={{color:"#d97706",fontWeight:700,marginRight:8}}>C</span>{g.split("—")[1]||g}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Análisis de mercado */}
          {res.analisis?.mercado_producto&&(
            <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:16,padding:"24px 28px"}}>
              <div className="lbl" style={{color:"#1d4ed8"}}>Estudio de Mercado — {res.analisis.mercado_producto.tipo}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:18,marginTop:8}}>
                {[
                  {l:"Precio venta m²",v:`${fmt(res.analisis.mercado_producto.precio_venta_m2_min)}–${fmt(res.analisis.mercado_producto.precio_venta_m2_max)}`},
                  {l:"Precio promedio m²",v:fmt(res.analisis.mercado_producto.precio_venta_m2_promedio)},
                  {l:"Renta mensual m²",v:fmt(res.analisis.mercado_producto.precio_renta_mensual_m2)},
                  {l:"Absorción estimada",v:`${res.analisis.mercado_producto.absorcion_estimada_meses} meses`},
                  {l:"Demanda",v:res.analisis.mercado_producto.demanda},
                  {l:"Tendencia",v:res.analisis.mercado_producto.tendencia},
                ].map(k=>(
                  <div key={k.l}>
                    <div style={{fontSize:10,fontWeight:700,color:"#1e40af",letterSpacing:".08em",textTransform:"uppercase",marginBottom:4}}>{k.l}</div>
                    <div style={{fontSize:15,fontWeight:700,color:"#1e3a5f"}}>{k.v}</div>
                  </div>
                ))}
              </div>
              {res.analisis.mercado_producto.proyectos_competencia?.length>0&&(
                <div style={{marginTop:16}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#1e40af",letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>Competencia</div>
                  {res.analisis.mercado_producto.proyectos_competencia.map((p:string,i:number)=>(
                    <div key={i} style={{fontSize:13,color:"#1e3a5f",padding:"4px 0",borderBottom:"1px solid #BFDBFE"}}>{p}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Precio terreno vs mercado */}
          {res.analisis?.precio_terreno_mercado&&(
            <div style={{background:"#fff",border:"1px solid #EAE5DF",borderRadius:16,padding:"24px 28px"}}>
              <div className="lbl">Precio Terreno vs Mercado</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:18,marginTop:8}}>
                {[
                  {l:"Mercado (promedio)",v:fmt(res.analisis.precio_terreno_mercado.promedio_m2)+"/m²"},
                  {l:"Precio pedido",v:fmt(res.terreno.precio_m2)+"/m²"},
                  {l:"Evaluación",v:res.analisis.precio_terreno_mercado.evaluacion_precio?.toUpperCase()},
                  {l:"Diferencia",v:`${res.analisis.precio_terreno_mercado.porcentaje_diferencia>0?"+":""}${res.analisis.precio_terreno_mercado.porcentaje_diferencia}%`},
                ].map(k=>(
                  <div key={k.l}>
                    <div style={{fontSize:10,fontWeight:700,color:"#a09888",letterSpacing:".08em",textTransform:"uppercase",marginBottom:4}}>{k.l}</div>
                    <div style={{fontSize:15,fontWeight:700,color:"#1a1510"}}>{k.v||"—"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entorno (completo) */}
          {res.analisis?.entorno_y_urbanismo&&(
            <div className="card">
              <div className="lbl">Entorno y Urbanismo</div>
              <p style={{fontSize:14,lineHeight:1.7,color:"#3a3228",marginTop:8}}>{res.analisis.entorno_y_urbanismo.descripcion_zona}</p>
              {res.analisis.entorno_y_urbanismo.conectividad&&<p style={{fontSize:13,color:"#7a6f64",marginTop:8,lineHeight:1.6}}>{res.analisis.entorno_y_urbanismo.conectividad}</p>}
            </div>
          )}

          {/* Financiero */}
          {res.analisis?.financiero&&(
            <div className="card">
              <div className="lbl">Análisis Financiero</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:22,marginTop:8}}>
                {[
                  {l:"Precio terreno",v:fmt(res.analisis.financiero.precio_terreno)},
                  {l:"Costo construcción",v:fmt(res.analisis.financiero.costo_construccion_total)},
                  {l:"Costo total proyecto",v:fmt(res.analisis.financiero.costo_total_proyecto)},
                  {l:"Ingreso estimado",v:fmt(res.analisis.financiero.ingreso_total_estimado)},
                  {l:"Utilidad bruta",v:fmt(res.analisis.financiero.utilidad_bruta)},
                  {l:"Margen bruto",v:`${res.analisis.financiero.margen_bruto_pct}%`},
                  {l:"ROI",v:`${res.analisis.financiero.roi_pct}%`},
                  {l:"TIR estimada",v:`${res.analisis.financiero.tir_estimada_pct}%`},
                  {l:"Plazo",v:`${res.analisis.financiero.plazo_meses} meses`},
                ].map(k=>(
                  <div key={k.l}>
                    <div style={{fontSize:10,fontWeight:700,color:"#a09888",letterSpacing:".08em",textTransform:"uppercase",marginBottom:5}}>{k.l}</div>
                    <div style={{fontSize:18,fontWeight:700,color:"#1a1510",letterSpacing:"-.02em"}}>{k.v||"—"}</div>
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
                <div key={i} style={{display:"flex",gap:10,marginTop:10,fontSize:13,color:"#7c2d12",lineHeight:1.55,alignItems:"flex-start"}}>
                  <span style={{color:"#f97316",fontWeight:800,flexShrink:0}}>!</span>{f}
                </div>
              ))}
            </div>
          )}

          {/* Fortalezas */}
          {res.analisis?.fortalezas?.length>0&&(
            <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:16,padding:"24px 28px"}}>
              <div className="lbl" style={{color:"#15803d"}}>Fortalezas</div>
              {res.analisis.fortalezas.map((f:string,i:number)=>(
                <div key={i} style={{display:"flex",gap:10,marginTop:10,fontSize:13,color:"#14532d",lineHeight:1.55,alignItems:"flex-start"}}>
                  <span style={{color:"#22c55e",fontWeight:800,flexShrink:0}}>✓</span>{f}
                </div>
              ))}
            </div>
          )}

          {/* Recomendación / justificación semáforo */}
          {(res.analisis?.recomendacion||res.analisis?.justificacion_semaforo)&&(
            <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:16,padding:"24px 28px"}}>
              <div className="lbl" style={{color:"#1d4ed8"}}>Recomendación</div>
              <p style={{fontSize:14,lineHeight:1.75,color:"#1e3a5f",margin:0,marginTop:8}}>
                {res.analisis.recomendacion||res.analisis.justificacion_semaforo}
              </p>
            </div>
          )}

          {/* Veredicto */}
          {res.analisis?.veredicto&&(
            <div style={{background:"#fff",border:`2px solid ${semCol}`,borderRadius:16,padding:"28px 32px",boxShadow:`0 0 0 4px ${semCol}10`}}>
              <div className="lbl">Veredicto</div>
              <div className="serif" style={{fontSize:36,color:semCol,lineHeight:1,marginBottom:14,marginTop:4}}>{res.analisis.veredicto}</div>
              <p style={{fontSize:14,color:"#3a3228",lineHeight:1.7,margin:0}}>{res.analisis.justificacion_veredicto}</p>
            </div>
          )}

          {/* Próximos pasos */}
          {res.analisis?.proximos_pasos?.length>0&&(
            <div className="card">
              <div className="lbl">Próximos Pasos</div>
              {res.analisis.proximos_pasos.map((p:string,i:number)=>(
                <div key={i} style={{display:"flex",gap:14,marginTop:12,fontSize:13,color:"#3a3228",lineHeight:1.6,alignItems:"flex-start"}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:"#EFF6FF",border:"1.5px solid #BFDBFE",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,color:"#2563a8"}}>{i+1}</div>
                  {p}
                </div>
              ))}
            </div>
          )}

          <button onClick={()=>{setRes(null);setDir("");setM2("");setPx("");setProd("");}}
            style={{background:"transparent",border:"1.5px solid #E8E2DA",borderRadius:10,padding:"11px 0",color:"#9a8f84",fontSize:13,cursor:"pointer",fontWeight:500,width:"100%"}}
            onMouseOver={e=>(e.currentTarget.style.background="#F5F2EE")}
            onMouseOut={e=>(e.currentTarget.style.background="transparent")}>
            ← Nuevo análisis
          </button>
        </div>
      )}
    </main>

    <footer style={{borderTop:"1px solid #E8E2DA",padding:"20px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#F5F2EE"}}>
      <span style={{fontSize:15,fontWeight:600,letterSpacing:"-.03em"}}>un<span style={{color:"#2563a8"}}>earth</span></span>
      <span style={{fontSize:11,color:"#b0a898",letterSpacing:".04em"}}>Monterrey, NL · {new Date().getFullYear()}</span>
    </footer>
  </>);
}