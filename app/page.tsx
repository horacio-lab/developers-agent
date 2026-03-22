"use client";
import { useState, useEffect, useRef } from "react";

const API = "https://lojqmvpzdhayekzgwazw.supabase.co/functions/v1/analizar_terreno";
const KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvanFtdnB6ZGhheWVremd3YXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzQ1MzUsImV4cCI6MjA4OTcxMDUzNX0.CZpREN5V1i1D8TSNrdmGR0of4F_DuS6EqU9AE9a_eog";
type Tipo = "lineamientos"|"mercado"|"completo";

const $  = (n:number|null|undefined, style="currency") =>
  n != null && !isNaN(n)
    ? style==="currency"
      ? new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n)
      : new Intl.NumberFormat("es-MX",{maximumFractionDigits:0}).format(n)
    : "—";

const pct = (n:number|null|undefined) => n != null ? `${Number(n).toFixed(1)}%` : "—";

const STEPS = ["Geocodificando…","Buscando zona…","Consultando PDU…","Investigando mercado…","Generando análisis…"];

/* ── Calculadora ─────────────────────────────────────────────── */
function calcMetrics(t:number, m2:number, pv:number, cc:number, ind:number, mkg:number, cont:number) {
  const units = Math.max(1, Math.floor(m2 / 65));
  const cConst = m2 * cc;
  const cInd   = cConst * ind / 100;
  const cMkg   = units * pv * 65 * mkg / 100;
  const cCont  = cConst * cont / 100;
  const total  = t + cConst + cInd + cMkg + cCont;
  const rev    = units * pv * 65;
  const util   = rev - total;
  const margen = rev > 0 ? util / rev : 0;
  const roi    = total > 0 ? util / total : 0;
  return { units, cConst, cInd, cMkg, cCont, total, rev, util, margen, roi };
}

/* ── Bar chart (pure canvas, no external lib needed) ────────── */
function BarChart({ bars }: { bars: { label: string; value: number; color: string }[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const W = c.offsetWidth; const H = 180;
    c.width = W * window.devicePixelRatio; c.height = H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const pad = { t: 20, r: 10, b: 48, l: 70 };
    const maxV = Math.max(...bars.map(b => Math.abs(b.value)));
    const bw = (W - pad.l - pad.r) / bars.length - 6;
    ctx.clearRect(0, 0, W, H);
    ctx.font = "10px Inter, sans-serif"; ctx.fillStyle = "#a09888";
    // Gridlines
    [0.25, 0.5, 0.75, 1].forEach(f => {
      const y = pad.t + (H - pad.t - pad.b) * (1 - f);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y);
      ctx.strokeStyle = "rgba(0,0,0,0.06)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(`$${(maxV * f / 1e6).toFixed(1)}M`, pad.l - 6, y + 3);
    });
    bars.forEach((b, i) => {
      const x = pad.l + i * ((W - pad.l - pad.r) / bars.length) + 3;
      const chartH = H - pad.t - pad.b;
      const h = Math.abs(b.value) / maxV * chartH * 0.88;
      const y = pad.t + (chartH - h);
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, bw, h, 4) : ctx.rect(x, y, bw, h);
      ctx.fill();
      ctx.fillStyle = "#3a3228"; ctx.textAlign = "center"; ctx.font = "9px Inter, sans-serif";
      const lines = b.label.split(" ");
      lines.forEach((l, li) => ctx.fillText(l, x + bw/2, H - pad.b + 14 + li * 11));
    });
  }, [bars]);
  return <canvas ref={ref} style={{ width: "100%", height: 180, display: "block" }} />;
}

/* ── Line chart ─────────────────────────────────────────────── */
function LineChart({ points, baseIdx }: { points: { x: string; y: number }[]; baseIdx: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const W = c.offsetWidth; const H = 160;
    c.width = W * window.devicePixelRatio; c.height = H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const pad = { t: 14, r: 14, b: 36, l: 60 };
    const vals = points.map(p => p.y);
    const minV = Math.min(...vals); const maxV = Math.max(...vals);
    const rangeV = maxV - minV || 1;
    const toY = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - minV) / rangeV);
    const toX = (i: number) => pad.l + i * (W - pad.l - pad.r) / (points.length - 1);
    ctx.clearRect(0, 0, W, H);
    // Zero line
    const y0 = toY(0);
    ctx.beginPath(); ctx.moveTo(pad.l, y0); ctx.lineTo(W - pad.r, y0);
    ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 1; ctx.setLineDash([4,4]); ctx.stroke();
    ctx.setLineDash([]);
    // Line
    ctx.beginPath();
    points.forEach((p, i) => { const x = toX(i); const y = toY(p.y); i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); });
    ctx.strokeStyle = "#2563a8"; ctx.lineWidth = 2; ctx.stroke();
    // Fill
    ctx.beginPath();
    points.forEach((p, i) => { const x = toX(i); const y = toY(p.y); i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); });
    ctx.lineTo(toX(points.length-1), y0); ctx.lineTo(toX(0), y0); ctx.closePath();
    ctx.fillStyle = "rgba(37,99,168,0.07)"; ctx.fill();
    // Active point
    const ax = toX(baseIdx); const ay = toY(points[baseIdx].y);
    ctx.beginPath(); ctx.arc(ax, ay, 5, 0, Math.PI*2);
    ctx.fillStyle = "#2563a8"; ctx.fill(); ctx.strokeStyle="#fff"; ctx.lineWidth=2; ctx.stroke();
    // Labels
    ctx.font = "9px Inter, sans-serif"; ctx.fillStyle = "#a09888"; ctx.textAlign = "center";
    points.forEach((p, i) => {
      if (i % Math.ceil(points.length/8) === 0 || i === baseIdx)
        ctx.fillText(p.x, toX(i), H - 6);
    });
    // Y labels
    ctx.textAlign = "right";
    [minV, (minV+maxV)/2, maxV].forEach(v => {
      const y = toY(v);
      ctx.fillText(`$${(v/1e6).toFixed(1)}M`, pad.l - 4, y + 3);
    });
  }, [points, baseIdx]);
  return <canvas ref={ref} style={{ width: "100%", height: 160, display: "block" }} />;
}

/* ══════════════════════════════════════════════════════════════ */
export default function Page() {
  const [dir, setDir]   = useState("");
  const [m2,  setM2]    = useState("");
  const [px,  setPx]    = useState("");
  const [tipo, setTipo] = useState<Tipo>("lineamientos");
  const [prod, setProd] = useState("");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [res,  setRes]  = useState<any>(null);
  const [err,  setErr]  = useState("");
  const [tab,  setTab]  = useState<"reporte"|"calculadora">("reporte");

  // Calculator state (initialized from analysis results)
  const [cPv,   setCPv]   = useState(62000);
  const [cCc,   setCCc]   = useState(16000);
  const [cAbs,  setCAbs]  = useState(1.5);
  const [cInd,  setCInd]  = useState(18);
  const [cMkg,  setCMkg]  = useState(4);
  const [cCont, setCCont] = useState(5);

  const needsProd = tipo === "mercado" || tipo === "completo";

  async function run() {
    if (!dir||!m2||!px) { setErr("Completa todos los campos."); return; }
    if (needsProd&&!prod) { setErr("Indica qué quieres construir."); return; }
    setErr(""); setRes(null); setLoading(true); setTab("reporte");
    for (let i=0;i<STEPS.length;i++) { setStep(i); await new Promise(r=>setTimeout(r,680)); }
    try {
      const body: any = {
        direccion: dir, metros2: parseFloat(m2),
        precio: parseFloat(px.replace(/,/g,"")), tipo_analisis: tipo,
      };
      if (prod) body.producto_deseado = prod;
      const r = await fetch(API, { method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${KEY}`}, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.necesita_producto) { setErr("Indica qué quieres construir."); setLoading(false); return; }
      if (d.ok) {
        setRes(d);
        const mp = d.analisis?.mercado_producto || d.analisis?.mercado;
        if (mp?.precio_venta_m2_promedio) setCPv(mp.precio_venta_m2_promedio);
        if (d.analisis?.financiero?.costo_construccion_m2) setCCc(d.analisis.financiero.costo_construccion_m2);
      } else { setErr(d.error||"Error inesperado."); }
    } catch { setErr("Error de conexión."); }
    finally { setLoading(false); }
  }

  const sem    = res?.analisis?.semaforo;
  const semCol = sem==="VERDE"?"#15803d" : sem==="AMARILLO"?"#d97706" : sem==="ROJO"?"#dc2626" : null;
  const mp     = res?.analisis?.mercado_producto || res?.analisis?.mercado;
  const pt     = res?.analisis?.precio_terreno_mercado || (res?.analisis?.mercado ? {
    promedio_m2: res.analisis.mercado.precio_terreno_mercado_m2_promedio,
    evaluacion_precio: res.analisis.mercado.evaluacion_precio_terreno,
    porcentaje_diferencia: res.analisis.mercado.porcentaje_sobre_mercado,
  } : null);

  // Calculator derived values
  const m2Total   = res?.lineamientos?.m2_construibles || 750;
  const terrenoV  = res?.terreno?.precio || 8000000;
  const calc      = calcMetrics(terrenoV, m2Total, cPv, cCc, cInd, cMkg, cCont);
  const sensPoints = Array.from({length:20},(_,i)=>{
    const price = Math.round(cPv * (0.7 + i * 0.033));
    const rev   = calc.units * price * 65;
    const cost  = terrenoV + m2Total * cCc * (1 + (cInd+cMkg+cCont)/100);
    return { x: `$${(price/1000).toFixed(0)}k`, y: rev - cost };
  });

  const C = { /* design tokens */
    bg: "#F5F2EE", white: "#fff", dark: "#1a1510", blue: "#2563a8",
    border: "#EAE5DF", mid: "#7a6f64", light: "#a09888", veryLight: "#c0b8ae",
  };

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      html,body{background:${C.bg};color:${C.dark};font-family:'Inter',-apple-system,sans-serif;}
      input,select,button{font-family:inherit;}
      .serif{font-family:'Instrument Serif',Georgia,serif;}
      input::placeholder,textarea::placeholder{color:#b0a898;}
      .f{width:100%;background:${C.white};border:1.5px solid ${C.border};border-radius:10px;padding:11px 14px;font-size:14px;color:${C.dark};outline:none;transition:border .2s,box-shadow .2s;}
      .f:focus{border-color:${C.blue};box-shadow:0 0 0 3px rgba(37,99,168,.08);}
      .f:disabled{opacity:.5;}
      .lbl{font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:${C.light};margin-bottom:6px;display:block;}
      @keyframes spin{to{transform:rotate(360deg)}}
      .spnr{width:36px;height:36px;border:2.5px solid ${C.border};border-top-color:${C.blue};border-radius:50%;animation:spin .8s linear infinite;}
      @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      .up{animation:up .3s ease forwards;}
      .card{background:${C.white};border:1px solid ${C.border};border-radius:14px;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,.04);}
      .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
      .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
      .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
      .ga{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;}
      @media(max-width:700px){.g2,.g3,.g4{grid-template-columns:1fr 1fr!important;}}
      @media(max-width:480px){.g2,.g3,.g4,.ga{grid-template-columns:1fr!important;}}
      .kpi{background:${C.white};border:1px solid ${C.border};border-radius:12px;padding:16px 18px;}
      .kpi .k-lbl{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.light};margin-bottom:6px;}
      .kpi .k-val{font-size:17px;font-weight:700;color:${C.dark};letter-spacing:-.02em;line-height:1.2;}
      .kpi .k-sub{font-size:11px;color:${C.veryLight};margin-top:3px;}
      .sl{background:${C.white};border:1px solid ${C.border};border-radius:10px;padding:14px 16px;}
      .sl .sl-l{font-size:10px;color:${C.light};text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;}
      .sl .sl-v{font-size:17px;font-weight:700;color:${C.dark};margin-bottom:8px;}
      input[type=range]{-webkit-appearance:none;width:100%;height:4px;background:#E8E2DA;border-radius:2px;outline:none;cursor:pointer;}
      input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${C.dark};cursor:pointer;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.2);}
      .sl .sl-r{display:flex;justify-content:space-between;font-size:10px;color:#c0b8ae;margin-top:3px;}
      .giro{font-size:12px;color:#3a3228;padding:5px 0;border-bottom:1px solid #F0EBE5;line-height:1.4;}
      .giro:last-child{border-bottom:none;}
      .wfr{display:flex;align-items:center;padding:7px 0;border-bottom:1px solid #F0EBE5;gap:8px;font-size:13px;}
      .wfr:last-child{border-bottom:none;}
      .wfr.tot{font-weight:700;background:#F5F2EE;margin:0 -24px;padding:8px 24px;border-radius:0 0 14px 14px;}
      .wfb{height:5px;background:#E8E2DA;border-radius:3px;overflow:hidden;width:70px;flex-shrink:0;}
      .wfbi{height:100%;border-radius:3px;}
      .snsr{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F0EBE5;font-size:12px;}
      .snsr:last-child{border-bottom:none;}
      .snsr.act{background:#EFF6FF;margin:0 -24px;padding:6px 24px;}
    `}</style>

    {/* ── NAV ── */}
    <header style={{position:"sticky",top:0,zIndex:30,background:"rgba(245,242,238,.95)",backdropFilter:"blur(10px)",borderBottom:`1px solid ${C.border}`,padding:"0 32px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <svg width="26" height="26" viewBox="0 0 36 36" fill="none">
          <rect width="36" height="36" rx="9" fill="#DBEAFE"/>
          <path d="M18 8L28 26H8Z" fill="none" stroke={C.blue} strokeWidth="2.2" strokeLinejoin="round"/>
          <path d="M13 26Q18 16 23 26" fill="none" stroke={C.blue} strokeWidth="1.6" strokeLinecap="round"/>
          <line x1="18" y1="20" x2="18" y2="26" stroke={C.blue} strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <span style={{fontSize:16,fontWeight:600,letterSpacing:"-.03em"}}>un<span style={{color:C.blue}}>earth</span></span>
      </div>
      <span style={{fontSize:11,fontWeight:500,color:C.veryLight,letterSpacing:".07em"}}>MONTERREY MVP</span>
    </header>

    {/* ── LAYOUT WRAPPER — siempre 1200px max, padding fijo ── */}
    <div style={{maxWidth:1200,margin:"0 auto",padding:"32px 28px 100px",width:"100%"}}>

      {/* ════════════════ HERO (solo sin resultado) ════════════════ */}
      {!res&&!loading&&(
        <div style={{textAlign:"center",marginBottom:48}} className="up">
          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"#DBEAFE",borderRadius:100,padding:"5px 14px",marginBottom:24}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:C.blue}}/>
            <span style={{fontSize:10,fontWeight:700,color:"#1d4ed8",letterSpacing:".08em"}}>PDU MONTERREY 2013–2025 · IA</span>
          </div>
          <h1 className="serif" style={{fontSize:"clamp(40px,5.5vw,64px)",lineHeight:1,color:C.dark,marginBottom:16,fontWeight:400}}>
            Unearth your next<br/><em style={{color:C.blue}}>development.</em>
          </h1>
          <p style={{fontSize:16,color:C.mid,lineHeight:1.7,maxWidth:420,margin:"0 auto"}}>
            Dirección, metros y precio — la IA hace el análisis completo.
          </p>
        </div>
      )}

      {/* ════════════════ FORM ════════════════ */}
      <div className="card up" style={{marginBottom:28,borderRadius:18,padding:"28px 32px",boxShadow:"0 2px 16px rgba(0,0,0,.07)"}}>
        {/* form only, no hero inside */}
        {false&&null}

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

        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button onClick={run} disabled={loading} style={{flex:1,background:loading?"#d4cfc8":C.dark,border:"none",borderRadius:10,padding:"13px 0",color:loading?"#7a6f64":"#fff",fontSize:14,fontWeight:600,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            {loading ? <><div style={{width:15,height:15,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>{STEPS[step]}</> : "Analizar terreno →"}
          </button>
          {res&&<button onClick={()=>{setRes(null);setDir("");setM2("");setPx("");setProd("");}} style={{background:"transparent",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"13px 18px",color:C.mid,fontSize:13,cursor:"pointer",fontWeight:500,whiteSpace:"nowrap"}}>← Nuevo</button>}
        </div>

        {loading&&<div style={{display:"flex",justifyContent:"center",gap:8,marginTop:14}}>
          {STEPS.map((_,i)=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:i<=step?C.blue:C.border,transform:i===step?"scale(1.5)":"scale(1)",transition:"all .3s"}}/>)}
        </div>}
      </div>

      {/* ════════════════ RESULTS ════════════════ */}
      {res&&!loading&&(()=>{
        const tipo_res = res.tipo_analisis as Tipo;

        /* ── Header común ── */
        const Header = () => (
          <div style={{background:C.dark,borderRadius:16,padding:"22px 28px",marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:".1em",marginBottom:6}}>
                  {tipo_res==="lineamientos"?"LINEAMIENTOS":tipo_res==="mercado"?"ESTUDIO DE MERCADO":"ANÁLISIS COMPLETO"} · {res.ubicacion.distrito?.toUpperCase()}, {res.ubicacion.delegacion?.toUpperCase()}
                </div>
                <div className="serif" style={{fontSize:24,color:"#fff",lineHeight:1.1}}>{res.ubicacion.direccion}</div>
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
                {l:"PRECIO / M²",v:$(res.terreno.precio_m2)},
                {l:"M² CONSTRUIBLES",v:res.lineamientos?.m2_construibles?`${$(res.lineamientos.m2_construibles,"num")} m²`:"—"},
                {l:"ALTURA MÁX",v:res.lineamientos?.altura_max||"—"},
              ].map(k=>(
                <div key={k.l} style={{background:"rgba(255,255,255,.07)",borderRadius:10,padding:"10px 14px"}}>
                  <div style={{fontSize:9,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>{k.l}</div>
                  <div style={{fontSize:k.v.length>14?13:16,fontWeight:700,color:"#fff",letterSpacing:"-.01em"}}>{k.v}</div>
                </div>
              ))}
            </div>
          </div>
        );

        /* ════ LINEAMIENTOS ════ */
        if (tipo_res==="lineamientos") return (
          <div className="up">
            <Header/>
            <div className="ga" style={{marginBottom:16}}>
              {[
                {l:"COS",v:res.lineamientos?.cos,s:"Coef. Ocupación Suelo"},
                {l:"CUS",v:res.lineamientos?.cus,s:"Coef. Utilización Suelo"},
                {l:"CAV",v:res.lineamientos?.cav,s:"Coef. Área Verde"},
                {l:"Huella máxima",v:res.lineamientos?.huella_max_m2?`${$(res.lineamientos.huella_max_m2,"num")} m²`:"—",s:""},
                {l:"M² Construibles",v:res.lineamientos?.m2_construibles?`${$(res.lineamientos.m2_construibles,"num")} m²`:"—",s:""},
                {l:"Área verde mín",v:res.lineamientos?.area_verde_min_m2?`${$(res.lineamientos.area_verde_min_m2,"num")} m²`:"—",s:""},
                {l:"Densidad máx",v:res.lineamientos?.densidad_max_viv_ha&&res.lineamientos.densidad_max_viv_ha!=="N/D"?`${res.lineamientos.densidad_max_viv_ha} viv/Ha`:"—",s:""},
                {l:"Altura máxima",v:res.lineamientos?.altura_max||"—",s:""},
              ].map(k=>(
                <div key={k.l} className="kpi">
                  <div className="k-lbl">{k.l}</div>
                  {k.s&&<div style={{fontSize:10,color:C.veryLight,marginBottom:4}}>{k.s}</div>}
                  <div className="k-val" style={{fontSize:15}}>{k.v||"—"}</div>
                </div>
              ))}
            </div>
            {res.giros?.permitidos?.length>0&&(
              <div className="g2">
                <div className="card">
                  <div className="lbl" style={{marginBottom:10}}>Giros Permitidos — {res.giros.total_permitidos}</div>
                  <div style={{maxHeight:280,overflowY:"auto"}}>
                    {res.giros.permitidos.map((g:string,i:number)=>(
                      <div key={i} className="giro"><span style={{color:"#15803d",fontWeight:700,marginRight:8,fontSize:10}}>P</span>{g.split("—")[1]||g}</div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="lbl" style={{marginBottom:10}}>Giros Condicionados — {res.giros.total_condicionados}</div>
                  <div style={{maxHeight:280,overflowY:"auto"}}>
                    {res.giros.condicionados?.map((g:string,i:number)=>(
                      <div key={i} className="giro"><span style={{color:"#d97706",fontWeight:700,marginRight:8,fontSize:10}}>C</span>{g.split("—")[1]||g}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

        /* ════ MERCADO ════ */
        if (tipo_res==="mercado") return (
          <div className="up">
            <Header/>

            {/* Compat badge */}
            {res.analisis?.producto_compatible!=null&&(
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 18px",background:res.analisis.producto_compatible?"#F0FDF4":"#FEF2F2",border:`1px solid ${res.analisis.producto_compatible?"#BBF7D0":"#FECACA"}`,borderRadius:12,marginBottom:16}}>
                <div style={{width:9,height:9,borderRadius:"50%",background:res.analisis.producto_compatible?"#15803d":"#dc2626",flexShrink:0}}/>
                <span style={{fontSize:13,fontWeight:600,color:res.analisis.producto_compatible?"#15803d":"#dc2626"}}>
                  {res.analisis.producto_compatible?"Producto compatible con la zona":"Producto NO compatible con la zona"}
                </span>
                {(res.analisis.motivo_compatibilidad)&&<span style={{fontSize:12,color:C.mid,marginLeft:4}}>{res.analisis.motivo_compatibilidad}</span>}
              </div>
            )}

            {/* Precio terreno vs mercado */}
            {pt&&(
              <div className="g4" style={{marginBottom:16}}>
                {[
                  {l:"Mercado — promedio zona",v:`${$(pt.promedio_m2)}/m²`,s:"precio de terrenos"},
                  {l:"Precio pedido",v:`${$(res.terreno.precio_m2)}/m²`,s:"vs mercado"},
                  {l:"Evaluación",v:(pt.evaluacion_precio||"").toUpperCase(),s:""},
                  {l:"Diferencia vs mercado",v:`${pt.porcentaje_diferencia>0?"+":""}${pt.porcentaje_diferencia}%`,s:"",col:pt.porcentaje_diferencia>20?"#dc2626":pt.porcentaje_diferencia>5?"#d97706":"#15803d"},
                ].map(k=>(
                  <div key={k.l} className="kpi">
                    <div className="k-lbl">{k.l}</div>
                    <div className="k-val" style={{fontSize:16,color:(k as any).col||C.dark}}>{k.v}</div>
                    {k.s&&<div className="k-sub">{k.s}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Gráfica barras de precios + competencia */}
            {mp&&(
              <div className="g2" style={{marginBottom:16}}>
                <div className="card">
                  <div className="lbl" style={{marginBottom:12}}>Precios del producto — {mp.tipo}</div>
                  <div style={{height:200,position:"relative"}}>
                  <BarChart bars={[
                    {label:"Venta mín",value:mp.precio_venta_m2_min||mp.precio_venta_producto_m2||0,color:"#93c5fd"},
                    {label:"Venta prom",value:mp.precio_venta_m2_promedio||mp.precio_venta_producto_m2||0,color:"#2563a8"},
                    {label:"Venta máx",value:mp.precio_venta_m2_max||mp.precio_venta_producto_m2||0,color:"#1d4ed8"},
                    {label:"Renta/m²/mes",value:(mp.precio_renta_mensual_m2||mp.precio_renta_producto_m2_mes||0)*10,color:"#d97706"},
                  ]}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:12,fontSize:11,color:C.mid,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                    <span>Absorción: <strong>{mp.absorcion_estimada_meses||mp.absorcion_meses} meses</strong></span>
                    <span>Demanda: <strong style={{color:mp.demanda==="alta"?"#15803d":mp.demanda==="baja"?"#dc2626":"#d97706"}}>{(mp.demanda||"").toUpperCase()}</strong></span>
                    <span>Tendencia: <strong>{(mp.tendencia||"").toUpperCase()}</strong></span>
                  </div>
                </div>

                <div className="card">
                  <div className="lbl" style={{marginBottom:10}}>Proyectos en competencia</div>
                  {Array.isArray(mp.proyectos_competencia)
                    ? mp.proyectos_competencia.map((p:string,i:number)=>(
                        <div key={i} className="giro" style={{display:"flex",gap:8}}>
                          <span style={{color:C.blue,fontWeight:700,flexShrink:0}}>→</span>{p}
                        </div>
                      ))
                    : <p style={{fontSize:13,color:"#3a3228",lineHeight:1.65}}>{mp.competencia}</p>
                  }
                  {res.analisis?.potencial_proyecto&&(
                    <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
                      <div className="lbl" style={{marginBottom:8}}>Potencial del proyecto</div>
                      <div className="g2" style={{gap:10}}>
                        {[
                          {l:"Unidades est.",v:`${res.analisis.potencial_proyecto.unidades_estimadas}`},
                          {l:"M²/unidad",v:`${res.analisis.potencial_proyecto.m2_por_unidad} m²`},
                          {l:"Ingreso venta",v:$(res.analisis.potencial_proyecto.ingreso_venta_estimado)},
                          {l:"Ingreso renta/año",v:$(res.analisis.potencial_proyecto.ingreso_renta_estimado_anual)},
                        ].map(k=>(
                          <div key={k.l}><div style={{fontSize:10,color:C.light,marginBottom:2}}>{k.l}</div><div style={{fontSize:14,fontWeight:700}}>{k.v}</div></div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resumen IA */}
            {res.analisis?.recomendacion&&(
              <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:14,padding:"20px 24px",marginBottom:16}}>
                <div className="lbl" style={{color:"#1d4ed8",marginBottom:8}}>Análisis IA</div>
                <p style={{fontSize:14,lineHeight:1.75,color:"#1e3a5f"}}>{res.analisis.recomendacion}</p>
              </div>
            )}
          </div>
        );

        /* ════ COMPLETO — 2 tabs ════ */
        // Recalculate financials from raw numbers to ensure consistency
        const fin = res.analisis?.financiero;
        let finFixed = fin;
        if (fin) {
          const ingresos = fin.ingreso_total_estimado || 0;
          const costoTotal = fin.costo_total_proyecto || fin.costo_total || 0;
          const utilidad = ingresos - costoTotal;
          const margen = ingresos > 0 ? (utilidad / ingresos * 100) : 0;
          const roi = costoTotal > 0 ? (utilidad / costoTotal * 100) : 0;
          // TIR aprox anualizada: (1 + roi/100)^(12/plazo) - 1
          const plazo = fin.plazo_meses || 24;
          const tir = ((Math.pow(1 + roi/100, 12/plazo) - 1) * 100);
          finFixed = { ...fin, utilidad_bruta: utilidad, margen_bruto_pct: Math.round(margen*10)/10, roi_pct: Math.round(roi*10)/10, tir_estimada_pct: Math.round(tir*10)/10 };
        }

        return (
          <div className="up">
            <Header/>

            {/* Tab switcher — solo 2 tabs */}
            <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:`1px solid ${C.border}`,paddingBottom:12}}>
              {[{id:"reporte",label:"Reporte completo"},{id:"calculadora",label:"Calculadora"}].map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id as any)}
                  style={{padding:"7px 18px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",border:"none",
                    background:tab===t.id?C.dark:"transparent",color:tab===t.id?"#fff":C.mid,transition:"all .15s"}}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── REPORTE ── */}
            {tab==="reporte"&&(
              <div style={{display:"flex",flexDirection:"column",gap:16}}>

                {/* Resumen ejecutivo */}
                {res.analisis?.resumen_ejecutivo&&(
                  <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:14,padding:"20px 24px"}}>
                    <div className="lbl" style={{color:"#1d4ed8",marginBottom:8}}>Resumen Ejecutivo</div>
                    <p style={{fontSize:14,lineHeight:1.75,color:"#1e3a5f"}}>{res.analisis.resumen_ejecutivo}</p>
                  </div>
                )}

                {/* Lineamientos */}
                <div className="card">
                  <div className="lbl" style={{marginBottom:14}}>Lineamientos Urbanísticos — PDU Monterrey 2013-2025</div>
                  <div className="ga">
                    {[
                      {l:"COS",v:res.lineamientos?.cos},{l:"CUS",v:res.lineamientos?.cus},{l:"CAV",v:res.lineamientos?.cav},
                      {l:"Huella máx",v:res.lineamientos?.huella_max_m2?`${$(res.lineamientos.huella_max_m2,"num")} m²`:"—"},
                      {l:"M² construibles",v:res.lineamientos?.m2_construibles?`${$(res.lineamientos.m2_construibles,"num")} m²`:"—"},
                      {l:"Densidad máx",v:res.lineamientos?.densidad_max_viv_ha&&res.lineamientos.densidad_max_viv_ha!=="N/D"?`${res.lineamientos.densidad_max_viv_ha} viv/Ha`:"—"},
                      {l:"Altura máx",v:res.lineamientos?.altura_max||"—"},
                      {l:"Área verde mín",v:res.lineamientos?.area_verde_min_m2?`${$(res.lineamientos.area_verde_min_m2,"num")} m²`:"—"},
                    ].map(k=>(
                      <div key={k.l}><div style={{fontSize:10,fontWeight:700,color:C.light,letterSpacing:".08em",textTransform:"uppercase",marginBottom:4}}>{k.l}</div><div style={{fontSize:15,fontWeight:700,color:C.dark}}>{k.v||"—"}</div></div>
                    ))}
                  </div>
                </div>

                {/* Entorno */}
                {res.analisis?.entorno_y_urbanismo&&(
                  <div className="card">
                    <div className="lbl" style={{marginBottom:10}}>Entorno y Urbanismo</div>
                    <p style={{fontSize:14,lineHeight:1.7,color:"#3a3228",marginBottom:8}}>{res.analisis.entorno_y_urbanismo.descripcion_zona}</p>
                    {res.analisis.entorno_y_urbanismo.conectividad&&<p style={{fontSize:13,color:C.mid,lineHeight:1.6,marginBottom:8}}>{res.analisis.entorno_y_urbanismo.conectividad}</p>}
                    {res.analisis.entorno_y_urbanismo.servicios_cercanos?.length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                        {res.analisis.entorno_y_urbanismo.servicios_cercanos.map((s:string,i:number)=>(
                          <span key={i} style={{background:"#EEE9E3",borderRadius:100,padding:"3px 10px",fontSize:11,fontWeight:500,color:"#5a4f44"}}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Mercado */}
                {mp&&(
                  <div className="g2">
                    <div className="card">
                      <div className="lbl" style={{marginBottom:12}}>Mercado — {mp.tipo||prod}</div>
                      {[
                        {l:"Precio venta m²",v:`${$(mp.precio_venta_m2_min||mp.precio_venta_producto_m2)}–${$(mp.precio_venta_m2_max||mp.precio_venta_producto_m2)}`},
                        {l:"Precio promedio",v:$(mp.precio_venta_m2_promedio||mp.precio_venta_producto_m2)},
                        {l:"Renta /m²/mes",v:$(mp.precio_renta_mensual_m2||mp.precio_renta_producto_m2_mes)},
                        {l:"Absorción",v:`${mp.absorcion_estimada_meses||mp.absorcion_meses} meses`},
                        {l:"Demanda",v:(mp.demanda||"").toUpperCase()},
                        {l:"Tendencia",v:(mp.tendencia||"").toUpperCase()},
                      ].map(k=>(
                        <div key={k.l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                          <span style={{color:C.mid}}>{k.l}</span><span style={{fontWeight:600,color:C.dark}}>{k.v||"—"}</span>
                        </div>
                      ))}
                    </div>
                    {pt&&(
                      <div className="card">
                        <div className="lbl" style={{marginBottom:12}}>Precio Terreno vs Mercado</div>
                        {[
                          {l:"Mercado promedio",v:`${$(pt.promedio_m2)}/m²`},
                          {l:"Precio pedido",v:`${$(res.terreno.precio_m2)}/m²`},
                          {l:"Evaluación",v:(pt.evaluacion_precio||"").toUpperCase()},
                          {l:"Diferencia",v:`${pt.porcentaje_diferencia>0?"+":""}${pt.porcentaje_diferencia}%`,col:pt.porcentaje_diferencia>20?"#dc2626":pt.porcentaje_diferencia>5?"#d97706":"#15803d"},
                        ].map(k=>(
                          <div key={k.l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                            <span style={{color:C.mid}}>{k.l}</span><span style={{fontWeight:600,color:(k as any).col||C.dark}}>{k.v||"—"}</span>
                          </div>
                        ))}
                        {Array.isArray(mp.proyectos_competencia)&&(
                          <div style={{marginTop:12}}>
                            <div className="lbl" style={{marginBottom:6}}>Competencia</div>
                            {mp.proyectos_competencia.map((p:string,i:number)=>(
                              <div key={i} style={{fontSize:12,color:"#3a3228",padding:"4px 0",borderBottom:`1px solid ${C.border}`}}><span style={{color:C.blue,fontWeight:700,marginRight:6}}>→</span>{p}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Financiero — usando finFixed para consistencia */}
                {finFixed&&(
                  <div className="card">
                    <div className="lbl" style={{marginBottom:14}}>Análisis Financiero</div>
                    <div className="g4">
                      {[
                        {l:"Precio terreno",v:$(finFixed.precio_terreno)},
                        {l:"Costo construcción",v:$(finFixed.costo_construccion_total)},
                        {l:"Costo total proyecto",v:$(finFixed.costo_total_proyecto)},
                        {l:"Ingreso estimado",v:$(finFixed.ingreso_total_estimado)},
                        {l:"Utilidad bruta",v:$(finFixed.utilidad_bruta),col:finFixed.utilidad_bruta>=0?"#15803d":"#dc2626"},
                        {l:"Margen bruto",v:pct(finFixed.margen_bruto_pct),col:finFixed.margen_bruto_pct>=15?"#15803d":finFixed.margen_bruto_pct>=8?"#d97706":"#dc2626"},
                        {l:"ROI",v:pct(finFixed.roi_pct),col:finFixed.roi_pct>=20?"#15803d":finFixed.roi_pct>=10?"#d97706":"#dc2626"},
                        {l:"TIR estimada",v:pct(finFixed.tir_estimada_pct),col:finFixed.tir_estimada_pct>=18?"#15803d":finFixed.tir_estimada_pct>=10?"#d97706":"#dc2626"},
                        {l:"Plazo",v:`${finFixed.plazo_meses} meses`},
                      ].map(k=>(
                        <div key={k.l} className="kpi">
                          <div className="k-lbl">{k.l}</div>
                          <div className="k-val" style={{color:(k as any).col||C.dark}}>{k.v||"—"}</div>
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
                  <div style={{background:C.white,border:`2px solid ${semCol}`,borderRadius:16,padding:"26px 30px",boxShadow:`0 0 0 4px ${semCol}10`}}>
                    <div className="lbl" style={{marginBottom:8}}>Veredicto</div>
                    <div className="serif" style={{fontSize:38,color:semCol,lineHeight:1,marginBottom:14}}>{res.analisis.veredicto}</div>
                    <p style={{fontSize:14,color:"#3a3228",lineHeight:1.7,marginBottom:res.analisis.proximos_pasos?.length>0?14:0}}>{res.analisis.justificacion_veredicto}</p>
                    {res.analisis.proximos_pasos?.length>0&&(
                      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:4}}>
                        <div className="lbl" style={{marginBottom:10}}>Próximos pasos</div>
                        {res.analisis.proximos_pasos.map((p:string,i:number)=>(
                          <div key={i} style={{display:"flex",gap:12,marginTop:10,fontSize:13,color:"#3a3228",lineHeight:1.5,alignItems:"flex-start"}}>
                            <div style={{width:22,height:22,borderRadius:"50%",background:"#EFF6FF",border:"1.5px solid #BFDBFE",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:700,color:C.blue}}>{i+1}</div>
                            {p}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── CALCULADORA ── */}
            {tab==="calculadora"&&(
              <div>
                {/* KPI bar */}
                <div style={{background:C.dark,borderRadius:14,padding:"18px 24px",marginBottom:16}}>
                  <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:".08em",marginBottom:12}}>CALCULADORA — AJUSTA LOS PARÁMETROS</div>
                  <div className="g4">
                    {[
                      {l:"UTILIDAD BRUTA",v:$(calc.util),col:calc.util>=0?"#4ED9A0":"#ff6b6b"},
                      {l:"MARGEN BRUTO",v:pct(calc.margen*100),col:calc.margen>=0.15?"#4ED9A0":calc.margen>=0.08?"#F4C55B":"#ff6b6b"},
                      {l:"ROI",v:pct(calc.roi*100),col:calc.roi>=0.20?"#4ED9A0":calc.roi>=0.10?"#F4C55B":"#ff6b6b"},
                      {l:"UNIDADES EST.",v:`${calc.units} unidades`,col:"#fff"},
                    ].map(k=>(
                      <div key={k.l} style={{background:"rgba(255,255,255,.07)",borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                        <div style={{fontSize:9,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>{k.l}</div>
                        <div style={{fontSize:17,fontWeight:700,color:k.col}}>{k.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sliders */}
                <div className="g3" style={{marginBottom:16}}>
                  {[
                    {l:"Precio venta/m²",v:cPv,min:30000,max:120000,step:1000,set:setCPv,fmt:(v:number)=>`$${(v/1000).toFixed(0)}k`},
                    {l:"Costo construcción/m²",v:cCc,min:10000,max:30000,step:500,set:setCCc,fmt:(v:number)=>`$${(v/1000).toFixed(1)}k`},
                    {l:"Absorción (dep/mes)",v:cAbs,min:0.5,max:5,step:0.5,set:setCAbs,fmt:(v:number)=>`${v} dep/mes`},
                    {l:"Indirectos %",v:cInd,min:5,max:35,step:1,set:setCInd,fmt:(v:number)=>`${v}%`},
                    {l:"Comercialización %",v:cMkg,min:1,max:8,step:0.5,set:setCMkg,fmt:(v:number)=>`${v}%`},
                    {l:"Contingencias %",v:cCont,min:2,max:15,step:1,set:setCCont,fmt:(v:number)=>`${v}%`},
                  ].map(sl=>(
                    <div key={sl.l} className="sl">
                      <div className="sl-l">{sl.l}</div>
                      <div className="sl-v">{sl.fmt(sl.v)}</div>
                      <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.v} onChange={e=>sl.set(parseFloat(e.target.value))}/>
                      <div className="sl-r"><span>{sl.fmt(sl.min)}</span><span>{sl.fmt(sl.max)}</span></div>
                    </div>
                  ))}
                </div>

                {/* Desglose + sensibilidad */}
                <div className="g2" style={{marginBottom:16}}>
                  <div className="card">
                    <div className="lbl" style={{marginBottom:12}}>Desglose de costos vs ingresos</div>
                    {[
                      {l:"Terreno",v:terrenoV,col:"#2563a8"},
                      {l:"Construcción",v:calc.cConst,col:"#4a90d9"},
                      {l:"Indirectos",v:calc.cInd,col:"#6faed4"},
                      {l:"Comercialización",v:calc.cMkg,col:"#8cbfdc"},
                      {l:"Contingencias",v:calc.cCont,col:"#a8cfe4"},
                    ].map(r=>(
                      <div key={r.l} className="wfr">
                        <div style={{flex:1,fontSize:12}}>{r.l}</div>
                        <div className="wfb"><div className="wfbi" style={{width:`${(r.v/calc.total)*100}%`,background:r.col}}/></div>
                        <div style={{fontWeight:600,minWidth:88,textAlign:"right",fontSize:12}}>{$(r.v)}</div>
                      </div>
                    ))}
                    <div className="wfr tot"><div style={{flex:1}}>TOTAL INVERSIÓN</div><div style={{fontWeight:700,fontSize:14}}>{$(calc.total)}</div></div>
                    <div className="wfr" style={{borderBottom:"none",marginTop:8}}><div style={{flex:1}}>INGRESOS EST.</div><div style={{fontWeight:700,fontSize:14,color:"#15803d"}}>{$(calc.rev)}</div></div>
                    <div className="wfr" style={{borderBottom:"none"}}><div style={{flex:1,fontWeight:700}}>UTILIDAD BRUTA</div><div style={{fontWeight:700,fontSize:16,color:calc.util>=0?"#15803d":"#dc2626"}}>{$(calc.util)}</div></div>
                  </div>

                  <div className="card">
                    <div className="lbl" style={{marginBottom:12}}>Sensibilidad — precio de venta</div>
                    {[0.8,0.9,0.95,1,1.05,1.1,1.2,1.3].map(mult=>{
                      const p  = Math.round(cPv*mult);
                      const rev = calc.units*p*65;
                      const u  = rev - calc.total;
                      const mg = rev>0?u/rev:0;
                      const isA = mult===1;
                      const col = mg>=0.15?"#15803d":mg>=0.08?"#d97706":"#dc2626";
                      const maxR = calc.units*cPv*1.3*65 - calc.total;
                      return (
                        <div key={mult} className={`snsr${isA?" act":""}`}>
                          <div style={{width:82,fontWeight:600,fontSize:12,color:C.dark,flexShrink:0}}>${(p/1000).toFixed(0)}k/m²{isA?" ★":""}</div>
                          <div style={{flex:1,height:5,background:"#E8E2DA",borderRadius:3,overflow:"hidden",minWidth:20}}>
                            <div style={{height:"100%",width:`${Math.max(0,(u/Math.max(maxR,1))*100)}%`,background:col,borderRadius:3}}/>
                          </div>
                          <div style={{width:82,textAlign:"right",fontWeight:600,fontSize:12,color:col,flexShrink:0}}>{$(u)}</div>
                          <div style={{width:32,textAlign:"right",fontSize:11,color:"#9a8f84",flexShrink:0}}>{(mg*100).toFixed(0)}%</div>
                          <div style={{width:14,textAlign:"center",fontSize:11,flexShrink:0}}>{mg>=0.15?"✓":mg>=0.08?"△":"✗"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Curva sensibilidad */}
                <div className="card">
                  <div className="lbl" style={{marginBottom:10}}>Curva de sensibilidad — precio de venta vs utilidad</div>
                  <div style={{height:180,position:"relative"}}>
                  <LineChart points={sensPoints} baseIdx={10}/>
                  </div>
                  <div style={{display:"flex",gap:16,marginTop:10,fontSize:11,color:C.mid}}>
                    <span style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:12,height:2,background:"#2563a8"}}/> Utilidad bruta</span>
                    <span style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:12,height:2,background:"#dc2626",borderTop:"1px dashed #dc2626"}}/> Break-even</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>

    <footer style={{borderTop:`1px solid ${C.border}`,padding:"18px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",background:C.bg}}>
      <span style={{fontSize:14,fontWeight:600,letterSpacing:"-.03em"}}>un<span style={{color:C.blue}}>earth</span></span>
      <span style={{fontSize:11,color:C.veryLight,letterSpacing:".04em"}}>Monterrey, NL · {new Date().getFullYear()}</span>
    </footer>
  </>);
}