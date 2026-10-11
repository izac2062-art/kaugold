// O Mercado Pago avisa aqui quando um pagamento muda de status.
import crypto from "crypto";

export default async function handler(req, res) {
  const id = req.body?.data?.id || req.query?.["data.id"];
  if (!id) return res.status(200).end();

  // Valida a assinatura (defina MP_WEBHOOK_SECRET em Suas integrações > Webhooks)
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret) {
    const sig = String(req.headers["x-signature"] || "");
    const ts = (sig.match(/ts=([^,]+)/) || [])[1];
    const v1 = (sig.match(/v1=([^,]+)/) || [])[1];
    const manifest = `id:${String(id).toLowerCase()};request-id:${req.headers["x-request-id"]};ts:${ts};`;
    const calc = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
    if (!v1 || calc !== v1) return res.status(401).end();
  }

  // Confirma o status direto na API (não confie só no aviso)
  const r = await fetch("https://api.mercadopago.com/v1/payments/" + id, {
    headers: { Authorization: "Bearer " + process.env.MP_ACCESS_TOKEN },
  });
  if (!r.ok) return res.status(502).end();
  const pay = await r.json();

  if (pay.status === "approved") {
    // TODO: marcar o pedido pay.external_reference como pago (banco/planilha),
    // baixar estoque e avisar a Kau Gold.
    console.log("Pago:", pay.external_reference, pay.transaction_amount);
  }
  return res.status(200).end();
}
