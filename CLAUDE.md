# DeVault Web — CLAUDE.md

## Vue d'ensemble

**DeVault** est une app de gestion de projets perso pour développeurs indie.
Cette version est une **web app responsive** déployée sur Vercel, partageant le même backend Supabase que l'app mobile.

Objectif : fiche projet par projet (stack, credentials, statut, journal) + assistant IA global avec saisie texte.

---

## Stack technique

| Couche | Techno |
|---|---|
| Framework | Vite + React 18 + TypeScript |
| Routing | React Router v6 |
| Styling | CSS Modules + variables CSS |
| Backend / DB | Supabase (même projet que l'app mobile) |
| IA | OpenRouter → `anthropic/claude-haiku-4-5` |
| Déploiement | Vercel |
| Icônes | Lucide React |
| Fonts | Inter (corps) + JetBrains Mono (code/credentials) via Google Fonts |

---

## Design system

Style : **Apple minimaliste** — noir, blanc, nuances de gris. Zéro couleur d'accent.

### Tokens CSS (variables globales dans `src/styles/tokens.css`)

```css
:root {
  /* Light mode */
  --bg-primary: #F2F2F7;
  --bg-secondary: #FFFFFF;
  --bg-card: #FFFFFF;
  --bg-fill: #EFEFF4;
  --text-primary: #000000;
  --text-secondary: #6E6E73;
  --border: #E5E5EA;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-pill: 999px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.10);
}

[data-theme="dark"] {
  --bg-primary: #1C1C1E;
  --bg-secondary: #2C2C2E;
  --bg-card: #2C2C2E;
  --bg-fill: #3A3A3C;
  --text-primary: #FFFFFF;
  --text-secondary: #8E8E93;
  --border: #3A3A3C;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
}
```

### Règles visuelles

- Titre principal : 34px, font-weight 800
- Pas de couleurs d'accent — hiérarchie uniquement par typographie et gris
- Icônes Lucide : strokeWidth 1.5, jamais filled
- Séparateurs : `border-bottom: 0.5px solid var(--border)` (pas de cards avec border)
- Coins : `--radius-lg` pour les cards, `--radius-md` pour les inputs
- Thème : `data-theme` sur `<html>`, persisté en `localStorage`

### Responsive

- **Mobile** (< 768px) : plein écran, navigation bottom bar
- **Desktop** (≥ 768px) : layout centré max-width 480px, sidebar de navigation à gauche
- Mobile-first dans tous les composants

---

## Règles visuelles critiques (basées sur les mockups)

### Dashboard
- Titre "Projets" : 34px, weight 800
- Compteur "N projets · X actifs" : 13px, textSecondary
- Liste projets : pas de card avec border — séparateur fin entre items
  - Nom : 17px SemiBold
  - Stack : 13px textSecondary, séparé par " · "
  - Description : 15px, 2 lignes max (line-clamp: 2)
  - Bas : StatusBadge à gauche + date relative à droite
- FilterChip : pill avec border, actif = fond `textPrimary` + texte inversé
- SearchBar : radius 12px, fond `fill`

### Fiche projet
- Badge statut + titre 28px Bold + description
- 3 stats en ligne : ENTRÉES / ACTIF DEPUIS / MRR
- TabBar : onglet actif fond blanc + shadow légère

### Journal composer
- Header : Annuler / "New entry" / Save (pill noir)
- Sélecteur type : 4 cards en grille 2×2
- Bouton micro : UI seulement (pas de vocal sur web V1)

### AI Drawer / Panel
- Panel latéral sur desktop (slide depuis la droite)
- Bottom sheet sur mobile
- Header : avatar Sparkles + "Assistant" + scope projet
- Bulles user : fond textPrimary, texte inversé, alignées droite
- Bulles assistant : fond fill, alignées gauche
- Suggestions chips avant le premier message

---

## Structure des dossiers

```
devault-web/
├── src/
│   ├── components/
│   │   ├── ui/                # Button, Input, SearchBar, FilterChip, Badge, Separator
│   │   ├── project/           # ProjectRow, StatusBadge, StackTag, CredentialRow, JournalEntryRow
│   │   ├── assistant/         # AIPanel, AssistantMessage, AssistantInput
│   │   └── layout/            # AppShell, Sidebar, BottomNav, Header
│   ├── pages/
│   │   ├── Auth.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── JournalNew.tsx
│   │   ├── CredentialNew.tsx
│   │   ├── Ideas.tsx
│   │   ├── Search.tsx
│   │   └── Settings.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useProjects.ts
│   │   ├── useProject.ts
│   │   ├── useJournal.ts
│   │   ├── useCredentials.ts
│   │   ├── useIdeas.ts
│   │   ├── useAssistant.ts
│   │   └── useTheme.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── openrouter.ts
│   │   ├── date.ts
│   │   └── types.ts
│   ├── styles/
│   │   ├── tokens.css         # Variables CSS globales
│   │   └── global.css         # Reset + base styles
│   └── main.tsx
├── index.html
├── vite.config.ts
├── .env                       # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_OPENROUTER_API_KEY
└── vercel.json                # SPA routing config
```

---

## Schema Supabase (identique à l'app mobile)

```sql
-- Projets
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  status text check (status in ('active', 'paused', 'abandoned', 'idea')) default 'idea',
  stack text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Credentials
create table credentials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  service text not null,
  login text,
  url text,
  notes text,
  created_at timestamptz default now()
);

-- Journal
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  type text check (type in ('note', 'idea', 'bug', 'decision')) default 'note',
  title text,
  body text not null,
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- Idées
create table ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text,
  body text not null,
  category text,
  promoted_to_project_id uuid references projects,
  created_at timestamptz default now()
);
```

---

## Variables d'environnement

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_OPENROUTER_API_KEY=
```

> ⚠️ Préfixe `VITE_` (pas `EXPO_PUBLIC_`) pour Vite.

---

## Fonctionnalités — ordre d'implémentation

### V1
1. Setup Vite + React Router + tokens CSS + auth Supabase
2. Dashboard — liste projets, filtres, recherche
3. Fiche projet — onglets Aperçu / Stack / Identifiants / Journal
4. Création projet (modal / page dédiée)
5. Compositeur journal
6. Credentials
7. Assistant IA (texte uniquement, panel latéral)
8. Paramètres (thème, compte)
9. Idées en vrac
10. Recherche globale
11. Déploiement Vercel

### Post-V1
- Saisie vocale (Web Speech API)
- Export PDF
- PWA (installable sur mobile)

---

## Configuration Vercel (`vercel.json`)

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Obligatoire pour que React Router fonctionne en SPA sur Vercel.

---

## Conventions de code

- TypeScript strict, pas de `any`
- Composants fonctionnels uniquement avec hooks
- CSS Modules pour les styles (un fichier `.module.css` par composant)
- Hooks custom pour toute logique métier
- Nommage : PascalCase composants, camelCase hooks/fonctions
- Chaque composant dans son propre fichier

---

## Contexte développeur

- Dev : Nicolas, développeur indie (React, Supabase, TypeScript)
- Environnement : Claude Code avec Opus
- App mobile parallèle : DeVault (Expo React Native, même Supabase)
- Usage strictement personnel — pas de multi-utilisateur prévu
