"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const API = "https://lojqmvpzdhayekzgwazw.supabase.co/functions/v1/analizar_terreno";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvanFtdnB6ZGhheWVremd3YXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzQ1MzUsImV4cCI6MjA4OTcxMDUzNX0.CZpREN5V1i1D8TSNrdmGR0of4F_DuS6EqU9AE9a_eog";
type Tipo = "lineamientos"|"mercado"|"completo";

const $   = (n:any,m="c")=>n!=null&&!isNaN(+n)?(m==="c"?new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(+n):new Intl.NumberFormat("es-MX",{maximumFractionDigits:0}).format(+n)):"—";
const pct = (n:any)=>n!=null&&!isNaN(+n)?`${(+n).toFixed(1)}%`:"—";
const STEPS=["Geocodificando…","Buscando zona…","Consultando PDU…","Investigando mercado…","Generando reporte…"];
const TIPS=[
  {tag:"Art. 36 · PDU",txt:"Las densidades y lineamientos urbanísticos del PDU definen el aprovechamiento máximo de cada predio. Un terreno en CAI puede construir hasta CUS 10 si supera los 1,000 m²."},
  {tag:"Art. 44 · Reg. Zonificación",txt:"En predios sobre Corredores de Alto Impacto, la altura y densidad se calculan considerando un área de influencia de 100 metros de profundidad desde la vialidad."},
  {tag:"Art. 48 · Reg. Zonificación",txt:"Las áreas de estacionamiento subterráneo están exentas del CUS. Esta estrategia permite liberar metros construibles para uso habitable o comercial."},
  {tag:"Art. 45 BIS · Reg. Zonificación",txt:"Un predio frente a una vialidad subcolectora clasificado como Corredor Urbano puede aplicar tanto los lineamientos del corredor como los de la zona base, eligiendo los más convenientes."},
  {tag:"Art. 73 · Reg. Zonificación",txt:"Los predios mayores a 2,000 m² dentro de la zona DOT (a 800m de estaciones de metro) pueden incrementar CUS hasta 100% y reducir requerimiento de cajones de estacionamiento en 50%."},
  {tag:"Art. 40 · Reg. Zonificación",txt:"La superficie mínima de lote para vivienda multifamiliar dúplex vertical es de 140 m². Para triplex, 180 m². Este requisito puede condicionar la viabilidad en terrenos pequeños."},
  {tag:"Art. 52 · Reg. Zonificación",txt:"Cada cajón de estacionamiento en batería mide mínimo 5.00 × 2.70 m. Hasta un 25% puede ser para autos compactos con dimensiones de 4.50 × 2.50 m."},
  {tag:"Art. 102 · Reg. Zonificación",txt:"Proyectos habitacionales multifamiliares que requieran más de 25 cajones de estacionamiento deben presentar Estudio de Impacto Vial ante la Secretaría de Desarrollo Urbano."},
  {tag:"Art. 31 · Reg. Zonificación",txt:"En predios clasificados como Comercio de Barrio se permite la vivienda multifamiliar, tiendas de especialidades y locales comerciales agrupados, aplicando lineamientos de la zona donde se ubiquen."},
  {tag:"Art. 35 BIS · Reg. Zonificación",txt:"Las suites ejecutivas y casas de huéspedes pueden instalarse en zonas HM, HML, HMM y HMI cuando se ubiquen a menos de 500 metros de hospitales, universidades o centros de convenciones."},
  {tag:"Cuadro 21 · PDU",txt:"La densidad máxima en Subcentros Urbanos es de 150 viviendas por hectárea, con CUS de 5 para terrenos menores a 1,000 m² y CUS de 10 para terrenos mayores — el doble de aprovechamiento."},
  {tag:"Art. 39 · Reg. Zonificación",txt:"La altura máxima de un edificio se mide desde el punto más alto del terreno hasta la parte superior de la losa. Los tanques de agua, cubos de elevadores y equipos no cuentan en esa medición."},
];
const BLUE="#2563a8", AMBER="#d97706", GREEN="#15803d";

/* ══════════════════════════════════════════════════════
   CHART COMPONENTS
══════════════════════════════════════════════════════ */

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
      ctx.font="11px Inter,sans-serif"; ctx.fillStyle="#7a6f64"; ctx.textAlign="right";
      ctx.fillText(b.l,lw-8,y+bh/2+4);
      ctx.fillStyle="#F0EBE5"; ctx.beginPath();
      if(ctx.roundRect)ctx.roundRect(lw,y,chartW,bh,4); else ctx.rect(lw,y,chartW,bh);
      ctx.fill();
      ctx.fillStyle=b.c; ctx.beginPath();
      if(ctx.roundRect)ctx.roundRect(lw,y,bw,bh,4); else ctx.rect(lw,y,bw,bh);
      ctx.fill();
      ctx.font="bold 12px Inter,sans-serif"; ctx.fillStyle="#1a1510"; ctx.textAlign="left";
      ctx.fillText(`$${(b.v/1000).toFixed(0)}k`,lw+bw+8,y+bh/2+4);
    });
  },[bars,h]);
  return <canvas ref={ref}/>;
}

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
    [0,.25,.5,.75,1].forEach(f=>{
      const y=p.t+f*cH;
      ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(W-p.r,y);
      ctx.strokeStyle="rgba(0,0,0,.05)";ctx.lineWidth=1;ctx.stroke();
      ctx.font="10px Inter,sans-serif";ctx.fillStyle="#a09888";ctx.textAlign="right";
      ctx.fillText(`$${((minY+(maxY-minY)*(1-f))/1e6).toFixed(1)}M`,p.l-4,y+3);
    });
    ctx.font="9px Inter,sans-serif";ctx.fillStyle="#a09888";ctx.textAlign="center";
    ctx.fillText(`${minX}m²`,p.l,h-4); ctx.fillText(`${maxX}m²`,toX(maxX),h-4);
    ctx.fillText("Tamaño unidad",W/2,h-4);
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
  const supabase = createClient();
  const [userSession, setUserSession] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [parkGiro, setParkGiro] = useState("1.1.2");
  const [parkM2, setParkM2] = useState("");
  const [parkResult, setParkResult] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  // ── NUEVO: estados Mercado Pago ──
  const [comprando, setComprando] = useState(false);
  const [showPaquetesModal, setShowPaquetesModal] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  const [creditos, setCreditos] = useState<number|null>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [reporteAbierto, setReporteAbierto] = useState<any>(null);
  const [dir,setDir]=useState(""); const [m2,setM2]=useState(""); const [px,setPx]=useState("");
  const [frente,setFrente]=useState(""); const [fondo,setFondo]=useState("");
  const [tipo,setTipo]=useState<Tipo>("lineamientos"); const [prod,setProd]=useState("");
  const [step,setStep]=useState(0);
  const [isoLoading,setIsoLoading]=useState(false);
  const [isoHtml,setIsoHtml]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [tipIdx,setTipIdx]=useState(0);
  const [pdfLoading,setPdfLoading]=useState(false);
  const iframeRef=useRef<HTMLIFrameElement>(null);
  const [res,setRes]=useState<any>(null); const [err,setErr]=useState("");
  const needsProd=tipo==="mercado"||tipo==="completo";

  // ── Auth + restaurar form pendiente ──
  useEffect(()=>{
    const pending = localStorage.getItem("ue_pending");
    if(pending){
      try{
        const p = JSON.parse(pending);
        if(p.dir) setDir(p.dir);
        if(p.m2) setM2(p.m2);
        if(p.px) setPx(p.px);
        if(p.tipo) setTipo(p.tipo);
        if(p.prod) setProd(p.prod);
        if(p.frente) setFrente(p.frente);
        if(p.fondo) setFondo(p.fondo);
        localStorage.removeItem("ue_pending");
      }catch(e){}
    }
    supabase.auth.getSession().then(({data:{session}})=>{
      setUserSession(session);
      if(session?.user?.id) cargarPerfil(session.user.id);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      setUserSession(session);
      if(session?.user?.id) cargarPerfil(session.user.id);
      else { setCreditos(null); setHistorial([]); }
    });
    return()=>subscription.unsubscribe();
  },[]);

  // ── NUEVO: detectar regreso de Mercado Pago ──
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const cr   = params.get("cr");
    if(pago === "exitoso"){
      window.history.replaceState({}, "", "/");
      setPagoExitoso(true);
      // Esperar 2s para que el webhook de MP procese y luego recargar créditos
      setTimeout(()=>{
        supabase.auth.getSession().then(({data:{session}})=>{
          if(session?.user?.id) cargarPerfil(session.user.id);
        });
        setTimeout(()=>setPagoExitoso(false), 5000);
      }, 2000);
    } else if(pago === "fallido"){
      window.history.replaceState({}, "", "/");
      alert("El pago no se completó. Puedes intentarlo de nuevo.");
    }
  },[]);

  async function cargarPerfil(userId:string, isNew=false){
    const [{data:perfil},{data:reportes}] = await Promise.all([
      supabase.from("profiles").select("creditos,nombre,total_reportes").eq("id",userId).single(),
      supabase.from("reportes").select("id,direccion,tipo_analisis,semaforo,veredicto,creditos_usados,created_at,resultado").eq("user_id",userId).order("created_at",{ascending:false}).limit(20),
    ]);
    if(perfil) setCreditos(perfil.creditos);
    if(reportes) setHistorial(reportes);
    if(isNew || (perfil && perfil.total_reportes===0 && reportes?.length===0)){
      const name = (perfil as any)?.nombre
        || userSession?.user?.user_metadata?.full_name
        || userSession?.user?.user_metadata?.name
        || userSession?.user?.email?.split("@")[0]
        || "";
      setWelcomeName(name);
      if(!sessionStorage.getItem("welcomed")){
        setShowWelcome(true);
        sessionStorage.setItem("welcomed","1");
      }
    }
  }

  useEffect(()=>{
    if(!loading)return;
    const iv=setInterval(()=>setTipIdx(i=>(i+1)%TIPS.length),4200);
    return()=>clearInterval(iv);
  },[loading]);

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
      const token = userSession?.access_token ?? "";
      if (!token) {
        setLoading(false);
        localStorage.setItem("ue_pending", JSON.stringify({dir,m2:m2,px,tipo,prod,frente,fondo}));
        setShowLoginModal(true);
        return;
      }
      const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${ANON_KEY}`,"x-user-token":token},body:JSON.stringify(body)});
      const d=await r.json();
      if(d.necesita_producto){setErr("Indica qué quieres construir.");setLoading(false);return;}
      if(d.error==="sin_creditos"||d.creditos_disponibles===0){
        setLoading(false); setShowNoCreditsModal(true); return;
      }
      if(d.error_uso_suelo){
        if(d.lineamientos) setRes({...d, ok:true, tipo_analisis:"error_uso_suelo", tipo_analisis_real: tipo});
        else setErr(d.error);
        setLoading(false);return;
      }
      if(d.ok){
        setRes(d);
        if(userSession?.user?.id) cargarPerfil(userSession.user.id);
      } else setErr(d.error||"Error inesperado.");
    }catch{setErr("Error de conexión.");}
    finally{setLoading(false);}
  }

  // ── NUEVO: función de compra con Mercado Pago ──
  async function comprarCreditos(paquete: "3"|"10"|"25"|"60"){
    if(!userSession?.access_token){ setShowLoginModal(true); return; }
    setComprando(true);
    try{
      const r = await fetch(
        "https://lojqmvpzdhayekzgwazw.supabase.co/functions/v1/crear_preferencia_mp",
        {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${ANON_KEY}`,
            "x-user-token":  userSession.access_token,
          },
          body: JSON.stringify({ paquete, origin: window.location.origin }),
        }
      );
      const d = await r.json();
      if(d.init_point){
        window.location.href = d.init_point;
      } else {
        alert("Error al iniciar el pago: " + (d.error || "intenta de nuevo"));
        setComprando(false);
      }
    }catch(e){
      alert("Error de conexión. Intenta de nuevo.");
      setComprando(false);
    }
  }

  const sem=res?.analisis?.semaforo;
  const semCol=sem==="VERDE"?"#15803d":sem==="AMARILLO"?"#d97706":sem==="ROJO"?"#dc2626":null;

  const rawMercado   = res?.analisis?.mercado || null;
  const rawRes = rawMercado?.mercado_residencial
    || res?.analisis?.mercado_residencial
    || res?.analisis?.mercado_producto
    || rawMercado
    || null;
  const rawCom = rawMercado?.mercado_comercial
    || res?.analisis?.mercado_comercial
    || null;

  const mp = rawRes ? {
    tipo:                    rawRes.tipo || prod,
    precio_venta_m2_min:     rawRes.precio_venta_m2_min     || 0,
    precio_venta_m2_max:     rawRes.precio_venta_m2_max     || 0,
    precio_venta_m2_promedio:rawRes.precio_venta_m2_promedio|| 0,
    precio_renta_mensual_m2: rawRes.precio_renta_mensual_m2 || rawRes.precio_renta_m2_mes || 0,
    m2_promedio_unidad:      rawRes.m2_promedio_unidad       || 0,
    absorcion_estimada_meses:rawRes.absorcion_estimada_meses || rawRes.absorcion_meses || 0,
    demanda:   rawRes.demanda   || rawMercado?.demanda   || "",
    tendencia: rawRes.tendencia || rawMercado?.tendencia || "",
    proyectos_competencia: (rawRes.proyectos_competencia||[])
      .map((p:any)=>typeof p==="string"?{nombre:p,precio_desde:0,precio_hasta:0,m2_min:0,m2_max:0}:p),
    tipologias: rawRes.tipologias || [],
    mercado_comercial: rawCom || null,
  } : null;

  const rawPt = res?.analisis?.precio_terreno_mercado || null;
  const pt = rawPt ? rawPt : rawMercado ? {
    promedio_m2:           rawMercado.precio_terreno_mercado_m2_promedio || 0,
    evaluacion_precio:     rawMercado.evaluacion_precio_terreno || "",
    porcentaje_diferencia: rawMercado.porcentaje_sobre_mercado  || 0,
  } : null;

  const fin=res?.analisis?.financiero;
  const finF=fin||null;

  const redFlagsMerged:string[] = res?.analisis?.red_flags || [];
  const semFinal    = res?.analisis?.semaforo  || "";
  const semColFinal = semFinal==="VERDE"?"#15803d":semFinal==="AMARILLO"?"#d97706":semFinal==="ROJO"?"#dc2626":null;
  const verdFinal   = res?.analisis?.veredicto || "";
  const justFinal   = res?.analisis?.justificacion_veredicto || "";

  const densVivHa=parseFloat(res?.lineamientos?.densidad_max_viv_ha)||0;
  const m2Terreno=res?.terreno?.metros2||0;
  const unidadesMax=densVivHa>0?Math.floor(densVivHa*(m2Terreno/10000)):null;

  const rawPot = res?.analisis?.potencial_proyecto || null;
  const rawPotResidencial = res?.analisis?.financiero?.modelo_residencial || rawPot || null;
  const rawPotComercial   = res?.analisis?.financiero?.modelo_comercial   || null;

  const mpData = (mp || rawPot || fin) ? {
    ...mp,
    unidades:  rawPot?.unidades_pdu || unidadesMax || 0,
    m2_unit:   rawPot?.m2_promedio_unidad || mp?.m2_promedio_unidad || fin?.m2_promedio_unidad || 0,
    pxm2:      rawPot?.precio_venta_m2_promedio || mp?.precio_venta_m2_promedio || fin?.precio_venta_m2_promedio || 0,
    ing_calc:  rawPot?.calculo_detalle || fin?.calculo_ingresos || "",
    ing_total: rawPot?.ingreso_total_estimado || rawPot?.ingreso_total_venta || fin?.ingreso_total_estimado || 0,
    ing_venta_depas:    rawPotResidencial?.ingreso_venta_depas || rawPot?.ingreso_venta_residencial || 0,
    valor_cap_comercial:rawPotComercial?.valor_capitalizacion  || rawPot?.valor_cap_comercial || 0,
    noi_anual:          rawPotComercial?.noi_anual             || rawPot?.noi_anual_comercial  || 0,
    competencia: mp?.proyectos_competencia || [],
    tipologias:  mp?.tipologias || [],
    mercado_comercial: mp?.mercado_comercial || null,
  } : null;

  const DISTRITOS_PARK = ["Centro","Industrial","Mitras Centro","Obispado","San Jerónimo",
    "Cumbres","Cumbres Pte.","Cd. Solidaridad","Mitras Norte","San Bernabé",
    "Valle Verde","Garza Sada","Independencia","Lázaro Cárdenas","Satélite"];
  const CAJONES_MF    = [1,1,2.3,2.3,2.3,2.3,2.3,1.5,2,1.5,2,2.3,2,2.3,2.3];
  const CAJONES_LOFT  = [1,1,1.2,1.2,1.2,1.2,1.2,1,1,1,1,1.2,1,1.2,1.2];
  const M2_LOCALES    = [30,30,20,20,20,20,20,30,25,30,25,20,25,20,20];
  const M2_OFICINAS   = [45,45,30,30,30,30,30,45,35,45,35,30,35,30,30];
  const M2_RESTAUR    = [15,15,10,10,10,10,10,15,12,15,12,10,12,10,10];

  function getDistritoIdxFront(dist:string):number{
    const d=(dist||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
    const keys=["centro","industrial","mitras centro","obispado","san jeronimo","cumbres",
      "cumbres pte","cd. solidaridad","mitras norte","san bernabe","valle verde",
      "garza sada","independencia","lazaro cardenas","satelite"];
    const idx=keys.findIndex(k=>d.includes(k)||k.includes(d));
    return idx>=0?idx:0;
  }

  const GIROS_PARK=[
    {codigo:"1.1.2",label:"Multifamiliar (departamentos)",unidad:"viviendas"},
    {codigo:"1.1.3",label:"Multifamiliar Lofts/Suites ≤40 m²",unidad:"viviendas"},
    {codigo:"2.3.1",label:"Locales comerciales agrupados",unidad:"m²"},
    {codigo:"2.3.3",label:"Centro/Plaza comercial",unidad:"m²"},
    {codigo:"3.4.5",label:"Restaurantes y cafés",unidad:"m²"},
    {codigo:"3.9.3",label:"Oficinas corporativas",unidad:"m²"},
    {codigo:"3.9.4",label:"Oficinas profesionistas",unidad:"m²"},
  ];

  function calcEstacionamiento(){
    const dist=res?.ubicacion?.distrito||"";
    const idx=getDistritoIdxFront(dist);
    const giroData=GIROS_PARK.find(g=>g.codigo===parkGiro);
    if(!giroData) return;
    const esVivienda=parkGiro==="1.1.2"||parkGiro==="1.1.3";
    const cantidad=esVivienda?(unidadesMax||0):parseFloat(parkM2||"0");
    if(cantidad<=0){ setParkResult({error:"Ingresa una cantidad válida."}); return; }
    let cajonesPorUnidad=1, m2PorCajon=0;
    if(parkGiro==="1.1.2")        cajonesPorUnidad=CAJONES_MF[idx];
    else if(parkGiro==="1.1.3")   cajonesPorUnidad=CAJONES_LOFT[idx];
    else if(parkGiro==="2.3.1"||parkGiro==="2.3.3") m2PorCajon=M2_LOCALES[idx];
    else if(parkGiro==="3.4.5")   m2PorCajon=M2_RESTAUR[idx];
    else if(parkGiro==="3.9.3"||parkGiro==="3.9.4") m2PorCajon=M2_OFICINAS[idx];
    const cajones=esVivienda
      ? Math.ceil(cantidad*cajonesPorUnidad)
      : Math.ceil(cantidad/m2PorCajon);
    const m2Estac=cajones*12;
    setParkResult({
      giro: giroData.label,
      distrito: DISTRITOS_PARK[idx]||dist,
      cantidad, unidad: giroData.unidad,
      cajones_por_unidad: esVivienda?cajonesPorUnidad:null,
      m2_por_cajon: !esVivienda?m2PorCajon:null,
      cajones, m2_estacionamiento: m2Estac,
      calculo: esVivienda
        ? `${cantidad} ${giroData.unidad} × ${cajonesPorUnidad} cajones = ${cajones} cajones`
        : `${cantidad} m² ÷ ${m2PorCajon} m²/cajón = ${cajones} cajones`,
      fuente: "PDU Monterrey 2013-2025, Matriz de Estacionamientos",
    });
  }

  const C={bg:"#F5F2EE",white:"#fff",dark:"#1a1510",blue:BLUE,border:"#EAE5DF",mid:"#7a6f64",light:"#a09888",vl:"#c0b8ae"};

  /* ── LINEAMIENTOS BLOCK ── */
  const LineamientosBlock=()=>(
    <div style={{display:"flex",flexDirection:"column" as const,gap:14}}>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 24px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:".09em",textTransform:"uppercase" as const,color:C.light,marginBottom:14}}>Lineamientos Urbanísticos — PDU Monterrey 2013-2025</div>
        <div className="stagger" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:12}}>
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
      {res?.tipo_analisis==="lineamientos"&&(()=>{
        const giroActual=GIROS_PARK.find(g=>g.codigo===parkGiro);
        const esVivienda=parkGiro==="1.1.2"||parkGiro==="1.1.3";
        return(
          <div style={{background:C.white,border:`2px solid ${BLUE}22`,borderRadius:14,padding:"20px 24px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
              <div style={{width:28,height:28,borderRadius:8,background:`${BLUE}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🅿️</div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:BLUE,letterSpacing:".08em",textTransform:"uppercase" as const}}>Calcular Estacionamiento PDU</div>
                <div style={{fontSize:10,color:C.light,marginTop:1}}>Basado en Distrito: <strong style={{color:C.mid}}>{res?.ubicacion?.distrito||"—"}</strong></div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end"}}>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:C.light,letterSpacing:".08em",textTransform:"uppercase" as const,display:"block",marginBottom:5}}>Giro / Uso</label>
                <select className="f" value={parkGiro} onChange={e=>{setParkGiro(e.target.value);setParkResult(null);}} style={{cursor:"pointer"}}>
                  {GIROS_PARK.map(g=>(
                    <option key={g.codigo} value={g.codigo}>{g.codigo} — {g.label}</option>
                  ))}
                </select>
              </div>
              {!esVivienda&&(
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:C.light,letterSpacing:".08em",textTransform:"uppercase" as const,display:"block",marginBottom:5}}>M² a construir</label>
                  <input className="f" type="number" placeholder="Ej: 500" value={parkM2} onChange={e=>{setParkM2(e.target.value);setParkResult(null);}} style={{width:120}}/>
                </div>
              )}
            </div>
            {esVivienda&&unidadesMax!=null&&(
              <div style={{marginTop:8,background:`${BLUE}08`,borderRadius:8,padding:"8px 12px",fontSize:12,color:BLUE}}>
                Unidades PDU: <strong>{unidadesMax}</strong>
                <span style={{color:C.light,marginLeft:6}}>({densVivHa} viv/Ha × {m2Terreno} m² / 10,000)</span>
              </div>
            )}
            <button onClick={calcEstacionamiento} style={{
              marginTop:12,width:"100%",background:`linear-gradient(135deg,${BLUE},#1a7a8a)`,
              border:"none",borderRadius:10,padding:"11px",color:"#fff",
              fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:".02em"
            }}>
              Calcular → PDU Monterrey
            </button>
            {parkResult&&!parkResult.error&&(
              <div style={{marginTop:14,background:"#F0F9FF",border:"1px solid #BAE6FD",borderRadius:12,padding:"16px 18px"}}>
                <div style={{fontSize:10,fontWeight:700,color:BLUE,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:10}}>Resultado</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:12}}>
                  {[
                    {l:"Cajones requeridos",v:`${parkResult.cajones} cajones`,hl:true},
                    {l:"Área estacionamiento",v:`${parkResult.m2_estacionamiento.toLocaleString("es-MX")} m²`,hl:false},
                    {l:"Distrito",v:parkResult.distrito,hl:false},
                    {l:"Norma aplicada",v:esVivienda?`${parkResult.cajones_por_unidad} caj/viv`:`1 cajón / ${parkResult.m2_por_cajon} m²`,hl:false},
                  ].map(k=>(
                    <div key={k.l} style={{background:k.hl?"#fff":"#F5FBFF",borderRadius:8,padding:"10px 12px",border:k.hl?`1.5px solid ${BLUE}44`:"1px solid #BAE6FD"}}>
                      <div style={{fontSize:9,fontWeight:700,color:"#0369a1",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:3}}>{k.l}</div>
                      <div style={{fontSize:k.hl?17:13,fontWeight:700,color:k.hl?BLUE:"#0c4a6e"}}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:"#E0F2FE",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#0369a1"}}>
                  <strong>Cálculo:</strong> {parkResult.calculo}
                </div>
                <div style={{marginTop:6,fontSize:10,color:"#7ab3cc"}}>Fuente: {parkResult.fuente}</div>
              </div>
            )}
            {parkResult?.error&&(
              <div style={{marginTop:10,background:"#FEF2F2",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#dc2626"}}>{parkResult.error}</div>
            )}
          </div>
        );
      })()}
    </div>
  );

  async function generarIsometrico(cobrarCredito = false) {
    if(!res||!res.lineamientos) return;
    if(cobrarCredito){
      if(!userSession?.access_token){setShowLoginModal(true);return;}
      if(!creditos||creditos<1){setShowNoCreditsModal(true);return;}
      await supabase.from("profiles").update({creditos:creditos-1}).eq("id",userSession.user.id);
      setCreditos(prev=>(prev??1)-1);
    }
    setIsoLoading(true);
    setIsoHtml(null);
    try {
      const vt  = res?.analisis?.viabilidad_tecnica||{};
      const lin = res.lineamientos||{};
      const fin = res?.analisis?.financiero||{};
      const m2     = res.terreno?.metros2||300;
      const cos    = parseFloat(lin.cos)||0.6;
      const cus    = parseFloat(lin.cus)||2.4;
      const frente = parseFloat(vt.frente_m) || parseFloat(vt.frente_estimado_m) || Math.round(Math.sqrt(m2*0.6));
      const fondo  = parseFloat(vt.fondo_m) || Math.round(m2/frente);
      const huella = lin.huella_max_m2||Math.round(m2*cos);
      const alturaMaxStr = String(lin.altura_max || "");
      const esAlturaLibre = /libre|según dictamen|dictamen/i.test(alturaMaxStr) || alturaMaxStr === "N/D";
      const niveles = (() => {
        if (esAlturaLibre) return 12;
        const nivStr = vt.niveles_posibles || "";
        const mNiv = nivStr.match(/(\d+)\s*nivel/i);
        if (mNiv) return parseInt(mNiv[1]);
        const mAlt = alturaMaxStr.match(/(\d+)\s*nivel/i);
        if (mAlt) return parseInt(mAlt[1]);
        return Math.max(1, Math.round(cus/cos));
      })();
      const r = await fetch("https://lojqmvpzdhayekzgwazw.supabase.co/functions/v1/generar_isometrico",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${ANON_KEY}`},
        body:JSON.stringify({
          frente, fondo, metros2:m2, cos, cus,
          altura_max:parseFloat(lin.altura_max)||18,
          niveles,
          rest_frontal:vt.restriccion_frontal_m||3,
          rest_lateral:vt.restriccion_lateral_m||0,
          rest_posterior:vt.restriccion_posterior_m||3,
          unidades:fin.unidades_reales||lin.unidades_max_pdu||0,
          zona:res.ubicacion?.zona||"",
          direccion:res.ubicacion?.direccion||"",
          huella,
        })
      });
      const d = await r.json();
      if(d.html&&(d.html.startsWith("<!DOCTYPE")||d.html.startsWith("<html"))) {
        setIsoHtml(d.html);
      } else {
        alert("No se pudo generar el modelo. Intenta de nuevo.");
      }
    } catch(e){ alert("Error: "+e); }
    finally { setIsoLoading(false); }
  }

  function loadScript(src:string):Promise<void>{
    return new Promise((res,rej)=>{
      if(document.querySelector(`script[src="${src}"]`)){res();return;}
      const s=document.createElement("script");s.src=src;
      s.onload=()=>res();s.onerror=rej;document.head.appendChild(s);
    });
  }

  async function generarPDF(){
    if(!res)return;
    setPdfLoading(true);
    let isoImg:HTMLImageElement|null=null;
    const iframeEl=iframeRef.current;
    try{
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      const {jsPDF}=(window as any).jspdf;
      const html2canvas=(window as any).html2canvas;
      const el=document.getElementById("results-container");
      if(!el){alert("No hay reporte que exportar.");return;}
      if(iframeEl&&isoHtml){
        const isoData=await new Promise<string|null>((resolve)=>{
          const handler=(e:MessageEvent)=>{
            if(e.data?.type==="unearta_snapshot"){
              window.removeEventListener("message",handler);
              resolve(e.data.data||null);
            }
          };
          window.addEventListener("message",handler);
          iframeEl.contentWindow?.postMessage("unearta_capture","*");
          setTimeout(()=>{window.removeEventListener("message",handler);resolve(null);},3500);
        });
        if(isoData&&iframeEl.parentElement){
          isoImg=document.createElement("img");
          isoImg.src=isoData;
          isoImg.style.cssText=`width:100%;height:500px;object-fit:cover;display:block;border-radius:0;`;
          iframeEl.style.display="none";
          iframeEl.parentElement.insertBefore(isoImg,iframeEl);
        }
      }
      const bgEl = document.querySelector('[style*="position: fixed"][style*="pointer-events: none"]') as HTMLElement;
      const bgEl2 = document.querySelector('[style*="position:fixed"][style*="pointerEvents"]') as HTMLElement;
      if(bgEl) bgEl.style.display = 'none';
      if(bgEl2) bgEl2.style.display = 'none';
      window.scrollTo(0,0);
      await new Promise(r=>setTimeout(r,120));
      const canvas=await html2canvas(el,{
        scale:2,useCORS:true,allowTaint:true,backgroundColor:"#ffffff",logging:false,
        windowWidth:1100,windowHeight:el.scrollHeight,
        onclone:(clonedDoc: Document)=>{
          const membrete=clonedDoc.getElementById("pdf-membrete");
          if(membrete) membrete.style.display="flex";
          const nav=clonedDoc.querySelector("header");
          if(nav)(nav as HTMLElement).style.display="none";
          const styleKill=clonedDoc.createElement("style");
          styleKill.textContent=`*{animation:none !important;animation-delay:0ms !important;animation-duration:0ms !important;transition:none !important;opacity:1 !important;transform:none !important;}`;
          clonedDoc.head.appendChild(styleKill);
          clonedDoc.querySelectorAll('[style*="overflow"]').forEach((node)=>{
            const el2 = node as HTMLElement;
            if(el2.style.overflowY==='auto'||el2.style.overflowY==='scroll'){
              el2.style.maxHeight='none'; el2.style.overflowY='visible';
            }
          });
        }
      });
      if(bgEl) bgEl.style.display = '';
      if(bgEl2) bgEl2.style.display = '';
      const imgData=canvas.toDataURL("image/jpeg",0.92);
      const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
      const margin=10;
      const W=210-margin*2, H=297;
      const imgH=(canvas.height*W)/canvas.width;
      let posY=margin;
      let remaining=imgH;
      while(remaining>0){
        doc.addImage(imgData,"JPEG",margin,posY,W,imgH);
        remaining-=(H-margin*2);
        posY-=(H-margin*2);
        if(remaining>0)doc.addPage();
      }
      const fecha=new Date().toISOString().slice(0,10);
      const dirPdf=(res.ubicacion?.direccion||"terreno").slice(0,30).replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g,"_");
      doc.save(`unearth_${dirPdf}_${fecha}.pdf`);
    }catch(err){console.error(err);alert("Error generando PDF. Intenta de nuevo.");}
    finally{
      if(isoImg){isoImg.remove();}
      if(iframeEl){iframeEl.style.display="block";}
      setPdfLoading(false);
    }
  }

  /* ── MERCADO CHARTS BLOCK ── */
  const MercadoChartsBlock=()=>{
    if(!mpData) return null;
    const comps=mpData.competencia||[];
    const tipos=mpData.tipologias||[];
    return (
      <div style={{display:"flex",flexDirection:"column" as const,gap:14}}>
        {res.analisis?.producto_compatible!=null&&(
          <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 18px",background:res.analisis.producto_compatible?"#F0FDF4":"#FEF2F2",border:`1px solid ${res.analisis.producto_compatible?"#BBF7D0":"#FECACA"}`,borderRadius:12}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:res.analisis.producto_compatible?"#15803d":"#dc2626",flexShrink:0,marginTop:3}}/>
            <div style={{maxHeight:290,overflowY:"auto" as const}}>
              <span style={{fontSize:13,fontWeight:600,color:res.analisis.producto_compatible?"#15803d":"#dc2626"}}>
                {res.analisis.producto_compatible?"Producto compatible con la zona":"Producto NO compatible"}
              </span>
              {(res.analisis.motivo_compatibilidad||res.analisis?.viabilidad_tecnica?.giro_aplicable)&&(
                <div style={{fontSize:12,color:C.mid,marginTop:3}}>{res.analisis.motivo_compatibilidad||res.analisis.viabilidad_tecnica?.giro_aplicable}</div>
              )}
            </div>
          </div>
        )}
        {pt&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12}}>
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
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(280px,100%),1fr))",gap:14}}>
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
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(280px,100%),1fr))",gap:14}}>
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
                      return(x.precio_desde+x.precio_hasta)/2/m;
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
        {res.analisis?.recomendacion&&(
          <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:14,padding:"20px 24px"}}>
            <div style={{fontSize:10,fontWeight:700,color:BLUE,letterSpacing:".09em",textTransform:"uppercase" as const,marginBottom:8}}>Análisis IA — Recomendación</div>
            <p style={{fontSize:14,lineHeight:1.75,color:"#1e3a5f"}}>{res.analisis.recomendacion}</p>
          </div>
        )}
      </div>
    );
  };

  const MercadoComercialBlock=()=>{
    const com=mpData?.mercado_comercial;
    if(!com)return null;
    return(
      <div className="card" style={{marginTop:0}}>
        <div style={{fontSize:10,fontWeight:700,color:AMBER,letterSpacing:".09em",textTransform:"uppercase" as const,marginBottom:14}}>
          Mercado Comercial — Locales en Renta (planta baja)
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:16}}>
          {[
            {l:"Renta mensual / m²",v:com.precio_renta_m2_mes_local?`$${com.precio_renta_m2_mes_local?.toLocaleString("es-MX")}/m²/mes`:"—"},
            {l:"Precio venta / m²",v:com.precio_venta_m2_local?$(com.precio_venta_m2_local):"—"},
            {l:"Absorción locales",v:com.absorcion_locales_meses?`${com.absorcion_locales_meses} meses`:"—"},
            {l:"Demanda",v:com.demanda||"—"},
          ].map(k=>(
            <div key={k.l} style={{background:"#FFF8F0",borderRadius:10,padding:"13px 15px"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#a09888",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4}}>{k.l}</div>
              <div style={{fontSize:14,fontWeight:700,color:"#1a1510"}}>{k.v}</div>
            </div>
          ))}
        </div>
        {com.precio_renta_m2_mes_local>0&&(
          <div style={{marginTop:8}}>
            <div style={{fontSize:10,fontWeight:700,color:"#a09888",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:8}}>
              Renta promedio local / m² / mes
            </div>
            <div className="mob-nav-btns" style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,height:32,background:"#F0EBE5",borderRadius:6,overflow:"hidden"}}>
                <div style={{height:"100%",background:AMBER,borderRadius:6,width:"100%",display:"flex",alignItems:"center",paddingLeft:12}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>${com.precio_renta_m2_mes_local?.toLocaleString("es-MX")}/m²/mes</span>
                </div>
              </div>
              {mpData?.noi_anual>0&&(
                <div style={{flexShrink:0,textAlign:"right" as const}}>
                  <div style={{fontSize:9,color:"#a09888",fontWeight:700}}>NOI ANUAL</div>
                  <div style={{fontSize:14,fontWeight:700,color:GREEN}}>{$(mpData.noi_anual)}</div>
                </div>
              )}
              {mpData?.valor_cap_comercial>0&&(
                <div style={{flexShrink:0,textAlign:"right" as const}}>
                  <div style={{fontSize:9,color:"#a09888",fontWeight:700}}>VALOR CAP (8%)</div>
                  <div style={{fontSize:14,fontWeight:700,color:BLUE}}>{$(mpData.valor_cap_comercial)}</div>
                </div>
              )}
            </div>
          </div>
        )}
        {com.notas&&<div style={{marginTop:10,fontSize:11,color:"#a09888"}}>{com.notas}</div>}
      </div>
    );
  };

  /* ── HEADER NEGRO ── */
  const Header=()=>(
    <div className="mob-header-card" style={{background:C.dark,borderRadius:16,padding:"22px 28px",marginBottom:20,animation:"fadeUp .3s cubic-bezier(.16,1,.3,1) both"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap" as const,gap:12,marginBottom:16}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:".1em",marginBottom:6}}>
            {res.tipo_analisis==="lineamientos"?"LINEAMIENTOS":res.tipo_analisis==="mercado"?"ESTUDIO DE MERCADO":"ANÁLISIS COMPLETO"} · {res.ubicacion.distrito?.toUpperCase()}, {res.ubicacion.delegacion?.toUpperCase()}
          </div>
          <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:24,color:"#fff",lineHeight:1.1}}>{res.ubicacion.direccion}</div>
        </div>
        {semColFinal&&(
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 18px",borderRadius:100,background:`${semColFinal}22`,border:`1.5px solid ${semColFinal}44`}}>
            <div className="semaforo-dot" style={{width:9,height:9,borderRadius:"50%",background:semColFinal,color:semColFinal,boxShadow:`0 0 8px ${semColFinal}`}}/>
            <span style={{fontSize:12,fontWeight:700,color:semColFinal,letterSpacing:".08em"}}>{semFinal}</span>
          </div>
        )}
      </div>
      <div className="mob-header-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,minWidth:0}}>
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
      .card{background:rgba(255,255,255,.85);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(234,229,223,.75);border-radius:14px;padding:20px 24px;box-shadow:0 2px 20px rgba(37,99,168,.07);}
      .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
      .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
      @media(max-width:700px){.g2,.g3{grid-template-columns:1fr!important;}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      .up{animation:up .3s ease forwards;}
      .sec-hdr{border-left:3px solid;padding-left:14px;margin-bottom:14px;}
      .fg{width:100%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:11px 14px;font-size:14px;color:#fff;outline:none;transition:border .2s,background .2s;font-family:inherit;}
      .fg::placeholder{color:rgba(180,210,240,.35);}
      .fg:focus{border-color:rgba(94,168,240,.7);background:rgba(255,255,255,.12);box-shadow:0 0 0 3px rgba(37,99,168,.2);}
      .fg option{background:#0f2240;color:#fff;}
      @keyframes orbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      @keyframes modalIn{from{opacity:0;transform:translate(-50%,-48%)}to{opacity:1;transform:translate(-50%,-50%)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
      @keyframes slideInRight{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
      @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
      @keyframes pulseGlow{0%,100%{box-shadow:0 0 8px currentColor}50%{box-shadow:0 0 18px currentColor}}
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      .up{animation:fadeUp .35s cubic-bezier(.16,1,.3,1) forwards;width:100%;}
      .stagger>*{animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both;}
      .stagger>*:nth-child(1){animation-delay:.04s}.stagger>*:nth-child(2){animation-delay:.08s}.stagger>*:nth-child(3){animation-delay:.12s}.stagger>*:nth-child(4){animation-delay:.16s}.stagger>*:nth-child(5){animation-delay:.20s}.stagger>*:nth-child(6){animation-delay:.24s}.stagger>*:nth-child(7){animation-delay:.28s}.stagger>*:nth-child(8){animation-delay:.32s}.stagger>*:nth-child(9){animation-delay:.36s}.stagger>*:nth-child(10){animation-delay:.40s}.stagger>*:nth-child(11){animation-delay:.44s}.stagger>*:nth-child(12){animation-delay:.48s}
      .card{transition:box-shadow .2s ease, transform .2s cubic-bezier(.16,1,.3,1);will-change:transform;}
      .card:hover{box-shadow:0 8px 32px rgba(37,99,168,.1);transform:translateY(-1px);}
      button{transition:transform .15s cubic-bezier(.16,1,.3,1), box-shadow .15s ease, opacity .15s ease !important;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}
      button:active{transform:scale(.97) !important;opacity:.92 !important;}
      button:hover:not(:disabled){opacity:.95;}
      button:disabled{cursor:not-allowed;opacity:.5;}
      .f,.fg{transition:border-color .2s ease, box-shadow .2s ease, background .2s ease !important;}
      .f:focus{border-color:#2563a8 !important;box-shadow:0 0 0 3px rgba(37,99,168,.1) !important;}
      .sidebar-panel{animation:slideInRight .3s cubic-bezier(.16,1,.3,1) forwards;}
      .semaforo-dot{animation:pulseGlow .8s ease-in-out 3;}
      .hero-symbol{animation:float 4s ease-in-out infinite;}
      .shimmer{background:linear-gradient(90deg,#f0ece8 25%,#e8e3de 50%,#f0ece8 75%);background-size:400px 100%;animation:shimmer 1.4s ease-in-out infinite;}
      .overlay-fade{animation:fadeIn .2s ease forwards;}
      @media(prefers-reduced-motion:reduce){*{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;}}
      @media(max-width:640px){
        .mob-nav{padding:12px 16px !important;}.mob-logo{height:22px !important;}.mob-nav-btns{gap:6px !important;}.mob-nav-btn{padding:5px 10px !important;font-size:10px !important;}.mob-nav-pill{padding:5px 10px !important;font-size:10px !important;}
        .mob-center{padding:10px 14px 20px !important;}.mob-symbol{width:72px !important;height:72px !important;}.mob-h2{font-size:26px !important;margin-bottom:6px !important;}.mob-subtitle{font-size:13px !important;margin-bottom:14px !important;}
        .mob-form{padding:18px 14px !important;border-radius:14px !important;}.mob-form .fg{font-size:16px !important;padding:12px !important;}
        .g2{grid-template-columns:1fr !important;}.g3{grid-template-columns:1fr !important;}
        .mob-results-content{padding:12px 12px 100px !important;}.mob-header-card{padding:14px 14px !important;border-radius:12px !important;}.mob-header-grid{grid-template-columns:1fr 1fr !important;}.card{padding:14px 14px !important;}.sec-hdr{margin-bottom:10px !important;}
        canvas{max-width:100% !important;}
        div[style*="display:"grid""]{max-width:100% !important;}
        body,html{overflow-x:hidden;}img{max-width:100% !important;}
        div[style*="1fr auto"]{grid-template-columns:1fr !important;}
        .mob-sidebar{width:100vw !important;max-width:100vw !important;}
        div[style*="position:"fixed""][style*="bottom:0"]{padding:10px 14px 16px !important;}
      }
    `}</style>

    {/* ── TOAST: pago exitoso ── */}
    {pagoExitoso&&(
      <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:200,
        background:"#F0FDF4",border:"1.5px solid #22c55e",borderRadius:14,
        padding:"14px 24px",boxShadow:"0 8px 32px rgba(0,0,0,.15)",
        display:"flex",alignItems:"center",gap:10,animation:"fadeIn .3s ease"}}>
        <div style={{width:10,height:10,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 8px #22c55e"}}/>
        <span style={{fontSize:14,fontWeight:700,color:"#15803d"}}>¡Pago exitoso! Tus créditos ya están disponibles.</span>
      </div>
    )}

    {/* ════════════════════════════════════════════
        LOADING
    ════════════════════════════════════════════ */}
    {loading&&(
      <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(160deg, #0a1628 0%, #0f2240 40%, #0d2d3a 70%, #0a1e28 100%)"}}>
          <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:.18}} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="gl" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#4a9ebb" strokeWidth=".6"/></pattern>
              <pattern id="gl2" width="300" height="300" patternUnits="userSpaceOnUse"><path d="M 300 0 L 0 0 0 300" fill="none" stroke="#4a9ebb" strokeWidth="1.2"/></pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gl)"/>
            <rect width="100%" height="100%" fill="url(#gl2)"/>
          </svg>
        </div>
        <div style={{position:"relative",zIndex:2,width:"min(520px,90vw)",display:"flex",flexDirection:"column" as const,alignItems:"center",gap:32,padding:"44px 40px",background:"rgba(15,34,64,.55)",border:"1px solid rgba(94,168,240,.18)",borderRadius:24,backdropFilter:"blur(20px)",boxShadow:"0 8px 60px rgba(0,0,0,.5)"}}>
          <div style={{position:"relative",width:64,height:64}}>
            <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"1.5px solid rgba(94,168,240,.25)",animation:"orbit 3s linear infinite"}}/>
            <div style={{position:"absolute",inset:6,borderRadius:"50%",border:"1.5px solid rgba(94,168,240,.15)",animation:"orbit 5s linear infinite reverse"}}/>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#5ea8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div style={{textAlign:"center" as const}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:".15em",color:"rgba(94,168,240,.6)",textTransform:"uppercase" as const,marginBottom:8}}>Analizando terreno</div>
            <div style={{fontSize:18,fontWeight:600,color:"#fff",letterSpacing:"-.01em",minHeight:28,transition:"all .3s"}}>{STEPS[step]}</div>
          </div>
          <div style={{width:"100%",display:"flex",flexDirection:"column" as const,gap:10}}>
            <div style={{width:"100%",height:4,borderRadius:99,background:"rgba(255,255,255,.08)",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:99,background:"linear-gradient(90deg,#2563a8,#5ea8f0)",width:`${((step+1)/STEPS.length)*100}%`,transition:"width .7s ease"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"0 2px"}}>
              {STEPS.map((_,i)=>(
                <div key={i} style={{display:"flex",flexDirection:"column" as const,alignItems:"center",gap:4}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:i<step?"#5ea8f0":i===step?"#fff":"rgba(255,255,255,.15)",boxShadow:i===step?"0 0 8px #5ea8f0":undefined,transition:"all .3s"}}/>
                </div>
              ))}
            </div>
          </div>
          <div style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(94,168,240,.12)",borderRadius:14,padding:"18px 20px",minHeight:110,display:"flex",flexDirection:"column" as const,gap:8,transition:"all .4s"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#5ea8f0",flexShrink:0}}/>
              <span style={{fontSize:10,fontWeight:700,color:"#5ea8f0",letterSpacing:".1em",textTransform:"uppercase" as const}}>{TIPS[tipIdx].tag}</span>
            </div>
            <p style={{fontSize:13,color:"rgba(255,255,255,.7)",lineHeight:1.7,margin:0}}>{TIPS[tipIdx].txt}</p>
          </div>
          <div style={{display:"flex",gap:5}}>
            {TIPS.map((_,i)=>(
              <div key={i} style={{width:i===tipIdx?18:5,height:5,borderRadius:99,background:i===tipIdx?"#5ea8f0":"rgba(255,255,255,.12)",transition:"all .4s"}}/>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* ════════════════════════════════════════════
        HERO
    ════════════════════════════════════════════ */}
    {!res&&!loading&&(
      <div style={{position:"relative",minHeight:"100vh",overflow:"hidden",display:"flex",flexDirection:"column" as const}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(160deg, #0a1628 0%, #0f2240 40%, #0d2d3a 70%, #0a1e28 100%)"}}>
          <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:.18}} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#4a9ebb" strokeWidth=".6"/></pattern>
              <pattern id="grid2" width="300" height="300" patternUnits="userSpaceOnUse"><path d="M 300 0 L 0 0 0 300" fill="none" stroke="#4a9ebb" strokeWidth="1.2"/></pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
            <rect width="100%" height="100%" fill="url(#grid2)"/>
            <line x1="0" y1="38%" x2="100%" y2="35%" stroke="#5bb8d4" strokeWidth="1.5" opacity=".5"/>
            <line x1="0" y1="62%" x2="100%" y2="65%" stroke="#5bb8d4" strokeWidth="1" opacity=".4"/>
            <line x1="0" y1="78%" x2="100%" y2="80%" stroke="#5bb8d4" strokeWidth=".8" opacity=".3"/>
            <line x1="22%" y1="0" x2="18%" y2="100%" stroke="#5bb8d4" strokeWidth="1.5" opacity=".5"/>
            <line x1="55%" y1="0" x2="52%" y2="100%" stroke="#5bb8d4" strokeWidth="1" opacity=".4"/>
            <line x1="78%" y1="0" x2="80%" y2="100%" stroke="#5bb8d4" strokeWidth=".8" opacity=".3"/>
            <rect x="24%" y="20%" width="8%" height="12%" fill="none" stroke="#2563a8" strokeWidth=".5" opacity=".3"/>
            <rect x="35%" y="25%" width="5%" height="8%" fill="none" stroke="#2563a8" strokeWidth=".5" opacity=".25"/>
            <rect x="58%" y="42%" width="10%" height="14%" fill="none" stroke="#2563a8" strokeWidth=".5" opacity=".3"/>
            <rect x="15%" y="55%" width="6%" height="9%" fill="none" stroke="#2563a8" strokeWidth=".5" opacity=".25"/>
            <rect x="70%" y="20%" width="7%" height="10%" fill="none" stroke="#2563a8" strokeWidth=".5" opacity=".3"/>
          </svg>
          <div style={{position:"absolute",top:"20%",left:"30%",width:400,height:400,background:"radial-gradient(circle, rgba(37,99,168,.25) 0%, transparent 70%)",transform:"translate(-50%,-50%)"}}/>
          <div style={{position:"absolute",bottom:"25%",right:"25%",width:300,height:300,background:"radial-gradient(circle, rgba(20,120,140,.2) 0%, transparent 70%)"}}/>
        </div>
        <nav style={{position:"relative",zIndex:10,padding:"18px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <button onClick={()=>{setRes(null);}} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"inline-flex",alignItems:"center",flexShrink:0}}>
            <img src="/LOGO LETRAS WHITE.png" alt="unearth" className="mob-logo" style={{height:28,width:"auto",display:"block"}}/>
          </button>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {!userSession&&(
              <button className="mob-nav-btn" onClick={()=>setShowLoginModal(true)} style={{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.1)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,.2)",borderRadius:100,padding:"7px 16px",cursor:"pointer",color:"#fff",fontSize:12,fontWeight:600,letterSpacing:".02em"}}>
                Iniciar sesión
              </button>
            )}
            {userSession&&(
              <button onClick={()=>setSidebarOpen(true)} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.08)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,.12)",borderRadius:100,padding:"6px 14px",cursor:"pointer",color:"rgba(255,255,255,.8)",fontSize:11,fontWeight:600,letterSpacing:".05em"}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,#2563a8,#1a7a8a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>
                  {(userSession.user?.email||"U")[0].toUpperCase()}
                </div>
                {creditos!==null&&<span style={{background:"rgba(94,168,240,.2)",borderRadius:100,padding:"2px 8px",fontSize:10,color:"#5ea8f0",fontWeight:700}}>{creditos} cr.</span>}
              </button>
            )}
          </div>
        </nav>
        <div style={{flex:1,display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",padding:"0 24px 32px",position:"relative",zIndex:10}}>
          <div style={{marginBottom:4,position:"relative"}}>
            <img src="/LOGO SIMBOLO WHITE.png" alt="" className="mob-symbol hero-symbol" style={{width:120,height:120,objectFit:"contain",filter:"drop-shadow(0 0 28px rgba(94,168,240,.75))",display:"block"}}/>
          </div>
          <h2 className="mob-h2" style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:"clamp(26px,3.5vw,48px)",lineHeight:1.1,color:"#fff",marginBottom:10,fontWeight:400,textAlign:"center" as const,textShadow:"0 2px 40px rgba(0,0,0,.4)"}}>
            Unearth your next<br/><em style={{color:"#5ea8f0",fontStyle:"italic"}}>development.</em>
          </h2>
          <p className="mob-subtitle" style={{fontSize:14,color:"rgba(200,220,240,.7)",lineHeight:1.6,maxWidth:400,margin:"0 auto 20px",textAlign:"center" as const}}>
            Dirección, metros y precio — análisis de zonificación, mercado y financiero en segundos.
          </p>
          <div className="mob-form" style={{width:"100%",maxWidth:680,background:"rgba(255,255,255,.07)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,.15)",borderRadius:20,padding:"28px 32px",boxShadow:"0 8px 40px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.1)"}}>
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
                <select className="fg" value={prod} onChange={e=>setProd(e.target.value)} disabled={loading} style={{cursor:"pointer"}}>
                  <option value="">Selecciona un producto…</option>
                  <option value="Departamentos">Departamentos</option>
                  <option value="Casas / Townhouses">Casas / Townhouses</option>
                  <option value="Uso Mixto (depas + comercio)">Uso Mixto (depas + comercio)</option>
                  <option value="Locales comerciales">Locales comerciales</option>
                  <option value="Oficinas">Oficinas</option>
                </select>
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
            <button onClick={run} disabled={loading} style={{width:"100%",background:loading?"rgba(255,255,255,.1)":"linear-gradient(135deg, #1a4d8a 0%, #2563a8 50%, #1a7a8a 100%)",border:"none",borderRadius:12,padding:"15px 0",color:"#fff",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:loading?"none":"0 4px 20px rgba(37,99,168,.5)",letterSpacing:".02em",transition:"all .25s cubic-bezier(.16,1,.3,1)"}}>
              {loading
                ?<><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>{STEPS[step]}</>
                :"Generar reporte de factibilidad →"}
            </button>
            {loading&&<div style={{display:"flex",justifyContent:"center",gap:8,marginTop:14}}>
              {STEPS.map((_,i)=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:i<=step?"#5ea8f0":"rgba(255,255,255,.2)",transform:i===step?"scale(1.6)":"scale(1)",boxShadow:i===step?"0 0 10px #5ea8f0":"none",transition:"all .35s cubic-bezier(.16,1,.3,1)"}}/>)}
            </div>}
          </div>
          <div style={{width:"100%",maxWidth:680,marginTop:10,background:"rgba(255,255,255,.05)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,padding:"14px 20px",display:"flex",alignItems:"flex-start",gap:14}}>
            <div style={{width:32,height:32,borderRadius:8,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,background:tipo==="lineamientos"?"rgba(94,168,240,.15)":tipo==="mercado"?"rgba(217,119,6,.15)":"rgba(34,197,94,.15)",transition:"background .25s ease"}}>
              {tipo==="lineamientos"?"🗺️":tipo==="mercado"?"📊":"📐"}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                <span style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,.85)"}}>
                  {tipo==="lineamientos"?"Lineamientos urbanísticos":tipo==="mercado"?"Estudio de mercado":"Análisis completo"}
                </span>
                <span style={{fontSize:11,fontWeight:700,flexShrink:0,marginLeft:12,color:tipo==="lineamientos"?"#5ea8f0":tipo==="mercado"?"#d97706":"#22c55e"}}>
                  {tipo==="lineamientos"?"1 crédito":tipo==="mercado"?"2 créditos":"3 créditos"}
                </span>
              </div>
              <span style={{fontSize:11,color:"rgba(200,220,240,.55)",lineHeight:1.5}}>
                {tipo==="lineamientos"&&"Zonificación PDU · COS, CUS, CAV y densidad máxima · Altura permitida · Giros permitidos y condicionados según el Plan de Desarrollo Urbano de Monterrey."}
                {tipo==="mercado"&&"Zonificación completa · Precios de venta y renta por m² en la zona · Proyectos de competencia activos · Absorción estimada en meses · Potencial de ingresos del proyecto."}
                {tipo==="completo"&&"Zonificación · Mercado completo · Análisis financiero: ROI, TIR, margen bruto, costo de construcción paramétrico, estacionamiento y veredicto GO / NO-GO."}
              </span>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ══════════════════════════════════════════
        RESULTS PAGE
    ══════════════════════════════════════════ */}
    {(res||loading)&&(<div style={{position:"relative",minHeight:"100vh",background:"#F8F5F0",width:"100%"}}>
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="rgl" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(37,99,168,.05)" strokeWidth=".6"/></pattern>
            <pattern id="rgl2" width="300" height="300" patternUnits="userSpaceOnUse"><path d="M 300 0 L 0 0 0 300" fill="none" stroke="rgba(37,99,168,.09)" strokeWidth="1.2"/></pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#rgl)"/>
          <rect width="100%" height="100%" fill="url(#rgl2)"/>
        </svg>
      </div>
      <header style={{position:"sticky",top:0,zIndex:30,background:"rgba(245,242,238,.95)",backdropFilter:"blur(10px)",borderBottom:"1px solid #EAE5DF",padding:"0 20px",height:48,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <button onClick={()=>{setRes(null);setDir("");setM2("");setPx("");setProd("");setFrente("");setFondo("");}} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"inline-flex",alignItems:"center",flexShrink:0}}>
          <img src="/LOGO LETRAS BLACK.png" alt="unearth" style={{height:24,width:"auto",display:"block"}}/>
        </button>
        {userSession&&(
          <button onClick={()=>setSidebarOpen(true)} style={{display:"flex",alignItems:"center",gap:7,background:"rgba(37,99,168,.08)",border:"1px solid #EAE5DF",borderRadius:100,padding:"5px 12px",cursor:"pointer",color:"#2563a8",fontSize:11,fontWeight:600}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:"linear-gradient(135deg,#2563a8,#1a7a8a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0}}>
              {(userSession.user?.email||"U")[0].toUpperCase()}
            </div>
            {creditos!==null&&<span style={{fontWeight:700}}>{creditos} cr.</span>}
          </button>
        )}
      </header>

      <div className="mob-results-content" style={{width:"100%",padding:"24px 28px 100px",boxSizing:"border-box" as const,position:"relative",zIndex:1}}>
        <div id="results-container" style={{paddingBottom:8,width:"100%",animation:"fadeUp .4s cubic-bezier(.16,1,.3,1) both"}}>

          {/* MEMBRETE PDF */}
          <div id="pdf-membrete" style={{display:"none",background:"#fff",borderBottom:"2px solid #EAE5DF",padding:"20px 28px 18px",marginBottom:24,alignItems:"center",justifyContent:"space-between",gap:16}}>
            <img src="/LOGO LETRAS BLACK.png" alt="unearth" style={{height:30,width:"auto",flexShrink:0}}/>
            <div style={{flex:1,paddingLeft:20,borderLeft:"1px solid #EAE5DF"}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1a1510",lineHeight:1.3}}>{res?.ubicacion?.direccion}</div>
              <div style={{fontSize:11,color:"#7a6f64",marginTop:3}}>
                {res?.tipo_analisis==="lineamientos"?"Lineamientos Urbanísticos":res?.tipo_analisis==="mercado"?"Estudio de Mercado":"Análisis Completo"}
                {res?.ubicacion?.distrito&&<> · {res.ubicacion.distrito}{res?.ubicacion?.delegacion&&`, ${res.ubicacion.delegacion}`}</>}
              </div>
            </div>
            <div style={{textAlign:"right" as const,flexShrink:0}}>
              <div style={{fontSize:12,fontWeight:600,color:"#1a1510"}}>{userSession?.user?.user_metadata?.full_name||userSession?.user?.email?.split("@")[0]||"—"}</div>
              <div style={{fontSize:11,color:"#a09888",marginTop:2}}>{new Date().toLocaleDateString("es-MX",{day:"2-digit",month:"long",year:"numeric"})}</div>
            </div>
          </div>

          {/* ERROR USO DE SUELO */}
          {res&&!loading&&res.tipo_analisis==="error_uso_suelo"&&(
            <div className="up" style={{display:"flex",flexDirection:"column",gap:14}}>
              <Header/>
              <div style={{background:"#FFF7ED",border:"2px solid #FED7AA",borderRadius:14,padding:"24px 28px"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                  <div style={{fontSize:24,lineHeight:"1",flexShrink:0}}>⚠️</div>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:"#c2410c",marginBottom:8}}>Producto no compatible con zona HU (Habitacional Unifamiliar)</div>
                    <p style={{fontSize:14,color:"#7c2d12",lineHeight:1.7,marginBottom:16}}>La zona <strong>HU</strong> solo permite <strong>una vivienda por lote</strong>. No es compatible con departamentos ni multifamiliar vertical.</p>
                    <div style={{background:"#FEF3C7",borderRadius:10,padding:"14px 18px",marginBottom:12}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#b45309",marginBottom:8}}>¿Qué SÍ se puede hacer en HU?</div>
                      <div style={{fontSize:13,color:"#78350f",lineHeight:1.9}}>✓ 1 vivienda unifamiliar<br/>✓ Duplex o casa con depto de servicio (condicionado)<br/>✓ Multifamiliar horizontal / townhouses — <strong>requiere verificación directa con Desarrollo Urbano Sostenible de Monterrey</strong></div>
                    </div>
                    <div style={{background:"#DBEAFE",borderRadius:10,padding:"14px 18px"}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#1d4ed8",marginBottom:6}}>Para departamentos busca zonas:</div>
                      <div style={{fontSize:13,color:"#1e3a5f"}}><strong>HM</strong> · <strong>HML</strong> · <strong>HMM</strong> · <strong>HMI</strong></div>
                    </div>
                  </div>
                </div>
              </div>
              {res.lineamientos&&<><div className="sec-hdr" style={{borderColor:BLUE}}><div style={{fontSize:11,fontWeight:700,color:BLUE,letterSpacing:".08em",textTransform:"uppercase" as const}}>Lineamientos del terreno (solo referencia)</div></div>{LineamientosBlock()}</>}
            </div>
          )}

          {/* LINEAMIENTOS */}
          {res&&!loading&&res.tipo_analisis==="lineamientos"&&(
            <div className="up" style={{display:"flex",flexDirection:"column",gap:14}}>
              <Header/>
              {LineamientosBlock()}
              <button onClick={()=>generarIsometrico(true)} disabled={isoLoading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:isoLoading?"#d4cfc8":"linear-gradient(135deg,#0f2240 0%,#1a4d8a 60%,#1a7a8a 100%)",border:"none",borderRadius:12,padding:"15px 28px",width:"100%",color:"#fff",fontSize:14,fontWeight:700,cursor:isoLoading?"not-allowed":"pointer",boxShadow:"0 4px 20px rgba(37,99,168,.25)",letterSpacing:".02em"}}>
                {isoLoading?<><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Generando modelo 3D…</>:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Ver Isométrico 3D<span style={{background:"rgba(255,255,255,.15)",borderRadius:100,padding:"2px 10px",fontSize:11,fontWeight:700,marginLeft:4}}>1 crédito</span></>}
              </button>
              {isoHtml&&(<div style={{borderRadius:16,overflow:"hidden",border:"1px solid #EAE5DF",background:"#0a0f1a"}}><div style={{padding:"12px 20px",borderBottom:"1px solid rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)"}}>MODELO 3D — {res.ubicacion?.zona}</span><button onClick={()=>setIsoHtml(null)} style={{background:"rgba(255,255,255,.08)",border:"none",borderRadius:6,padding:"4px 10px",color:"rgba(255,255,255,.5)",fontSize:11,cursor:"pointer"}}>✕</button></div><iframe ref={iframeRef} srcDoc={isoHtml} style={{width:"100%",height:500,border:"none",display:"block"}} title="Isométrico 3D" sandbox="allow-scripts"/></div>)}
              <button onClick={()=>setRes(null)} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"transparent",border:"1.5px solid #2563a8",borderRadius:12,padding:"13px 28px",width:"100%",color:"#2563a8",fontSize:14,fontWeight:600,cursor:"pointer",letterSpacing:".02em",marginTop:4}}>
                ← Analizar con otro tipo de análisis
              </button>
              <button onClick={generarPDF} disabled={pdfLoading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:pdfLoading?"#d4cfc8":"linear-gradient(135deg,#1a1510 0%,#3a2e28 100%)",border:"1.5px solid #EAE5DF",borderRadius:12,padding:"15px 28px",width:"100%",color:pdfLoading?"#7a6f64":"#fff",fontSize:14,fontWeight:700,cursor:pdfLoading?"not-allowed":"pointer",boxShadow:"0 2px 12px rgba(0,0,0,.1)",transition:"all .2s",letterSpacing:".02em",marginTop:8}}>
                {pdfLoading?<><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Generando PDF…</>:<><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14,2 14,8 20,8" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="18" x2="12" y2="12" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round"/><polyline points="9,15 12,18 15,15" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Exportar Reporte PDF<span style={{fontSize:10,fontWeight:500,color:"rgba(255,255,255,.45)",marginLeft:4}}>unearth</span></>}
              </button>
            </div>
          )}

          {/* MERCADO */}
          {res&&!loading&&res.tipo_analisis==="mercado"&&(
            <div className="up" style={{display:"flex",flexDirection:"column",gap:14}}>
              <Header/>
              {MercadoChartsBlock()}
              {MercadoComercialBlock()}
              <div className="sec-hdr" style={{borderColor:BLUE,marginTop:8}}>
                <div style={{fontSize:11,fontWeight:700,color:BLUE,letterSpacing:".08em",textTransform:"uppercase" as const}}>Lineamientos y Giros Permitidos</div>
              </div>
              {LineamientosBlock()}
              <button onClick={()=>setRes(null)} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"transparent",border:"1.5px solid #2563a8",borderRadius:12,padding:"13px 28px",width:"100%",color:"#2563a8",fontSize:14,fontWeight:600,cursor:"pointer",letterSpacing:".02em",marginTop:4}}>
                ← Analizar con otro tipo de análisis
              </button>
              <button onClick={generarPDF} disabled={pdfLoading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:pdfLoading?"#d4cfc8":"linear-gradient(135deg,#1a1510 0%,#3a2e28 100%)",border:"1.5px solid #EAE5DF",borderRadius:12,padding:"15px 28px",width:"100%",color:pdfLoading?"#7a6f64":"#fff",fontSize:14,fontWeight:700,cursor:pdfLoading?"not-allowed":"pointer",boxShadow:"0 2px 12px rgba(0,0,0,.1)",transition:"all .2s",letterSpacing:".02em",marginTop:8}}>
                {pdfLoading?<><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Generando PDF…</>:<><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14,2 14,8 20,8" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="18" x2="12" y2="12" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round"/><polyline points="9,15 12,18 15,15" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Exportar Reporte PDF<span style={{fontSize:10,fontWeight:500,color:"rgba(255,255,255,.45)",marginLeft:4}}>unearth</span></>}
              </button>
            </div>
          )}

          {/* COMPLETO */}
          {res&&!loading&&res.tipo_analisis==="completo"&&(
            <div className="up" style={{display:"flex",flexDirection:"column",gap:14}}>
              <Header/>
              {res.analisis?.resumen_ejecutivo&&(
                <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:14,padding:"20px 24px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:BLUE,letterSpacing:".09em",textTransform:"uppercase" as const,marginBottom:8}}>Resumen Ejecutivo</div>
                  <p style={{fontSize:14,lineHeight:1.75,color:"#1e3a5f"}}>{res.analisis.resumen_ejecutivo}</p>
                </div>
              )}
              <div className="sec-hdr" style={{borderColor:BLUE}}>
                <div style={{fontSize:11,fontWeight:700,color:BLUE,letterSpacing:".08em",textTransform:"uppercase" as const}}>1 · Lineamientos Urbanísticos y Giros</div>
              </div>
              {LineamientosBlock()}
              {res.analisis?.viabilidad_tecnica?.retos_constructivos?.length>0&&(
                <div className="card">
                  <div className="lbl" style={{marginBottom:10}}>Retos constructivos</div>
                  {res.analisis.viabilidad_tecnica.retos_constructivos.map((r:string,i:number)=>(
                    <div key={i} style={{display:"flex",gap:8,padding:"5px 0",borderBottom:"1px solid #F0EBE5",fontSize:13,color:"#3a3228",lineHeight:1.4}}>
                      <span style={{color:"#f97316",fontWeight:700,flexShrink:0}}>·</span>{r}
                    </div>
                  ))}
                </div>
              )}
              {res.analisis?.estacionamiento&&(
                <div style={{background:"#F8F5F0",border:"1px solid #EAE5DF",borderRadius:14,padding:"20px 24px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:BLUE,letterSpacing:".09em",textTransform:"uppercase" as const,marginBottom:12}}>Requerimiento de Estacionamiento — PDU Monterrey</div>
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
              <div className="sec-hdr" style={{borderColor:AMBER,marginTop:8}}>
                <div style={{fontSize:11,fontWeight:700,color:AMBER,letterSpacing:".08em",textTransform:"uppercase" as const}}>2 · Estudio de Mercado</div>
              </div>
              {MercadoChartsBlock()}
              {MercadoComercialBlock()}
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
                  <div className="stagger" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
                    {[
                      {l:"Precio terreno",v:$(finF.precio_terreno)},
                      {l:"Costo construcción",v:$(finF.costo_construccion_total)},
                      {l:"Estacionamiento",v:`${$(finF.costo_estacionamiento||0)}${finF.cajones_por_vivienda_pdu?` (${finF.cajones_requeridos||0} caj.)`:""}`},
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
              {(redFlagsMerged.length>0||res.analisis?.fortalezas?.length>0)&&(
                <div className="g2">
                  {redFlagsMerged.length>0&&(
                    <div style={{background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:14,padding:"20px 24px"}}>
                      <div className="lbl" style={{color:"#c2410c",marginBottom:10}}>Red Flags</div>
                      {redFlagsMerged.map((f:string,i:number)=>(
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
              {verdFinal&&semColFinal&&(
                <div style={{background:C.white,border:`2px solid ${semColFinal}`,borderRadius:16,padding:"26px 30px",boxShadow:`0 0 0 4px ${semColFinal}10`,animation:"fadeUp .35s cubic-bezier(.16,1,.3,1) .05s both"}}>
                  <div className="lbl" style={{marginBottom:8}}>Veredicto Final</div>
                  <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:38,color:semColFinal,lineHeight:1,marginBottom:14}}>{verdFinal}</div>
                  <p style={{fontSize:14,color:"#3a3228",lineHeight:1.7,marginBottom:res.analisis.proximos_pasos?.length>0?14:0}}>{justFinal}</p>
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
              <div style={{marginTop:24,display:"flex",flexDirection:"column" as const,gap:16}}>
                <button onClick={()=>generarIsometrico()} disabled={isoLoading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:isoLoading?"#d4cfc8":"linear-gradient(135deg,#0f2240 0%,#1a4d8a 60%,#1a7a8a 100%)",border:"none",borderRadius:12,padding:"15px 28px",width:"100%",color:"#fff",fontSize:14,fontWeight:700,cursor:isoLoading?"not-allowed":"pointer",boxShadow:"0 4px 20px rgba(37,99,168,.25)",transition:"all .2s",letterSpacing:".02em"}}>
                  {isoLoading?<><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Generando modelo 3D…</>:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Ver Isométrico 3D del Terreno</>}
                </button>
                {isoHtml&&(
                  <div style={{borderRadius:16,overflow:"hidden",border:"1px solid #EAE5DF",background:"#0a0f1a",boxShadow:"0 8px 40px rgba(0,0,0,.15)"}}>
                    <div style={{padding:"12px 20px",borderBottom:"1px solid rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",letterSpacing:".1em"}}>MODELO 3D — {res.ubicacion?.zona}</span>
                      </div>
                      <button onClick={()=>setIsoHtml(null)} style={{background:"rgba(255,255,255,.08)",border:"none",borderRadius:6,padding:"4px 10px",color:"rgba(255,255,255,.5)",fontSize:11,cursor:"pointer"}}>✕</button>
                    </div>
                    <iframe ref={iframeRef} srcDoc={isoHtml} style={{width:"100%",height:500,border:"none",display:"block"}} title="Isométrico 3D" sandbox="allow-scripts"/>
                    <div style={{padding:"10px 20px",display:"flex",gap:16,flexWrap:"wrap" as const,borderTop:"1px solid rgba(255,255,255,.06)"}}>
                      {([["#ffffff","Volumen construido"],["#e74c3c","Restricciones"],["#27ae60","Área Verde (CAV)"],["#8B6340","Área libre / Terreno"]] as [string,string][]).map(([col,lbl])=>(
                        <div key={lbl} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"rgba(255,255,255,.35)"}}>
                          <div style={{width:9,height:9,borderRadius:2,background:col}}/>{lbl}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={()=>generarIsometrico(true)} disabled={isoLoading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:isoLoading?"#d4cfc8":"linear-gradient(135deg,#0f2240 0%,#1a4d8a 60%,#1a7a8a 100%)",border:"none",borderRadius:12,padding:"15px 28px",width:"100%",color:"#fff",fontSize:14,fontWeight:700,cursor:isoLoading?"not-allowed":"pointer",boxShadow:"0 4px 20px rgba(37,99,168,.25)",letterSpacing:".02em"}}>
                {isoLoading?<><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Generando modelo 3D…</>:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Ver Isométrico 3D<span style={{background:"rgba(255,255,255,.15)",borderRadius:100,padding:"2px 10px",fontSize:11,fontWeight:700,marginLeft:4}}>1 crédito</span></>}
              </button>
              {isoHtml&&(<div style={{borderRadius:16,overflow:"hidden",border:"1px solid #EAE5DF",background:"#0a0f1a"}}><div style={{padding:"12px 20px",borderBottom:"1px solid rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)"}}>MODELO 3D — {res.ubicacion?.zona}</span><button onClick={()=>setIsoHtml(null)} style={{background:"rgba(255,255,255,.08)",border:"none",borderRadius:6,padding:"4px 10px",color:"rgba(255,255,255,.5)",fontSize:11,cursor:"pointer"}}>✕</button></div><iframe ref={iframeRef} srcDoc={isoHtml} style={{width:"100%",height:500,border:"none",display:"block"}} title="Isométrico 3D" sandbox="allow-scripts"/></div>)}
              <button onClick={()=>setRes(null)} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"transparent",border:"1.5px solid #2563a8",borderRadius:12,padding:"13px 28px",width:"100%",color:"#2563a8",fontSize:14,fontWeight:600,cursor:"pointer",letterSpacing:".02em",marginTop:4}}>
                ← Analizar con otro tipo de análisis
              </button>
              <button onClick={generarPDF} disabled={pdfLoading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:pdfLoading?"#d4cfc8":"linear-gradient(135deg,#1a1510 0%,#3a2e28 100%)",border:"1.5px solid #EAE5DF",borderRadius:12,padding:"15px 28px",width:"100%",color:pdfLoading?"#7a6f64":"#fff",fontSize:14,fontWeight:700,cursor:pdfLoading?"not-allowed":"pointer",boxShadow:"0 2px 12px rgba(0,0,0,.1)",transition:"all .2s",letterSpacing:".02em",marginTop:8}}>
                {pdfLoading?<><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Generando PDF…</>:<><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14,2 14,8 20,8" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="18" x2="12" y2="12" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round"/><polyline points="9,15 12,18 15,15" stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Exportar Reporte PDF<span style={{fontSize:10,fontWeight:500,color:"rgba(255,255,255,.45)",marginLeft:4}}>unearth</span></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>)}

    {/* ════ MODAL BIENVENIDA ════ */}
    {showWelcome&&(
      <>
        <div onClick={()=>setShowWelcome(false)} className="overlay-fade" style={{position:"fixed",inset:0,zIndex:60,background:"rgba(0,0,0,.6)",backdropFilter:"blur(6px)"}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:70,width:"min(520px,92vw)",animation:"modalIn .25s cubic-bezier(.16,1,.3,1) both",background:"rgba(10,22,40,.92)",backdropFilter:"blur(32px)",WebkitBackdropFilter:"blur(32px)",borderRadius:24,border:"1px solid rgba(94,168,240,.2)",boxShadow:"0 32px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(94,168,240,.08)",overflow:"hidden" as const}}>
          <div style={{position:"absolute",inset:0,opacity:.12,pointerEvents:"none"}}><svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="wg" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4a9ebb" strokeWidth=".6"/></pattern></defs><rect width="100%" height="100%" fill="url(#wg)"/></svg></div>
          <div style={{position:"relative",zIndex:1,padding:"40px 36px 32px"}}>
            <div style={{textAlign:"center" as const,marginBottom:20}}>
              <img src="/LOGO SIMBOLO WHITE.png" alt="" style={{width:100,height:100,objectFit:"contain",filter:"drop-shadow(0 0 28px rgba(94,168,240,.7))",display:"block"}}/>
            </div>
            <div style={{textAlign:"center" as const,marginBottom:28}}>
              <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:38,color:"#fff",lineHeight:1.15,marginBottom:6}}>Bienvenido{welcomeName?`, ${welcomeName.split(" ")[0]}`:""}
              </div>
              <div style={{fontSize:13,color:"rgba(200,220,240,.55)",lineHeight:1.6}}>Tu asistente de análisis inmobiliario está listo.</div>
            </div>
            <div style={{display:"flex",flexDirection:"column" as const,gap:10,marginBottom:28}}>
              {[
                {icon:"🗺️",title:"Zonificación instantánea",desc:"Identifica uso de suelo, COS/CUS/CAV y giros permitidos según el PDU de Monterrey para cualquier predio."},
                {icon:"📊",title:"Estudio de mercado con IA",desc:"Precios reales de venta y renta, proyectos de competencia activos y absorción del mercado en la zona."},
                {icon:"📐",title:"Análisis financiero completo",desc:"ROI, TIR, margen bruto, costo de construcción y veredicto GO / NO-GO para tu proyecto inmobiliario."},
              ].map(f=>(
                <div key={f.title} style={{display:"flex",gap:14,alignItems:"flex-start",background:"rgba(255,255,255,.05)",border:"1px solid rgba(94,168,240,.1)",borderRadius:12,padding:"14px 16px"}}>
                  <span style={{fontSize:20,flexShrink:0,lineHeight:1}}>{f.icon}</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:3}}>{f.title}</div>
                    <div style={{fontSize:12,color:"rgba(200,220,240,.55)",lineHeight:1.5}}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:"rgba(94,168,240,.1)",border:"1px solid rgba(94,168,240,.2)",borderRadius:12,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:12,color:"rgba(200,220,240,.7)"}}>Tienes <strong style={{color:"#5ea8f0"}}>{creditos??3} créditos</strong> para empezar</div>
              <div style={{display:"flex",gap:4}}>
                {Array.from({length:Math.min(creditos??3,3)}).map((_,i)=>(
                  <div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#5ea8f0",boxShadow:"0 0 6px #5ea8f0"}}/>
                ))}
              </div>
            </div>
            <button onClick={()=>setShowWelcome(false)} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#1a4d8a,#2563a8,#1a7a8a)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:".02em",boxShadow:"0 4px 20px rgba(37,99,168,.4)"}}>
              Empezar →
            </button>
          </div>
        </div>
      </>
    )}

    {/* ════ MODAL LOGIN ════ */}
    {showLoginModal&&(
      <>
        <div onClick={()=>setShowLoginModal(false)} className="overlay-fade" style={{position:"fixed",inset:0,zIndex:60,background:"rgba(0,0,0,.5)",backdropFilter:"blur(4px)"}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:70,width:"min(420px,90vw)",animation:"modalIn .25s cubic-bezier(.16,1,.3,1) both",background:"rgba(250,247,244,.97)",backdropFilter:"blur(24px)",borderRadius:24,padding:"36px 32px",boxShadow:"0 24px 80px rgba(0,0,0,.25)",border:"1px solid rgba(234,229,223,.8)"}}>
          <div style={{textAlign:"center" as const,marginBottom:24}}>
            <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:24,color:"#1a1510",marginBottom:8}}>Crea tu cuenta gratis</div>
            <p style={{fontSize:14,color:"#7a6f64",lineHeight:1.6}}>Tu análisis está listo para generarse.<br/>Solo necesitas una cuenta para continuar.</p>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:600,color:"#15803d",marginTop:8}}>✦ 3 créditos gratis al registrarte</div>
          </div>
          <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
            <button onClick={async()=>{await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${location.origin}/auth/callback`}});}} style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid #EAE5DF",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:14,fontWeight:600,color:"#1a1510",cursor:"pointer"}}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continuar con Google
            </button>
            <button onClick={()=>{setShowLoginModal(false);window.location.href="/login";}} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#0f2240,#1a4d8a,#1a7a8a)",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>
              Registrarse con email
            </button>
          </div>
          <button onClick={()=>setShowLoginModal(false)} style={{position:"absolute" as const,top:16,right:16,background:"rgba(0,0,0,.06)",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:14,color:"#7a6f64",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
      </>
    )}

    {/* ════ MODAL SIN CRÉDITOS ════ */}
    {showNoCreditsModal&&(
      <>
        <div onClick={()=>setShowNoCreditsModal(false)} className="overlay-fade" style={{position:"fixed",inset:0,zIndex:60,background:"rgba(0,0,0,.5)",backdropFilter:"blur(4px)"}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:70,width:"min(420px,90vw)",animation:"modalIn .25s cubic-bezier(.16,1,.3,1) both",background:"rgba(250,247,244,.97)",backdropFilter:"blur(24px)",borderRadius:24,padding:"36px 32px",boxShadow:"0 24px 80px rgba(0,0,0,.25)",border:"1px solid rgba(234,229,223,.8)"}}>
          <div style={{textAlign:"center" as const,marginBottom:24}}>
            <div style={{fontSize:36,marginBottom:12}}>⚡</div>
            <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:24,color:"#1a1510",marginBottom:8}}>Sin créditos disponibles</div>
            <p style={{fontSize:14,color:"#7a6f64",lineHeight:1.6}}>Tu análisis de <strong style={{color:"#1a1510"}}>{dir}</strong> está listo para generarse.</p>
          </div>
          {/* ── NUEVO: abre el modal de paquetes ── */}
          <button onClick={()=>{setShowNoCreditsModal(false);setShowPaquetesModal(true);}}
            style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#0f2240,#1a4d8a,#1a7a8a)",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:10,letterSpacing:".02em"}}>
            Ver paquetes de créditos →
          </button>
          <button onClick={()=>setShowNoCreditsModal(false)} style={{width:"100%",padding:"10px",borderRadius:12,border:"1.5px solid #EAE5DF",background:"transparent",color:"#7a6f64",fontSize:13,cursor:"pointer"}}>Cancelar</button>
          <button onClick={()=>setShowNoCreditsModal(false)} style={{position:"absolute" as const,top:16,right:16,background:"rgba(0,0,0,.06)",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:14,color:"#7a6f64",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
      </>
    )}

    {/* ════ MODAL PAQUETES MERCADO PAGO — NUEVO ════ */}
    {showPaquetesModal&&(
  <>
    <div onClick={()=>{if(!comprando)setShowPaquetesModal(false);}} className="overlay-fade"
      style={{position:"fixed",inset:0,zIndex:60,background:"rgba(0,0,0,.55)",backdropFilter:"blur(5px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:70,
      width:"min(400px,92vw)",animation:"modalIn .25s cubic-bezier(.16,1,.3,1) both",
      background:"rgba(250,247,244,.98)",backdropFilter:"blur(24px)",
      borderRadius:24,padding:"34px 28px",
      boxShadow:"0 24px 80px rgba(0,0,0,.3)",
      border:"1px solid rgba(234,229,223,.9)"}}>

      <div style={{textAlign:"center" as const,marginBottom:24}}>
        <div style={{fontSize:32,marginBottom:8}}>💳</div>
        <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:26,color:"#1a1510",marginBottom:5}}>
          Comprar créditos
        </div>
        <p style={{fontSize:13,color:"#7a6f64"}}>
          Pago seguro con Mercado Pago
        </p>
      </div>

      {/* Único paquete */}
      <div style={{background:"linear-gradient(135deg,#0f2240 0%,#1a4d8a 60%,#1a7a8a 100%)",borderRadius:16,padding:"24px 22px",marginBottom:20,textAlign:"center" as const}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",color:"rgba(255,255,255,.5)",marginBottom:6}}>PAQUETE INICIO</div>
        <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:44,color:"#fff",lineHeight:1,marginBottom:4}}>$199
          <span style={{fontSize:16,fontWeight:400,opacity:.6}}> MXN</span>
        </div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.6)",marginBottom:16}}>3 créditos · 1 análisis completo</div>
        <div style={{display:"flex",flexDirection:"column" as const,gap:6,marginBottom:18}}>
          {[
            {t:"Lineamientos urbanísticos",c:"1 crédito",col:"#5ea8f0"},
            {t:"Estudio de mercado",c:"2 créditos",col:"#d97706"},
            {t:"Análisis completo",c:"3 créditos",col:"#22c55e"},
          ].map(x=>(
            <div key={x.t} style={{background:"rgba(255,255,255,.08)",borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:11,color:"rgba(255,255,255,.65)"}}>{x.t}</span>
              <span style={{fontSize:11,fontWeight:700,color:x.col}}>{x.c}</span>
            </div>
          ))}
        </div>
        <button
          onClick={()=>comprarCreditos("3")}
          disabled={comprando}
          style={{width:"100%",background:comprando?"rgba(255,255,255,.1)":"rgba(255,255,255,.15)",border:"1.5px solid rgba(255,255,255,.25)",borderRadius:12,padding:"13px",color:"#fff",fontSize:15,fontWeight:700,cursor:comprando?"not-allowed":"pointer",letterSpacing:".02em",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          {comprando
            ?<><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>Redirigiendo…</>
            :"Comprar ahora →"}
        </button>
      </div>

      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:14}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{fontSize:11,color:"#a09888"}}>Sin suscripción · Los créditos no expiran</span>
      </div>

      {!comprando&&(
        <button onClick={()=>setShowPaquetesModal(false)}
          style={{width:"100%",padding:"10px",borderRadius:12,border:"1.5px solid #EAE5DF",background:"transparent",color:"#7a6f64",fontSize:13,cursor:"pointer"}}>
          Cancelar
        </button>
      )}
      {!comprando&&(
        <button onClick={()=>setShowPaquetesModal(false)}
          style={{position:"absolute" as const,top:16,right:16,background:"rgba(0,0,0,.06)",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:14,color:"#7a6f64",display:"flex",alignItems:"center",justifyContent:"center"}}>✕
        </button>
      )}
    </div>
  </>
)}

    {/* ════ SIDEBAR ════ */}
    {sidebarOpen&&(
      <>
        <div onClick={()=>setSidebarOpen(false)} className="overlay-fade" style={{position:"fixed",inset:0,zIndex:40,background:"rgba(0,0,0,.3)",backdropFilter:"blur(2px)"}}/>
        <div className="sidebar-panel" style={{position:"fixed",top:0,right:0,bottom:0,zIndex:50,width:380,maxWidth:"min(380px,100vw)",background:"rgba(250,247,244,.97)",backdropFilter:"blur(24px)",borderLeft:"1px solid rgba(234,229,223,.8)",boxShadow:"-8px 0 40px rgba(0,0,0,.12)",display:"flex",flexDirection:"column" as const}}>
          <div style={{padding:"20px 24px",borderBottom:"1px solid #EAE5DF",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(255,255,255,.6)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#0f2240,#1a7a8a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff"}}>
                {(userSession?.user?.email||"U")[0].toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"#1a1510"}}>{userSession?.user?.email}</div>
                <div style={{fontSize:10,color:"#a09888",marginTop:1}}>Cuenta activa</div>
              </div>
            </div>
            <button onClick={()=>setSidebarOpen(false)} style={{background:"rgba(0,0,0,.06)",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:14,color:"#7a6f64",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>

          {/* Créditos */}
          <div style={{margin:"20px 24px 0",background:"linear-gradient(135deg,#0f2240 0%,#1a4d8a 60%,#1a7a8a 100%)",borderRadius:16,padding:"20px 22px",color:"#fff"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:".1em",color:"rgba(255,255,255,.5)",marginBottom:4}}>CRÉDITOS DISPONIBLES</div>
            <div style={{fontSize:42,fontWeight:700,lineHeight:1,marginBottom:4}}>{creditos??0}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginBottom:16}}>
              {creditos===0?"Sin créditos — compra más para continuar":creditos===1?"Alcanza para 1 análisis de lineamientos":`Suficiente para ${Math.floor((creditos??0)/3)} análisis completo${Math.floor((creditos??0)/3)!==1?"s":""}`}
            </div>
            <div style={{marginBottom:16,display:"flex",flexDirection:"column" as const,gap:6}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:".08em",color:"rgba(255,255,255,.35)",marginBottom:2}}>COSTO POR TIPO DE ANÁLISIS</div>
              {[{t:"Lineamientos urbanísticos",c:1,col:"#5ea8f0"},{t:"Estudio de mercado",c:2,col:"#d97706"},{t:"Análisis completo",c:3,col:"#22c55e"}].map(x=>(
                <div key={x.t} style={{background:"rgba(255,255,255,.08)",borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:11,color:"rgba(255,255,255,.65)",fontWeight:500}}>{x.t}</span>
                  <span style={{fontSize:12,fontWeight:700,color:x.col,flexShrink:0,marginLeft:8}}>{x.c} crédito{x.c>1?"s":""}</span>
                </div>
              ))}
            </div>
            {/* ── NUEVO: botón que abre el modal de paquetes ── */}
            <button
              onClick={()=>{setSidebarOpen(false);setShowPaquetesModal(true);}}
              style={{width:"100%",background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",borderRadius:10,padding:"11px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:".02em",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              💳 Comprar créditos
            </button>
          </div>

          {/* Historial */}
          <div style={{padding:"20px 24px",flex:1,overflowY:"auto" as const}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:".1em",color:"#a09888",marginBottom:14}}>HISTORIAL DE REPORTES</div>
            {historial.length===0?(
              <div style={{textAlign:"center" as const,padding:"32px 0",color:"#c0b8ae"}}>
                <div style={{fontSize:28,marginBottom:8}}>📋</div>
                <div style={{fontSize:13}}>Aún no tienes reportes</div>
                <div style={{fontSize:11,marginTop:4}}>Genera tu primer análisis</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
                {historial.map((r:any)=>{
                  const col=r.semaforo==="VERDE"?"#15803d":r.semaforo==="AMARILLO"?"#d97706":r.semaforo==="ROJO"?"#dc2626":"#a09888";
                  const fecha=new Date(r.created_at).toLocaleDateString("es-MX",{day:"2-digit",month:"short"});
                  const tipoLabel=r.tipo_analisis==="lineamientos"?"Lin.":r.tipo_analisis==="mercado"?"Mdo.":"Compl.";
                  return(
                    <button key={r.id} onClick={()=>{
                      if(r.resultado){
                        const d=r.resultado;
                        setRes({ok:true,tipo_analisis:r.tipo_analisis,ubicacion:d.ubicacion,terreno:d.terreno,lineamientos:d.lineamientos,giros:d.giros,analisis:d.analisis});
                        setSidebarOpen(false);
                      }
                    }} style={{background:"rgba(255,255,255,.8)",border:"1px solid #EAE5DF",borderRadius:12,padding:"12px 14px",cursor:"pointer",textAlign:"left" as const,transition:"all .2s cubic-bezier(.16,1,.3,1)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:"#1a1510",lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{r.direccion}</div>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                            <span style={{fontSize:10,color:"#a09888"}}>{fecha}</span>
                            <span style={{fontSize:10,background:"#EAE5DF",borderRadius:4,padding:"1px 6px",color:"#7a6f64",fontWeight:600}}>{tipoLabel}</span>
                            <span style={{fontSize:10,color:"#a09888"}}>{r.creditos_usados} cr.</span>
                          </div>
                        </div>
                        {r.semaforo&&(
                          <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:col,boxShadow:`0 0 6px ${col}`}}/>
                            <span style={{fontSize:10,fontWeight:700,color:col}}>{r.semaforo}</span>
                          </div>
                        )}
                      </div>
                      {r.veredicto&&r.tipo_analisis==="completo"&&(
                        <div style={{marginTop:6,fontSize:11,fontWeight:700,color:col}}>{r.veredicto}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{padding:"16px 24px",borderTop:"1px solid #EAE5DF"}}>
            <button onClick={async()=>{await supabase.auth.signOut();setSidebarOpen(false);setUserSession(null);setCreditos(null);setHistorial([]);}} style={{width:"100%",background:"transparent",border:"1.5px solid #EAE5DF",borderRadius:10,padding:"10px",color:"#7a6f64",fontSize:13,fontWeight:500,cursor:"pointer"}}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </>
    )}
  </>);
}