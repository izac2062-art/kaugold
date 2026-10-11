// Cria a preferência de pagamento no Mercado Pago. Os preços ficam AQUI (servidor), nunca vêm do navegador.
const PRODUCTS = [
  { title: "Colar Gota de Luz", price: 489 },
  { title: "Argola Clássica", price: 329 },
  { title: "Pulseira Encantos", price: 549 },
  { title: "Anel Trançado", price: 399 },
];
const PIX_DISCOUNT = 0.05;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const { items, method } = req.body || {};
  if (!Array.isArray(items) || !items.length || items.length > 20)
    return res.status(400).json({ error: "items" });

  const factor = method === "pix" ? 1 - PIX_DISCOUNT : 1;
  const mpItems = [];
  for (const it of items) {
    const p = PRODUCTS[it.id];
    const qty = Number(it.qty);
    if (!p || !Number.isInteger(qty) || qty < 1 || qty > 10)
      return res.status(400).json({ error: "item" });
    mpItems.push({
      title: p.title,
      quantity: qty,
      currency_id: "BRL",
      unit_price: Math.round(p.price * factor * 100) / 100,
    });
  }

  // Mostra só a forma escolhida
  const all = ["credit_card", "debit_card", "ticket", "bank_transfer"];
  const keep = { pix: "bank_transfer", card: "credit_card", boleto: "ticket" }[method];
  const site = process.env.SITE_URL; // ex.: https://www.kaugold.com.br
  const orderId = "kg-" + Date.now();

  const pref = {
    items: mpItems,
    external_reference: orderId,
    payment_methods: {
      excluded_payment_types: all.filter((t) => t !== keep).map((id) => ({ id })),
      installments: method === "card" ? 3 : 1,
    },
    back_urls: { success: site + "/?pago=ok", pending: site + "/?pago=pendente", failure: site + "/?pago=erro" },
    auto_return: "approved",
    notification_url: site + "/api/webhook",
  };

  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.MP_ACCESS_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(pref),
  });
  const data = await r.json();
  if (!r.ok) return res.status(502).json({ error: "mp" });
  return res.status(200).json({ url: data.init_point, orderId });
}
