const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { frente, fondo, metros2, cos, cus, altura_max, niveles,
            rest_frontal, rest_lateral, rest_posterior, unidades,
            zona, direccion, huella } = await req.json();

    const prompt = `Eres un experto en Three.js y visualización arquitectónica 3D.
Genera una página HTML completa con un modelo isométrico 3D de este terreno usando Three.js r128.
NO uses markdown. NO uses backticks. Responde SOLO con el HTML, empezando con <!DOCTYPE html>.

DATOS EXACTOS DEL TERRENO:
- Dirección: ${direccion}
- Zona: ${zona}
- Frente: ${frente}m | Fondo: ${fondo}m | Superficie: ${metros2}m²
- COS: ${cos} → Huella máx edificable: ${huella}m²
- CUS: ${cus} → M² construibles totales: ${Math.round(metros2*cus)}m²
- Altura máxima: ${altura_max}m | Niveles estimados: ${niveles}
- Restricción frontal: ${rest_frontal}m | Lateral: ${rest_lateral}m | Posterior: ${rest_posterior}m
- Unidades máximas: ${unidades}

INSTRUCCIONES TÉCNICAS:
1. Carga Three.js: <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
2. Cámara: OrthographicCamera con frustum 80, posición (60,60,60), lookAt(0,0,0)
3. Renderer: WebGLRenderer antialias:true, fondo #0d1421, tamaño 100% x 480px
4. ESCALA: 1 unidad = 1 metro real. Divide todas las dimensiones entre 3 para que quepan bien.

5. GEOMETRÍAS (en este orden, todas centradas en Y=0):
   a) TERRENO BASE: BoxGeometry(${frente}/3, 0.3, ${fondo}/3)
      Material: MeshLambertMaterial color:#6b5033
      Posición Y: -0.15

   b) RESTRICCIONES (wireframe): 4 planos semitransparentes delimitando los setbacks
      Color: #fbbf24, opacity 0.25, transparent:true
      Frontal: frente total menos ${rest_frontal}m cada lado en Z
      Lateral: fondo total menos ${rest_lateral}m cada lado en X
      Posterior: similar al frontal pero opuesto

   c) ÁREA VERDE: BoxGeometry(${frente}/3 * 0.3, 0.15, ${fondo}/3 * 0.2)
      Color: #16a34a, opacity 0.6, posición en esquina posterior

   d) HUELLA EDIFICABLE: BoxGeometry(${Math.round(Math.sqrt(huella)*0.9)}/3, 0.1, ${Math.round(huella/Math.sqrt(huella)*0.9)}/3)
      Color: #22c55e, opacity 0.2, Y: 0.05

   e) EDIFICIO (${niveles} pisos apilados):
      Cada piso: BoxGeometry(${Math.round(Math.sqrt(huella)*0.85)}/3, 2.8/3, ${Math.round(huella/Math.sqrt(huella)*0.85)}/3)
      Piso i → Y: 0.2 + i*(2.8/3) + (2.8/3)/2
      Material: MeshPhongMaterial color:#2563a8, opacity:0.88, transparent:true, shininess:30
      Agregar EdgesGeometry con LineSegments color:#5ea8f0 para cada piso

6. ILUMINACIÓN:
   - AmbientLight(0xffffff, 0.5)
   - DirectionalLight(0xffffff, 0.9) posición (10,20,10)
   - HemisphereLight(0x87ceeb, 0x3d2b1f, 0.3)

7. ETIQUETAS (canvas textures sobre sprites):
   Crea función makeLabel(text, color) que retorna Sprite con CanvasTexture
   - "⬌ ${frente}m" → frente del terreno
   - "↕ ${fondo}m" → lado del terreno  
   - "${niveles} NIV / ${altura_max}m" → encima del edificio
   - "${unidades} UNID." → costado del edificio
   Fuente: "bold 28px monospace", fondo semitransparente oscuro

8. ANIMACIÓN: rotación suave del grupo principal
   group.rotation.y += 0.004 en cada frame
   Todo excepto las luces va dentro del group

9. HTML completo con:
   - <style> body{margin:0;overflow:hidden;background:#0d1421;font-family:monospace}
     canvas{display:block} #info{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
     background:rgba(0,0,0,.5);color:#94a3b8;padding:6px 14px;border-radius:20px;font-size:11px;
     letter-spacing:.05em;pointer-events:none} </style>
   - Un div#info con el texto: "DRAG para rotar • ${metros2}m² • ${zona}"
   - Script que añade mousedown/mousemove para OrbitControls manual (sin importar OrbitControls)
     Implementa rotación manual simple con mouse/touch drag sobre el group

Responde SOLO con el HTML completo. Sin explicaciones. Sin markdown.`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const d = await r.json();
    const html = d.content?.find((b: any) => b.type === "text")?.text || "";
    const cleaned = html
      .replace(/^```html\n?/, "").replace(/^```\n?/, "").replace(/```$/, "").trim();

    return new Response(JSON.stringify({ html: cleaned }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
