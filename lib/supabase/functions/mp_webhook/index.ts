import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY    = Deno.env.get("SERVICE_ROLE_KEY")!;

const CREDITOS_POR_PAQUETE: Record<string, number> = {
  "3":  3,
  "10": 10,
  "25": 25,
  "60": 60,
};

Deno.serve(async (req) => {
  // MP envía GET con ?source_news=... para verificar — responder 200
  if (req.method === "GET") {
    return new Response("ok", { status: 200 });
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const body = await req.json();

    console.log("MP webhook recibido:", JSON.stringify(body));

    // Solo procesar notificaciones de tipo "payment"
    if (body.type !== "payment" || !body.data?.id) {
      return new Response("ignored", { status: 200 });
    }

    const paymentId = body.data.id;

    // Consultar el pago en la API de MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const payment = await mpRes.json();

    console.log("Payment status:", payment.status, "ref:", payment.external_reference);

    // Solo procesar pagos aprobados
    if (payment.status !== "approved") {
      return new Response("not approved", { status: 200 });
    }

    // Evitar procesar el mismo pago dos veces
    const { data: existe } = await sb
      .from("pagos_mp")
      .select("id")
      .eq("payment_id", String(paymentId))
      .single();

    if (existe) {
      console.log("Pago ya procesado:", paymentId);
      return new Response("duplicate", { status: 200 });
    }

    // Parsear external_reference: "userId::paquete"
    const [userId, paquete] = (payment.external_reference || "::").split("::");
    const creditosAgregar = CREDITOS_POR_PAQUETE[paquete];

    if (!userId || !creditosAgregar) {
      console.error("external_reference inválido:", payment.external_reference);
      return new Response("bad reference", { status: 200 });
    }

    // Registrar el pago para evitar duplicados
    await sb.from("pagos_mp").insert({
      payment_id:  String(paymentId),
      user_id:     userId,
      paquete,
      creditos:    creditosAgregar,
      monto:       payment.transaction_amount,
      status:      payment.status,
      raw:         payment,
    });

    // Sumar créditos al perfil del usuario (RPC atómica)
    const { error: rpcErr } = await sb.rpc("agregar_creditos", {
      p_user_id:  userId,
      p_cantidad: creditosAgregar,
    });

    if (rpcErr) {
      console.error("Error agregando créditos:", rpcErr);
      return new Response("credits error", { status: 500 });
    }

    console.log(`✓ ${creditosAgregar} créditos agregados a ${userId}`);
    return new Response("ok", { status: 200 });

  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("error", { status: 500 });
  }
});