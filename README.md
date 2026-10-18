# Portfolio — Déo Gratias Adindje

Site statique bilingue (FR sur `/`, EN sur `/en/`) avec une fonction serverless Vercel pour le formulaire de contact. Il n'y a aucune dépendance npm.

## Structure

```
index.html            Page française
en/index.html         Page anglaise
404.html              Page d'erreur
style.css, main.js    Styles et interactions (partagés)
fonts/                Schibsted Grotesk, auto-hébergée
images/               Portrait sur fond studio (portrait.*), photo d’origine (photo-pro.jpg), images Open Graph
cv/                   CV HTML (inchangé)
api/contact.js        Fonction Vercel : envoi du formulaire via Resend
scripts/build.mjs     Build : copie vers public/, URL du site, sitemap.xml, robots.txt
.env.example          Variables à configurer (sans valeurs)
_ancienne-version/    Sauvegarde de la version précédente (peut être supprimée)
```

Les liens utilisent des chemins absolus (`/style.css`). Pour prévisualiser le site en local, il faut donc un serveur et non un double-clic sur le fichier :

```
npm run build
npx serve public        # site sans le formulaire
npx vercel dev          # site + formulaire (variables dans .env.local)
```

## Formulaire de contact

Le formulaire envoie les messages à `/api/contact`, qui les transmet par email via [Resend](https://resend.com). Le plan gratuit suffit pour un portfolio.

Si les variables ne sont pas configurées, le formulaire n'affiche **pas** de faux succès. Il affiche une erreur avec un lien `mailto:` déjà rempli.

| Variable | Rôle |
|---|---|
| `RESEND_API_KEY` | Clé API Resend (secrète) |
| `CONTACT_TO_EMAIL` | Adresse qui reçoit les messages |
| `CONTACT_FROM_EMAIL` | Expéditeur vérifié, ex. `Portfolio <contact@mondomaine.com>`. Pour tester : `Portfolio <onboarding@resend.dev>` (n'envoie qu'à l'email du compte Resend) |
| `SITE_URL` | Facultatif. À définir seulement avec un domaine personnalisé, ex. `https://mondomaine.com` |

## Déployer sur Vercel

1. Pousser ce dossier sur un dépôt GitHub (le `.gitignore` exclut `public/` et `.env`).
2. Sur vercel.com : **Add New → Project**, puis importer le dépôt.
3. Paramètres du projet :
   - Framework Preset : **Other**
   - Build Command : `npm run build`
   - Output Directory : `public`
   - Install Command : laisser par défaut
4. **Environment Variables** : ajouter `RESEND_API_KEY`, `CONTACT_TO_EMAIL` et `CONTACT_FROM_EMAIL`.
5. Cliquer sur **Deploy**.
6. Vérifier : `/`, `/en/`, `/cv/cv.html`, une URL inexistante (page 404), `/sitemap.xml`, puis envoyer un message de test.

Pour un domaine personnalisé : Settings → Domains, puis définir `SITE_URL` et redéployer.
