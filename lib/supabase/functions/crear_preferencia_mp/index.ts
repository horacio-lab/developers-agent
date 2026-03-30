import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY    = Deno.env.get("SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
};

const PAQUETES: Record<string, { creditos: number; precio: number; titulo: string }> = {
  "3":  { creditos: 3,  precio: 199,  titulo: "Unearth — 3 créditos"  },
  "10": { creditos: 10, precio: 499,  titulo: "Unearth — 10 créditos" },
  "25": { creditos: 25, precio: 999,  titulo: "Unearth — 25 créditos" },
  "60": { creditos: 60, precio: 1999, titulo: "Unearth — 60 créditos" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Autenticar usuario
    const userToken = req.headers.get("x-user-token") || "";
    const { data: { user }, error: authErr } = await sb.auth.getUser(userToken);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401, headers: cors });
    }

    const { paquete, origin } = await req.json();
    const pkg = PAQUETES[String(paquete)];
    if (!pkg) {
      return new Response(JSON.stringify({ error: "Paquete inválido" }), { status: 400, headers: cors });
    }

    const baseUrl = origin || "https://unearth.mx";

    // Crear preferencia en Mercado Pago
    const preference = {
      items: [{
        id:          `unearth-${paquete}cr`,
        title:       pkg.titulo,
        description: `${pkg.creditos} créditos para análisis de terrenos en Unearth`,
        quantity:    1,
        unit_price:  pkg.precio,
        currency_id: "MXN",
      }],
      payer: {
        email: user.email,
      },
      external_reference: `${user.id}::${paquete}`,  // userId::paquete — lo leerá el webhook
      back_urls: {
        success: `${baseUrl}/?pago=exitoso&cr=${paquete}`,
        failure: `${baseUrl}/?pago=fallido`,
        pending: `${baseUrl}/?pago=pendiente`,
      },
      auto_return: "approved",
      notification_url: `${SUPABASE_URL}/functions/v1/mp_webhook`,
      statement_descriptor: "UNEARTH MX",
      expires: false,
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpRes.json();

    if (!mpData.id) {
      console.error("MP error:", JSON.stringify(mpData));
      return new Response(JSON.stringify({ error: "Error creando preferencia MP", detalle: mpData }), { status: 500, headers: cors });
    }

    return new Response(JSON.stringify({
      ok:                true,
      preference_id:     mpData.id,
      init_point:        mpData.init_point,        // producción
      sandbox_init_point: mpData.sandbox_init_point, // sandbox
    }), { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});