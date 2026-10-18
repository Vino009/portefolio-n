/**
 * Fonction serverless Vercel : POST /api/contact
 * Envoie le message du formulaire par email via l'API Resend (https://resend.com).
 *
 * Variables d'environnement (à définir dans Vercel > Settings > Environment Variables) :
 *   RESEND_API_KEY      clé API Resend (secrète, jamais exposée au navigateur)
 *   CONTACT_TO_EMAIL    adresse qui reçoit les messages
 *   CONTACT_FROM_EMAIL  expéditeur vérifié chez Resend, ex. "Portfolio <contact@votredomaine.com>"
 *                       (pour tester sans domaine : "Portfolio <onboarding@resend.dev>",
 *                        qui n'envoie qu'à l'adresse du compte Resend)
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIMITS = { name: 120, email: 200, company: 150, projectType: 80, message: 5000 };

// Limitation simple par IP (au mieux : la mémoire n'est pas partagée entre instances).
const hits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > MAX_PER_WINDOW;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const body = await readBody(req);

  // Champ piège anti-spam : rempli uniquement par les robots.
  if (body.website) return res.status(200).json({ ok: true });

  const data = {
    name: clean(body.name, LIMITS.name),
    email: clean(body.email, LIMITS.email),
    company: clean(body.company, LIMITS.company),
    projectType: clean(body.projectType, LIMITS.projectType),
    message: clean(body.message, LIMITS.message),
    lang: body.lang === 'en' ? 'en' : 'fr',
  };

  if (!data.name || !EMAIL_RE.test(data.email) || data.message.length < 20) {
    return res.status(400).json({ ok: false, error: 'invalid_input' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'too_many_requests' });
  }

  const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    console.error('[contact] Variables manquantes : RESEND_API_KEY, CONTACT_TO_EMAIL ou CONTACT_FROM_EMAIL');
    return res.status(503).json({ ok: false, error: 'not_configured' });
  }

  const rows = [
    ['Nom', data.name],
    ['Email', data.email],
    ['Entreprise', data.company || '—'],
    ['Type de projet', data.projectType || '—'],
    ['Langue du site', data.lang.toUpperCase()],
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#17222c;line-height:1.55">
      <h2 style="margin:0 0 16px">Nouvelle demande depuis le portfolio</h2>
      <table style="border-collapse:collapse;margin-bottom:16px">
        ${rows.map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#586774">${k}</td><td style="padding:4px 0"><strong>${escapeHtml(v)}</strong></td></tr>`).join('')}
      </table>
      <div style="white-space:pre-wrap;border-left:3px solid #283e51;padding-left:12px">${escapeHtml(data.message)}</div>
    </div>`;

  const text = rows.map(([k, v]) => `${k} : ${v}`).join('\n') + '\n\n' + data.message;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: [CONTACT_TO_EMAIL],
        reply_to: data.email,
        subject: `Portfolio — ${data.projectType || 'Nouvelle demande'} — ${data.name}`,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[contact] Échec Resend', response.status, detail.slice(0, 500));
      return res.status(502).json({ ok: false, error: 'send_failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[contact] Erreur réseau', err);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
}
