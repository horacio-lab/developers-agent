import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const GOOGLE_MAPS_KEY   = Deno.env.get("GOOGLE_MAPS_KEY")!;
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY      = Deno.env.get("SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function claude(prompt: string, maxTokens = 3500): Promise<any> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await r.json();
  const text = d.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "{}";
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : { error: "No se pudo parsear la respuesta" };
}

const REGLAMENTO_CONSTRUCCION = `
REGLAMENTO DE CONSTRUCCIONES MUNICIPIO DE MONTERREY:
- Restricción frontal mínima: 3.00 m desde la alineación del predio
- Restricción lateral: 0 m en colindancia / 1.5 m si se deja separación
- Restricción posterior: 3.00 m mínimo en habitacional
- Frente mínimo habitacional multifamiliar: 10 m recomendado
- Pasillo entre edificios: mínimo 1.20 m
- Corredor peatonal multifamiliar: mínimo 1.50 m libre
- Altura libre mínima planta baja: 2.40 m / pisos superiores: 2.30 m
- Cajón estacionamiento: 2.40 m × 5.00 m + pasillo maniobras 6.00 m (~12 m² neto por cajón)
ESTACIONAMIENTO REQUERIDO:
- Depto ≤ 60 m²: 1 cajón/unidad | Depto 61-100 m²: 1.5 cajones/unidad | Depto > 100 m²: 2 cajones/unidad
- Oficinas: 1 cajón/30 m² útil | Local comercial: 1 cajón/30 m² | Restaurante: 1 cajón/10 m²
`;

const NOTA_GIROS = `
INTERPRETACIÓN PDU MONTERREY: "Multifamiliar (2 o más viviendas por lote)" = departamentos en edificio vertical.
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { direccion, metros2, precio, tipo_analisis, producto_deseado, frente_m, fondo_m } = await req.json();
    if (!direccion || !metros2 || !precio) {
      return new Response(JSON.stringify({ error: "Faltan datos" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── 1. GEOCODIFICAR ──────────────────────────────────────────
    const geoData = await (await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(direccion + ", Monterrey, Nuevo León, México")}&key=${GOOGLE_MAPS_KEY}`
    )).json();
    if (!geoData.results?.length)
      return new Response(JSON.stringify({ error: "No se pudo geocodificar la dirección." }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } });

    const lat = geoData.results[0].geometry.location.lat;
    const lng = geoData.results[0].geometry.location.lng;

    // ── 2. SPATIAL LOOKUP ────────────────────────────────────────
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: zonaData } = await sb.rpc("get_zona_by_point", { lat_input: lat, lng_input: lng });
    const zona = zonaData?.[0] || null;

    // ── 3. COEFICIENTES ──────────────────────────────────────────
    let coef: any = null;
    if (zona?.densidad) {
      const { data } = await sb.from("densidades").select("*").ilike("subtipo", `%${zona.densidad}%`).limit(1);
      coef = data?.[0] || null;
    }

    // ── 4. GIROS ─────────────────────────────────────────────────
    const usoCode = zona?.uso_suelo || "";
    const colMap: Record<string, string> = {
      "HU":"hu","HM":"hm","HML":"hml","HMM":"hmm","HMI":"hmi","HC":"hc",
      "CC":"cc","ZVC":"zvc","ZVP":"zvp","CS":"cs","ZT":"zt","SCU":"scu",
      "CI":"ci","CAI":"cai","CMI":"cmi","CBI":"cbi","CCU":"ccu","ANU":"anu"
    };
    const col = colMap[usoCode] || "";
    let girosPermitidos: string[] = [];
    let girosCondicionados: string[] = [];
    if (col) {
      const { data: giros } = await sb.from("usos_suelo").select(`codigo, categoria, uso, ${col}`);
      if (giros) {
        girosPermitidos    = giros.filter((g: any) => g[col] === "P").map((g: any) => `${g.codigo} — ${g.uso}`);
        girosCondicionados = giros.filter((g: any) => g[col] === "C").map((g: any) => `${g.codigo} — ${g.uso}`);
      }
    }

    // ── 5. MÉTRICAS BASE ─────────────────────────────────────────
    const precioM2   = Math.round(precio / metros2);
    const huellaMax  = coef?.cos  ? Math.round(metros2 * parseFloat(coef.cos))  : null;
    const m2Const    = coef?.cus && !isNaN(parseFloat(coef.cus)) ? Math.round(metros2 * parseFloat(coef.cus)) : null;
    const areaVerde  = coef?.cav  ? Math.round(metros2 * parseFloat(coef.cav))  : null;
    const densVivHa  = coef?.densidad_viv_ha ? parseFloat(coef.densidad_viv_ha) : 0;
    // CÁLCULO CORRECTO DE UNIDADES — PDU:
    const unidadesMax = densVivHa > 0 ? Math.floor(densVivHa * (metros2 / 10000)) : null;

    const ubicacionObj = { direccion, lat, lng, zona: zona?.uso_suelo, densidad: zona?.densidad, delegacion: zona?.delegacion, distrito: zona?.distrito };
    const terrenoObj   = { metros2, precio, precio_m2: precioM2 };
    const lineamientosObj = {
      cos: coef?.cos || "N/D", cus: coef?.cus || "N/D", cav: coef?.cav || "N/D",
      altura_max: coef?.altura_max || "N/D",
      densidad_max_viv_ha: coef?.densidad_viv_ha || "N/D",
      huella_max_m2: huellaMax, m2_construibles: m2Const,
      area_verde_min_m2: areaVerde,
      unidades_max_pdu: unidadesMax,
      nombre_zona: coef?.nombre || `${zona?.uso_suelo} ${zona?.densidad}`,
    };
    const girosObj = {
      permitidos: girosPermitidos, condicionados: girosCondicionados,
      total_permitidos: girosPermitidos.length, total_condicionados: girosCondicionados.length,
    };

    // ── VALIDACIÓN HU ─────────────────────────────────────────
    const zonaUso = zona?.uso_suelo || "";
    const esHU = zonaUso === "HU";
    const productosNoPermitidosHU = ["departamentos","departamento","multifamiliar","condominio","condominios","apartments","edificio"];
    const productoEsMultifamiliar = producto_deseado
      ? productosNoPermitidosHU.some(p => producto_deseado.toLowerCase().includes(p))
      : false;

    if (esHU && productoEsMultifamiliar && (tipo_analisis === "mercado" || tipo_analisis === "completo")) {
      return new Response(JSON.stringify({
        ok: false,
        error_uso_suelo: true,
        error: `La zona es HU (Habitacional Unifamiliar) y solo permite 1 vivienda por lote. No es compatible con "${producto_deseado}". Para desarrollos multifamiliares o departamentos se requiere zonificación HM, HML, HMM o HMI.`,
        ubicacion: ubicacionObj,
        terreno: terrenoObj,
        lineamientos: lineamientosObj,
        giros: girosObj,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const contexto = `
TERRENO:
- Dirección: ${direccion}, Monterrey, NL
- Superficie: ${metros2} m² | Precio: $${Number(precio).toLocaleString("es-MX")} MXN ($${precioM2.toLocaleString("es-MX")}/m²)
${frente_m ? `- Frente: ${frente_m} m | Fondo: ${fondo_m || Math.round(metros2/frente_m)} m` : '- Dimensiones: no proporcionadas (usar estimación conservadora con frente ~15m)'}

ZONIFICACIÓN (PDU Monterrey 2013-2025):
- Uso de suelo: ${zona?.uso_suelo} — ${coef?.nombre || ""}
- Densidad: ${zona?.densidad} | Delegación: ${zona?.delegacion} | Distrito: ${zona?.distrito}

LINEAMIENTOS:
- COS: ${coef?.cos} → Huella máx: ${huellaMax} m²
- CUS: ${coef?.cus} → M² construibles totales: ${m2Const}
- CAV: ${coef?.cav} → Área verde mín: ${areaVerde} m²
- Altura máxima: ${coef?.altura_max}
- Densidad: ${coef?.densidad_viv_ha} viv/Ha

⚠️ UNIDADES MÁXIMAS PERMITIDAS POR PDU (DATO FIJO — NO CAMBIAR):
unidades_max = densidad_viv_ha × (m²_terreno / 10,000)
= ${densVivHa} × (${metros2} / 10,000) = ${unidadesMax !== null ? unidadesMax : "N/A"} UNIDADES
Este número es el máximo absoluto permitido por reglamento para este terreno.

GIROS PERMITIDOS: ${girosPermitidos.slice(0, 20).join(" | ")}
GIROS CONDICIONADOS: ${girosCondicionados.slice(0, 10).join(" | ")}

${producto_deseado ? `PRODUCTO DESEADO: ${producto_deseado}` : ""}
${REGLAMENTO_CONSTRUCCION}
${NOTA_GIROS}
    `.trim();

    // ════ LINEAMIENTOS — sin IA ══════════════════════════════════
    if (tipo_analisis === "lineamientos") {
      return new Response(JSON.stringify({
        ok: true, tipo_analisis: "lineamientos",
        ubicacion: ubicacionObj, terreno: terrenoObj,
        lineamientos: lineamientosObj, giros: girosObj,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ════ MERCADO ════════════════════════════════════════════════
    if (tipo_analisis === "mercado") {
      if (!producto_deseado)
        return new Response(JSON.stringify({
          ok: false, necesita_producto: true,
          error: "Para el estudio de mercado necesito saber qué quieres construir.",
        }), { headers: { ...cors, "Content-Type": "application/json" } });

      const promptMercado = `Eres un analista inmobiliario senior especializado en Monterrey, NL.

${contexto}

INSTRUCCIONES:
1. Usa web_search para buscar precios REALES y ACTUALES (2024-2025) en ${zona?.distrito || "Monterrey"}:
   - Precio de venta por m² de terrenos en la zona
   - Precio de venta de "${producto_deseado}" (mínimo, promedio, máximo por m²)
   - Precio de renta mensual por m²
   - Tamaño promedio de unidades (m² típico de "${producto_deseado}" en la zona)
   - Al menos 3 proyectos activos de la competencia con precios reales

2. CÁLCULO DE INGRESOS TOTALES — USA EXACTAMENTE ESTA FÓRMULA:
   unidades = ${unidadesMax !== null ? unidadesMax : "calcular con densidad"} (DATO FIJO DEL PDU — NO CAMBIAR)
   m2_promedio_unidad = tamaño promedio de "${producto_deseado}" en la zona (del estudio de mercado)
   precio_venta_m2 = precio promedio por m² (del estudio de mercado)
   ingreso_total_venta = unidades × m2_promedio_unidad × precio_venta_m2
   ingreso_total_renta_anual = unidades × m2_promedio_unidad × precio_renta_m2 × 12

3. TIPOLOGÍAS — investiga los tipos de unidades que se ofertan en la zona:
   (ej: 1 recámara 45-55 m², 2 recámaras 70-90 m², 3 recámaras 100-130 m²)

4. Responde ÚNICAMENTE en JSON (sin texto antes ni después, sin markdown):
{
  "producto_compatible": true/false,
  "motivo_compatibilidad": "giro específico del PDU",
  "precio_terreno_mercado": {
    "min_m2": número, "max_m2": número, "promedio_m2": número,
    "evaluacion_precio": "caro/justo/barato",
    "porcentaje_diferencia": número
  },
  "mercado_producto": {
    "tipo": "${producto_deseado}",
    "precio_venta_m2_min": número,
    "precio_venta_m2_max": número,
    "precio_venta_m2_promedio": número,
    "precio_renta_mensual_m2": número,
    "m2_promedio_unidad": número,
    "absorcion_estimada_meses": número,
    "demanda": "alta/media/baja",
    "tendencia": "alza/estable/baja",
    "proyectos_competencia": [
      {"nombre":"proyecto","precio_desde":número,"precio_hasta":número,"m2_min":número,"m2_max":número,"unidades_total":número,"tipologia":"descripción"},
      {"nombre":"proyecto","precio_desde":número,"precio_hasta":número,"m2_min":número,"m2_max":número,"unidades_total":número,"tipologia":"descripción"},
      {"nombre":"proyecto","precio_desde":número,"precio_hasta":número,"m2_min":número,"m2_max":número,"unidades_total":número,"tipologia":"descripción"}
    ],
    "tipologias": [
      {"tipo":"1 recámara","m2_min":número,"m2_max":número,"precio_m2":número,"participacion_pct":número},
      {"tipo":"2 recámaras","m2_min":número,"m2_max":número,"precio_m2":número,"participacion_pct":número}
    ]
  },
  "potencial_proyecto": {
    "unidades_pdu": ${unidadesMax !== null ? unidadesMax : 0},
    "m2_promedio_unidad": número,
    "precio_venta_m2_promedio": número,
    "ingreso_total_venta": número,
    "ingreso_renta_anual": número,
    "calculo_detalle": "X unidades × Y m²/unidad × $Z/m² = $TOTAL"
  },
  "semaforo": "VERDE/AMARILLO/ROJO",
  "justificacion_semaforo": "basado en precio terreno vs mercado y demanda",
  "recomendacion": "párrafo específico con recomendación de acción"
}`;

      const analisis = await claude(promptMercado, 4000);
      return new Response(JSON.stringify({
        ok: true, tipo_analisis: "mercado",
        ubicacion: ubicacionObj, terreno: terrenoObj,
        lineamientos: lineamientosObj, giros: girosObj, analisis,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ════ COMPLETO ════════════════════════════════════════════════
    if (tipo_analisis === "completo") {
      if (!producto_deseado)
        return new Response(JSON.stringify({
          ok: false, necesita_producto: true,
          error: "Para el análisis completo necesito saber qué quieres desarrollar.",
        }), { headers: { ...cors, "Content-Type": "application/json" } });

      const promptCompleto = `Actúa como un Desarrollador Inmobiliario Senior y Director de Proyectos de Inversión con más de 20 años de experiencia en Monterrey, NL. Tienes expertise en 4 pilares:
1. ARQUITECTURA: interpretar aprovechamiento de espacios, asoleamiento, topografía, diseño conceptual.
2. INGENIERÍA CIVIL: costos paramétricos, viabilidad de suelos, cimentaciones, servicios e infraestructura.
3. URBANISMO: PDU, zonificación, CUS/COS, restricciones, densidad, movilidad, impacto vial.
4. MERCADO INMOBILIARIO: absorción, Cap Rate, ROI, TIR, Highest and Best Use.

Misión: análisis crítico, conservador y objetivo. Si no cierra, dilo directamente. Sigue esta estructura de 5 secciones en tu respuesta JSON.

${contexto}

INSTRUCCIONES:
1. Usa web_search para investigar CADA UNO de estos puntos en ${zona?.distrito || "Monterrey"}, ${zona?.delegacion || "NL"}:
   a) Precio de terrenos en la zona ($/m²)
   b) Precio venta de "${producto_deseado}" nuevos: mínimo, promedio, máximo por m²
   c) Precio renta mensual por m² de "${producto_deseado}"
   d) Tamaño promedio de unidades de "${producto_deseado}" en la zona
   e) ⚠️ COSTO DE CONSTRUCCIÓN: busca "costo construccion departamentos Monterrey 2024 m2" o "costo paramétrico construccion residencial Monterrey 2025" — necesitas un rango real en MXN/m², NO inventes este número
   f) Al menos 3 proyectos activos de competencia con precios, tamaños y tipologías

2. ⚠️ CÁLCULO DE INGRESOS — USA EXACTAMENTE ESTA METODOLOGÍA (NO INVENTAR):
   PASO 1: unidades = ${unidadesMax !== null ? unidadesMax : 0} (FIJO — PDU — NO CAMBIAR)
   PASO 2: m2_promedio_unidad = tamaño típico de "${producto_deseado}" en la zona (del mercado)
   PASO 3: precio_venta_m2 = precio promedio por m² (del mercado)
   PASO 4: ingreso_total = PASO 1 × PASO 2 × PASO 3
   PASO 5: costo_construccion_m2 = resultado de la búsqueda del punto (e) — rango típico Monterrey 2024-2025
           costo_construccion_total = ${m2Const || 0} m² × costo_construccion_m2
   PASO 6: NUNCA uses unidades diferentes a las del PASO 1

3. ESTACIONAMIENTO — calcula basado en resultado del PASO 1 y tipo de unidades:
   - Cajones = unidades × factor según tamaño (≤60m²: 1, 61-100m²: 1.5, >100m²: 2)
   - Área cajones = cajones × 12 m² (incluye pasillo)
   - Verificar si cabe en el terreno considerando huella máx de ${huellaMax} m²

4. Responde ÚNICAMENTE en JSON (sin texto antes ni después):
{
  "resumen_ejecutivo": "4-5 oraciones críticas sobre viabilidad total",
  "entorno_y_urbanismo": {
    "descripcion_zona": "texto", "conectividad": "texto",
    "tendencia_crecimiento": "texto", "servicios_cercanos": ["lista"]
  },
  "viabilidad_tecnica": {
    "producto_compatible": true/false,
    "giro_aplicable": "código y nombre",
    "frente_m": ${frente_m ? frente_m : "número (estimado conservador basado en superficie)"},
    "fondo_m": ${fondo_m ? fondo_m : frente_m ? Math.round(metros2/Number(frente_m)) : "número"},
    "restriccion_frontal_m": 3,
    "restriccion_lateral_m": número,
    "restriccion_posterior_m": 3,
    "area_neta_construible_m2": número,
    "niveles_posibles": "texto",
    "retos_constructivos": ["lista"]
  },
  "estacionamiento": {
    "cajones_requeridos": número,
    "calculo": "X unidades × Y cajones/unidad = Z cajones",
    "area_requerida_m2": número,
    "area_disponible_estimada_m2": número,
    "viable": true/false,
    "notas": "observaciones"
  },
  "mercado": {
    "precio_terreno_mercado_m2_promedio": número,
    "evaluacion_precio_terreno": "caro/justo/barato",
    "porcentaje_sobre_mercado": número,
    "precio_venta_m2_min": número,
    "precio_venta_m2_max": número,
    "precio_venta_m2_promedio": número,
    "precio_renta_m2_mes": número,
    "m2_promedio_unidad": número,
    "demanda": "alta/media/baja",
    "absorcion_meses": número,
    "tendencia": "alza/estable/baja",
    "proyectos_competencia": [
      {"nombre":"txt","precio_desde":n,"precio_hasta":n,"m2_min":n,"m2_max":n,"unidades_total":n,"tipologia":"txt"},
      {"nombre":"txt","precio_desde":n,"precio_hasta":n,"m2_min":n,"m2_max":n,"unidades_total":n,"tipologia":"txt"},
      {"nombre":"txt","precio_desde":n,"precio_hasta":n,"m2_min":n,"m2_max":n,"unidades_total":n,"tipologia":"txt"}
    ],
    "tipologias": [
      {"tipo":"1 recámara","m2_min":n,"m2_max":n,"precio_m2":n,"participacion_pct":n},
      {"tipo":"2 recámaras","m2_min":n,"m2_max":n,"precio_m2":n,"participacion_pct":n}
    ]
  },
  "financiero": {
    "precio_terreno": ${precio},
    "unidades_reales": ${unidadesMax !== null ? unidadesMax : 0},
    "m2_promedio_unidad": número,
    "precio_venta_m2_promedio": número,
    "calculo_ingresos": "X unidades × Y m²/unidad × $Z/m² = $TOTAL",
    "ingreso_total_venta": número,
    "costo_construccion_m2": número,
    "costo_construccion_total": número,
    "costo_estacionamiento": número,
    "gastos_indirectos_pct": número, "gastos_indirectos": número,
    "comercializacion_pct": número, "comercializacion": número,
    "contingencias_pct": número, "contingencias": número,
    "costo_total_proyecto": número,
    "precio_venta_por_unidad": número,
    "ingreso_total_estimado": número,
    "utilidad_bruta": número,
    "margen_bruto_pct": número,
    "roi_pct": número,
    "tir_estimada_pct": número,
    "plazo_meses": número
  },
  "red_flags": ["lista con números específicos"],
  "fortalezas": ["lista concreta"],
  "semaforo": "VERDE/AMARILLO/ROJO",
  "veredicto": "GO/NO-GO/INVESTIGAR MÁS",
  "justificacion_veredicto": "párrafo directo y crítico",
  "proximos_pasos": ["pasos concretos"]
}`;

      const analisis = await claude(promptCompleto, 5000);
      return new Response(JSON.stringify({
        ok: true, tipo_analisis: "completo",
        ubicacion: ubicacionObj, terreno: terrenoObj,
        lineamientos: lineamientosObj, giros: girosObj, analisis,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "tipo_analisis inválido" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
