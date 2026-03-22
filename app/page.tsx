"use client";
import { useState, useEffect, useRef } from "react";

const API = "https://lojqmvpzdhayekzgwazw.supabase.co/functions/v1/analizar_terreno";
const KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvanFtdnB6ZGhheWVremd3YXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzQ1MzUsImV4cCI6MjA4OTcxMDUzNX0.CZpREN5V1i1D8TSNrdmGR0of4F_DuS6EqU9AE9a_eog";
type Tipo = "lineamientos"|"mercado"|"completo";

const fmt  = (n:number)=>n!=null?new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n):"—";
const fmtN = (n:number)=>n!=null?new Intl.NumberFormat("es-MX",{maximumFractionDigits:0}).format(n):"—";
const STEPS = ["Geocodificando…","Buscando zona…","Consultando PDU…","Investigando mercado…","Generando reporte…"];

// ─── Calculator logic ────────────────────────────────────────────
function calcMetrics(inputs: any) {
  const { terreno, m2Total, precioVenta, absorcionMes, ccM2, indirectosPct, mkgPct, contingPct } = inputs;
  const unidades      = Math.floor(m2Total / 65);
  const costConst     = m2Total * ccM2;
  const costIndirect  = costConst * indirectosPct / 100;
  const costMkg       = (unidades * precioVenta * 65) * mkgPct / 100;
  const contingency   = costConst * contingPct / 100;
  const totalCost     = terreno + costConst + costIndirect + costMkg + contingency;
  const totalRev      = unidades * precioVenta * 65;
  const utilBruta     = totalRev - totalCost;
  const margen        = totalRev > 0 ? utilBruta / totalRev : 0;
  const roi           = totalCost > 0 ? utilBruta / totalCost : 0;
  const plazoMeses    = absorcionMes > 0 ? Math.ceil(unidades / absorcionMes) + 6 : 36;
  const tirAnual      = plazoMeses > 0 ? Math.pow(1 + roi, 12 / plazoMeses) - 1 : 0;
  return { unidades, costConst, costIndirect, costMkg, contingency, totalCost, totalRev, utilBruta, margen, roi, tirAnual, plazoMeses };
}

// ─── Chart components ────────────────────────────────────────────
function WaterfallChart({ data }: { data: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current || !data) return;
    const Chart = (window as any).Chart;
    if (!Chart) return;
    const ctx = canvasRef.current.getContext("2d");
    const existing = (Chart as any).getChart(canvasRef.current);
    if (existing) existing.destroy();
    const labels = ["Terreno","Construcción","Indirectos","Mktg","Contingencias","TOTAL COSTO","Ingresos","UTILIDAD"];
    const values = [
      data.terreno, data.costConst, data.costIndirect, data.costMkg,
      data.contingency, data.totalCost, data.totalRev, data.utilBruta
    ].map(v => v / 1e6);
    const colors = [
      "#2563a8","#4a90d9","#6faed4","#8cbfdc","#a8cfe4",
      "#1a1510","#15803d", data.utilBruta >= 0 ? "#15803d" : "#dc2626"
    ];
    new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: (c: any) => ` $${c.parsed.y.toFixed(1)}M MXN`
        }}},
        scales: {
          y: { ticks: { callback: (v: any) => `$${v}M`, font: { size: 10 } }, grid: { color: "rgba(0,0,0,0.04)" }},
          x: { ticks: { font: { size: 9 } }, grid: { display: false }}
        }
      }
    });
  }, [data]);
  return <canvas ref={canvasRef} style={{ height: 200 }}/>;
}

function SensChart({ basePrice, baseUtil, m2Total, terreno, ccM2, indirectosPct, mkgPct, contingPct }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const Chart = (window as any).Chart;
    if (!Chart) return;
    const ctx = canvasRef.current.getContext("2d");
    const existing = (Chart as any).getChart(canvasRef.current);
    if (existing) existing.destroy();
    const prices = Array.from({ length: 20 }, (_, i) => Math.round(basePrice * 0.7 + i * basePrice * 0.033));
    const utils  = prices.map(p => {
      const rev  = (Math.floor(m2Total / 65)) * p * 65;
      const cost = terreno + m2Total * ccM2 * (1 + (indirectosPct + mkgPct + contingPct) / 100);
      return (rev - cost) / 1e6;
    });
    new Chart(ctx, {
      type: "line",
      data: { labels: prices.map(p => `$${(p/1000).toFixed(0)}k`), datasets: [
        { label: "Utilidad bruta", data: utils, borderColor: "#2563a8", borderWidth: 2, pointRadius: 0, tension: 0.3, fill: false },
        { label: "Break-even", data: prices.map(() => 0), borderColor: "#dc2626", borderWidth: 1, pointRadius: 0, borderDash: [4, 4] }
      ]},
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { font: { size: 11 }, boxWidth: 12 } }},
        scales: {
          y: { ticks: { callback: (v: any) => `$${v}M`, font: { size: 10 } }, grid: { color: "rgba(0,0,0,0.04)" }},
          x: { ticks: { font: { size: 9 }, maxTicksLimit: 10 }, grid: { display: false }}
        }
      }
    });
  }, [basePrice, baseUtil, m2Total, terreno, ccM2, indirectosPct, mkgPct, contingPct]);
  return <canvas ref={canvasRef} style={{ height: 180 }}/>;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────
export default function Page() {
  const [dir, setDir]   = useState("");
  const [m2, setM2]     = useState("");
  const [px, setPx]     = useState("");
  const [tipo, setTipo] = useState<Tipo>("lineamientos");
  const [prod, setProd] = useState("");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [res, setRes]   = useState<any>(null);
  const [err, setErr]   = useState("");
  const [activeTab, setActiveTab] = useState("resumen");
  const [chartLoaded, setChartLoaded] = useState(false);

  // Calculator state
  const [calcCC,    setCalcCC]    = useState(16000);
  const [calcPx,    setCalcPx]    = useState(62000);
  const [calcAbs,   setCalcAbs]   = useState(1.5);
  const [calcInd,   setCalcInd]   = useState(18);
  const [calcMkg,   setCalcMkg]   = useState(4);
  const [calcCont,  setCalcCont]  = useState(5);

  const needsProduct = tipo === "mercado" || tipo === "completo";
  const sem    = res?.analisis?.semaforo;
  const semCol = sem === "VERDE" ? "#15803d" : sem === "AMARILLO" ? "#d97706" : sem === "ROJO" ? "#dc2626" : "#94a3b8";

  // Load Chart.js
  useEffect(() => {
    if ((window as any).Chart) { setChartLoaded(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";
    s.onload = () => setChartLoaded(true);
    document.head.appendChild(s);
  }, []);

  async function run() {
    if (!dir || !m2 || !px) { setErr("Completa todos los campos."); return; }
    if (needsProduct && !prod) { setErr("Indica qué quieres construir."); return; }
    setErr(""); setRes(null); setLoading(true); setActiveTab("resumen");
    for (let i = 0; i < STEPS.length; i++) { setStep(i); await new Promise(r => setTimeout(r, 700)); }
    try {
      const body: any = { direccion: dir, metros2: parseFloat(m2), precio: parseFloat(px.replace(/,/g, "")), tipo_analisis: tipo };
      if (prod) body.producto_deseado = prod;
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KEY}` }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.necesita_producto) { setErr("Indica qué quieres construir."); setLoading(false); return; }
      if (d.ok) {
        setRes(d);
        if (d.analisis?.financiero) {
          setCalcPx(d.analisis.financiero.precio_terreno ? Math.round(d.analisis.mercado?.precio_venta_producto_m2 || d.analisis.mercado_producto?.precio_venta_m2_promedio || 62000) : 62000);
          setCalcCC(d.analisis.financiero.costo_construccion_m2 || 16000);
        }
      } else { setErr(d.error || "Error inesperado."); }
    } catch { setErr("Error de conexión."); }
    finally { setLoading(false); }
  }

  // Derived data for calculator
  const m2Total = res?.lineamientos?.m2_construibles || 750;
  const terrenoVal = res?.terreno?.precio || parseFloat(px.replace(/,/g, "")) || 8000000;
  const calcInputs = { terreno: terrenoVal, m2Total, precioVenta: calcPx, absorcionMes: calcAbs, ccM2: calcCC, indirectosPct: calcInd, mkgPct: calcMkg, contingPct: calcCont };
  const calc = calcMetrics(calcInputs);

  const mercadoProd   = res?.analisis?.mercado_producto || res?.analisis?.mercado;
  const precioTerreno = res?.analisis?.precio_terreno_mercado || (res?.analisis?.mercado ? {
    promedio_m2: res.analisis.mercado.precio_terreno_mercado_m2_promedio,
    evaluacion_precio: res.analisis.mercado.evaluacion_precio_terreno,
    porcentaje_diferencia: res.analisis.mercado.porcentaje_sobre_mercado,
  } : null);

  const TABS = [
    { id: "resumen",   label: "Resumen" },
    { id: "lineamientos", label: "Lineamientos" },
    { id: "mercado",   label: "Mercado", show: !!mercadoProd },
    { id: "calculadora", label: "Calculadora", show: res?.tipo_analisis === "completo" || res?.tipo_analisis === "mercado" },
    { id: "financiero", label: "Financiero", show: !!res?.analisis?.financiero },
  ].filter(t => t.show !== false);

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body{background:#F5F2EE;color:#1a1510;font-family:'Inter',-apple-system,sans-serif;}
      input,select,button{font-family:inherit;}
      .serif{font-family:'Instrument Serif',Georgia,serif;}
      input::placeholder{color:#b0a898;}
      .f{width:100%;background:#fff;border:1.5px solid #E8E2DA;border-radius:10px;padding:11px 14px;font-size:14px;color:#1a1510;outline:none;transition:border .2s,box-shadow .2s;}
      .f:focus{border-color:#2563a8;box-shadow:0 0 0 3px rgba(37,99,168,.08);}
      .f:disabled{background:#faf9f7;color:#b0a898;}
      .lbl{font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#a09888;margin-bottom:6px;display:block;}
      @keyframes spin{to{transform:rotate(360deg)}}
      .spin{width:15px;height:15px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0;}
      @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      .up{animation:up .35s ease forwards;}
      .dot{width:7px;height:7px;border-radius:50%;transition:all .3s;}
      .card{background:#fff;border:1px solid #EAE5DF;border-radius:14px;padding:20px 24px;box-shadow:0 1px 4px rgba(0,0,0,.04);}
      .lbl2{font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#a09888;margin-bottom:6px;}
      .val{font-size:18px;font-weight:700;color:#1a1510;letter-spacing:-.02em;line-height:1.2;}
      .sub{font-size:11px;color:#b0a898;margin-top:2px;}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
      .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
      .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
      @media(max-width:640px){.grid4{grid-template-columns:repeat(2,1fr);}.grid3{grid-template-columns:1fr 1fr;}.grid2{grid-template-columns:1fr;}}
      .tab{padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;color:#7a6f64;letter-spacing:.02em;transition:all .15s;}
      .tab.active{background:#1a1510;color:#fff;}
      .tab:hover:not(.active){background:#EEE9E3;}
      .giro{font-size:12px;color:#3a3228;padding:5px 0;border-bottom:1px solid #F0EBE5;line-height:1.4;}
      .giro:last-child{border-bottom:none;}
      .pill{display:inline-block;padding:4px 10px;border-radius:100px;font-size:11px;font-weight:500;background:#EEE9E3;color:#5a4f44;margin:3px 3px 0 0;}
      .sl{background:#fff;border:1px solid #EAE5DF;border-radius:10px;padding:14px 16px;}
      .sl-lbl{font-size:10px;color:#a09888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;}
      .sl-val{font-size:18px;font-weight:700;color:#1a1510;margin-bottom:8px;}
      input[type=range]{-webkit-appearance:none;width:100%;height:4px;background:#E8E2DA;border-radius:2px;outline:none;cursor:pointer;}
      input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#1a1510;cursor:pointer;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.2);}
      .sl-range{display:flex;justify-content:space-between;font-size:10px;color:#c0b8ae;margin-top:3px;}
      .kpi-hdr{background:#1a1510;border-radius:12px;padding:20px 24px;margin-bottom:16px;}
      .kpi-hdr-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px;}
      @media(max-width:600px){.kpi-hdr-grid{grid-template-columns:repeat(2,1fr);}}
      .kpi-hdr-item{background:rgba(255,255,255,.07);border-radius:8px;padding:10px 12px;text-align:center;}
      .kpi-hdr-lbl{font-size:9px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;}
      .kpi-hdr-val{font-size:17px;font-weight:700;color:#fff;}
      .wf-row{display:flex;align-items:center;padding:7px 0;border-bottom:1px solid #F0EBE5;gap:8px;font-size:13px;}
      .wf-row:last-child{border-bottom:none;}
      .wf-row.total{font-weight:700;background:#F5F2EE;margin:0 -24px;padding:8px 24px;border-radius:0 0 14px 14px;}
      .wf-bar-wrap{width:70px;height:5px;background:#E8E2DA;border-radius:3px;overflow:hidden;flex-shrink:0;}
      .wf-bar{height:100%;border-radius:3px;}
      .sens-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F0EBE5;font-size:12px;}
      .sens-row:last-child{border-bottom:none;}
      .sens-row.active{background:#EFF6FF;margin:0 -24px;padding:6px 24px;}
      .chart-wrap{background:#fff;border:1px solid #EAE5DF;border-radius:14px;padding:18px 20px;}
      .chart-title{font-size:11px;font-weight:700;color:#1a1510;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px;}
      .veredicto{border-radius:14px;padding:24px 28px;border-width:2px;border-style:solid;}
    `}</style>

    {/* NAV */}
    <header style={{background:"rgba(245,242,238,.96)",backdropFilter:"blur(12px)",borderBottom:"1px solid #E8E2DA",padding:"0 32px",height:54,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:20}}>
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

    {/* MAIN GRID — when no result: centered form / when result: full grid */}
    {!res && !loading ? (
      <div style={{maxWidth:640,margin:"0 auto",padding:"64px 24px 100px"}} className="up">
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"#DBEAFE",borderRadius:100,padding:"5px 14px",marginBottom:22}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#2563a8"}}/>
            <span style={{fontSize:11,fontWeight:700,color:"#1d4ed8",letterSpacing:".07em"}}>PDU MONTERREY 2013–2025 · IA</span>
          </div>
          <h1 className="serif" style={{fontSize:"clamp(40px,6vw,62px)",lineHeight:1,color:"#1a1510",marginBottom:16,fontWeight:400}}>
            Unearth your next<br/><em style={{color:"#2563a8"}}>development.</em>
          </h1>
          <p style={{fontSize:16,color:"#7a6f64",lineHeight:1.7,maxWidth:400,margin:"0 auto"}}>
            Dirección, metros y precio — el resto lo hace la IA.
          </p>
        </div>

        <div className="card" style={{borderRadius:20,padding:"32px",boxShadow:"0 2px 20px rgba(0,0,0,.07)"}}>
          <div style={{marginBottom:14}}>
            <label className="lbl">Dirección del terreno</label>
            <input className="f" value={dir} onChange={e=>setDir(e.target.value)} placeholder="Mitla 418, Mitras Norte, Monterrey"/>
          </div>
          <div className="grid3" style={{marginBottom:14}}>
            <div><label className="lbl">Superficie m²</label><input className="f" value={m2} onChange={e=>setM2(e.target.value)} placeholder="300" type="number"/></div>
            <div><label className="lbl">Precio MXN</label><input className="f" value={px} onChange={e=>setPx(e.target.value)} placeholder="8,000,000"/></div>
            <div>
              <label className="lbl">Tipo</label>
              <select className="f" value={tipo} onChange={e=>{setTipo(e.target.value as Tipo);setProd("");}} style={{cursor:"pointer",background:"#fff"}}>
                <option value="lineamientos">Lineamientos</option>
                <option value="mercado">+ Mercado</option>
                <option value="completo">Análisis completo</option>
              </select>
            </div>
          </div>
          {needsProduct&&(
            <div style={{marginBottom:14}}>
              <label className="lbl">¿Qué quieres construir?</label>
              <input className="f" value={prod} onChange={e=>setProd(e.target.value)} placeholder="departamentos, casas, locales, oficinas…"/>
            </div>
          )}
          {err&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 14px",color:"#dc2626",fontSize:13,marginBottom:12}}>{err}</div>}
          <button onClick={run} style={{width:"100%",background:"#1a1510",border:"none",borderRadius:11,padding:"14px 0",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"opacity .15s"}}>
            Analizar terreno →
          </button>
        </div>
      </div>
    ) : loading ? (
      <div style={{maxWidth:640,margin:"80px auto",textAlign:"center",padding:"0 24px"}}>
        <div style={{width:38,height:38,border:"2.5px solid #E8E2DA",borderTop:"2.5px solid #2563a8",borderRadius:"50%",margin:"0 auto 18px",animation:"spin .8s linear infinite"}}/>
        <div style={{fontSize:15,fontWeight:600,color:"#1a1510",marginBottom:10}}>{STEPS[step]}</div>
        <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:12}}>
          {STEPS.map((_,i)=><div key={i} className="dot" style={{background:i<=step?"#2563a8":"#E8E2DA",transform:i===step?"scale(1.5)":"scale(1)"}}/>)}
        </div>
      </div>
    ) : res && (
      <div style={{maxWidth:1280,margin:"0 auto",padding:"24px 24px 80px"}} className="up">

        {/* KPI HEADER BAR */}
        <div className="kpi-hdr" style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.45)",letterSpacing:".08em",marginBottom:4}}>
                {res.tipo_analisis === "lineamientos" ? "LINEAMIENTOS" : res.tipo_analisis === "mercado" ? "ESTUDIO DE MERCADO" : "ANÁLISIS COMPLETO"} · {res.ubicacion.distrito?.toUpperCase()}, {res.ubicacion.delegacion?.toUpperCase()}
              </div>
              <div className="serif" style={{fontSize:26,color:"#fff",lineHeight:1.1}}>{res.ubicacion.direccion}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:100,background:`${semCol}25`,border:`1.5px solid ${semCol}50`}}>
              {sem&&<><div style={{width:9,height:9,borderRadius:"50%",background:semCol}}/><span style={{fontSize:12,fontWeight:700,color:semCol,letterSpacing:".08em"}}>{sem}</span></>}
              {!sem&&<span style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>Sin semáforo</span>}
            </div>
          </div>
          <div className="kpi-hdr-grid">
            {[
              {l:"ZONA",v:`${res.ubicacion.zona} · ${res.ubicacion.densidad}`},
              {l:"PRECIO / M² TERRENO",v:fmt(res.terreno.precio_m2)},
              {l:"M² CONSTRUIBLES",v:res.lineamientos?.m2_construibles?`${fmtN(res.lineamientos.m2_construibles)} m²`:(res.lineamientos?.cus==="Libre"?"Libre":"—")},
              {l:"ALTURA MÁX",v:res.lineamientos?.altura_max||"—"},
            ].map(k=>(
              <div key={k.l} className="kpi-hdr-item">
                <div className="kpi-hdr-lbl">{k.l}</div>
                <div className="kpi-hdr-val" style={{fontSize:k.v.length>14?13:17}}>{k.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TABS */}
        <div style={{display:"flex",gap:4,marginBottom:20,flexWrap:"wrap"}}>
          {TABS.map(t=>(
            <button key={t.id} className={`tab ${activeTab===t.id?"active":""}`} onClick={()=>setActiveTab(t.id)}>{t.label}</button>
          ))}
          <button style={{marginLeft:"auto",background:"transparent",border:"1.5px solid #E8E2DA",borderRadius:8,padding:"6px 14px",fontSize:12,cursor:"pointer",color:"#9a8f84",fontWeight:500}}
            onClick={()=>{setRes(null);setDir("");setM2("");setPx("");setProd("");}}>← Nuevo análisis</button>
        </div>

        {/* ══ TAB: RESUMEN ══ */}
        {activeTab==="resumen"&&(
          <div>
            <div className="grid4" style={{marginBottom:14}}>
              {[
                {l:"Terreno",v:fmt(res.terreno.precio),s:"precio pedido"},
                {l:"Precio / m²",v:fmt(res.terreno.precio_m2),s:precioTerreno?`mercado ~${fmt(precioTerreno.promedio_m2)}/m²`:""},
                {l:"Superficie",v:`${fmtN(res.terreno.metros2)} m²`,s:"terreno"},
                {l:"M² construibles",v:res.lineamientos?.m2_construibles?`${fmtN(res.lineamientos.m2_construibles)} m²`:"—",s:`CUS ${res.lineamientos?.cus}`},
              ].map(k=>(
                <div key={k.l} className="card">
                  <div className="lbl2">{k.l}</div>
                  <div className="val">{k.v}</div>
                  {k.s&&<div className="sub">{k.s}</div>}
                </div>
              ))}
            </div>

            {res.analisis?.resumen_ejecutivo&&(
              <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:14,padding:"20px 24px",marginBottom:14}}>
                <div className="lbl2" style={{color:"#1d4ed8"}}>Resumen ejecutivo</div>
                <p style={{fontSize:14,lineHeight:1.75,color:"#1e3a5f",marginTop:6}}>{res.analisis.resumen_ejecutivo}</p>
              </div>
            )}

            <div className="grid2" style={{marginBottom:14}}>
              {res.analisis?.red_flags?.length>0&&(
                <div style={{background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:14,padding:"20px 24px"}}>
                  <div className="lbl2" style={{color:"#c2410c"}}>Red Flags</div>
                  {res.analisis.red_flags.map((f:string,i:number)=>(
                    <div key={i} style={{display:"flex",gap:8,marginTop:9,fontSize:13,color:"#7c2d12",lineHeight:1.5,alignItems:"flex-start"}}>
                      <span style={{color:"#f97316",fontWeight:800,flexShrink:0}}>!</span>{f}
                    </div>
                  ))}
                </div>
              )}
              {res.analisis?.fortalezas?.length>0&&(
                <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:14,padding:"20px 24px"}}>
                  <div className="lbl2" style={{color:"#15803d"}}>Fortalezas</div>
                  {res.analisis.fortalezas.map((f:string,i:number)=>(
                    <div key={i} style={{display:"flex",gap:8,marginTop:9,fontSize:13,color:"#14532d",lineHeight:1.5,alignItems:"flex-start"}}>
                      <span style={{color:"#22c55e",fontWeight:800,flexShrink:0}}>✓</span>{f}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {res.analisis?.veredicto&&(
              <div className="veredicto" style={{borderColor:semCol,boxShadow:`0 0 0 3px ${semCol}10`}}>
                <div className="lbl2">Veredicto</div>
                <div className="serif" style={{fontSize:34,color:semCol,lineHeight:1,marginBottom:12,marginTop:4}}>{res.analisis.veredicto}</div>
                <p style={{fontSize:14,color:"#3a3228",lineHeight:1.7}}>{res.analisis.justificacion_veredicto}</p>
                {res.analisis.proximos_pasos?.length>0&&(
                  <div style={{marginTop:18,borderTop:"1px solid #F0EBE5",paddingTop:14}}>
                    <div className="lbl2">Próximos pasos</div>
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

            {res.analisis?.recomendacion&&!res.analisis?.veredicto&&(
              <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:14,padding:"20px 24px",marginTop:14}}>
                <div className="lbl2" style={{color:"#1d4ed8"}}>Recomendación</div>
                <p style={{fontSize:14,lineHeight:1.75,color:"#1e3a5f",marginTop:6}}>{res.analisis.recomendacion}</p>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: LINEAMIENTOS ══ */}
        {activeTab==="lineamientos"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:14}}>
              {res.lineamientos&&[
                {l:"COS",v:res.lineamientos.cos,s:"Coef. Ocupación Suelo"},
                {l:"CUS",v:res.lineamientos.cus,s:"Coef. Utilización Suelo"},
                {l:"CAV",v:res.lineamientos.cav,s:"Coef. Área Verde"},
                {l:"Huella máx",v:res.lineamientos.huella_max_m2?`${fmtN(res.lineamientos.huella_max_m2)} m²`:"—",s:""},
                {l:"M² construibles",v:res.lineamientos.m2_construibles?`${fmtN(res.lineamientos.m2_construibles)} m²`:(res.lineamientos.cus==="Libre"?"Libre":"—"),s:""},
                {l:"Área verde mín",v:res.lineamientos.area_verde_min_m2?`${fmtN(res.lineamientos.area_verde_min_m2)} m²`:"—",s:""},
                {l:"Densidad máx",v:res.lineamientos.densidad_max_viv_ha&&res.lineamientos.densidad_max_viv_ha!=="N/D"?`${res.lineamientos.densidad_max_viv_ha} viv/Ha`:"—",s:""},
                {l:"Altura máxima",v:res.lineamientos.altura_max||"—",s:""},
              ].map(k=>(
                <div key={k.l} className="card">
                  <div className="lbl2">{k.l}</div>
                  {k.s&&<div style={{fontSize:10,color:"#c0b8ae",marginBottom:4}}>{k.s}</div>}
                  <div className="val" style={{fontSize:16}}>{k.v}</div>
                </div>
              ))}
            </div>

            {res.giros?.permitidos?.length>0&&(
              <div className="grid2">
                <div className="card">
                  <div className="lbl2">Giros Permitidos (P) — {res.giros.total_permitidos}</div>
                  <div style={{maxHeight:260,overflowY:"auto",marginTop:6}}>
                    {res.giros.permitidos.map((g:string,i:number)=>(
                      <div key={i} className="giro"><span style={{color:"#15803d",fontWeight:700,marginRight:8,fontSize:10}}>P</span>{g.split("—")[1]||g}</div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="lbl2">Giros Condicionados (C) — {res.giros.total_condicionados}</div>
                  <div style={{maxHeight:260,overflowY:"auto",marginTop:6}}>
                    {res.giros.condicionados?.map((g:string,i:number)=>(
                      <div key={i} className="giro"><span style={{color:"#d97706",fontWeight:700,marginRight:8,fontSize:10}}>C</span>{g.split("—")[1]||g}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: MERCADO ══ */}
        {activeTab==="mercado"&&mercadoProd&&(
          <div>
            {res.analisis?.producto_compatible!==undefined&&(
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"12px 18px",background:res.analisis.producto_compatible?"#F0FDF4":"#FEF2F2",border:`1px solid ${res.analisis.producto_compatible?"#BBF7D0":"#FECACA"}`,borderRadius:12}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:res.analisis.producto_compatible?"#15803d":"#dc2626"}}/>
                <span style={{fontSize:14,fontWeight:600,color:res.analisis.producto_compatible?"#15803d":"#dc2626"}}>
                  {res.analisis.producto_compatible?"Producto compatible con la zona":"Producto NO compatible con la zona"}
                </span>
                <span style={{fontSize:13,color:"#7a6f64",marginLeft:6}}>{res.analisis.motivo_compatibilidad||res.analisis?.viabilidad_tecnica?.motivo}</span>
              </div>
            )}

            <div className="grid4" style={{marginBottom:14}}>
              {precioTerreno&&[
                {l:"Terreno — mercado",v:`${fmt(precioTerreno.promedio_m2)}/m²`,s:"promedio zona"},
                {l:"Terreno — pedido",v:`${fmt(res.terreno.precio_m2)}/m²`,s:"precio actual"},
                {l:"Evaluación",v:(precioTerreno.evaluacion_precio||"").toUpperCase(),s:""},
                {l:"Diferencia vs mercado",v:`${precioTerreno.porcentaje_diferencia>0?"+":""}${precioTerreno.porcentaje_diferencia}%`,s:""},
              ].map(k=>(
                <div key={k.l} className="card">
                  <div className="lbl2">{k.l}</div>
                  <div className="val" style={{fontSize:16,color:k.l.includes("Diferencia")&&precioTerreno.porcentaje_diferencia>20?"#dc2626":"#1a1510"}}>{k.v}</div>
                  {k.s&&<div className="sub">{k.s}</div>}
                </div>
              ))}
            </div>

            <div className="grid2" style={{marginBottom:14}}>
              <div className="card">
                <div className="lbl2" style={{color:"#1d4ed8"}}>Precios del producto — {mercadoProd.tipo}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:12}}>
                  {[
                    {l:"Venta mín/m²",v:fmt(mercadoProd.precio_venta_m2_min||mercadoProd.precio_venta_producto_m2)},
                    {l:"Venta máx/m²",v:fmt(mercadoProd.precio_venta_m2_max||mercadoProd.precio_venta_producto_m2)},
                    {l:"Promedio/m²",v:fmt(mercadoProd.precio_venta_m2_promedio||mercadoProd.precio_venta_producto_m2)},
                    {l:"Renta/m²/mes",v:fmt(mercadoProd.precio_renta_mensual_m2||mercadoProd.precio_renta_producto_m2_mes)},
                    {l:"Absorción",v:`${mercadoProd.absorcion_estimada_meses||mercadoProd.absorcion_meses} meses`},
                    {l:"Demanda",v:(mercadoProd.demanda||"").toUpperCase()},
                  ].map(k=>(
                    <div key={k.l}>
                      <div className="lbl2">{k.l}</div>
                      <div style={{fontSize:16,fontWeight:700,color:"#1e3a5f"}}>{k.v||"—"}</div>
                    </div>
                  ))}
                </div>
              </div>

              {(Array.isArray(mercadoProd.proyectos_competencia)||(typeof mercadoProd.competencia==="string"))&&(
                <div className="card">
                  <div className="lbl2">Competencia directa</div>
                  <div style={{marginTop:8}}>
                    {Array.isArray(mercadoProd.proyectos_competencia)
                      ? mercadoProd.proyectos_competencia.map((p:string,i:number)=>(
                          <div key={i} className="giro" style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                            <span style={{color:"#2563a8",fontWeight:700,flexShrink:0}}>→</span>{p}
                          </div>
                        ))
                      : <p style={{fontSize:13,color:"#3a3228",lineHeight:1.65}}>{mercadoProd.competencia}</p>
                    }
                  </div>
                  {res.analisis?.entorno_y_urbanismo&&(
                    <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid #F0EBE5"}}>
                      <div className="lbl2">Entorno</div>
                      <p style={{fontSize:13,color:"#7a6f64",lineHeight:1.6,marginTop:6}}>{res.analisis.entorno_y_urbanismo.descripcion_zona}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {res.analisis?.potencial_proyecto&&(
              <div className="card">
                <div className="lbl2">Potencial del proyecto (estimado)</div>
                <div className="grid4" style={{marginTop:10}}>
                  {[
                    {l:"Unidades",v:`${res.analisis.potencial_proyecto.unidades_estimadas}`},
                    {l:"M² / unidad",v:`${res.analisis.potencial_proyecto.m2_por_unidad} m²`},
                    {l:"Ingreso venta est.",v:fmt(res.analisis.potencial_proyecto.ingreso_venta_estimado)},
                    {l:"Ingreso renta anual",v:fmt(res.analisis.potencial_proyecto.ingreso_renta_estimado_anual)},
                  ].map(k=>(
                    <div key={k.l}>
                      <div className="lbl2">{k.l}</div>
                      <div style={{fontSize:16,fontWeight:700,color:"#1a1510"}}>{k.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: CALCULADORA ══ */}
        {activeTab==="calculadora"&&(
          <div>
            {/* KPI bar calculadora */}
            <div style={{background:"#1a1510",borderRadius:14,padding:"20px 24px",marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:".08em",marginBottom:12}}>CALCULADORA DE INVERSIÓN — ajusta los parámetros</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {[
                  {l:"UTILIDAD BRUTA",v:fmt(calc.utilBruta),col:calc.utilBruta>=0?"#4ED9A0":"#ff6b6b"},
                  {l:"MARGEN BRUTO",v:`${(calc.margen*100).toFixed(1)}%`,col:calc.margen>=0.15?"#4ED9A0":calc.margen>=0.08?"#F4C55B":"#ff6b6b"},
                  {l:"ROI",v:`${(calc.roi*100).toFixed(1)}%`,col:calc.roi>=0.20?"#4ED9A0":calc.roi>=0.10?"#F4C55B":"#ff6b6b"},
                  {l:"TIR ANUAL EST.",v:`${(calc.tirAnual*100).toFixed(1)}%`,col:calc.tirAnual>=0.18?"#4ED9A0":calc.tirAnual>=0.10?"#F4C55B":"#ff6b6b"},
                ].map(k=>(
                  <div key={k.l} style={{background:"rgba(255,255,255,.07)",borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>{k.l}</div>
                    <div style={{fontSize:18,fontWeight:700,color:k.col}}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
              {[
                {l:"Precio venta/m²",v:calcPx,min:30000,max:120000,step:1000,set:setCalcPx,fmt:(v:number)=>`$${(v/1000).toFixed(0)}k`},
                {l:"Costo constr./m²",v:calcCC,min:10000,max:30000,step:500,set:setCalcCC,fmt:(v:number)=>`$${(v/1000).toFixed(1)}k`},
                {l:"Absorción (dep/mes)",v:calcAbs,min:0.5,max:5,step:0.5,set:setCalcAbs,fmt:(v:number)=>`${v} dep/mes`},
                {l:"Indirectos %",v:calcInd,min:5,max:35,step:1,set:setCalcInd,fmt:(v:number)=>`${v}%`},
                {l:"Comercialización %",v:calcMkg,min:1,max:8,step:0.5,set:setCalcMkg,fmt:(v:number)=>`${v}%`},
                {l:"Contingencias %",v:calcCont,min:2,max:15,step:1,set:setCalcCont,fmt:(v:number)=>`${v}%`},
              ].map(sl=>(
                <div key={sl.l} className="sl">
                  <div className="sl-lbl">{sl.l}</div>
                  <div className="sl-val">{sl.fmt(sl.v)}</div>
                  <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.v} onChange={e=>sl.set(parseFloat(e.target.value))}/>
                  <div className="sl-range"><span>{sl.fmt(sl.min)}</span><span>{sl.fmt(sl.max)}</span></div>
                </div>
              ))}
            </div>

            {/* Waterfall costos + sensibilidad */}
            <div className="grid2" style={{marginBottom:14}}>
              <div className="card">
                <div className="lbl2">Desglose de costos vs ingresos</div>
                <div style={{marginTop:8}}>
                  {[
                    {l:"Terreno",v:terrenoVal,col:"#2563a8"},
                    {l:"Construcción",v:calc.costConst,col:"#4a90d9"},
                    {l:"Indirectos",v:calc.costIndirect,col:"#6faed4"},
                    {l:"Comercialización",v:calc.costMkg,col:"#8cbfdc"},
                    {l:"Contingencias",v:calc.contingency,col:"#a8cfe4"},
                  ].map(r=>(
                    <div key={r.l} className="wf-row">
                      <div style={{flex:1,fontSize:12,color:"#3a3228"}}>{r.l}</div>
                      <div className="wf-bar-wrap"><div className="wf-bar" style={{width:`${(r.v/calc.totalCost)*100}%`,background:r.col}}/></div>
                      <div style={{fontWeight:600,minWidth:90,textAlign:"right",fontSize:12}}>{fmt(r.v)}</div>
                    </div>
                  ))}
                  <div className="wf-row total">
                    <div style={{flex:1,fontSize:13}}>TOTAL INVERSIÓN</div>
                    <div style={{fontWeight:700,fontSize:14,color:"#1a1510"}}>{fmt(calc.totalCost)}</div>
                  </div>
                  <div className="wf-row" style={{borderBottom:"none",marginTop:8}}>
                    <div style={{flex:1,fontSize:13}}>INGRESOS EST.</div>
                    <div style={{fontWeight:700,fontSize:14,color:"#15803d"}}>{fmt(calc.totalRev)}</div>
                  </div>
                  <div className="wf-row" style={{borderBottom:"none"}}>
                    <div style={{flex:1,fontSize:13,fontWeight:700}}>UTILIDAD BRUTA</div>
                    <div style={{fontWeight:700,fontSize:16,color:calc.utilBruta>=0?"#15803d":"#dc2626"}}>{fmt(calc.utilBruta)}</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="lbl2">Sensibilidad — precio de venta vs utilidad</div>
                <div style={{marginTop:8}}>
                  {[0.8,0.9,0.95,1,1.05,1.1,1.2,1.3].map(mult=>{
                    const p = Math.round(calcPx * mult);
                    const rev = calc.unidades * p * 65;
                    const u = rev - calc.totalCost;
                    const mg = rev > 0 ? u / rev : 0;
                    const isActive = mult === 1;
                    const col = mg >= 0.15 ? "#15803d" : mg >= 0.08 ? "#d97706" : "#dc2626";
                    return (
                      <div key={mult} className={`sens-row${isActive?" active":""}`}>
                        <div style={{width:90,fontWeight:600,color:"#1a1510",fontSize:12,flexShrink:0}}>${(p/1000).toFixed(0)}k/m²{isActive?" ★":""}</div>
                        <div style={{flex:1,height:5,background:"#E8E2DA",borderRadius:3,overflow:"hidden",minWidth:30}}>
                          <div style={{height:"100%",width:`${Math.max(0,(u/Math.abs(calc.totalRev*0.3))*100)}%`,background:col,borderRadius:3}}/>
                        </div>
                        <div style={{width:80,textAlign:"right",fontWeight:600,fontSize:12,color:col,flexShrink:0}}>{fmt(u)}</div>
                        <div style={{width:36,textAlign:"right",fontSize:11,color:"#9a8f84",flexShrink:0}}>{(mg*100).toFixed(0)}%</div>
                        <div style={{width:16,textAlign:"center",fontSize:11,flexShrink:0}}>{mg>=0.15?"✓":mg>=0.08?"△":"✗"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chart sensibilidad */}
            {chartLoaded&&(
              <div className="chart-wrap">
                <div className="chart-title">Curva de sensibilidad — precio de venta</div>
                <SensChart basePrice={calcPx} baseUtil={calc.utilBruta} m2Total={m2Total} terreno={terrenoVal} ccM2={calcCC} indirectosPct={calcInd} mkgPct={calcMkg} contingPct={calcCont}/>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: FINANCIERO ══ */}
        {activeTab==="financiero"&&res.analisis?.financiero&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:14}}>
              {[
                {l:"Precio terreno",v:fmt(res.analisis.financiero.precio_terreno)},
                {l:"Costo construcción",v:fmt(res.analisis.financiero.costo_construccion_total)},
                {l:"Costo total proyecto",v:fmt(res.analisis.financiero.costo_total_proyecto)},
                {l:"Ingreso estimado",v:fmt(res.analisis.financiero.ingreso_total_estimado)},
                {l:"Utilidad bruta",v:fmt(res.analisis.financiero.utilidad_bruta),col:res.analisis.financiero.utilidad_bruta>=0?"#15803d":"#dc2626"},
                {l:"Margen bruto",v:`${res.analisis.financiero.margen_bruto_pct}%`,col:res.analisis.financiero.margen_bruto_pct>=15?"#15803d":res.analisis.financiero.margen_bruto_pct>=8?"#d97706":"#dc2626"},
                {l:"ROI",v:`${res.analisis.financiero.roi_pct}%`,col:res.analisis.financiero.roi_pct>=20?"#15803d":"#1a1510"},
                {l:"TIR estimada",v:`${res.analisis.financiero.tir_estimada_pct}%`,col:res.analisis.financiero.tir_estimada_pct>=18?"#15803d":"#1a1510"},
                {l:"Plazo",v:`${res.analisis.financiero.plazo_meses} meses`},
              ].map(k=>(
                <div key={k.l} className="card">
                  <div className="lbl2">{k.l}</div>
                  <div className="val" style={{fontSize:18,color:(k as any).col||"#1a1510"}}>{k.v||"—"}</div>
                </div>
              ))}
            </div>

            {/* Waterfall chart */}
            {chartLoaded&&(
              <div className="chart-wrap">
                <div className="chart-title">Desglose financiero</div>
                <WaterfallChart data={{
                  terreno: res.analisis.financiero.precio_terreno,
                  costConst: res.analisis.financiero.costo_construccion_total,
                  costIndirect: res.analisis.financiero.costo_total_proyecto - res.analisis.financiero.costo_construccion_total - res.analisis.financiero.precio_terreno,
                  costMkg: 0, contingency: 0,
                  totalCost: res.analisis.financiero.costo_total_proyecto,
                  totalRev: res.analisis.financiero.ingreso_total_estimado,
                  utilBruta: res.analisis.financiero.utilidad_bruta,
                }}/>
              </div>
            )}
          </div>
        )}
      </div>
    )}

    <footer style={{borderTop:"1px solid #E8E2DA",padding:"18px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#F5F2EE"}}>
      <span style={{fontSize:14,fontWeight:600,letterSpacing:"-.03em"}}>un<span style={{color:"#2563a8"}}>earth</span></span>
      <span style={{fontSize:11,color:"#b0a898",letterSpacing:".04em"}}>Monterrey, NL · {new Date().getFullYear()}</span>
    </footer>
  </>);
}