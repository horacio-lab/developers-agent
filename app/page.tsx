"use client";
import { useState, useRef, useEffect } from "react";

const API = "https://lojqmvpzdhayekzgwazw.supabase.co/functions/v1/analizar_terreno";
const KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvanFtdnB6ZGhheWVremd3YXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzQ1MzUsImV4cCI6MjA4OTcxMDUzNX0.CZpREN5V1i1D8TSNrdmGR0of4F_DuS6EqU9AE9a_eog";
type Tipo = "lineamientos"|"mercado"|"completo";

const $   = (n:any,m="c")=>n!=null&&!isNaN(+n)?(m==="c"?new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(+n):new Intl.NumberFormat("es-MX",{maximumFractionDigits:0}).format(+n)):"—";
const pct = (n:any)=>n!=null&&!isNaN(+n)?`${(+n).toFixed(1)}%`:"—";
const STEPS=["Geocodificando…","Buscando zona…","Consultando PDU…","Investigando mercado…","Generando reporte…"];

/* ── Bar chart ─────────────────────────────────────────── */
function BarChart({bars,h=190}:{bars:{l:string;v:number;c:string}[];h?:number}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const ctx=el.getContext("2d"); if(!ctx) return;
    const dpr=window.devicePixelRatio||1;
    const W=el.parentElement?.clientWidth||500;
    el.width=W*dpr; el.height=h*dpr; el.style.width=W+"px"; el.style.height=h+"px";
    ctx.scale(dpr,dpr);
    const p={t:24,r:10,b:48,l:68};
    const cW=W-p.l-p.r, cH=h-p.t-p.b;
    const maxV=Math.max(...bars.map(b=>b.v),1);
    const bw=cW/bars.length*0.6, gap=cW/bars.length;
    ctx.clearRect(0,0,W,h);
    [.25,.5,.75,1].forEach(f=>{
      const y=p.t+cH*(1-f);
      ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(W-p.r,y);
      ctx.strokeStyle="rgba(0,0,0,.05)";ctx.lineWidth=1;ctx.stroke();
      ctx.font="10px Inter,sans-serif";ctx.fillStyle="#a09888";ctx.textAlign="right";
      ctx.fillText(`$${(maxV*f/1000).toFixed(0)}k`,p.l-4,y+3);
    });
    bars.forEach((b,i)=>{
      const x=p.l+i*gap+gap/2-bw/2;
      const bh=(b.v/maxV)*cH*.88;
      const y=p.t+cH-bh;
      ctx.fillStyle=b.c;
      if(ctx.roundRect)ctx.roundRect(x,y,bw,bh,4); else ctx.rect(x,y,bw,bh);
      ctx.fill();
      ctx.fillStyle="#1a1510";ctx.textAlign="center";ctx.font="bold 11px Inter,sans-serif";
      ctx.fillText(`$${(b.v/1000).toFixed(0)}k`,x+bw/2,y-5);
      const words=b.l.split(" ");
      ctx.fillStyle="#a09888";ctx.font="9px Inter,sans-serif";
      words.forEach((w,wi)=>ctx.fillText(w,x+bw/2,h-p.b+14+wi*11));
    });
  },[bars,h]);
  return <canvas ref={ref}/>;
}

/* ── Shared sub-components ────────────────────────────── */
const Row=({l,v,col}:{l:string;v:string;col?:string})=>(
  <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #F0EBE5",fontSize:13}}>
    <span style={{color:"#7a6f64"}}>{l}</span>
    <span style={{fontWeight:600,color:col||"#1a1510"}}>{v}</span>
  </div>
);

const Tag=({c,txt}:{c:string;txt:string})=>(
  <span style={{background:"#EEE9E3",borderRadius:100,padding:"3px 10px",fontSize:11,fontWeight:500,color:"#5a4f44",margin:"3px 3px 0 0",display:"inline-block"}}>{txt}</span>
);

export default function Page(){
  const [dir,setDir]=useState(""); const [m2,setM2]=useState(""); const [px,setPx]=useState("");
  const [tipo,setTipo]=useState<Tipo>("lineamientos"); const [prod,setProd]=useState("");
  const [step,setStep]=useState(0); const [loading,setLoading]=useState(false);
  const [res,setRes]=useState<any>(null); const [err,setErr]=useState("");
  const needsProd=tipo==="mercado"||tipo==="completo";

  async function run(){
    if(!dir||!m2||!px){setErr("Completa todos los campos.");return;}
    if(needsProd&&!prod){setErr("Indica qué quieres construir.");return;}
    setErr(""); setRes(null); setLoading(true);
    for(let i=0;i<STEPS.length;i++){setStep(i);await new Promise(r=>setTimeout(r,680));}
    try{
      const body:any={direccion:dir,metros2:parseFloat(m2),precio:parseFloat(px.replace(/,/g,"")),tipo_analisis:tipo};
      if(prod)body.producto_deseado=prod;
      const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${KEY}`},body:JSON.stringify(body)});
      const d=await r.json();
      if(d.necesita_producto){setErr("Indica qué quieres construir.");setLoading(false);return;}
      if(d.ok)setRes(d); else setErr(d.error||"Error inesperado.");
    }catch{setErr("Error de conexión.");}
    finally{setLoading(false);}
  }

  const sem=res?.analisis?.semaforo;
  const semCol=sem==="VERDE"?"#15803d":sem==="AMARILLO"?"#d97706":sem==="ROJO"?"#dc2626":null;
  const mp=res?.analisis?.mercado_producto||res?.analisis?.mercado;
  const pt=res?.analisis?.precio_terreno_mercado||(res?.analisis?.mercado?{
    promedio_m2:res.analisis.mercado.precio_terreno_mercado_m2_promedio,
    evaluacion_precio:res.analisis.mercado.evaluacion_precio_terreno,
    porcentaje_diferencia:res.analisis.mercado.porcentaje_sobre_mercado,
  }:null);

  // Recalculate financials for consistency
  const fin=res?.analisis?.financiero;
  const finF=fin?(()=>{
    const ing=fin.ingreso_total_estimado||0;
    const cost=fin.costo_total_proyecto||0;
    const util=ing-cost;
    const mg=ing>0?util/ing*100:0;
    const roi=cost>0?util/cost*100:0;
    const plazo=fin.plazo_meses||24;
    const tir=(Math.pow(1+roi/100,12/plazo)-1)*100;
    return{...fin,utilidad_bruta:util,margen_bruto_pct:Math.round(mg*10)/10,roi_pct:Math.round(roi*10)/10,tir_estimada_pct:Math.round(tir*10)/10};
  })():null;

  const densVivHa=parseFloat(res?.lineamientos?.densidad_max_viv_ha)||0;
  const m2Terreno=res?.terreno?.metros2||0;
  const unidadesMax=densVivHa>0?Math.floor(densVivHa*(m2Terreno/10000)):null;

  const C={bg:"#F5F2EE",white:"#fff",dark:"#1a1510",blue:"#2563a8",border:"#EAE5DF",mid:"#7a6f64",light:"#a09888",vl:"#c0b8ae"};

  /* ── LINEAMIENTOS BLOCK ── */
  const LineamientosBlock=()=>(
    <>
      <div className="card">
        <div className="lbl" style={{marginBottom:14}}>Lineamientos Urbanísticos — PDU Monterrey 2013-2025</div>
        <div className="ga">
          {[
            {l:"COS",v:res.lineamientos?.cos,s:"Coef. Ocupación Suelo"},
            {l:"CUS",v:res.lineamientos?.cus,s:"Coef. Utilización Suelo"},
            {l:"CAV",v:res.lineamientos?.cav,s:"Coef. Área Verde"},
            {l:"Huella máx",v:res.lineamientos?.huella_max_m2?`${$(res.lineamientos.huella_max_m2,"n")} m²`:"—",s:"área de desplante"},
            {l:"M² construibles",v:res.lineamientos?.m2_construibles?`${$(res.lineamientos.m2_construibles,"n")} m²`:"—",s:"total en todos niveles"},
            {l:"Área verde mín",v:res.lineamientos?.area_verde_min_m2?`${$(res.lineamientos.area_verde_min_m2,"n")} m²`:"—",s:""},
            {l:"Densidad máx",v:res.lineamientos?.densidad_max_viv_ha&&res.lineamientos.densidad_max_viv_ha!=="N/D"?`${res.lineamientos.densidad_max_viv_ha} viv/Ha`:"—",s:""},
            {l:"Unidades máx (PDU)",v:unidadesMax!=null?`${unidadesMax} unidades`:"—",s:unidadesMax!=null?`${densVivHa} viv/Ha × ${m2Terreno}m²/10,000`:""},
            {l:"Altura máxima",v:res.lineamientos?.altura_max||"—",s:""},
          ].map(k=>(
            <div key={k.l} style={{background:C.bg,borderRadius:10,padding:"14px 16px"}}>
              <div style={{fontSize:10,fontWeight:700,color:C.light,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:k.s?2:6}}>{k.l}</div>
              {k.s&&<div style={{fontSize:10,color:C.vl,marginBottom:4}}>{k.s}</div>}
              <div style={{fontSize:15,fontWeight:700,color:C.dark}}>{k.v||"—"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Giros */}
      {res.giros?.permitidos?.length>0&&(
        <div className="g2">
          <div className="card">
            <div className="lbl" style={{marginBottom:10}}>Giros Permitidos (P) — {res.giros.total_permitidos}</div>
            <div style={{maxHeight:300,overflowY:"auto" as const}}>
              {res.giros.permitidos.map((g:string,i:number)=>(
                <div key={i} style={{fontSize:12,color:"#3a3228",padding:"5px 0",borderBottom:"1px solid #F0EBE5",lineHeight:1.4}}>
                  <span style={{color:"#15803d",fontWeight:700,marginRight:8,fontSize:10}}>P</span>{g.split("—")[1]||g}
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="lbl" style={{marginBottom:10}}>Giros Condicionados (C) — {res.giros.total_condicionados}</div>
            <div style={{maxHeight:300,overflowY:"auto" as const}}>
              {res.giros.condicionados?.map((g:string,i:number)=>(
                <div key={i} style={{fontSize:12,color:"#3a3228",padding:"5px 0",borderBottom:"1px solid #F0EBE5",lineHeight:1.4}}>
                  <span style={{color:"#d97706",fontWeight:700,marginRight:8,fontSize:10}}>C</span>{g.split("—")[1]||g}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );

  /* ── MERCADO BLOCK ── */
  const MercadoBlock=()=>mp?(
    <>
      {/* Compat badge */}
      {res.analisis?.producto_compatible!=null&&(
        <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 18px",background:res.analisis.producto_compatible?"#F0FDF4":"#FEF2F2",border:`1px solid ${res.analisis.producto_compatible?"#BBF7D0":"#FECACA"}`,borderRadius:12}}>
          <div style={{width:9,height:9,borderRadius:"50%",background:res.analisis.producto_compatible?"#15803d":"#dc2626",flexShrink:0,marginTop:3}}/>
          <div>
            <span style={{fontSize:13,fontWeight:600,color:res.analisis.producto_compatible?"#15803d":"#dc2626"}}>
              {res.analisis.producto_compatible?"Producto compatible con la zona":"Producto NO compatible con la zona"}
            </span>
            {(res.analisis.motivo_compatibilidad||res.analisis?.viabilidad_tecnica?.giro_aplicable)&&(
              <div style={{fontSize:12,color:C.mid,marginTop:3}}>{res.analisis.motivo_compatibilidad||res.analisis.viabilidad_tecnica?.giro_aplicable}</div>
            )}
          </div>
        </div>
      )}

      {/* KPIs precio terreno */}
      {pt&&(
        <div className="g4">
          {[
            {l:"Mercado — promedio zona",v:`${$(pt.promedio_m2)}/m²`,s:"precio de terrenos",col:undefined},
            {l:"Precio pedido",v:`${$(res.terreno.precio_m2)}/m²`,s:"terreno actual",col:undefined},
            {l:"Evaluación",v:(pt.evaluacion_precio||"").toUpperCase(),s:"",col:undefined},
            {l:"Diferencia vs mercado",v:`${pt.porcentaje_diferencia>0?"+":""}${pt.porcentaje_diferencia}%`,s:"",col:pt.porcentaje_diferencia>20?"#dc2626":pt.porcentaje_diferencia>5?"#d97706":"#15803d"},
          ].map(k=>(
            <div key={k.l} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px"}}>
              <div style={{fontSize:10,fontWeight:700,color:C.light,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:6}}>{k.l}</div>
              <div style={{fontSize:16,fontWeight:700,color:k.col||C.dark}}>{k.v}</div>
              {k.s&&<div style={{fontSize:11,color:C.vl,marginTop:3}}>{k.s}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Gráfica precios + competencia */}
      <div className="g2">
        <div className="card">
          <div className="lbl" style={{marginBottom:12}}>Precios de mercado — {mp.tipo||prod} / m²</div>
          <div style={{width:"100%",overflow:"hidden"}}>
            <BarChart h={200} bars={[
              {l:"Venta mín",v:mp.precio_venta_m2_min||mp.precio_venta_producto_m2||0,c:"#93c5fd"},
              {l:"Venta prom",v:mp.precio_venta_m2_promedio||mp.precio_venta_producto_m2||0,c:"#2563a8"},
              {l:"Venta máx",v:mp.precio_venta_m2_max||mp.precio_venta_producto_m2||0,c:"#1d4ed8"},
              {l:"Renta ×10",v:(mp.precio_renta_mensual_m2||mp.precio_renta_producto_m2_mes||0)*10,c:"#d97706"},
            ]}/>
          </div>
          <div style={{display:"flex",gap:16,marginTop:12,fontSize:11,color:C.mid,flexWrap:"wrap" as const,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            <span>Absorción: <strong>{mp.absorcion_estimada_meses||mp.absorcion_meses} meses</strong></span>
            <span>Demanda: <strong style={{color:mp.demanda==="alta"?"#15803d":mp.demanda==="baja"?"#dc2626":"#d97706"}}>{(mp.demanda||"").toUpperCase()}</strong></span>
            <span>Tendencia: <strong>{(mp.tendencia||"").toUpperCase()}</strong></span>
          </div>
        </div>

        <div className="card">
          <div className="lbl" style={{marginBottom:10}}>Proyectos en competencia</div>
          {Array.isArray(mp.proyectos_competencia)
            ?mp.proyectos_competencia.map((p:string,i:number)=>(
              <div key={i} style={{display:"flex",gap:8,padding:"7px 0",borderBottom:"1px solid #F0EBE5",fontSize:13,color:"#3a3228",lineHeight:1.4,alignItems:"flex-start"}}>
                <span style={{color:C.blue,fontWeight:700,flexShrink:0}}>→</span>{p}
              </div>
            ))
            :<p style={{fontSize:13,color:"#3a3228",lineHeight:1.65}}>{mp.competencia}</p>
          }
          {res.analisis?.potencial_proyecto&&(
            <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
              <div className="lbl" style={{marginBottom:8}}>Potencial del proyecto</div>
              <div className="g2" style={{gap:10}}>
                {[
                  {l:"Unidades PDU",v:unidadesMax!=null?`${unidadesMax} unidades`:`${res.analisis.potencial_proyecto.unidades_estimadas}`},
                  {l:"M²/unidad",v:`${res.analisis.potencial_proyecto.m2_por_unidad} m²`},
                  {l:"Ingreso venta",v:$(res.analisis.potencial_proyecto.ingreso_venta_estimado)},
                  {l:"Renta anual",v:$(res.analisis.potencial_proyecto.ingreso_renta_estimado_anual)},
                ].map(k=>(
                  <div key={k.l}><div style={{fontSize:10,color:C.light,marginBottom:3}}>{k.l}</div><div style={{fontSize:14,fontWeight:700}}>{k.v}</div></div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  ):null;

  /* ── HEADER NEGRO ── */
  const Header=()=>(
    <div style={{background:C.dark,borderRadius:16,padding:"22px 28px",marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap" as const,gap:12,marginBottom:16}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:".1em",marginBottom:6}}>
            {res.tipo_analisis==="lineamientos"?"LINEAMIENTOS":res.tipo_analisis==="mercado"?"ESTUDIO DE MERCADO":"ANÁLISIS COMPLETO"} · {res.ubicacion.distrito?.toUpperCase()}, {res.ubicacion.delegacion?.toUpperCase()}
          </div>
          <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:24,color:"#fff",lineHeight:1.1}}>{res.ubicacion.direccion}</div>
        </div>
        {semCol&&(
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 18px",borderRadius:100,background:`${semCol}22`,border:`1.5px solid ${semCol}44`}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:semCol,boxShadow:`0 0 8px ${semCol}`}}/>
            <span style={{fontSize:12,fontWeight:700,color:semCol,letterSpacing:".08em"}}>{sem}</span>
          </div>
        )}
      </div>
      <div className="g4">
        {[
          {l:"ZONA",v:`${res.ubicacion.zona} · ${res.ubicacion.densidad}`},
          {l:"PRECIO / M² TERRENO",v:$(res.terreno.precio_m2)},
          {l:"M² CONSTRUIBLES",v:res.lineamientos?.m2_construibles?`${$(res.lineamientos.m2_construibles,"n")} m²`:"—"},
          {l:"UNIDADES MÁX (PDU)",v:unidadesMax!=null?`${unidadesMax} unidades`:"—"},
        ].map(k=>(
          <div key={k.l} style={{background:"rgba(255,255,255,.07)",borderRadius:10,padding:"10px 14px"}}>
            <div style={{fontSize:9,color:"rgba(255,255,255,.4)",textTransform:"uppercase" as const,letterSpacing:".08em",marginBottom:4}}>{k.l}</div>
            <div style={{fontSize:k.v.length>16?12:15,fontWeight:700,color:"#fff",letterSpacing:"-.01em",lineHeight:1.2}}>{k.v}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      html,body{background:#F5F2EE;color:#1a1510;font-family:'Inter',-apple-system,sans-serif;}
      input,select,button{font-family:inherit;}
      input::placeholder{color:#b0a898;}
      .f{width:100%;background:#fff;border:1.5px solid #EAE5DF;border-radius:10px;padding:11px 14px;font-size:14px;color:#1a1510;outline:none;transition:border .2s,box-shadow .2s;}
      .f:focus{border-color:#2563a8;box-shadow:0 0 0 3px rgba(37,99,168,.08);}
      .f:disabled{opacity:.5;}
      .lbl{font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#a09888;margin-bottom:6px;display:block;}
      .card{background:#fff;border:1px solid #EAE5DF;border-radius:14px;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,.04);}
      .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
      .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
      .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
      .ga{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:12px;}
      @media(max-width:720px){.g2,.g3,.g4{grid-template-columns:1fr 1fr!important;}}
      @media(max-width:480px){.g2,.g3,.g4,.ga{grid-template-columns:1fr!important;}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      .up{animation:up .3s ease forwards;}
    `}</style>

    {/* NAV */}
    <header style={{position:"sticky",top:0,zIndex:30,background:"rgba(245,242,238,.95)",backdropFilter:"blur(10px)",borderBottom:"1px solid #EAE5DF",padding:"0 32px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <svg width="26" height="26" viewBox="0 0 36 36" fill="none">
          <rect width="36" height="36" rx="9" fill="#DBEAFE"/>
          <path d="M18 8L28 26H8Z" fill="none" stroke="#2563a8" strokeWidth="2.2" strokeLinejoin="round"/>
          <path d="M13 26Q18 16 23 26" fill="none" stroke="#2563a8" strokeWidth="1.6" strokeLinecap="round"/>
          <line x1="18" y1="20" x2="18" y2="26" stroke="#2563a8" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <span style={{fontSize:16,fontWeight:600,letterSpacing:"-.03em"}}>un<span style={{color:"#2563a8"}}>earth</span></span>
      </div>
      <span style={{fontSize:11,fontWeight:500,color:"#c0b8ae",letterSpacing:".07em"}}>MONTERREY MVP</span>
    </header>

    <div style={{maxWidth:1200,margin:"0 auto",padding:"32px 28px 100px",width:"100%"}}>

      {/* HERO */}
      {!res&&!loading&&(
        <div style={{textAlign:"center",marginBottom:48}} className="up">
          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"#DBEAFE",borderRadius:100,padding:"5px 14px",marginBottom:24}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#2563a8"}}/>
            <span style={{fontSize:10,fontWeight:700,color:"#1d4ed8",letterSpacing:".08em"}}>PDU MONTERREY 2013–2025 · IA</span>
          </div>
          <h1 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:"clamp(40px,5.5vw,64px)",lineHeight:1,color:"#1a1510",marginBottom:16,fontWeight:400}}>
            Unearth your next<br/><em style={{color:"#2563a8"}}>development.</em>
          </h1>
          <p style={{fontSize:16,color:"#7a6f64",lineHeight:1.7,maxWidth:420,margin:"0 auto"}}>
            Dirección, metros y precio — la IA hace el análisis completo.
          </p>
        </div>
      )}

      {/* FORM */}
      <div className="card up" style={{marginBottom:28,borderRadius:18,padding:"28px 32px",boxShadow:"0 2px 16px rgba(0,0,0,.07)"}}>
        <div className="g3" style={{marginBottom:14}}>
          <div style={{gridColumn:"1/-1"}}>
            <label className="lbl">Dirección del terreno</label>
            <input className="f" value={dir} onChange={e=>setDir(e.target.value)} disabled={loading} placeholder="Ej: Mitla 418, Mitras Norte, Monterrey"/>
          </div>
          <div><label className="lbl">Superficie m²</label><input className="f" value={m2} onChange={e=>setM2(e.target.value)} disabled={loading} placeholder="300" type="number"/></div>
          <div><label className="lbl">Precio MXN</label><input className="f" value={px} onChange={e=>setPx(e.target.value)} disabled={loading} placeholder="8,000,000"/></div>
          <div>
            <label className="lbl">Tipo de análisis</label>
            <select className="f" value={tipo} onChange={e=>{setTipo(e.target.value as Tipo);setProd("");}} disabled={loading} style={{cursor:"pointer"}}>
              <option value="lineamientos">Lineamientos urbanísticos</option>
              <option value="mercado">Estudio de mercado</option>
              <option value="completo">Análisis completo</option>
            </select>
          </div>
        </div>
        {needsProd&&(
          <div style={{marginBottom:14}}>
            <label className="lbl">¿Qué quieres construir?</label>
            <input className="f" value={prod} onChange={e=>setProd(e.target.value)} disabled={loading} placeholder="departamentos, casas, locales comerciales, oficinas…"/>
          </div>
        )}
        {err&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 14px",color:"#dc2626",fontSize:13,marginBottom:12}}>{err}</div>}
        <div style={{display:"flex",gap:10}}>
          <button onClick={run} disabled={loading} style={{flex:1,background:loading?"#d4cfc8":"#1a1510",border:"none",borderRadius:10,padding:"13px 0",color:loading?"#7a6f64":"#fff",fontSize:14,fontWeight:600,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            {loading?<><div style={{width:15,height:15,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>{STEPS[step]}</>:"Analizar terreno →"}
          </button>
          {res&&<button onClick={()=>{setRes(null);setDir("");setM2("");setPx("");setProd("");}} style={{background:"transparent",border:"1.5px solid #EAE5DF",borderRadius:10,padding:"13px 18px",color:"#7a6f64",fontSize:13,cursor:"pointer",fontWeight:500,whiteSpace:"nowrap"}}>← Nuevo</button>}
        </div>
        {loading&&<div style={{display:"flex",justifyContent:"center",gap:8,marginTop:14}}>
          {STEPS.map((_,i)=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:i<=step?"#2563a8":"#EAE5DF",transform:i===step?"scale(1.5)":"scale(1)",transition:"all .3s"}}/>)}
        </div>}
      </div>

      {/* ══════════════ LINEAMIENTOS ══════════════ */}
      {res&&!loading&&res.tipo_analisis==="lineamientos"&&(
        <div className="up" style={{display:"flex",flexDirection:"column",gap:14}}>
          <Header/>
          <LineamientosBlock/>
        </div>
      )}

      {/* ══════════════ MERCADO ══════════════ */}
      {res&&!loading&&res.tipo_analisis==="mercado"&&(
        <div className="up" style={{display:"flex",flexDirection:"column",gap:14}}>
          <Header/>
          <MercadoBlock/>
          {/* Resumen IA */}
          {res.analisis?.recomendacion&&(
            <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:14,padding:"20px 24px"}}>
              <div className="lbl" style={{color:"#1d4ed8",marginBottom:8}}>Análisis IA — Recomendación</div>
              <p style={{fontSize:14,lineHeight:1.75,color:"#1e3a5f"}}>{res.analisis.recomendacion}</p>
            </div>
          )}
          {/* Lineamientos completos */}
          <LineamientosBlock/>
        </div>
      )}

      {/* ══════════════ COMPLETO ══════════════ */}
      {res&&!loading&&res.tipo_analisis==="completo"&&(
        <div className="up" style={{display:"flex",flexDirection:"column",gap:14}}>
          <Header/>

          {/* Resumen ejecutivo */}
          {res.analisis?.resumen_ejecutivo&&(
            <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:14,padding:"20px 24px"}}>
              <div className="lbl" style={{color:"#1d4ed8",marginBottom:8}}>Resumen Ejecutivo</div>
              <p style={{fontSize:14,lineHeight:1.75,color:"#1e3a5f"}}>{res.analisis.resumen_ejecutivo}</p>
            </div>
          )}

          {/* === SECCIÓN 1: LINEAMIENTOS === */}
          <div style={{borderLeft:"3px solid #2563a8",paddingLeft:16}}>
            <div style={{fontSize:12,fontWeight:700,color:"#2563a8",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:12}}>1. Lineamientos Urbanísticos y Giros</div>
          </div>
          <LineamientosBlock/>

          {/* Reglamento de construcción */}
          {res.analisis?.viabilidad_tecnica&&(
            <div className="card">
              <div className="lbl" style={{marginBottom:14}}>Reglamento de Construcción — Restricciones del Predio</div>
              <div className="g2" style={{marginBottom:14}}>
                <div>
                  <div className="g2" style={{gap:10}}>
                    {[
                      {l:"Frente estimado",v:res.analisis.viabilidad_tecnica.frente_estimado_m?`${res.analisis.viabilidad_tecnica.frente_estimado_m} m`:"—"},
                      {l:"Restricción frontal",v:res.analisis.viabilidad_tecnica.restriccion_frontal_m?`${res.analisis.viabilidad_tecnica.restriccion_frontal_m} m`:"—"},
                      {l:"Restricción lateral",v:res.analisis.viabilidad_tecnica.restriccion_lateral_m?`${res.analisis.viabilidad_tecnica.restriccion_lateral_m} m`:"—"},
                      {l:"Restricción posterior",v:res.analisis.viabilidad_tecnica.restriccion_posterior_m?`${res.analisis.viabilidad_tecnica.restriccion_posterior_m} m`:"—"},
                      {l:"Área neta construible",v:res.analisis.viabilidad_tecnica.area_neta_construible_m2?`${$(res.analisis.viabilidad_tecnica.area_neta_construible_m2,"n")} m²`:"—"},
                      {l:"Niveles posibles",v:res.analisis.viabilidad_tecnica.niveles_posibles||"—"},
                    ].map(k=>(
                      <div key={k.l} style={{background:"#F5F2EE",borderRadius:10,padding:"12px 14px"}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#a09888",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4}}>{k.l}</div>
                        <div style={{fontSize:14,fontWeight:700,color:"#1a1510"}}>{k.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  {res.analisis.viabilidad_tecnica.retos_constructivos?.length>0&&(
                    <>
                      <div className="lbl" style={{marginBottom:8}}>Retos constructivos</div>
                      {res.analisis.viabilidad_tecnica.retos_constructivos.map((r:string,i:number)=>(
                        <div key={i} style={{display:"flex",gap:8,padding:"5px 0",borderBottom:"1px solid #F0EBE5",fontSize:13,color:"#3a3228",lineHeight:1.4}}>
                          <span style={{color:"#f97316",fontWeight:700,flexShrink:0}}>·</span>{r}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Estacionamiento */}
          {res.analisis?.estacionamiento&&(
            <div style={{background:res.analisis.estacionamiento.viable===false?"#FFF7ED":"#F0FDF4",border:`1px solid ${res.analisis.estacionamiento.viable===false?"#FED7AA":"#BBF7D0"}`,borderRadius:14,padding:"20px 24px"}}>
              <div className="lbl" style={{color:res.analisis.estacionamiento.viable===false?"#c2410c":"#15803d",marginBottom:12}}>Análisis de Estacionamiento</div>
              <div className="g4" style={{marginBottom:12}}>
                {[
                  {l:"Cajones requeridos",v:`${res.analisis.estacionamiento.cajones_requeridos} cajones`},
                  {l:"Área requerida",v:`${$(res.analisis.estacionamiento.area_requerida_m2,"n")} m²`},
                  {l:"Área disponible est.",v:`${$(res.analisis.estacionamiento.area_disponible_estimada_m2,"n")} m²`},
                  {l:"Viabilidad",v:res.analisis.estacionamiento.viable?"VIABLE":"RESTRICCIÓN CRÍTICA",col:res.analisis.estacionamiento.viable?"#15803d":"#dc2626"},
                ].map(k=>(
                  <div key={k.l}>
                    <div style={{fontSize:10,fontWeight:700,color:"#a09888",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4}}>{k.l}</div>
                    <div style={{fontSize:15,fontWeight:700,color:(k as any).col||"#1a1510"}}>{k.v}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:12,color:"#7a6f64",lineHeight:1.6}}>
                <strong>Cálculo:</strong> {res.analisis.estacionamiento.calculo}
              </div>
              {res.analisis.estacionamiento.notas&&(
                <div style={{fontSize:12,color:"#7a6f64",lineHeight:1.6,marginTop:6}}>
                  <strong>Notas:</strong> {res.analisis.estacionamiento.notas}
                </div>
              )}
            </div>
          )}

          {/* === SECCIÓN 2: ESTUDIO DE MERCADO === */}
          <div style={{borderLeft:"3px solid #d97706",paddingLeft:16,marginTop:8}}>
            <div style={{fontSize:12,fontWeight:700,color:"#d97706",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:12}}>2. Estudio de Mercado</div>
          </div>
          <MercadoBlock/>

          {/* Entorno */}
          {res.analisis?.entorno_y_urbanismo&&(
            <div className="card">
              <div className="lbl" style={{marginBottom:10}}>Entorno y Urbanismo</div>
              <p style={{fontSize:14,lineHeight:1.7,color:"#3a3228",marginBottom:8}}>{res.analisis.entorno_y_urbanismo.descripcion_zona}</p>
              {res.analisis.entorno_y_urbanismo.conectividad&&<p style={{fontSize:13,color:"#7a6f64",lineHeight:1.6,marginBottom:8}}>{res.analisis.entorno_y_urbanismo.conectividad}</p>}
              {res.analisis.entorno_y_urbanismo.tendencia_crecimiento&&<p style={{fontSize:13,color:"#7a6f64",lineHeight:1.6,marginBottom:8}}>{res.analisis.entorno_y_urbanismo.tendencia_crecimiento}</p>}
              {res.analisis.entorno_y_urbanismo.servicios_cercanos?.length>0&&(
                <div style={{marginTop:8}}>
                  {res.analisis.entorno_y_urbanismo.servicios_cercanos.map((s:string,i:number)=><Tag key={i} c="" txt={s}/>)}
                </div>
              )}
            </div>
          )}

          {/* === SECCIÓN 3: ANÁLISIS FINANCIERO === */}
          <div style={{borderLeft:"3px solid #15803d",paddingLeft:16,marginTop:8}}>
            <div style={{fontSize:12,fontWeight:700,color:"#15803d",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:12}}>3. Análisis Financiero</div>
          </div>

          {finF&&(
            <div className="card">
              <div className="lbl" style={{marginBottom:14}}>Desglose financiero completo</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:12}}>
                {[
                  {l:"Precio terreno",v:$(finF.precio_terreno)},
                  {l:"Costo construcción",v:$(finF.costo_construccion_total)},
                  {l:"Estacionamiento",v:$(finF.costo_estacionamiento||0)},
                  {l:"Indirectos",v:`${finF.gastos_indirectos_pct||0}% = ${$(finF.gastos_indirectos||0)}`},
                  {l:"Comercialización",v:`${finF.comercializacion_pct||0}% = ${$(finF.comercializacion||0)}`},
                  {l:"Contingencias",v:`${finF.contingencias_pct||0}% = ${$(finF.contingencias||0)}`},
                  {l:"Costo total proyecto",v:$(finF.costo_total_proyecto),b:true},
                  {l:"Ingreso estimado",v:$(finF.ingreso_total_estimado),b:true},
                  {l:"Utilidad bruta",v:$(finF.utilidad_bruta),col:finF.utilidad_bruta>=0?"#15803d":"#dc2626",b:true},
                  {l:"Margen bruto",v:pct(finF.margen_bruto_pct),col:finF.margen_bruto_pct>=15?"#15803d":finF.margen_bruto_pct>=8?"#d97706":"#dc2626",b:true},
                  {l:"ROI",v:pct(finF.roi_pct),col:finF.roi_pct>=20?"#15803d":finF.roi_pct>=10?"#d97706":"#dc2626",b:true},
                  {l:"TIR estimada",v:pct(finF.tir_estimada_pct),col:finF.tir_estimada_pct>=18?"#15803d":finF.tir_estimada_pct>=10?"#d97706":"#dc2626",b:true},
                  {l:"Unidades reales",v:`${finF.unidades_reales||unidadesMax||"—"} unidades`},
                  {l:"Precio/unidad",v:$(finF.precio_venta_por_unidad)},
                  {l:"Plazo",v:`${finF.plazo_meses} meses`},
                ].map(k=>(
                  <div key={k.l} style={{background:"#F5F2EE",borderRadius:10,padding:"14px 16px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#a09888",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4}}>{k.l}</div>
                    <div style={{fontSize:(k as any).b?17:14,fontWeight:700,color:(k as any).col||"#1a1510"}}>{k.v||"—"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Red flags + Fortalezas */}
          {(res.analisis?.red_flags?.length>0||res.analisis?.fortalezas?.length>0)&&(
            <div className="g2">
              {res.analisis?.red_flags?.length>0&&(
                <div style={{background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:14,padding:"20px 24px"}}>
                  <div className="lbl" style={{color:"#c2410c",marginBottom:10}}>Red Flags</div>
                  {res.analisis.red_flags.map((f:string,i:number)=>(
                    <div key={i} style={{display:"flex",gap:8,marginTop:9,fontSize:13,color:"#7c2d12",lineHeight:1.5,alignItems:"flex-start"}}>
                      <span style={{color:"#f97316",fontWeight:800,flexShrink:0}}>!</span>{f}
                    </div>
                  ))}
                </div>
              )}
              {res.analisis?.fortalezas?.length>0&&(
                <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:14,padding:"20px 24px"}}>
                  <div className="lbl" style={{color:"#15803d",marginBottom:10}}>Fortalezas</div>
                  {res.analisis.fortalezas.map((f:string,i:number)=>(
                    <div key={i} style={{display:"flex",gap:8,marginTop:9,fontSize:13,color:"#14532d",lineHeight:1.5,alignItems:"flex-start"}}>
                      <span style={{color:"#22c55e",fontWeight:800,flexShrink:0}}>✓</span>{f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Veredicto */}
          {res.analisis?.veredicto&&semCol&&(
            <div style={{background:"#fff",border:`2px solid ${semCol}`,borderRadius:16,padding:"26px 30px",boxShadow:`0 0 0 4px ${semCol}10`}}>
              <div className="lbl" style={{marginBottom:8}}>Veredicto Final</div>
              <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:38,color:semCol,lineHeight:1,marginBottom:14}}>{res.analisis.veredicto}</div>
              <p style={{fontSize:14,color:"#3a3228",lineHeight:1.7,marginBottom:res.analisis.proximos_pasos?.length>0?14:0}}>{res.analisis.justificacion_veredicto}</p>
              {res.analisis.proximos_pasos?.length>0&&(
                <div style={{borderTop:"1px solid #EAE5DF",paddingTop:14}}>
                  <div className="lbl" style={{marginBottom:10}}>Próximos Pasos</div>
                  {res.analisis.proximos_pasos.map((p:string,i:number)=>(
                    <div key={i} style={{display:"flex",gap:12,marginTop:10,fontSize:13,color:"#3a3228",lineHeight:1.5,alignItems:"flex-start"}}>
                      <div style={{width:22,height:22,borderRadius:"50%",background:"#EFF6FF",border:"1.5px solid #BFDBFE",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:700,color:"#2563a8"}}>{i+1}</div>
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>

    <footer style={{borderTop:"1px solid #EAE5DF",padding:"18px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#F5F2EE"}}>
      <span style={{fontSize:14,fontWeight:600,letterSpacing:"-.03em"}}>un<span style={{color:"#2563a8"}}>earth</span></span>
      <span style={{fontSize:11,color:"#c0b8ae",letterSpacing:".04em"}}>Monterrey, NL · {new Date().getFullYear()}</span>
    </footer>
  </>);
}