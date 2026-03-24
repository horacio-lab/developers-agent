"use client";
import { useState, useRef, useEffect } from "react";

const API = "https://lojqmvpzdhayekzgwazw.supabase.co/functions/v1/analizar_terreno";
const KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvanFtdnB6ZGhheWVremd3YXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzQ1MzUsImV4cCI6MjA4OTcxMDUzNX0.CZpREN5V1i1D8TSNrdmGR0of4F_DuS6EqU9AE9a_eog";
type Tipo = "lineamientos"|"mercado"|"completo";

const $   = (n:any,m="c")=>n!=null&&!isNaN(+n)?(m==="c"?new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(+n):new Intl.NumberFormat("es-MX",{maximumFractionDigits:0}).format(+n)):"—";
const pct = (n:any)=>n!=null&&!isNaN(+n)?`${(+n).toFixed(1)}%`:"—";
const STEPS=["Geocodificando…","Buscando zona…","Consultando PDU…","Investigando mercado…","Generando reporte…"];
const BLUE="#2563a8", AMBER="#d97706", GREEN="#15803d";

/* ══════════════════════════════════════════════════════
   CHART COMPONENTS
══════════════════════════════════════════════════════ */

// Horizontal bar chart
function HBarChart({bars,h=180}:{bars:{l:string;v:number;c:string;max:number}[];h?:number}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const ctx=el.getContext("2d"); if(!ctx) return;
    const dpr=window.devicePixelRatio||1;
    const W=el.parentElement?.clientWidth||400;
    const H=Math.max(h,bars.length*44+24);
    el.width=W*dpr; el.height=H*dpr; el.style.width=W+"px"; el.style.height=H+"px";
    ctx.scale(dpr,dpr);
    const lw=120, pad={t:12,r:80,b:12};
    const bh=26, gap=44;
    const chartW=W-lw-pad.r;
    const maxV=Math.max(...bars.map(b=>b.max||b.v),1);
    ctx.clearRect(0,0,W,H);
    bars.forEach((b,i)=>{
      const y=pad.t+i*gap;
      const bw=(b.v/maxV)*chartW;
      // Label
      ctx.font="11px Inter,sans-serif"; ctx.fillStyle="#7a6f64"; ctx.textAlign="right";
      ctx.fillText(b.l,lw-8,y+bh/2+4);
      // Bar bg
      ctx.fillStyle="#F0EBE5"; ctx.beginPath();
      if(ctx.roundRect)ctx.roundRect(lw,y,chartW,bh,4); else ctx.rect(lw,y,chartW,bh);
      ctx.fill();
      // Bar fill
      ctx.fillStyle=b.c; ctx.beginPath();
      if(ctx.roundRect)ctx.roundRect(lw,y,bw,bh,4); else ctx.rect(lw,y,bw,bh);
      ctx.fill();
      // Value
      ctx.font="bold 12px Inter,sans-serif"; ctx.fillStyle="#1a1510"; ctx.textAlign="left";
      ctx.fillText(`$${(b.v/1000).toFixed(0)}k`,lw+bw+8,y+bh/2+4);
    });
  },[bars,h]);
  return <canvas ref={ref}/>;
}

// Vertical bar chart
function VBarChart({bars,h=180}:{bars:{l:string;v:number;c:string}[];h?:number}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const ctx=el.getContext("2d"); if(!ctx) return;
    const dpr=window.devicePixelRatio||1;
    const W=el.parentElement?.clientWidth||400;
    el.width=W*dpr; el.height=h*dpr; el.style.width=W+"px"; el.style.height=h+"px";
    ctx.scale(dpr,dpr);
    const p={t:24,r:10,b:44,l:64};
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
      const bh=(b.v/maxV)*cH*.88, y=p.t+cH-bh;
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

// Donut / pie chart for typologies
function DonutChart({slices,h=160}:{slices:{l:string;pct:number;c:string}[];h?:number}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const ctx=el.getContext("2d"); if(!ctx) return;
    const dpr=window.devicePixelRatio||1;
    const W=el.parentElement?.clientWidth||300;
    el.width=W*dpr; el.height=h*dpr; el.style.width=W+"px"; el.style.height=h+"px";
    ctx.scale(dpr,dpr);
    const cx=W*.38, cy=h/2, r=Math.min(cx,cy)*0.85, ir=r*0.55;
    let angle=-Math.PI/2;
    ctx.clearRect(0,0,W,h);
    slices.forEach(s=>{
      const sweep=(s.pct/100)*Math.PI*2;
      ctx.beginPath();
      ctx.moveTo(cx+Math.cos(angle)*ir,cy+Math.sin(angle)*ir);
      ctx.arc(cx,cy,r,angle,angle+sweep);
      ctx.arc(cx,cy,ir,angle+sweep,angle,true);
      ctx.closePath();
      ctx.fillStyle=s.c; ctx.fill();
      ctx.strokeStyle="#F5F2EE"; ctx.lineWidth=2; ctx.stroke();
      angle+=sweep;
    });
    // Legend
    slices.forEach((s,i)=>{
      const lx=W*.78, ly=h/2-(slices.length-1)*14+i*28;
      ctx.fillStyle=s.c; ctx.fillRect(lx,ly-8,12,12);
      ctx.fillStyle="#3a3228"; ctx.font="11px Inter,sans-serif"; ctx.textAlign="left";
      ctx.fillText(`${s.l}`,lx+16,ly+2);
      ctx.fillStyle="#a09888"; ctx.font="10px Inter,sans-serif";
      ctx.fillText(`${s.pct}%`,lx+16,ly+13);
    });
  },[slices,h]);
  return <canvas ref={ref}/>;
}

// Scatter / bubble chart for competition
function ScatterChart({points,h=200}:{points:{x:number;y:number;label:string;size:number}[];h?:number}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const ctx=el.getContext("2d"); if(!ctx) return;
    const dpr=window.devicePixelRatio||1;
    const W=el.parentElement?.clientWidth||400;
    el.width=W*dpr; el.height=h*dpr; el.style.width=W+"px"; el.style.height=h+"px";
    ctx.scale(dpr,dpr);
    const p={t:16,r:16,b:44,l:64};
    const cW=W-p.l-p.r, cH=h-p.t-p.b;
    const xs=points.map(pt=>pt.x), ys=points.map(pt=>pt.y);
    const minX=Math.min(...xs), maxX=Math.max(...xs);
    const minY=Math.min(...ys)*0.9, maxY=Math.max(...ys)*1.1;
    const toX=(v:number)=>p.l+(v-minX)/(maxX-minX||1)*cW;
    const toY=(v:number)=>p.t+(1-(v-minY)/(maxY-minY||1))*cH;
    const maxSz=Math.max(...points.map(pt=>pt.size),1);
    ctx.clearRect(0,0,W,h);
    // Grid
    [0,.25,.5,.75,1].forEach(f=>{
      const y=p.t+f*cH;
      ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(W-p.r,y);
      ctx.strokeStyle="rgba(0,0,0,.05)";ctx.lineWidth=1;ctx.stroke();
      ctx.font="10px Inter,sans-serif";ctx.fillStyle="#a09888";ctx.textAlign="right";
      ctx.fillText(`$${((minY+(maxY-minY)*(1-f))/1e6).toFixed(1)}M`,p.l-4,y+3);
    });
    // X axis labels
    ctx.font="9px Inter,sans-serif";ctx.fillStyle="#a09888";ctx.textAlign="center";
    ctx.fillText(`${minX}m²`,p.l,h-4); ctx.fillText(`${maxX}m²`,toX(maxX),h-4);
    ctx.fillText("Tamaño unidad",W/2,h-4);
    // Bubbles
    const colors=["#2563a8","#d97706","#15803d","#dc2626","#7c3aed"];
    points.forEach((pt,i)=>{
      const x=toX(pt.x), y=toY(pt.y);
      const r=8+(pt.size/maxSz)*16;
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fillStyle=colors[i%colors.length]+"40";ctx.fill();
      ctx.strokeStyle=colors[i%colors.length];ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle="#1a1510";ctx.font="bold 9px Inter,sans-serif";ctx.textAlign="center";
      const name=pt.label.split("—")[0].trim().split(" ").slice(0,2).join(" ");
      ctx.fillText(name,x,y+r+11);
    });
  },[points,h]);
  return <canvas ref={ref}/>;
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
export default function Page(){
  const [dir,setDir]=useState(""); const [m2,setM2]=useState(""); const [px,setPx]=useState("");
  const [frente,setFrente]=useState(""); const [fondo,setFondo]=useState("");
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
      if(frente)body.frente_m=parseFloat(frente);
      if(fondo)body.fondo_m=parseFloat(fondo);
      const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${KEY}`},body:JSON.stringify(body)});
      const d=await r.json();
      if(d.necesita_producto){setErr("Indica qué quieres construir.");setLoading(false);return;}
      if(d.error_uso_suelo){
        // Show HU warning with lineamientos data if available
        if(d.lineamientos) setRes({...d, ok:true, tipo_analisis:"error_uso_suelo", tipo_analisis_real: tipo});
        else setErr(d.error);
        setLoading(false);return;
      }
      if(d.ok)setRes(d); else setErr(d.error||"Error inesperado.");
    }catch{setErr("Error de conexión.");}
    finally{setLoading(false);}
  }

  const sem=res?.analisis?.semaforo;
  const semCol=sem==="VERDE"?"#15803d":sem==="AMARILLO"?"#d97706":sem==="ROJO"?"#dc2626":null;

  // Normalize market data — handles both "mercado" and "completo" response shapes
  const rawMp = res?.analisis?.mercado_producto || res?.analisis?.mercado || null;
  const mp = rawMp ? {
    tipo:                    rawMp.tipo || prod,
    precio_venta_m2_min:     rawMp.precio_venta_m2_min    || rawMp.precio_venta_producto_m2 || 0,
    precio_venta_m2_max:     rawMp.precio_venta_m2_max    || rawMp.precio_venta_producto_m2 || 0,
    precio_venta_m2_promedio:rawMp.precio_venta_m2_promedio || rawMp.precio_venta_producto_m2 || 0,
    precio_renta_mensual_m2: rawMp.precio_renta_mensual_m2 || rawMp.precio_renta_m2_mes || rawMp.precio_renta_producto_m2_mes || 0,
    m2_promedio_unidad:      rawMp.m2_promedio_unidad || 0,
    absorcion_estimada_meses:rawMp.absorcion_estimada_meses || rawMp.absorcion_meses || 0,
    demanda:    rawMp.demanda  || "",
    tendencia:  rawMp.tendencia|| "",
    proyectos_competencia: (rawMp.proyectos_competencia||[])
      .map((p:any)=>typeof p==="string"?{nombre:p,precio_desde:0,precio_hasta:0,m2_min:0,m2_max:0}:p),
    tipologias: rawMp.tipologias || [],
  } : null;

  // Normalize precio terreno
  const rawPt = res?.analisis?.precio_terreno_mercado || null;
  const rawM  = res?.analisis?.mercado || null;
  const pt = rawPt ? rawPt : rawM ? {
    promedio_m2:          rawM.precio_terreno_mercado_m2_promedio || 0,
    evaluacion_precio:    rawM.evaluacion_precio_terreno || "",
    porcentaje_diferencia:rawM.porcentaje_sobre_mercado || 0,
  } : null;

  // Recalc financials from raw numbers
  const fin=res?.analisis?.financiero;
  const finF=fin?(()=>{
    const ing=fin.ingreso_total_estimado||fin.ingreso_total_venta||0;
    const cost=fin.costo_total_proyecto||0;
    const util=ing-cost;
    const mg=ing>0?util/ing*100:0;
    const roi=cost>0?util/cost*100:0;
    const plazo=fin.plazo_meses||24;
    const tir=(Math.pow(1+roi/100,12/plazo)-1)*100;
    return{...fin,ingreso_total_estimado:ing,utilidad_bruta:util,margen_bruto_pct:Math.round(mg*10)/10,roi_pct:Math.round(roi*10)/10,tir_estimada_pct:Math.round(tir*10)/10};
  })():null;

  const densVivHa=parseFloat(res?.lineamientos?.densidad_max_viv_ha)||0;
  const m2Terreno=res?.terreno?.metros2||0;
  const unidadesMax=densVivHa>0?Math.floor(densVivHa*(m2Terreno/10000)):null;

  // Extract market data
  const rawPot = res?.analisis?.potencial_proyecto || null;
  const mpData = (mp || rawPot || fin) ? {
    ...mp,
    unidades: rawPot?.unidades_pdu || unidadesMax || 0,
    m2_unit:  rawPot?.m2_promedio_unidad || mp?.m2_promedio_unidad || fin?.m2_promedio_unidad || 0,
    pxm2:     rawPot?.precio_venta_m2_promedio || mp?.precio_venta_m2_promedio || fin?.precio_venta_m2_promedio || 0,
    ing_calc: rawPot?.calculo_detalle || fin?.calculo_ingresos || "",
    ing_total:rawPot?.ingreso_total_venta || fin?.ingreso_total_estimado || 0,
    competencia: mp?.proyectos_competencia || [],
    tipologias:  mp?.tipologias || [],
  } : null;

  const C={bg:"#F5F2EE",white:"#fff",dark:"#1a1510",blue:BLUE,border:"#EAE5DF",mid:"#7a6f64",light:"#a09888",vl:"#c0b8ae"};

  /* ── LINEAMIENTOS BLOCK ── */
  const LineamientosBlock=()=>(
    <div style={{display:"flex",flexDirection:"column" as const,gap:14}}>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:".09em",textTransform:"uppercase" as const,color:C.light,marginBottom:14}}>Lineamientos Urbanísticos — PDU Monterrey 2013-2025</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:12}}>
          {[
            {l:"COS",v:res.lineamientos?.cos,s:"Coef. Ocupación"},
            {l:"CUS",v:res.lineamientos?.cus,s:"Coef. Utilización"},
            {l:"CAV",v:res.lineamientos?.cav,s:"Coef. Área Verde"},
            {l:"Huella máx",v:res.lineamientos?.huella_max_m2?`${$(res.lineamientos.huella_max_m2,"n")} m²`:"—",s:"área de desplante"},
            {l:"M² construibles",v:res.lineamientos?.m2_construibles?`${$(res.lineamientos.m2_construibles,"n")} m²`:"—",s:"total en niveles"},
            {l:"Área verde mín",v:res.lineamientos?.area_verde_min_m2?`${$(res.lineamientos.area_verde_min_m2,"n")} m²`:"—",s:""},
            {l:"Densidad máx",v:res.lineamientos?.densidad_max_viv_ha&&res.lineamientos.densidad_max_viv_ha!=="N/D"?`${res.lineamientos.densidad_max_viv_ha} viv/Ha`:"—",s:""},
            {l:"Unidades máx PDU",v:unidadesMax!=null?`${unidadesMax} unidades`:"—",s:unidadesMax!=null?`${densVivHa} viv/Ha × ${m2Terreno}m²/10,000`:""},
            {l:"Altura máxima",v:res.lineamientos?.altura_max||"—",s:""},
          ].map(k=>(
            <div key={k.l} style={{background:C.bg,borderRadius:10,padding:"13px 15px"}}>
              <div style={{fontSize:10,fontWeight:700,color:C.light,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:k.s?2:6}}>{k.l}</div>
              {k.s&&<div style={{fontSize:10,color:C.vl,marginBottom:4}}>{k.s}</div>}
              <div style={{fontSize:15,fontWeight:700,color:C.dark}}>{k.v||"—"}</div>
            </div>
          ))}
        </div>
      </div>
      {res.giros?.permitidos?.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {[
            {title:`Giros Permitidos (P) — ${res.giros.total_permitidos}`,items:res.giros.permitidos,col:"#15803d"},
            {title:`Giros Condicionados (C) — ${res.giros.total_condicionados}`,items:res.giros.condicionados||[],col:"#d97706"},
          ].map(g=>(
            <div key={g.title} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 24px"}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:".09em",textTransform:"uppercase" as const,color:C.light,marginBottom:10}}>{g.title}</div>
              <div style={{maxHeight:290,overflowY:"auto" as const}}>
                {g.items.map((item:string,i:number)=>(
                  <div key={i} style={{fontSize:12,color:"#3a3228",padding:"5px 0",borderBottom:"1px solid #F0EBE5",lineHeight:1.4}}>
                    <span style={{color:g.col,fontWeight:700,marginRight:8,fontSize:10}}>
                      {g.col==="#15803d"?"P":"C"}
                    </span>{item.split("—")[1]||item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ── MERCADO CHARTS BLOCK ── */
  const MercadoChartsBlock=()=>{
    if(!mpData) return null;
    const comps=mpData.competencia||[];
    const tipos=mpData.tipologias||[];
    return (
      <div style={{display:"flex",flexDirection:"column" as const,gap:14}}>
        {/* Badge compatibilidad */}
        {res.analisis?.producto_compatible!=null&&(
          <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 18px",background:res.analisis.producto_compatible?"#F0FDF4":"#FEF2F2",border:`1px solid ${res.analisis.producto_compatible?"#BBF7D0":"#FECACA"}`,borderRadius:12}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:res.analisis.producto_compatible?"#15803d":"#dc2626",flexShrink:0,marginTop:3}}/>
            <div>
              <span style={{fontSize:13,fontWeight:600,color:res.analisis.producto_compatible?"#15803d":"#dc2626"}}>
                {res.analisis.producto_compatible?"Producto compatible con la zona":"Producto NO compatible"}
              </span>
              {(res.analisis.motivo_compatibilidad||res.analisis?.viabilidad_tecnica?.giro_aplicable)&&(
                <div style={{fontSize:12,color:C.mid,marginTop:3}}>{res.analisis.motivo_compatibilidad||res.analisis.viabilidad_tecnica?.giro_aplicable}</div>
              )}
            </div>
          </div>
        )}

        {/* KPIs precio terreno vs mercado */}
        {pt&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
            {[
              {l:"Mercado — promedio zona",v:`${$(pt.promedio_m2)}/m²`,s:"terrenos en zona",col:undefined},
              {l:"Precio pedido terreno",v:`${$(res.terreno.precio_m2)}/m²`,s:"",col:undefined},
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

        {/* Fila 1: Precios + Tipologías */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {/* Gráfica precios por m² */}
          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 24px"}}>
            <div style={{fontSize:10,fontWeight:700,color:C.light,letterSpacing:".09em",textTransform:"uppercase" as const,marginBottom:12}}>
              Precios de mercado — {mpData.tipo||prod} / m²
            </div>
            <div style={{width:"100%",overflow:"hidden"}}>
              <VBarChart h={190} bars={[
                {l:"Venta mín",v:mpData.precio_venta_m2_min||0,c:"#93c5fd"},
                {l:"Venta prom",v:mpData.precio_venta_m2_promedio||mpData.pxm2||0,c:BLUE},
                {l:"Venta máx",v:mpData.precio_venta_m2_max||0,c:"#1d4ed8"},
                {l:"Renta ×10",v:(mpData.precio_renta_mensual_m2||0)*10,c:AMBER},
              ].filter(b=>b.v>0)}/>
            </div>
            <div style={{display:"flex",gap:14,marginTop:10,fontSize:11,color:C.mid,borderTop:`1px solid ${C.border}`,paddingTop:10,flexWrap:"wrap" as const}}>
              <span>Absorción: <strong>{mpData.absorcion_estimada_meses} meses</strong></span>
              <span>Demanda: <strong style={{color:mpData.demanda==="alta"?"#15803d":mpData.demanda==="baja"?"#dc2626":"#d97706"}}>{(mpData.demanda||"").toUpperCase()}</strong></span>
              <span>Tendencia: <strong>{(mpData.tendencia||"").toUpperCase()}</strong></span>
            </div>
          </div>

          {/* Tipologías donut */}
          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 24px"}}>
            <div style={{fontSize:10,fontWeight:700,color:C.light,letterSpacing:".09em",textTransform:"uppercase" as const,marginBottom:12}}>Tipologías del mercado</div>
            {tipos.length>0?(
              <>
                <div style={{width:"100%",overflow:"hidden"}}>
                  <DonutChart h={160} slices={tipos.map((t:any,i:number)=>({
                    l:`${t.tipo} (${t.m2_min}-${t.m2_max}m²)`,
                    pct:t.participacion_pct||Math.round(100/tipos.length),
                    c:[BLUE,"#60a5fa",AMBER,"#34d399","#a78bfa"][i%5],
                  }))}/>
                </div>
                <div style={{marginTop:10}}>
                  {tipos.map((t:any,i:number)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #F0EBE5",fontSize:12,color:"#3a3228"}}>
                      <span>{t.tipo} — {t.m2_min}–{t.m2_max} m²</span>
                      <span style={{fontWeight:600}}>{$(t.precio_m2)}/m²</span>
                    </div>
                  ))}
                </div>
              </>
            ):(
              <div style={{color:C.mid,fontSize:13,marginTop:20}}>Datos de tipologías no disponibles para esta zona.</div>
            )}
          </div>
        </div>

        {/* Fila 2: Competencia scatter + dispersión precios */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {/* Competencia scatter */}
          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 24px"}}>
            <div style={{fontSize:10,fontWeight:700,color:C.light,letterSpacing:".09em",textTransform:"uppercase" as const,marginBottom:12}}>
              Competencia — tamaño vs precio total
            </div>
            {comps.filter((c:any)=>c.m2_min>0&&c.precio_desde>0).length>=2?(
              <div style={{width:"100%",overflow:"hidden"}}>
                <ScatterChart h={200} points={comps.filter((c:any)=>c.m2_min>0&&c.precio_desde>0).map((c:any)=>({
                  x: Math.round((c.m2_min+c.m2_max)/2)||c.m2_min||60,
                  y: Math.round((c.precio_desde+c.precio_hasta)/2)||c.precio_desde||0,
                  label: c.nombre||"",
                  size: c.unidades_total||10,
                }))}/>
              </div>
            ):(
              <div style={{color:C.mid,fontSize:13,marginTop:20}}>Datos de competencia insuficientes para gráfica.</div>
            )}
            <div style={{marginTop:10}}>
              {comps.map((c:any,i:number)=>(
                <div key={i} style={{display:"flex",gap:6,padding:"6px 0",borderBottom:"1px solid #F0EBE5",fontSize:12,color:"#3a3228",lineHeight:1.4,alignItems:"flex-start"}}>
                  <span style={{color:BLUE,fontWeight:700,flexShrink:0}}>→</span>
                  <span>
                    <strong>{typeof c==="string"?c:(c.nombre||"")}</strong>
                    {c.precio_desde>0&&<span style={{color:C.mid}}> — desde {$(c.precio_desde)}</span>}
                    {c.m2_min>0&&<span style={{color:C.mid}}> — {c.m2_min}–{c.m2_max}m²</span>}
                    {c.tipologia&&<span style={{color:C.light}}> — {c.tipologia}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Dispersión precios horizontal */}
          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 24px"}}>
            <div style={{fontSize:10,fontWeight:700,color:C.light,letterSpacing:".09em",textTransform:"uppercase" as const,marginBottom:12}}>
              Dispersión de precios por m² — competencia
            </div>
            {comps.filter((c:any)=>c.precio_desde>0&&c.m2_min>0).length>0?(
              <div style={{width:"100%",overflow:"hidden"}}>
                <HBarChart h={Math.max(180,comps.length*44+24)} bars={
                  comps.filter((c:any)=>c.precio_desde>0&&c.m2_min>0).map((c:any,i:number)=>{
                    const m2avg=(c.m2_min+c.m2_max)/2||c.m2_min||60;
                    const pxm2=Math.round((c.precio_desde+c.precio_hasta)/2/m2avg||c.precio_desde/m2avg||0);
                    const maxPx=Math.max(...comps.filter((x:any)=>x.precio_desde>0&&x.m2_min>0).map((x:any)=>{
                      const m=(x.m2_min+x.m2_max)/2||x.m2_min||60;
                      return (x.precio_desde+x.precio_hasta)/2/m;
                    }),1);
                    return {l:(c.nombre||"").split(" ").slice(0,2).join(" "),v:pxm2,c:[BLUE,"#60a5fa",AMBER,"#34d399","#7c3aed"][i%5],max:maxPx};
                  })
                }/>
              </div>
            ):(
              <div style={{color:C.mid,fontSize:13,marginTop:20}}>Datos de precios por m² no disponibles.</div>
            )}
          </div>
        </div>

        {/* Cálculo de ingresos */}
        {(mpData.ing_calc||mpData.unidades>0)&&(
          <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:14,padding:"20px 24px"}}>
            <div style={{fontSize:10,fontWeight:700,color:BLUE,letterSpacing:".09em",textTransform:"uppercase" as const,marginBottom:12}}>Potencial del proyecto — cálculo de ingresos</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:14,marginBottom:12}}>
              {[
                {l:"Unidades PDU",v:`${unidadesMax||mpData.unidades} unidades`,s:"densidad × m²/10,000"},
                {l:"Tamaño promedio",v:mpData.m2_unit||mpData.m2_promedio_unidad?`${mpData.m2_unit||mpData.m2_promedio_unidad} m²/unidad`:"—",s:"del mercado"},
                {l:"Precio prom /m²",v:mpData.pxm2||mpData.precio_venta_m2_promedio?$(mpData.pxm2||mpData.precio_venta_m2_promedio):"—",s:"del mercado"},
                {l:"Ingresos venta est.",v:(()=>{const t=mpData.ing_total>0?mpData.ing_total:((unidadesMax||mpData.unidades||0)*(mpData.m2_unit||mpData.m2_promedio_unidad||0)*(mpData.pxm2||mpData.precio_venta_m2_promedio||0));return t>0?$(t):"—";})(),s:mpData.ing_calc||`${unidadesMax||mpData.unidades||0} unidades × ${mpData.m2_unit||mpData.m2_promedio_unidad||0}m² × ${$(mpData.pxm2||mpData.precio_venta_m2_promedio||0)}/m²`},
              ].map(k=>(
                <div key={k.l}>
                  <div style={{fontSize:10,fontWeight:700,color:"#1e40af",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4}}>{k.l}</div>
                  <div style={{fontSize:16,fontWeight:700,color:"#1e3a5f"}}>{k.v}</div>
                  {k.s&&<div style={{fontSize:10,color:"#60a5fa",marginTop:2}}>{k.s}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumen IA */}
        {res.analisis?.recomendacion&&(
          <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:14,padding:"20px 24px"}}>
            <div style={{fontSize:10,fontWeight:700,color:BLUE,letterSpacing:".09em",textTransform:"uppercase" as const,marginBottom:8}}>Análisis IA — Recomendación</div>
            <p style={{fontSize:14,lineHeight:1.75,color:"#1e3a5f"}}>{res.analisis.recomendacion}</p>
          </div>
        )}
      </div>
    );
  };

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
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
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
      @media(max-width:700px){.g2,.g3{grid-template-columns:1fr!important;}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      .up{animation:up .3s ease forwards;}
      .sec-hdr{border-left:3px solid;padding-left:14px;margin-bottom:14px;}
      /* Glass form inputs */
      .fg{width:100%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:11px 14px;font-size:14px;color:#fff;outline:none;transition:border .2s,background .2s;font-family:inherit;}
      .fg::placeholder{color:rgba(180,210,240,.35);}
      .fg:focus{border-color:rgba(94,168,240,.7);background:rgba(255,255,255,.12);box-shadow:0 0 0 3px rgba(37,99,168,.2);}
      .fg option{background:#0f2240;color:#fff;}
      @keyframes orbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    `}</style>

    {/* ════════════════════════════════════════════
        HERO — full viewport glassmorphism landing
        Only shown when there's no result yet
    ════════════════════════════════════════════ */}
    {!res&&!loading&&(
      <div style={{position:"relative",minHeight:"100vh",overflow:"hidden",display:"flex",flexDirection:"column" as const}}>
        {/* MAP BACKGROUND — SVG grid simulating urban map */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(160deg, #0a1628 0%, #0f2240 40%, #0d2d3a 70%, #0a1e28 100%)"}}>
          {/* Grid lines */}
          <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:.18}} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#4a9ebb" strokeWidth=".6"/>
              </pattern>
              <pattern id="grid2" width="300" height="300" patternUnits="userSpaceOnUse">
                <path d="M 300 0 L 0 0 0 300" fill="none" stroke="#4a9ebb" strokeWidth="1.2"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
            <rect width="100%" height="100%" fill="url(#grid2)"/>
            {/* Simulated streets */}
            <line x1="0" y1="38%" x2="100%" y2="35%" stroke="#5bb8d4" strokeWidth="1.5" opacity=".5"/>
            <line x1="0" y1="62%" x2="100%" y2="65%" stroke="#5bb8d4" strokeWidth="1" opacity=".4"/>
            <line x1="0" y1="78%" x2="100%" y2="80%" stroke="#5bb8d4" strokeWidth=".8" opacity=".3"/>
            <line x1="22%" y1="0" x2="18%" y2="100%" stroke="#5bb8d4" strokeWidth="1.5" opacity=".5"/>
            <line x1="55%" y1="0" x2="52%" y2="100%" stroke="#5bb8d4" strokeWidth="1" opacity=".4"/>
            <line x1="78%" y1="0" x2="80%" y2="100%" stroke="#5bb8d4" strokeWidth=".8" opacity=".3"/>
            {/* City blocks */}
            <rect x="24%" y="20%" width="8%" height="12%" fill="none" stroke="#2563a8" strokeWidth=".5" opacity=".3"/>
            <rect x="35%" y="25%" width="5%" height="8%" fill="none" stroke="#2563a8" strokeWidth=".5" opacity=".25"/>
            <rect x="58%" y="42%" width="10%" height="14%" fill="none" stroke="#2563a8" strokeWidth=".5" opacity=".3"/>
            <rect x="15%" y="55%" width="6%" height="9%" fill="none" stroke="#2563a8" strokeWidth=".5" opacity=".25"/>
            <rect x="70%" y="20%" width="7%" height="10%" fill="none" stroke="#2563a8" strokeWidth=".5" opacity=".3"/>
          </svg>
          {/* Glow blobs */}
          <div style={{position:"absolute",top:"20%",left:"30%",width:400,height:400,background:"radial-gradient(circle, rgba(37,99,168,.25) 0%, transparent 70%)",transform:"translate(-50%,-50%)"}}/>
          <div style={{position:"absolute",bottom:"25%",right:"25%",width:300,height:300,background:"radial-gradient(circle, rgba(20,120,140,.2) 0%, transparent 70%)"}}/>
        </div>



        {/* NAV over map */}
        <nav style={{position:"relative",zIndex:10,padding:"20px 32px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          {/* Logo real */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{display:"inline-block",width:44,height:44}}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4961 3508" style={{width:"100%",height:"100%"}} fill="none">
  <g transform="matrix(0.751636,0,0,0.751636,357.522346,8.290459)">
    <path d="M2823.312,1280.588C3311.812,1280.588 3708.412,1677.188 3708.412,2165.688C3708.412,2654.188 3311.812,3050.788 2823.312,3050.788C2334.812,3050.788 1938.212,2654.188 1938.212,2165.688C1938.212,1677.188 2334.812,1280.588 2823.312,1280.588ZM2823.312,1322.164C2357.758,1322.164 1979.788,1700.135 1979.788,2165.688C1979.788,2631.242 2357.758,3009.212 2823.312,3009.212C3288.865,3009.212 3666.836,2631.242 3666.836,2165.688C3666.836,1700.135 3288.865,1322.164 2823.312,1322.164Z" fill="white"/>
  </g>
  <g transform="matrix(1.951872,-0.447186,0.447186,1.951872,-2935.660556,891.126125)">
    <path d="M2094,1081C2094,1081 1845.397,1385.126 2185,1211.821C2434.232,1084.634 3079.015,737.886 3115.878,627.72C3144.998,540.693 2999.054,550.138 2804.743,648" stroke="#5ea8f0" strokeWidth="20.81" strokeLinecap="round" fill="none"/>
  </g>
  <g transform="matrix(0.663165,1.889442,-1.889442,0.663165,2660.72479,-3818.272822)">
    <path d="M2094,1081C2094,1081 1845.397,1385.126 2185,1211.821C2434.232,1084.634 3079.015,737.886 3115.878,627.72C3144.998,540.693 2999.054,550.138 2804.743,648" stroke="#5ea8f0" strokeWidth="20.81" strokeLinecap="round" fill="none"/>
  </g>
  <g transform="matrix(1.930173,-0.533117,0.533117,1.930173,-2359.786435,1704.552736)">
    <circle cx="2060.234" cy="197" r="54" fill="#5ea8f0"/>
  </g>
</svg></span>
            <span style={{display:"inline-block",height:28,width:148}}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4961 3508" style={{width:"100%",height:"100%"}}>
  <g transform="matrix(0.2963,0,0,0.2963,1690.427598,1587.252321)">
    <g transform="matrix(0.960503,0,0,1,-185.86227,0)">
      <g transform="matrix(4125.249604,0,0,4125.249604,-4705.730796,1681.366567)">
        <path d="M0.275,0.011C0.229,0.012 0.188,0.002 0.153,-0.016C0.117,-0.035 0.089,-0.06 0.068,-0.093C0.048,-0.126 0.038,-0.164 0.038,-0.206L0.038,-0.489L0.212,-0.489L0.212,-0.206C0.212,-0.193 0.215,-0.181 0.22,-0.171C0.225,-0.161 0.232,-0.153 0.242,-0.148C0.251,-0.142 0.263,-0.14 0.275,-0.14C0.294,-0.14 0.309,-0.146 0.32,-0.158C0.332,-0.17 0.338,-0.186 0.338,-0.206L0.338,-0.489L0.512,-0.489L0.512,-0.206C0.512,-0.163 0.502,-0.125 0.482,-0.093C0.462,-0.06 0.434,-0.035 0.398,-0.016C0.363,0.002 0.322,0.012 0.275,0.011Z" fill="white"/>
      </g>
      <g transform="matrix(4125.249604,0,0,4125.249604,-2436.843514,1681.366567)">
        <path d="M0.367,-0L0.367,-0.276C0.367,-0.299 0.361,-0.316 0.348,-0.329C0.334,-0.342 0.317,-0.349 0.297,-0.349C0.283,-0.349 0.27,-0.346 0.26,-0.34C0.249,-0.334 0.24,-0.326 0.234,-0.315C0.228,-0.304 0.225,-0.291 0.225,-0.276L0.157,-0.308C0.157,-0.347 0.166,-0.381 0.183,-0.409C0.2,-0.438 0.224,-0.46 0.254,-0.476C0.285,-0.491 0.319,-0.499 0.358,-0.499C0.393,-0.499 0.425,-0.491 0.452,-0.475C0.48,-0.458 0.502,-0.436 0.518,-0.409C0.534,-0.381 0.542,-0.35 0.542,-0.316L0.542,-0L0.367,-0ZM0.051,-0L0.051,-0.489L0.225,-0.489L0.225,-0L0.051,-0Z" fill="white"/>
      </g>
    </g>
    <g transform="matrix(0.960503,0,0,1,-8.626521,0)">
      <g transform="matrix(4125.249604,0,0,4125.249604,-218.409509,1681.366567)">
        <path d="M0.298,0.011C0.243,0.012 0.195,0.001 0.153,-0.021C0.111,-0.043 0.078,-0.073 0.054,-0.112C0.03,-0.15 0.018,-0.195 0.018,-0.244C0.018,-0.294 0.03,-0.338 0.053,-0.376C0.076,-0.415 0.108,-0.445 0.148,-0.467C0.189,-0.489 0.234,-0.501 0.285,-0.501C0.334,-0.501 0.378,-0.49 0.416,-0.469C0.454,-0.448 0.484,-0.419 0.506,-0.382C0.528,-0.345 0.538,-0.303 0.538,-0.256C0.538,-0.246 0.538,-0.236 0.537,-0.226C0.536,-0.215 0.534,-0.204 0.531,-0.19L0.1,-0.188L0.1,-0.3L0.462,-0.302L0.384,-0.254C0.383,-0.281 0.379,-0.304 0.372,-0.321C0.365,-0.339 0.354,-0.353 0.34,-0.362C0.326,-0.371 0.308,-0.376 0.287,-0.376C0.265,-0.376 0.246,-0.37 0.23,-0.36C0.214,-0.349 0.201,-0.334 0.193,-0.315C0.184,-0.295 0.18,-0.272 0.18,-0.244C0.18,-0.216 0.185,-0.193 0.194,-0.173C0.203,-0.154 0.217,-0.139 0.234,-0.129C0.252,-0.119 0.273,-0.114 0.298,-0.114C0.322,-0.114 0.343,-0.118 0.361,-0.126C0.38,-0.134 0.396,-0.146 0.411,-0.163L0.502,-0.072C0.478,-0.044 0.448,-0.023 0.414,-0.009C0.38,0.004 0.341,0.012 0.298,0.011Z" fill="#5ea8f0"/>
      </g>
      <g transform="matrix(4125.249604,0,0,4125.249604,2068.010084,1681.366567)">
        <path d="M0.255,0.01C0.209,0.01 0.169,-0.001 0.134,-0.023C0.098,-0.045 0.071,-0.075 0.051,-0.113C0.031,-0.151 0.021,-0.195 0.021,-0.244C0.021,-0.294 0.031,-0.337 0.051,-0.376C0.071,-0.414 0.098,-0.444 0.134,-0.466C0.169,-0.488 0.209,-0.499 0.255,-0.499C0.285,-0.499 0.313,-0.493 0.339,-0.482C0.364,-0.471 0.385,-0.456 0.401,-0.436C0.418,-0.416 0.427,-0.393 0.431,-0.367L0.431,-0.121C0.427,-0.096 0.418,-0.073 0.401,-0.053C0.385,-0.033 0.364,-0.018 0.339,-0.007C0.313,0.004 0.285,0.01 0.255,0.01ZM0.292,-0.145C0.321,-0.145 0.344,-0.154 0.361,-0.173C0.379,-0.191 0.388,-0.215 0.388,-0.244C0.388,-0.264 0.384,-0.281 0.376,-0.296C0.368,-0.311 0.357,-0.323 0.343,-0.331C0.328,-0.34 0.312,-0.344 0.293,-0.344C0.274,-0.344 0.258,-0.34 0.243,-0.331C0.229,-0.323 0.218,-0.311 0.209,-0.296C0.201,-0.281 0.197,-0.264 0.197,-0.244C0.197,-0.225 0.201,-0.208 0.209,-0.193C0.217,-0.178 0.228,-0.166 0.243,-0.158C0.257,-0.149 0.274,-0.145 0.292,-0.145ZM0.381,-0L0.381,-0.131L0.406,-0.251L0.381,-0.369L0.381,-0.489L0.552,-0.489L0.552,-0L0.381,-0Z" fill="#5ea8f0"/>
      </g>
      <g transform="matrix(4125.249604,0,0,4125.249604,4553.472971,1681.366567)">
        <path d="M0.051,-0L0.051,-0.489L0.225,-0.489L0.225,-0L0.051,-0ZM0.225,-0.266L0.147,-0.332C0.166,-0.387 0.192,-0.429 0.224,-0.457C0.256,-0.485 0.298,-0.499 0.349,-0.499C0.372,-0.499 0.392,-0.496 0.409,-0.49C0.426,-0.484 0.441,-0.474 0.453,-0.462L0.352,-0.327C0.346,-0.333 0.339,-0.338 0.329,-0.342C0.32,-0.345 0.309,-0.347 0.296,-0.347C0.274,-0.347 0.256,-0.34 0.244,-0.327C0.231,-0.313 0.225,-0.293 0.225,-0.266Z" fill="#5ea8f0"/>
      </g>
      <g transform="matrix(4125.249604,0,0,4125.249604,6378.230882,1681.366567)">
        <path d="M0.118,-0L0.118,-0.691L0.292,-0.691L0.292,-0L0.118,-0ZM0.01,-0.344L0.01,-0.489L0.4,-0.489L0.4,-0.344L0.01,-0.344Z" fill="#5ea8f0"/>
      </g>
      <g transform="matrix(4125.249604,0,0,4125.249604,8067.520595,1681.366567)">
        <path d="M0.367,-0L0.367,-0.276C0.367,-0.299 0.361,-0.316 0.348,-0.329C0.334,-0.342 0.317,-0.349 0.297,-0.349C0.283,-0.349 0.27,-0.346 0.26,-0.34C0.249,-0.334 0.24,-0.326 0.234,-0.315C0.228,-0.304 0.225,-0.291 0.225,-0.276L0.157,-0.308C0.157,-0.347 0.165,-0.381 0.182,-0.409C0.198,-0.438 0.22,-0.46 0.249,-0.476C0.278,-0.491 0.311,-0.499 0.349,-0.499C0.388,-0.499 0.422,-0.491 0.451,-0.475C0.48,-0.46 0.503,-0.438 0.518,-0.411C0.534,-0.383 0.542,-0.352 0.542,-0.316L0.542,-0L0.367,-0ZM0.051,-0L0.051,-0.729L0.225,-0.729L0.225,-0L0.051,-0Z" fill="#5ea8f0"/>
      </g>
    </g>
  </g>
</svg></span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.08)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,.12)",borderRadius:100,padding:"6px 14px"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 6px #22c55e"}}/>
            <span style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.7)",letterSpacing:".07em"}}>LIVE DATA</span>
          </div>
        </nav>

        {/* Center content */}
        <div style={{flex:1,display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",padding:"0 24px 60px",position:"relative",zIndex:10}}>
          {/* Logo real grande */}
          <div style={{marginBottom:8,position:"relative"}}>
            <span style={{display:"inline-block",width:130,height:130,filter:"drop-shadow(0 0 26px rgba(94,168,240,.65))"}}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4961 3508" style={{width:"100%",height:"100%"}} fill="none">
  <g transform="matrix(0.751636,0,0,0.751636,357.522346,8.290459)">
    <path d="M2823.312,1280.588C3311.812,1280.588 3708.412,1677.188 3708.412,2165.688C3708.412,2654.188 3311.812,3050.788 2823.312,3050.788C2334.812,3050.788 1938.212,2654.188 1938.212,2165.688C1938.212,1677.188 2334.812,1280.588 2823.312,1280.588ZM2823.312,1322.164C2357.758,1322.164 1979.788,1700.135 1979.788,2165.688C1979.788,2631.242 2357.758,3009.212 2823.312,3009.212C3288.865,3009.212 3666.836,2631.242 3666.836,2165.688C3666.836,1700.135 3288.865,1322.164 2823.312,1322.164Z" fill="white"/>
  </g>
  <g transform="matrix(1.951872,-0.447186,0.447186,1.951872,-2935.660556,891.126125)">
    <path d="M2094,1081C2094,1081 1845.397,1385.126 2185,1211.821C2434.232,1084.634 3079.015,737.886 3115.878,627.72C3144.998,540.693 2999.054,550.138 2804.743,648" stroke="#5ea8f0" strokeWidth="20.81" strokeLinecap="round" fill="none"/>
  </g>
  <g transform="matrix(0.663165,1.889442,-1.889442,0.663165,2660.72479,-3818.272822)">
    <path d="M2094,1081C2094,1081 1845.397,1385.126 2185,1211.821C2434.232,1084.634 3079.015,737.886 3115.878,627.72C3144.998,540.693 2999.054,550.138 2804.743,648" stroke="#5ea8f0" strokeWidth="20.81" strokeLinecap="round" fill="none"/>
  </g>
  <g transform="matrix(1.930173,-0.533117,0.533117,1.930173,-2359.786435,1704.552736)">
    <circle cx="2060.234" cy="197" r="54" fill="#5ea8f0"/>
  </g>
</svg></span>
          </div>

          <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:"clamp(28px,4vw,52px)",lineHeight:1.1,color:"#fff",marginBottom:16,fontWeight:400,textAlign:"center" as const,textShadow:"0 2px 40px rgba(0,0,0,.4)"}}>
            Unearth your next<br/><em style={{color:"#5ea8f0",fontStyle:"italic"}}>development.</em>
          </h2>
          <p style={{fontSize:16,color:"rgba(200,220,240,.7)",lineHeight:1.7,maxWidth:400,margin:"0 auto 40px",textAlign:"center" as const}}>
            Dirección, metros y precio — análisis de zonificación, mercado y financiero en segundos.
          </p>

          {/* GLASSMORPHISM FORM */}
          <div style={{
            width:"100%",maxWidth:680,
            background:"rgba(255,255,255,.07)",
            backdropFilter:"blur(24px)",
            WebkitBackdropFilter:"blur(24px)",
            border:"1px solid rgba(255,255,255,.15)",
            borderRadius:20,
            padding:"28px 32px",
            boxShadow:"0 8px 40px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.1)",
          }}>
            <div className="g3" style={{marginBottom:14}}>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:10,fontWeight:700,letterSpacing:".09em",textTransform:"uppercase" as const,color:"rgba(180,210,240,.6)",marginBottom:6,display:"block"}}>Dirección del terreno</label>
                <input className="fg" value={dir} onChange={e=>setDir(e.target.value)} disabled={loading} placeholder="Ej: Mitla 418, Mitras Norte, Monterrey"/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,letterSpacing:".09em",textTransform:"uppercase" as const,color:"rgba(180,210,240,.6)",marginBottom:6,display:"block"}}>Superficie m²</label>
                <input className="fg" value={m2} onChange={e=>setM2(e.target.value)} disabled={loading} placeholder="300" type="number"/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,letterSpacing:".09em",textTransform:"uppercase" as const,color:"rgba(180,210,240,.6)",marginBottom:6,display:"block"}}>Precio MXN</label>
                <input className="fg" value={px} onChange={e=>setPx(e.target.value)} disabled={loading} placeholder="8,000,000"/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,letterSpacing:".09em",textTransform:"uppercase" as const,color:"rgba(180,210,240,.6)",marginBottom:6,display:"block"}}>Tipo de análisis</label>
                <select className="fg" value={tipo} onChange={e=>{setTipo(e.target.value as Tipo);setProd("");}} disabled={loading} style={{cursor:"pointer"}}>
                  <option value="lineamientos">Lineamientos urbanísticos</option>
                  <option value="mercado">Estudio de mercado</option>
                  <option value="completo">Análisis completo</option>
                </select>
              </div>
            </div>
            {needsProd&&(
              <div style={{marginBottom:14}}>
                <label style={{fontSize:10,fontWeight:700,letterSpacing:".09em",textTransform:"uppercase" as const,color:"rgba(180,210,240,.6)",marginBottom:6,display:"block"}}>¿Qué quieres construir?</label>
                <input className="fg" value={prod} onChange={e=>setProd(e.target.value)} disabled={loading} placeholder="departamentos, casas, locales comerciales, oficinas…"/>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <div>
                <label style={{fontSize:10,fontWeight:700,letterSpacing:".09em",textTransform:"uppercase" as const,color:"rgba(180,210,240,.6)",marginBottom:6,display:"block"}}>
                  Frente (m) <span style={{color:"rgba(150,180,210,.4)",fontWeight:400}}>opcional</span>
                </label>
                <input className="fg" value={frente} onChange={e=>setFrente(e.target.value)} disabled={loading} placeholder="Ej: 10" type="number"/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,letterSpacing:".09em",textTransform:"uppercase" as const,color:"rgba(180,210,240,.6)",marginBottom:6,display:"block"}}>
                  Fondo (m) <span style={{color:"rgba(150,180,210,.4)",fontWeight:400}}>opcional</span>
                </label>
                <input className="fg" value={fondo} onChange={e=>setFondo(e.target.value)} disabled={loading} placeholder="Ej: 30" type="number"/>
              </div>
            </div>
            {err&&<div style={{background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.3)",borderRadius:10,padding:"10px 14px",color:"#fca5a5",fontSize:13,marginBottom:12}}>{err}</div>}
            <button onClick={run} disabled={loading} style={{
              width:"100%",
              background:loading?"rgba(255,255,255,.1)":"linear-gradient(135deg, #1a4d8a 0%, #2563a8 50%, #1a7a8a 100%)",
              border:"none",borderRadius:12,padding:"15px 0",
              color:"#fff",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",gap:10,
              boxShadow:loading?"none":"0 4px 20px rgba(37,99,168,.5)",
              letterSpacing:".02em",transition:"all .2s",
            }}>
              {loading
                ?<><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>{STEPS[step]}</>
                :"Generar reporte de factibilidad →"}
            </button>
            {loading&&<div style={{display:"flex",justifyContent:"center",gap:8,marginTop:14}}>
              {STEPS.map((_,i)=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:i<=step?"#5ea8f0":"rgba(255,255,255,.2)",transform:i===step?"scale(1.5)":"scale(1)",transition:"all .3s"}}/>)}
            </div>}
          </div>
        </div>
      </div>
    )}

    {/* ══════════════════════════════════════════
        RESULTS PAGE — shown when there's a result
        Keeps its own nav + white bg layout
    ══════════════════════════════════════════ */}
    {(res||loading)&&(<>
    {/* NAV — compact when showing results */}
    <header style={{position:"sticky",top:0,zIndex:30,background:"rgba(245,242,238,.95)",backdropFilter:"blur(10px)",borderBottom:"1px solid #EAE5DF",padding:"0 32px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{display:"inline-block",width:36,height:36}}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4961 3508" style={{width:"100%",height:"100%"}} fill="none">
  <g transform="matrix(0.751636,0,0,0.751636,357.522346,8.290459)">
    <path d="M2823.312,1280.588C3311.812,1280.588 3708.412,1677.188 3708.412,2165.688C3708.412,2654.188 3311.812,3050.788 2823.312,3050.788C2334.812,3050.788 1938.212,2654.188 1938.212,2165.688C1938.212,1677.188 2334.812,1280.588 2823.312,1280.588ZM2823.312,1322.164C2357.758,1322.164 1979.788,1700.135 1979.788,2165.688C1979.788,2631.242 2357.758,3009.212 2823.312,3009.212C3288.865,3009.212 3666.836,2631.242 3666.836,2165.688C3666.836,1700.135 3288.865,1322.164 2823.312,1322.164Z" fill="#1a1510"/>
  </g>
  <g transform="matrix(1.951872,-0.447186,0.447186,1.951872,-2935.660556,891.126125)">
    <path d="M2094,1081C2094,1081 1845.397,1385.126 2185,1211.821C2434.232,1084.634 3079.015,737.886 3115.878,627.72C3144.998,540.693 2999.054,550.138 2804.743,648" stroke="#2563a8" strokeWidth="20.81" strokeLinecap="round" fill="none"/>
  </g>
  <g transform="matrix(0.663165,1.889442,-1.889442,0.663165,2660.72479,-3818.272822)">
    <path d="M2094,1081C2094,1081 1845.397,1385.126 2185,1211.821C2434.232,1084.634 3079.015,737.886 3115.878,627.72C3144.998,540.693 2999.054,550.138 2804.743,648" stroke="#2563a8" strokeWidth="20.81" strokeLinecap="round" fill="none"/>
  </g>
  <g transform="matrix(1.930173,-0.533117,0.533117,1.930173,-2359.786435,1704.552736)">
    <circle cx="2060.234" cy="197" r="54" fill="#2563a8"/>
  </g>
</svg></span>
        <span style={{display:"inline-block",height:22,width:118}}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4961 3508" style={{width:"100%",height:"100%"}}>
  <g transform="matrix(0.2963,0,0,0.2963,1690.427598,1587.252321)">
    <g transform="matrix(0.960503,0,0,1,-185.86227,0)">
      <g transform="matrix(4125.249604,0,0,4125.249604,-4705.730796,1681.366567)">
        <path d="M0.275,0.011C0.229,0.012 0.188,0.002 0.153,-0.016C0.117,-0.035 0.089,-0.06 0.068,-0.093C0.048,-0.126 0.038,-0.164 0.038,-0.206L0.038,-0.489L0.212,-0.489L0.212,-0.206C0.212,-0.193 0.215,-0.181 0.22,-0.171C0.225,-0.161 0.232,-0.153 0.242,-0.148C0.251,-0.142 0.263,-0.14 0.275,-0.14C0.294,-0.14 0.309,-0.146 0.32,-0.158C0.332,-0.17 0.338,-0.186 0.338,-0.206L0.338,-0.489L0.512,-0.489L0.512,-0.206C0.512,-0.163 0.502,-0.125 0.482,-0.093C0.462,-0.06 0.434,-0.035 0.398,-0.016C0.363,0.002 0.322,0.012 0.275,0.011Z" fill="#1a1510"/>
      </g>
      <g transform="matrix(4125.249604,0,0,4125.249604,-2436.843514,1681.366567)">
        <path d="M0.367,-0L0.367,-0.276C0.367,-0.299 0.361,-0.316 0.348,-0.329C0.334,-0.342 0.317,-0.349 0.297,-0.349C0.283,-0.349 0.27,-0.346 0.26,-0.34C0.249,-0.334 0.24,-0.326 0.234,-0.315C0.228,-0.304 0.225,-0.291 0.225,-0.276L0.157,-0.308C0.157,-0.347 0.166,-0.381 0.183,-0.409C0.2,-0.438 0.224,-0.46 0.254,-0.476C0.285,-0.491 0.319,-0.499 0.358,-0.499C0.393,-0.499 0.425,-0.491 0.452,-0.475C0.48,-0.458 0.502,-0.436 0.518,-0.409C0.534,-0.381 0.542,-0.35 0.542,-0.316L0.542,-0L0.367,-0ZM0.051,-0L0.051,-0.489L0.225,-0.489L0.225,-0L0.051,-0Z" fill="#1a1510"/>
      </g>
    </g>
    <g transform="matrix(0.960503,0,0,1,-8.626521,0)">
      <g transform="matrix(4125.249604,0,0,4125.249604,-218.409509,1681.366567)">
        <path d="M0.298,0.011C0.243,0.012 0.195,0.001 0.153,-0.021C0.111,-0.043 0.078,-0.073 0.054,-0.112C0.03,-0.15 0.018,-0.195 0.018,-0.244C0.018,-0.294 0.03,-0.338 0.053,-0.376C0.076,-0.415 0.108,-0.445 0.148,-0.467C0.189,-0.489 0.234,-0.501 0.285,-0.501C0.334,-0.501 0.378,-0.49 0.416,-0.469C0.454,-0.448 0.484,-0.419 0.506,-0.382C0.528,-0.345 0.538,-0.303 0.538,-0.256C0.538,-0.246 0.538,-0.236 0.537,-0.226C0.536,-0.215 0.534,-0.204 0.531,-0.19L0.1,-0.188L0.1,-0.3L0.462,-0.302L0.384,-0.254C0.383,-0.281 0.379,-0.304 0.372,-0.321C0.365,-0.339 0.354,-0.353 0.34,-0.362C0.326,-0.371 0.308,-0.376 0.287,-0.376C0.265,-0.376 0.246,-0.37 0.23,-0.36C0.214,-0.349 0.201,-0.334 0.193,-0.315C0.184,-0.295 0.18,-0.272 0.18,-0.244C0.18,-0.216 0.185,-0.193 0.194,-0.173C0.203,-0.154 0.217,-0.139 0.234,-0.129C0.252,-0.119 0.273,-0.114 0.298,-0.114C0.322,-0.114 0.343,-0.118 0.361,-0.126C0.38,-0.134 0.396,-0.146 0.411,-0.163L0.502,-0.072C0.478,-0.044 0.448,-0.023 0.414,-0.009C0.38,0.004 0.341,0.012 0.298,0.011Z" fill="#2563a8"/>
      </g>
      <g transform="matrix(4125.249604,0,0,4125.249604,2068.010084,1681.366567)">
        <path d="M0.255,0.01C0.209,0.01 0.169,-0.001 0.134,-0.023C0.098,-0.045 0.071,-0.075 0.051,-0.113C0.031,-0.151 0.021,-0.195 0.021,-0.244C0.021,-0.294 0.031,-0.337 0.051,-0.376C0.071,-0.414 0.098,-0.444 0.134,-0.466C0.169,-0.488 0.209,-0.499 0.255,-0.499C0.285,-0.499 0.313,-0.493 0.339,-0.482C0.364,-0.471 0.385,-0.456 0.401,-0.436C0.418,-0.416 0.427,-0.393 0.431,-0.367L0.431,-0.121C0.427,-0.096 0.418,-0.073 0.401,-0.053C0.385,-0.033 0.364,-0.018 0.339,-0.007C0.313,0.004 0.285,0.01 0.255,0.01ZM0.292,-0.145C0.321,-0.145 0.344,-0.154 0.361,-0.173C0.379,-0.191 0.388,-0.215 0.388,-0.244C0.388,-0.264 0.384,-0.281 0.376,-0.296C0.368,-0.311 0.357,-0.323 0.343,-0.331C0.328,-0.34 0.312,-0.344 0.293,-0.344C0.274,-0.344 0.258,-0.34 0.243,-0.331C0.229,-0.323 0.218,-0.311 0.209,-0.296C0.201,-0.281 0.197,-0.264 0.197,-0.244C0.197,-0.225 0.201,-0.208 0.209,-0.193C0.217,-0.178 0.228,-0.166 0.243,-0.158C0.257,-0.149 0.274,-0.145 0.292,-0.145ZM0.381,-0L0.381,-0.131L0.406,-0.251L0.381,-0.369L0.381,-0.489L0.552,-0.489L0.552,-0L0.381,-0Z" fill="#2563a8"/>
      </g>
      <g transform="matrix(4125.249604,0,0,4125.249604,4553.472971,1681.366567)">
        <path d="M0.051,-0L0.051,-0.489L0.225,-0.489L0.225,-0L0.051,-0ZM0.225,-0.266L0.147,-0.332C0.166,-0.387 0.192,-0.429 0.224,-0.457C0.256,-0.485 0.298,-0.499 0.349,-0.499C0.372,-0.499 0.392,-0.496 0.409,-0.49C0.426,-0.484 0.441,-0.474 0.453,-0.462L0.352,-0.327C0.346,-0.333 0.339,-0.338 0.329,-0.342C0.32,-0.345 0.309,-0.347 0.296,-0.347C0.274,-0.347 0.256,-0.34 0.244,-0.327C0.231,-0.313 0.225,-0.293 0.225,-0.266Z" fill="#2563a8"/>
      </g>
      <g transform="matrix(4125.249604,0,0,4125.249604,6378.230882,1681.366567)">
        <path d="M0.118,-0L0.118,-0.691L0.292,-0.691L0.292,-0L0.118,-0ZM0.01,-0.344L0.01,-0.489L0.4,-0.489L0.4,-0.344L0.01,-0.344Z" fill="#2563a8"/>
      </g>
      <g transform="matrix(4125.249604,0,0,4125.249604,8067.520595,1681.366567)">
        <path d="M0.367,-0L0.367,-0.276C0.367,-0.299 0.361,-0.316 0.348,-0.329C0.334,-0.342 0.317,-0.349 0.297,-0.349C0.283,-0.349 0.27,-0.346 0.26,-0.34C0.249,-0.334 0.24,-0.326 0.234,-0.315C0.228,-0.304 0.225,-0.291 0.225,-0.276L0.157,-0.308C0.157,-0.347 0.165,-0.381 0.182,-0.409C0.198,-0.438 0.22,-0.46 0.249,-0.476C0.278,-0.491 0.311,-0.499 0.349,-0.499C0.388,-0.499 0.422,-0.491 0.451,-0.475C0.48,-0.46 0.503,-0.438 0.518,-0.411C0.534,-0.383 0.542,-0.352 0.542,-0.316L0.542,-0L0.367,-0ZM0.051,-0L0.051,-0.729L0.225,-0.729L0.225,-0L0.051,-0Z" fill="#2563a8"/>
      </g>
    </g>
  </g>
</svg></span>
      </div>
      <span style={{fontSize:11,fontWeight:500,color:"#c0b8ae",letterSpacing:".07em"}}>MONTERREY MVP</span>
    </header>

    <div style={{maxWidth:1200,margin:"0 auto",padding:"32px 28px 100px",width:"100%"}}>

      {/* COMPACT FORM */}
      <div className="card up" style={{marginBottom:28,borderRadius:18,padding:"20px 28px",boxShadow:"0 2px 16px rgba(0,0,0,.07)"}}>
        <div className="g3" style={{marginBottom:12}}>
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
          <div style={{marginBottom:12}}>
            <label className="lbl">¿Qué quieres construir?</label>
            <input className="f" value={prod} onChange={e=>setProd(e.target.value)} disabled={loading} placeholder="departamentos, casas, locales comerciales, oficinas…"/>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:12}}>
          <div>
            <label className="lbl">Frente (m) <span style={{color:"#c0b8ae",fontWeight:400}}>opcional</span></label>
            <input className="f" value={frente} onChange={e=>setFrente(e.target.value)} disabled={loading} placeholder="10" type="number"/>
          </div>
          <div>
            <label className="lbl">Fondo (m) <span style={{color:"#c0b8ae",fontWeight:400}}>opcional</span></label>
            <input className="f" value={fondo} onChange={e=>setFondo(e.target.value)} disabled={loading} placeholder="30" type="number"/>
          </div>
        </div>
        {err&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 14px",color:"#dc2626",fontSize:13,marginBottom:12}}>{err}</div>}
        <div style={{display:"flex",gap:10}}>
          <button onClick={run} disabled={loading} style={{flex:1,background:loading?"#d4cfc8":"#1a1510",border:"none",borderRadius:10,padding:"12px 0",color:loading?"#7a6f64":"#fff",fontSize:14,fontWeight:600,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            {loading?<><div style={{width:15,height:15,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>{STEPS[step]}</>:"Analizar terreno →"}
          </button>
          <button onClick={()=>{setRes(null);setDir("");setM2("");setPx("");setProd("");setFrente("");setFondo("");}} style={{background:"transparent",border:"1.5px solid #EAE5DF",borderRadius:10,padding:"12px 18px",color:"#7a6f64",fontSize:13,cursor:"pointer",fontWeight:500,whiteSpace:"nowrap"}}>← Nuevo</button>
        </div>
        {loading&&<div style={{display:"flex",justifyContent:"center",gap:8,marginTop:14}}>
          {STEPS.map((_,i)=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:i<=step?BLUE:"#EAE5DF",transform:i===step?"scale(1.5)":"scale(1)",transition:"all .3s"}}/>)}
        </div>}
      </div>

      {/* ══ ERROR USO DE SUELO HU ══ */}
      {res&&!loading&&res.tipo_analisis==="error_uso_suelo"&&(
        <div className="up" style={{display:"flex",flexDirection:"column",gap:14}}>
          <Header/>
          <div style={{background:"#FFF7ED",border:"2px solid #FED7AA",borderRadius:14,padding:"24px 28px"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
              <div style={{fontSize:24,lineHeight:"1",flexShrink:0}}>⚠️</div>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#c2410c",marginBottom:8}}>
                  Producto no compatible con zona HU (Habitacional Unifamiliar)
                </div>
                <p style={{fontSize:14,color:"#7c2d12",lineHeight:1.7,marginBottom:16}}>
                  La zona <strong>HU</strong> solo permite <strong>una vivienda por lote</strong>. No es compatible con departamentos ni multifamiliar vertical.
                </p>
                <div style={{background:"#FEF3C7",borderRadius:10,padding:"14px 18px",marginBottom:12}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#b45309",marginBottom:8}}>¿Qué SÍ se puede hacer en HU?</div>
                  <div style={{fontSize:13,color:"#78350f",lineHeight:1.9}}>
                    ✓ 1 vivienda unifamiliar<br/>
                    ✓ Duplex o casa con depto de servicio (condicionado)<br/>
                    ✓ Multifamiliar horizontal / townhouses — <strong>requiere verificación directa con Desarrollo Urbano Sostenible de Monterrey</strong>
                  </div>
                </div>
                <div style={{background:"#DBEAFE",borderRadius:10,padding:"14px 18px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#1d4ed8",marginBottom:6}}>Para departamentos busca zonas:</div>
                  <div style={{fontSize:13,color:"#1e3a5f"}}>
                    <strong>HM</strong> · <strong>HML</strong> · <strong>HMM</strong> · <strong>HMI</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {res.lineamientos&&<><div className="sec-hdr" style={{borderColor:BLUE}}><div style={{fontSize:11,fontWeight:700,color:BLUE,letterSpacing:".08em",textTransform:"uppercase" as const}}>Lineamientos del terreno (solo referencia)</div></div><LineamientosBlock/></>}
        </div>
      )}

      {/* ══ LINEAMIENTOS ══ */}
      {res&&!loading&&res.tipo_analisis==="lineamientos"&&(
        <div className="up"><Header/><LineamientosBlock/></div>
      )}

      {/* ══ MERCADO ══ */}
      {res&&!loading&&res.tipo_analisis==="mercado"&&(
        <div className="up" style={{display:"flex",flexDirection:"column",gap:14}}>
          <Header/>
          {/* Orden: mercado primero, luego lineamientos */}
          <MercadoChartsBlock/>
          <div className="sec-hdr" style={{borderColor:BLUE,marginTop:8}}>
            <div style={{fontSize:11,fontWeight:700,color:BLUE,letterSpacing:".08em",textTransform:"uppercase" as const}}>Lineamientos y Giros Permitidos</div>
          </div>
          <LineamientosBlock/>
        </div>
      )}

      {/* ══ COMPLETO ══ */}
      {res&&!loading&&res.tipo_analisis==="completo"&&(
        <div className="up" style={{display:"flex",flexDirection:"column",gap:14}}>
          <Header/>

          {/* Resumen */}
          {res.analisis?.resumen_ejecutivo&&(
            <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:14,padding:"20px 24px"}}>
              <div style={{fontSize:10,fontWeight:700,color:BLUE,letterSpacing:".09em",textTransform:"uppercase" as const,marginBottom:8}}>Resumen Ejecutivo</div>
              <p style={{fontSize:14,lineHeight:1.75,color:"#1e3a5f"}}>{res.analisis.resumen_ejecutivo}</p>
            </div>
          )}

          {/* SECCIÓN 1 */}
          <div className="sec-hdr" style={{borderColor:BLUE}}>
            <div style={{fontSize:11,fontWeight:700,color:BLUE,letterSpacing:".08em",textTransform:"uppercase" as const}}>1 · Lineamientos Urbanísticos y Giros</div>
          </div>
          <LineamientosBlock/>

          {/* Reglamento construcción */}
          {res.analisis?.viabilidad_tecnica&&(
            <div className="card">
              <div className="lbl" style={{marginBottom:14}}>Reglamento de Construcción — Restricciones del Predio</div>
              <div className="g2">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[
                    {l:frente?"Frente":"Frente estimado",v:(()=>{const f=res.analisis.viabilidad_tecnica.frente_m||res.analisis.viabilidad_tecnica.frente_estimado_m;return f?`${f} m`:(frente?`${frente} m`:"—");})()},
                    {l:"Restricción frontal",v:res.analisis.viabilidad_tecnica.restriccion_frontal_m?`${res.analisis.viabilidad_tecnica.restriccion_frontal_m} m`:"—"},
                    {l:"Restricción lateral",v:res.analisis.viabilidad_tecnica.restriccion_lateral_m?`${res.analisis.viabilidad_tecnica.restriccion_lateral_m} m`:"—"},
                    {l:"Restricción posterior",v:res.analisis.viabilidad_tecnica.restriccion_posterior_m?`${res.analisis.viabilidad_tecnica.restriccion_posterior_m} m`:"—"},
                    {l:"Área neta real",v:res.analisis.viabilidad_tecnica.area_neta_construible_m2?`${$(res.analisis.viabilidad_tecnica.area_neta_construible_m2,"n")} m²`:"—"},
                    {l:"Niveles posibles",v:res.analisis.viabilidad_tecnica.niveles_posibles||"—"},
                  ].map(k=>(
                    <div key={k.l} style={{background:"#F5F2EE",borderRadius:10,padding:"12px 14px"}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#a09888",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4}}>{k.l}</div>
                      <div style={{fontSize:14,fontWeight:700}}>{k.v}</div>
                    </div>
                  ))}
                </div>
                {res.analisis.viabilidad_tecnica.retos_constructivos?.length>0&&(
                  <div>
                    <div className="lbl" style={{marginBottom:8}}>Retos constructivos</div>
                    {res.analisis.viabilidad_tecnica.retos_constructivos.map((r:string,i:number)=>(
                      <div key={i} style={{display:"flex",gap:8,padding:"5px 0",borderBottom:"1px solid #F0EBE5",fontSize:13,color:"#3a3228",lineHeight:1.4}}>
                        <span style={{color:"#f97316",fontWeight:700,flexShrink:0}}>·</span>{r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Estacionamiento */}
          {res.analisis?.estacionamiento&&(
            <div style={{background:res.analisis.estacionamiento.viable===false?"#FFF7ED":"#F0FDF4",border:`1px solid ${res.analisis.estacionamiento.viable===false?"#FED7AA":"#BBF7D0"}`,borderRadius:14,padding:"20px 24px"}}>
              <div style={{fontSize:10,fontWeight:700,color:res.analisis.estacionamiento.viable===false?"#c2410c":"#15803d",letterSpacing:".09em",textTransform:"uppercase" as const,marginBottom:12}}>
                Análisis de Estacionamiento
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:12}}>
                {[
                  {l:"Cajones requeridos",v:`${res.analisis.estacionamiento.cajones_requeridos} cajones`},
                  {l:"Área requerida",v:`${$(res.analisis.estacionamiento.area_requerida_m2,"n")} m²`},
                  {l:"Área disponible",v:`${$(res.analisis.estacionamiento.area_disponible_estimada_m2,"n")} m²`},
                  {l:"Viabilidad",v:res.analisis.estacionamiento.viable?"VIABLE":"RESTRICCIÓN CRÍTICA",col:res.analisis.estacionamiento.viable?"#15803d":"#dc2626"},
                ].map(k=>(
                  <div key={k.l}>
                    <div style={{fontSize:10,fontWeight:700,color:"#a09888",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4}}>{k.l}</div>
                    <div style={{fontSize:15,fontWeight:700,color:(k as any).col||"#1a1510"}}>{k.v}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:12,color:"#7a6f64",lineHeight:1.6}}><strong>Cálculo:</strong> {res.analisis.estacionamiento.calculo}</div>
              {res.analisis.estacionamiento.notas&&<div style={{fontSize:12,color:"#7a6f64",marginTop:6,lineHeight:1.6}}><strong>Notas:</strong> {res.analisis.estacionamiento.notas}</div>}
            </div>
          )}

          {/* SECCIÓN 2 */}
          <div className="sec-hdr" style={{borderColor:AMBER,marginTop:8}}>
            <div style={{fontSize:11,fontWeight:700,color:AMBER,letterSpacing:".08em",textTransform:"uppercase" as const}}>2 · Estudio de Mercado</div>
          </div>
          <MercadoChartsBlock/>

          {/* Entorno */}
          {res.analisis?.entorno_y_urbanismo&&(
            <div className="card">
              <div className="lbl" style={{marginBottom:10}}>Entorno y Urbanismo</div>
              <p style={{fontSize:14,lineHeight:1.7,color:"#3a3228",marginBottom:8}}>{res.analisis.entorno_y_urbanismo.descripcion_zona}</p>
              {res.analisis.entorno_y_urbanismo.conectividad&&<p style={{fontSize:13,color:"#7a6f64",lineHeight:1.6,marginBottom:8}}>{res.analisis.entorno_y_urbanismo.conectividad}</p>}
              {res.analisis.entorno_y_urbanismo.servicios_cercanos?.length>0&&(
                <div style={{marginTop:8}}>{res.analisis.entorno_y_urbanismo.servicios_cercanos.map((s:string,i:number)=>(
                  <span key={i} style={{background:"#EEE9E3",borderRadius:100,padding:"3px 10px",fontSize:11,fontWeight:500,color:"#5a4f44",margin:"3px 3px 0 0",display:"inline-block"}}>{s}</span>
                ))}</div>
              )}
            </div>
          )}

          {/* SECCIÓN 3 */}
          <div className="sec-hdr" style={{borderColor:GREEN,marginTop:8}}>
            <div style={{fontSize:11,fontWeight:700,color:GREEN,letterSpacing:".08em",textTransform:"uppercase" as const}}>3 · Análisis Financiero</div>
          </div>

          {finF&&(
            <div className="card">
              <div className="lbl" style={{marginBottom:14}}>Desglose financiero completo</div>
              {finF.calculo_ingresos&&(
                <div style={{background:"#EFF6FF",borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#1e3a5f",lineHeight:1.6}}>
                  <strong>Cálculo de ingresos:</strong> {finF.calculo_ingresos}
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
                {[
                  {l:"Precio terreno",v:$(finF.precio_terreno)},
                  {l:"Costo construcción",v:$(finF.costo_construccion_total)},
                  {l:"Estacionamiento",v:$(finF.costo_estacionamiento||0)},
                  {l:"Indirectos",v:`${finF.gastos_indirectos_pct||0}% → ${$(finF.gastos_indirectos||0)}`},
                  {l:"Comercialización",v:`${finF.comercializacion_pct||0}% → ${$(finF.comercializacion||0)}`},
                  {l:"Contingencias",v:`${finF.contingencias_pct||0}% → ${$(finF.contingencias||0)}`},
                  {l:"Costo total",v:$(finF.costo_total_proyecto),b:true},
                  {l:"Ingreso estimado",v:$(finF.ingreso_total_estimado),b:true},
                  {l:"Utilidad bruta",v:$(finF.utilidad_bruta),col:finF.utilidad_bruta>=0?GREEN:"#dc2626",b:true},
                  {l:"Margen bruto",v:pct(finF.margen_bruto_pct),col:finF.margen_bruto_pct>=15?GREEN:finF.margen_bruto_pct>=8?AMBER:"#dc2626",b:true},
                  {l:"ROI",v:pct(finF.roi_pct),col:finF.roi_pct>=20?GREEN:finF.roi_pct>=10?AMBER:"#dc2626",b:true},
                  {l:"TIR estimada",v:pct(finF.tir_estimada_pct),col:finF.tir_estimada_pct>=18?GREEN:finF.tir_estimada_pct>=10?AMBER:"#dc2626",b:true},
                  {l:"Unidades reales",v:`${finF.unidades_reales||unidadesMax} und.`},
                  {l:"M² / unidad",v:finF.m2_promedio_unidad?`${finF.m2_promedio_unidad} m²`:"—"},
                  {l:"Precio/unidad",v:$(finF.precio_venta_por_unidad)},
                  {l:"Plazo",v:`${finF.plazo_meses} meses`},
                ].map(k=>(
                  <div key={k.l} style={{background:"#F5F2EE",borderRadius:10,padding:"13px 15px"}}>
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
                  <div className="lbl" style={{color:GREEN,marginBottom:10}}>Fortalezas</div>
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
            <div style={{background:C.white,border:`2px solid ${semCol}`,borderRadius:16,padding:"26px 30px",boxShadow:`0 0 0 4px ${semCol}10`}}>
              <div className="lbl" style={{marginBottom:8}}>Veredicto Final</div>
              <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:38,color:semCol,lineHeight:1,marginBottom:14}}>{res.analisis.veredicto}</div>
              <p style={{fontSize:14,color:"#3a3228",lineHeight:1.7,marginBottom:res.analisis.proximos_pasos?.length>0?14:0}}>{res.analisis.justificacion_veredicto}</p>
              {res.analisis.proximos_pasos?.length>0&&(
                <div style={{borderTop:"1px solid #EAE5DF",paddingTop:14}}>
                  <div className="lbl" style={{marginBottom:10}}>Próximos Pasos</div>
                  {res.analisis.proximos_pasos.map((p:string,i:number)=>(
                    <div key={i} style={{display:"flex",gap:12,marginTop:10,fontSize:13,color:"#3a3228",lineHeight:1.5,alignItems:"flex-start"}}>
                      <div style={{width:22,height:22,borderRadius:"50%",background:"#EFF6FF",border:`1.5px solid #BFDBFE`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:700,color:BLUE}}>{i+1}</div>
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div></>)}


  </>);
}