"use client";

import { useState } from "react";

const SUPABASE_URL = "https://lojqmvpzdhayekzgwazw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvanFtdnB6ZGhheWVremd3YXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzQ1MzUsImV4cCI6MjA4OTcxMDUzNX0.CZpREN5V1i1D8TSNrdmGR0of4F_DuS6EqU9AE9a_eog";

type TipoAnalisis = "lineamientos" | "mercado" | "completo";

interface Resultado {
  ok: boolean;
  tipo_analisis: string;
  ubicacion: {
    direccion: string;
    lat: number;
    lng: number;
    zona: string;
    densidad: string;
    delegacion: string;
    distrito: string;
  };
  terreno: {
    metros2: number;
    precio: number;
    precio_m2: number;
  };
  analisis: any;
}

export default function Home() {
  const [direccion, setDireccion] = useState("");
  const [metros2, setMetros2] = useState("");
  const [precio, setPrecio] = useState("");
  const [tipoAnalisis, setTipoAnalisis] = useState<TipoAnalisis>("lineamientos");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState("");
  const [paso, setPaso] = useState("");

  const PASOS = [
    "Geocodificando dirección...",
    "Identificando zona de uso de suelo...",
    "Consultando lineamientos urbanísticos...",
    "Analizando mercado inmobiliario...",
    "Generando reporte con IA...",
  ];

  async function analizar() {
    if (!direccion || !metros2 || !precio) {
      setError("Por favor llena todos los campos");
      return;
    }
    setError("");
    setResultado(null);
    setLoading(true);

    // Simulate progress steps
    for (let i = 0; i < PASOS.length; i++) {
      setPaso(PASOS[i]);
      await new Promise((r) => setTimeout(r, 600));
    }

    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/analizar_terreno`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            direccion,
            metros2: parseFloat(metros2),
            precio: parseFloat(precio.replace(/,/g, "")),
            tipo_analisis: tipoAnalisis,
          }),
        }
      );
      const data = await res.json();
      if (data.ok) {
        setResultado(data);
      } else {
        setError(data.error || "Error al analizar el terreno");
      }
    } catch (e) {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
      setPaso("");
    }
  }

  const semaforo = resultado?.analisis?.semaforo || resultado?.analisis?.semaforo;
  const semaforoColor =
    semaforo === "VERDE"
      ? "#22c55e"
      : semaforo === "AMARILLO"
      ? "#f59e0b"
      : semaforo === "ROJO"
      ? "#ef4444"
      : "#6b7280";

  const formatMXN = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        color: "#e8e6e0",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid #1e1e2e",
          padding: "20px 40px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "#0d0d18",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          ◈
        </div>
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              color: "#fff",
            }}
          >
            Developer's Agent
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: "0.5px" }}>
            ANÁLISIS DE FACTIBILIDAD • MONTERREY
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "#4b5563",
            letterSpacing: "0.5px",
          }}
        >
          MVP v0.1
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
        {/* Hero */}
        {!resultado && !loading && (
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div
              style={{
                display: "inline-block",
                fontSize: 11,
                letterSpacing: "2px",
                color: "#6366f1",
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 20,
                padding: "4px 14px",
                marginBottom: 20,
              }}
            >
              POWERED BY IA + PDU MONTERREY 2013–2025
            </div>
            <h1
              style={{
                fontSize: "clamp(32px, 5vw, 52px)",
                fontWeight: 800,
                letterSpacing: "-2px",
                lineHeight: 1.1,
                margin: "0 0 16px",
                color: "#fff",
              }}
            >
              Análisis de terreno
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg, #6366f1, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                en segundos
              </span>
            </h1>
            <p
              style={{
                fontSize: 17,
                color: "#9ca3af",
                maxWidth: 480,
                margin: "0 auto",
                lineHeight: 1.6,
              }}
            >
              Ingresa una dirección en Monterrey y obtén zonificación,
              lineamientos, mercado y análisis financiero al instante.
            </p>
          </div>
        )}

        {/* Formulario */}
        <div
          style={{
            background: "#111120",
            border: "1px solid #1e1e2e",
            borderRadius: 16,
            padding: "32px",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            {/* Dirección */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 11, color: "#6b7280", letterSpacing: "1px", display: "block", marginBottom: 8 }}>
                DIRECCIÓN
              </label>
              <input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Mitla 418, Mitras Norte, Monterrey"
                style={{
                  width: "100%",
                  background: "#0a0a0f",
                  border: "1px solid #2a2a3e",
                  borderRadius: 8,
                  padding: "12px 16px",
                  color: "#e8e6e0",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "#2a2a3e")}
              />
            </div>

            {/* Metros */}
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", letterSpacing: "1px", display: "block", marginBottom: 8 }}>
                SUPERFICIE (M²)
              </label>
              <input
                value={metros2}
                onChange={(e) => setMetros2(e.target.value)}
                placeholder="300"
                type="number"
                style={{
                  width: "100%",
                  background: "#0a0a0f",
                  border: "1px solid #2a2a3e",
                  borderRadius: 8,
                  padding: "12px 16px",
                  color: "#e8e6e0",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "#2a2a3e")}
              />
            </div>

            {/* Precio */}
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", letterSpacing: "1px", display: "block", marginBottom: 8 }}>
                PRECIO PEDIDO (MXN)
              </label>
              <input
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="8,000,000"
                style={{
                  width: "100%",
                  background: "#0a0a0f",
                  border: "1px solid #2a2a3e",
                  borderRadius: 8,
                  padding: "12px 16px",
                  color: "#e8e6e0",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "#2a2a3e")}
              />
            </div>

            {/* Tipo análisis */}
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", letterSpacing: "1px", display: "block", marginBottom: 8 }}>
                TIPO DE ANÁLISIS
              </label>
              <select
                value={tipoAnalisis}
                onChange={(e) => setTipoAnalisis(e.target.value as TipoAnalisis)}
                style={{
                  width: "100%",
                  background: "#0a0a0f",
                  border: "1px solid #2a2a3e",
                  borderRadius: 8,
                  padding: "12px 16px",
                  color: "#e8e6e0",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                }}
              >
                <option value="lineamientos">📋 Lineamientos urbanísticos</option>
                <option value="mercado">📊 + Estudio de mercado</option>
                <option value="completo">🏗️ Análisis completo</option>
              </select>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8,
                padding: "10px 16px",
                color: "#f87171",
                fontSize: 14,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={analizar}
            disabled={loading}
            style={{
              width: "100%",
              background: loading
                ? "#2a2a3e"
                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              borderRadius: 10,
              padding: "14px",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "-0.3px",
              transition: "opacity 0.2s",
            }}
          >
            {loading ? paso : "Analizar terreno →"}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#6b7280",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                border: "3px solid #1e1e2e",
                borderTop: "3px solid #6366f1",
                borderRadius: "50%",
                margin: "0 auto 16px",
                animation: "spin 1s linear infinite",
              }}
            />
            <div style={{ fontSize: 14 }}>{paso}</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Resultado */}
        {resultado && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Header resultado */}
            <div
              style={{
                background: "#111120",
                border: "1px solid #1e1e2e",
                borderRadius: 16,
                padding: "24px 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: "1px", marginBottom: 6 }}>
                  RESULTADO
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>
                  {resultado.ubicacion.distrito} — {resultado.ubicacion.delegacion}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                  {resultado.ubicacion.direccion}
                </div>
              </div>
              {semaforo && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: `${semaforoColor}18`,
                    border: `1px solid ${semaforoColor}40`,
                    borderRadius: 12,
                    padding: "10px 20px",
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: semaforoColor,
                      boxShadow: `0 0 10px ${semaforoColor}`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: semaforoColor,
                      letterSpacing: "1px",
                    }}
                  >
                    {semaforo}
                  </span>
                </div>
              )}
            </div>

            {/* Métricas zona */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
              }}
            >
              {[
                { label: "ZONA", value: `${resultado.ubicacion.zona} ${resultado.ubicacion.densidad}` },
                { label: "PRECIO/M²", value: formatMXN(resultado.terreno.precio_m2) },
                {
                  label: "M² CONSTRUIBLES",
                  value: resultado.analisis?.lineamientos?.metros_construibles || "—",
                },
                {
                  label: "ALTURA MÁX",
                  value: resultado.analisis?.lineamientos?.altura_maxima || "—",
                },
              ].map((m) => (
                <div
                  key={m.label}
                  style={{
                    background: "#111120",
                    border: "1px solid #1e1e2e",
                    borderRadius: 12,
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: "1px", marginBottom: 6 }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e6e0" }}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Lineamientos */}
            {resultado.analisis?.lineamientos && (
              <div
                style={{
                  background: "#111120",
                  border: "1px solid #1e1e2e",
                  borderRadius: 16,
                  padding: "24px 28px",
                }}
              >
                <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: "1px", marginBottom: 20 }}>
                  LINEAMIENTOS URBANÍSTICOS
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16,
                  }}
                >
                  {Object.entries(resultado.analisis.lineamientos).map(([key, val]) => (
                    <div key={key}>
                      <div style={{ fontSize: 10, color: "#4b5563", letterSpacing: "1px", marginBottom: 4 }}>
                        {key.toUpperCase().replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: 14, color: "#d1d5db" }}>{String(val)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumen IA */}
            {(resultado.analisis?.resumen || resultado.analisis?.resumen_ejecutivo) && (
              <div
                style={{
                  background: "rgba(99,102,241,0.06)",
                  border: "1px solid rgba(99,102,241,0.15)",
                  borderRadius: 16,
                  padding: "24px 28px",
                }}
              >
                <div style={{ fontSize: 11, color: "#6366f1", letterSpacing: "1px", marginBottom: 12 }}>
                  ANÁLISIS IA
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: "#d1d5db", margin: 0 }}>
                  {resultado.analisis.resumen || resultado.analisis.resumen_ejecutivo}
                </p>
              </div>
            )}

            {/* Usos permitidos */}
            {resultado.analisis?.usos_principales_permitidos && (
              <div
                style={{
                  background: "#111120",
                  border: "1px solid #1e1e2e",
                  borderRadius: 16,
                  padding: "24px 28px",
                }}
              >
                <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: "1px", marginBottom: 16 }}>
                  USOS PERMITIDOS
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {resultado.analisis.usos_principales_permitidos.map((uso: string) => (
                    <span
                      key={uso}
                      style={{
                        background: "#1a1a2e",
                        border: "1px solid #2a2a3e",
                        borderRadius: 20,
                        padding: "4px 12px",
                        fontSize: 12,
                        color: "#9ca3af",
                      }}
                    >
                      {uso}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Producto óptimo (mercado/completo) */}
            {resultado.analisis?.producto_optimo && (
              <div
                style={{
                  background: "#111120",
                  border: "1px solid #1e1e2e",
                  borderRadius: 16,
                  padding: "24px 28px",
                }}
              >
                <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: "1px", marginBottom: 16 }}>
                  PRODUCTO ÓPTIMO
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                  {resultado.analisis.producto_optimo.tipo}
                </div>
                <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, margin: 0 }}>
                  {resultado.analisis.producto_optimo.justificacion}
                </p>
              </div>
            )}

            {/* Financiero (completo) */}
            {resultado.analisis?.financiero && (
              <div
                style={{
                  background: "#111120",
                  border: "1px solid #1e1e2e",
                  borderRadius: 16,
                  padding: "24px 28px",
                }}
              >
                <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: "1px", marginBottom: 20 }}>
                  ANÁLISIS FINANCIERO
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 16,
                  }}
                >
                  {[
                    { label: "PRECIO TERRENO", value: formatMXN(resultado.analisis.financiero.precio_terreno) },
                    { label: "COSTO CONSTRUCCIÓN", value: formatMXN(resultado.analisis.financiero.costo_construccion_estimado) },
                    { label: "INGRESO ESTIMADO", value: formatMXN(resultado.analisis.financiero.ingreso_total_estimado) },
                    { label: "MARGEN BRUTO", value: `${resultado.analisis.financiero.margen_bruto_pct}%` },
                    { label: "ROI ESTIMADO", value: `${resultado.analisis.financiero.roi_estimado_pct}%` },
                    { label: "TIR ESTIMADA", value: `${resultado.analisis.financiero.tir_estimada_pct}%` },
                  ].map((m) => (
                    <div key={m.label}>
                      <div style={{ fontSize: 10, color: "#4b5563", letterSpacing: "1px", marginBottom: 4 }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e6e0" }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Red flags + Veredicto */}
            {resultado.analisis?.veredicto && (
              <div
                style={{
                  background: "#111120",
                  border: `1px solid ${semaforoColor}30`,
                  borderRadius: 16,
                  padding: "24px 28px",
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: semaforoColor,
                    letterSpacing: "-0.5px",
                    marginBottom: 10,
                  }}
                >
                  {resultado.analisis.veredicto}
                </div>
                <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, margin: 0 }}>
                  {resultado.analisis.justificacion_veredicto}
                </p>
              </div>
            )}

            {/* Botón nuevo análisis */}
            <button
              onClick={() => { setResultado(null); setDireccion(""); setMetros2(""); setPrecio(""); }}
              style={{
                background: "transparent",
                border: "1px solid #2a2a3e",
                borderRadius: 10,
                padding: "12px",
                color: "#6b7280",
                fontSize: 14,
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              ← Nuevo análisis
            </button>
          </div>
        )}
      </div>
    </main>
  );
}