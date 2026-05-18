const nodemailer = require('nodemailer');

// ─── Transporteur Gmail ───────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── Template HTML de base ────────────────────────────────────────────────────
function template(title, content, color = '#2563EB') {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,${color},#6366F1);padding:32px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">⚡ StockBTP</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:6px;">Gestion de Stock Intelligente</div>
        </td></tr>

        <!-- Title -->
        <tr><td style="padding:32px 40px 0;text-align:center;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;">${title}</h1>
          <p style="margin:8px 0 0;font-size:13px;color:#6B7280;">${new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
        </td></tr>

        <!-- Content -->
        <tr><td style="padding:24px 40px;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F9FAFB;padding:20px 40px;text-align:center;border-top:1px solid #E5E7EB;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">
            StockBTP — Notification automatique<br/>
            <a href="https://stock-app-kappa-lime.vercel.app" style="color:#2563EB;text-decoration:none;">Accéder à l'application →</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Email : Alerte stock faible ──────────────────────────────────────────────
exports.envoyerAlerteStock = async (produits) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_DEST) return;

  const ruptures = produits.filter(p => p.quantiteStock === 0);
  const faibles  = produits.filter(p => p.quantiteStock > 0);

  const lignesRupture = ruptures.map(p => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #FEE2E2;font-weight:600;color:#111827;">${p.nom}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #FEE2E2;text-align:center;">
        <span style="background:#FEE2E2;color:#DC2626;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700;">Rupture totale</span>
      </td>
    </tr>`).join('');

  const lignesFaibles = faibles.map(p => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #FEF3C7;font-weight:600;color:#111827;">${p.nom}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #FEF3C7;text-align:center;">
        <span style="background:#FEF3C7;color:#D97706;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700;">${p.quantiteStock} ${p.unite}</span>
      </td>
    </tr>`).join('');

  const content = `
    <p style="color:#374151;font-size:15px;margin:0 0 20px;">
      ⚠️ <strong>${produits.length} produit(s)</strong> nécessitent votre attention immédiate.
    </p>

    ${ruptures.length > 0 ? `
    <h3 style="color:#DC2626;font-size:16px;margin:0 0 10px;">🔴 Ruptures de stock (${ruptures.length})</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #FEE2E2;margin-bottom:24px;">
      <tr style="background:#FEF2F2;">
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Produit</th>
        <th style="padding:10px 12px;text-align:center;font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Statut</th>
      </tr>
      ${lignesRupture}
    </table>` : ''}

    ${faibles.length > 0 ? `
    <h3 style="color:#D97706;font-size:16px;margin:0 0 10px;">🟡 Stocks faibles (${faibles.length})</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #FEF3C7;margin-bottom:24px;">
      <tr style="background:#FFFBEB;">
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Produit</th>
        <th style="padding:10px 12px;text-align:center;font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Stock restant</th>
      </tr>
      ${lignesFaibles}
    </table>` : ''}

    <div style="background:#EFF6FF;border-radius:12px;padding:16px;text-align:center;">
      <a href="https://stock-app-kappa-lime.vercel.app/alertes"
        style="display:inline-block;background:linear-gradient(135deg,#2563EB,#6366F1);color:#ffffff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
        Voir les alertes dans l'application →
      </a>
    </div>`;

  await transporter.sendMail({
    from:    `"StockBTP 📦" <${process.env.EMAIL_USER}>`,
    to:      process.env.EMAIL_DEST,
    subject: `⚠️ Alerte Stock — ${produits.length} produit(s) à vérifier`,
    html:    template('Alerte de Stock', content, '#DC2626'),
  });

  console.log(`✅ Email alerte stock envoyé à ${process.env.EMAIL_DEST}`);
};

// ─── Email : Résumé quotidien ─────────────────────────────────────────────────
exports.envoyerResumequotidien = async ({ ventes, alertes, valeurStock, ca }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_DEST) return;

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

  const content = `
    <p style="color:#374151;font-size:15px;margin:0 0 24px;">
      Voici le résumé de votre activité d'aujourd'hui.
    </p>

    <!-- KPIs -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="50%" style="padding:0 8px 0 0;">
          <div style="background:#EFF6FF;border-radius:12px;padding:20px;text-align:center;border:1px solid #DBEAFE;">
            <div style="font-size:28px;font-weight:800;color:#2563EB;">${ventes}</div>
            <div style="font-size:13px;color:#6B7280;margin-top:4px;">Ventes aujourd'hui</div>
          </div>
        </td>
        <td width="50%" style="padding:0 0 0 8px;">
          <div style="background:#F0FDF4;border-radius:12px;padding:20px;text-align:center;border:1px solid #BBF7D0;">
            <div style="font-size:28px;font-weight:800;color:#16A34A;">${fmt(ca)}</div>
            <div style="font-size:13px;color:#6B7280;margin-top:4px;">GNF encaissés</div>
          </div>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="50%" style="padding:0 8px 0 0;">
          <div style="background:#F5F3FF;border-radius:12px;padding:20px;text-align:center;border:1px solid #DDD6FE;">
            <div style="font-size:28px;font-weight:800;color:#7C3AED;">${fmt(valeurStock)}</div>
            <div style="font-size:13px;color:#6B7280;margin-top:4px;">GNF valeur du stock</div>
          </div>
        </td>
        <td width="50%" style="padding:0 0 0 8px;">
          <div style="background:${alertes > 0 ? '#FEF2F2' : '#F0FDF4'};border-radius:12px;padding:20px;text-align:center;border:1px solid ${alertes > 0 ? '#FECACA' : '#BBF7D0'};">
            <div style="font-size:28px;font-weight:800;color:${alertes > 0 ? '#DC2626' : '#16A34A'};">${alertes}</div>
            <div style="font-size:13px;color:#6B7280;margin-top:4px;">Alerte(s) de stock</div>
          </div>
        </td>
      </tr>
    </table>

    <div style="background:#F9FAFB;border-radius:12px;padding:16px;text-align:center;margin-top:8px;">
      <a href="https://stock-app-kappa-lime.vercel.app"
        style="display:inline-block;background:linear-gradient(135deg,#2563EB,#6366F1);color:#ffffff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
        Ouvrir le tableau de bord →
      </a>
    </div>`;

  await transporter.sendMail({
    from:    `"StockBTP 📦" <${process.env.EMAIL_USER}>`,
    to:      process.env.EMAIL_DEST,
    subject: `📊 Résumé du jour — ${ventes} vente(s) · ${fmt(ca)} GNF`,
    html:    template('Résumé Quotidien', content),
  });

  console.log(`✅ Email résumé quotidien envoyé`);
};

// ─── Email : Alerte vente importante ─────────────────────────────────────────
exports.envoyerAlerteVente = async (vente) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_DEST) return;
  if (!process.env.SEUIL_VENTE_ALERTE) return;
  if (vente.totalNet < Number(process.env.SEUIL_VENTE_ALERTE)) return;

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

  const lignes = vente.lignes.map(l => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;color:#111827;">${l.nomProduit}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:center;color:#6B7280;">${l.quantite} ${l.unite}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:right;font-weight:600;color:#111827;">${fmt(l.sousTotal)} GNF</td>
    </tr>`).join('');

  const content = `
    <p style="color:#374151;font-size:15px;margin:0 0 20px;">
      💰 Une vente importante vient d'être enregistrée !
    </p>

    <div style="background:#EFF6FF;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;border:1px solid #DBEAFE;">
      <div style="font-size:13px;color:#6B7280;margin-bottom:4px;">N° ${vente.numero}</div>
      <div style="font-size:36px;font-weight:800;color:#2563EB;">${fmt(vente.totalNet)} GNF</div>
      <div style="font-size:13px;color:#6B7280;margin-top:4px;">Client : ${vente.client?.nom || 'Comptoir'}</div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;margin-bottom:20px;">
      <tr style="background:#F9FAFB;">
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#9CA3AF;text-transform:uppercase;">Produit</th>
        <th style="padding:10px 12px;text-align:center;font-size:12px;color:#9CA3AF;text-transform:uppercase;">Qté</th>
        <th style="padding:10px 12px;text-align:right;font-size:12px;color:#9CA3AF;text-transform:uppercase;">Montant</th>
      </tr>
      ${lignes}
    </table>

    <div style="background:#F9FAFB;border-radius:12px;padding:16px;text-align:center;">
      <a href="https://stock-app-kappa-lime.vercel.app/ventes"
        style="display:inline-block;background:linear-gradient(135deg,#2563EB,#6366F1);color:#ffffff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
        Voir l'historique des ventes →
      </a>
    </div>`;

  await transporter.sendMail({
    from:    `"StockBTP 📦" <${process.env.EMAIL_USER}>`,
    to:      process.env.EMAIL_DEST,
    subject: `💰 Vente importante — ${fmt(vente.totalNet)} GNF (${vente.numero})`,
    html:    template('Vente Importante', content, '#16A34A'),
  });

  console.log(`✅ Email alerte vente envoyé pour ${vente.numero}`);
};

// ─── Test de connexion ────────────────────────────────────────────────────────
exports.testerConnexion = async () => {
  try {
    await transporter.verify();
    console.log('✅ Service email configuré et prêt');
    return true;
  } catch (err) {
    console.error('❌ Erreur email :', err.message);
    return false;
  }
};
