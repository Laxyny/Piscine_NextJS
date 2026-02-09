---
title: ChatApp NextJS
emoji: 💬
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
app_port: 7860
---

# ChatApp - Application de Chat avec IA

Application web de chat moderne développée avec Next.js, intégrant une IA (Grok) et une authentification complète via Supabase.

## Sommaire

- [Description du projet](#description-du-projet)
- [Fonctionnalités](#fonctionnalités)
- [Technologies utilisées](#technologies-utilisées)
- [Structure du projet](#structure-du-projet)
- [Installation et lancement](#installation-et-lancement)
- [Configuration](#configuration)
- [Fonctionnement de l'application](#fonctionnement-de-lapplication)
- [Migration Supabase](#migration-supabase)
- [Authentification](#authentification)
- [Sécurité](#sécurité)

## Description du projet

Cette application permet aux utilisateurs de :

- **Chatter avec une IA** : conversation libre avec l'assistant Grok
- **Gérer des conversations** : créer, renommer, supprimer des discussions
- **Personnaliser des assistants** : créer des GPTs personnalisés avec des instructions système
- **Générer du contenu professionnel** : CV, lettres de motivation et suggestions via l'assistant de carrière
- **Sauvegarder l'historique** : toutes les conversations et générations sont stockées et accessibles

L'application est entièrement sécurisée : chaque utilisateur ne peut accéder qu'à ses propres données.

## Fonctionnalités

### Mode Chat
- Conversation en temps réel avec l'IA Grok avec mémoire
- Génération d'images (mode image)
- Historique des conversations sauvegardé
- Titres automatiques générés pour chaque conversation
- Support des assistants personnalisés (GPTs)

### Assistant de carrière
- Formulaire de profil professionnel
- Génération automatique de CV structuré
- Génération de lettre de motivation personnalisée
- Suggestions d'amélioration
- Historique des générations précédentes

### Authentification
- Inscription et connexion par email/mot de passe
- Connexion via Google (OAuth)
- Connexion via GitHub (OAuth)
- Gestion du profil utilisateur

## Technologies utilisées

- **Framework** : Next.js 15.1.0 (App Router)
- **Langage** : JavaScript (pas de TypeScript)
- **Frontend** : React 19
- **Backend** : API Routes Next.js
- **Base de données** : Supabase (PostgreSQL)
- **Authentification** : Supabase Auth
- **IA** : API Grok (xAI)
- **Containerisation** : Docker
- **Dépendances principales** :
  - `@supabase/supabase-js` : Client Supabase
  - `groq-sdk` : SDK Groq (non utilisé directement, appels HTTP)
  - `react-markdown` : Affichage du Markdown généré par l'IA

## Structure du projet

```
chat-app/
├── frontend/                # Interface utilisateur (React)
│   ├── components/         # Composants React réutilisables
│   │   ├── Chat.jsx        # Composant principal du chat
│   │   ├── Login.jsx       # Page de connexion
│   │   ├── Sidebar.jsx     # Barre latérale avec liste des conversations
│   │   ├── MessageBubble.jsx  # Bulle de message
│   │   └── AgentsModal.jsx # Modal pour gérer les GPTs personnalisés
│   ├── hooks/              # Hooks React personnalisés
│   │   ├── useAuth.js      # Gestion de l'authentification
│   │   └── useChat.js      # Logique du chat
│   ├── context/            # Contextes React
│   │   └── SettingsContext.jsx  # Paramètres de l'application
│   ├── styles/             # Fichiers CSS
│   │   └── globals.css     # Styles globaux
│   └── utils/              # Utilitaires
│       └── displayName.js  # Formatage des noms d'utilisateur
│
├── backend/                # Logique serveur
│   └── lib/                # Bibliothèques backend
│       ├── supabase.js     # Client Supabase serveur
│       ├── auth.js         # Vérification des tokens JWT
│       └── db.js           # Accès à la base de données
│
├── app/                    # Next.js App Router
│   ├── api/                # Routes API
│   │   ├── chat/           # API du chat
│   │   │   ├── route.js    # POST/GET messages
│   │   │   ├── [id]/route.js  # PATCH/DELETE conversation
│   │   │   └── settings/route.js  # Suppression de l'historique
│   │   ├── chats/          # API des conversations
│   │   │   └── route.js    # GET liste, POST création
│   │   ├── agents/         # API des assistants personnalisés
│   │   │   ├── route.js    # GET liste, POST création
│   │   │   └── [id]/route.js  # PATCH/DELETE assistant
│   │   └── career/         # API assistant de carrière
│   │       └── route.js    # POST génération, GET historique
│   ├── auth/               # Authentification
│   │   └── callback/      # Callback OAuth
│   │       └── page.jsx    # Page de retour après OAuth
│   ├── career/             # Page assistant de carrière
│   │   └── page.jsx
│   ├── settings/           # Page paramètres
│   │   └── page.jsx
│   ├── page.jsx            # Page principale (chat)
│   └── layout.jsx          # Layout global
│
├── supabase/               # Configuration Supabase
│   └── migrations/         # Migrations SQL
│       └── 001_schema.sql  # Schéma de la base de données
│
├── Dockerfile              # Configuration Docker
├── docker-compose.yml      # Configuration Docker Compose
├── package.json            # Dépendances npm
└── README.md               # Ce fichier
```

### Description des répertoires

| Répertoire | Rôle | Description |
|------------|------|-------------|
| `frontend/` | Interface utilisateur | Contient tout le code React affiché à l'écran (composants, hooks, styles) |
| `frontend/components/` | Composants UI | Composants React réutilisables (chat, messages, formulaire, etc.) |
| `frontend/hooks/` | Logique frontend | Hooks React pour gérer l'état et les appels API |
| `frontend/styles/` | Styles | Fichiers CSS pour le style de l'application |
| `backend/` | Logique serveur | Contient toute la logique métier côté serveur |
| `backend/lib/` | Outils backend | Connexion Supabase (auth, client serveur) |
| `app/` | Next.js App Router | Point d'entrée de l'application Next.js |
| `app/api/` | API Routes | Routes API accessibles via `/api/*` |
| `supabase/migrations/` | Schéma BDD | Migrations SQL (tables, RLS) |
| `Dockerfile` | Déploiement | Instructions pour construire et lancer l'application avec Docker |

## Installation et lancement

### Prérequis

- Node.js 20 ou supérieur
- npm ou yarn
- Un compte Supabase
- Une clé API Grok (xAI)

### Installation locale

1. **Cloner le dépôt**
   ```bash
   git clone <url-du-repo>
   cd Piscine_NextJS
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement**
   
   Créer un fichier `.env` à la racine du projet :
   ```env
   GROK_API_KEY=cle_grok
   
   NEXT_PUBLIC_SUPABASE_URL=https://projet.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=cle_anon_supabase
   SUPABASE_SERVICE_ROLE_KEY=cle_service_role_supabase
   ```

4. **Configurer Supabase**
   
   - Créer un projet sur [supabase.com](https://supabase.com)
   - Dans le SQL Editor, exécuter le contenu de `supabase/migrations/001_schema.sql`
   - Récupérer l'URL et les clés dans Settings → API

5. **Lancer l'application en développement**
   ```bash
   npm run dev
   ```
   
   L'application sera accessible sur `http://localhost:3000`

### Lancement avec Docker

1. **Construire l'image**
   ```bash
   docker build -t chat-app .
   ```

2. **Lancer le conteneur**
   ```bash
   docker run -p 7860:7860 --env-file .env chat-app
   ```

   Ou avec Docker Compose :
   ```bash
   docker-compose up
   ```

3. **Accéder à l'application**
   
   Ouvrir `http://localhost:7860` dans le navigateur

### Déploiement sur HuggingFace

L'ensemble du projet peut être déployé sur HuggingFace

## Configuration

### Variables d'environnement

| Variable | Description | Où la trouver |
|----------|-------------|---------------|
| `GROK_API_KEY` | Clé API Grok pour l'IA | [xAI Console](https://console.x.ai) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme (publique) | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (secrète) | Supabase → Settings → API → service_role |

### Configuration Supabase

1. **Créer les tables** : Exécuter `supabase/migrations/001_schema.sql` dans le SQL Editor
2. **Configurer l'authentification** :
   - Activer les providers (Google, GitHub) dans Authentication → Providers
   - Configurer les Redirect URLs dans Authentication → URL Configuration
   - Pour le développement : `http://localhost:3000/auth/callback`

## Fonctionnement de l'application

### Architecture générale

L'application suit une architecture **client-serveur** claire :

```
Frontend (React)  →  API Routes (Next.js)  →  Supabase (PostgreSQL)
     ↓                      ↓                        ↓
  Interface          Vérification            Stockage des
  utilisateur        authentification         données
```

### Flux de données

#### 1. Envoi d'un message

1. L'utilisateur saisit un message dans le champ texte
2. Le frontend (`Chat.jsx`) appelle `POST /api/chat` avec le contenu
3. La route API (`app/api/chat/route.js`) :
   - Vérifie l'authentification (token JWT)
   - Vérifie que le message n'est pas vide
   - Enregistre le message utilisateur dans Supabase
   - Appelle l'API Grok avec l'historique de la conversation
   - Enregistre la réponse de l'IA dans Supabase
   - Retourne la réponse au frontend
4. Le frontend affiche la réponse dans l'interface

#### 2. Authentification

1. L'utilisateur clique sur "Se connecter" ou choisit Google/GitHub
2. Le frontend (`Login.jsx`) appelle Supabase Auth
3. Pour OAuth : redirection vers le provider, puis retour sur `/auth/callback`
4. Le callback échange le code OAuth contre une session Supabase
5. Le token JWT est stocké et envoyé dans les en-têtes des requêtes API

#### 3. Génération de contenu professionnel

1. L'utilisateur remplit le formulaire sur `/career`
2. Le frontend appelle `POST /api/career` avec les données du profil
3. La route API :
   - Vérifie l'authentification
   - Construit un prompt structuré pour l'IA
   - Appelle l'API Grok avec le prompt
   - Parse la réponse (CV, lettre, suggestions)
   - Enregistre tout dans Supabase
   - Retourne les résultats au frontend
4. Le frontend affiche le CV, la lettre et les suggestions

### Séparation frontend/backend

- **Frontend** : Ne communique jamais directement avec Supabase. Toutes les requêtes passent par `/api/*`
- **Backend** : Les routes API vérifient l'authentification et accèdent à Supabase avec la clé service role
- **Sécurité** : Les règles RLS (Row Level Security) dans Supabase garantissent qu'un utilisateur ne peut accéder qu'à ses propres données

## Migration Supabase

### Contexte

Le projet initial utilisait **SQLite** avec **Prisma** (voir `100.md`). Il a été migré vers **Supabase** (PostgreSQL) pour :

- Permettre l'authentification moderne
- Sécuriser les données avec RLS
- Faciliter le déploiement cloud
- Gérer plusieurs utilisateurs simultanément

### Changements effectués

1. **Base de données** : SQLite → Supabase (PostgreSQL)
2. **ORM** : Prisma → Client Supabase direct
3. **Authentification** : Ajout de Supabase Auth
4. **Schéma** : Migration vers PostgreSQL avec RLS

### Structure de la base de données

Les tables principales sont :

- **`chats`** : Conversations de l'utilisateur (titre, date, agent_id)
- **`messages`** : Messages dans chaque conversation (contenu, rôle, type, date)
- **`agents`** : Assistants personnalisés (nom, description, system_prompt)
- **`career_generations`** : Générations de l'assistant de carrière (profil, CV, lettre, suggestions)

Toutes les tables sont protégées par **RLS** (Row Level Security) : chaque utilisateur ne voit que ses propres données.

## Authentification

### Méthodes implémentées

L'application propose **trois méthodes d'authentification** :

1. **Email + mot de passe**
   - Inscription : création de compte avec email et mot de passe (min. 6 caractères)
   - Connexion : authentification avec les identifiants

2. **Google OAuth**
   - Connexion via compte Google
   - Redirection vers Google, puis retour sur l'application

3. **GitHub OAuth**
   - Connexion via compte GitHub
   - Redirection vers GitHub, puis retour sur l'application

### Flux OAuth

1. L'utilisateur clique sur "Google" ou "GitHub"
2. Redirection vers le provider (Google/GitHub)
3. Authentification sur le provider
4. Redirection vers `/auth/callback?code=...`
5. Échange du code contre une session Supabase
6. Stockage du token JWT côté client
7. Redirection vers la page principale

### Protection des routes API

Toutes les routes API vérifient l'authentification :

```javascript
const authUser = await getAuthFromRequest(request);
if (!authUser) return unauthorizedResponse();
```

Le token JWT est envoyé dans l'en-tête `Authorization: Bearer <token>`.

## Sécurité

### Row Level Security (RLS)

Toutes les tables Supabase sont protégées par des **politiques RLS** :

- Un utilisateur ne peut **lire** que ses propres données
- Un utilisateur ne peut **créer** que des données avec son propre `user_id`
- Un utilisateur ne peut **modifier/supprimer** que ses propres données

Exemple de politique :
```sql
CREATE POLICY "chats_select_own" ON public.chats 
FOR SELECT USING (auth.uid() = user_id);
```

### Vérification côté serveur

Même avec RLS, chaque route API vérifie que l'utilisateur est propriétaire de la ressource :

```javascript
async function checkChatOwner(supabase, chatId, uid) {
  const { data } = await supabase
    .from('chats')
    .select('user_id')
    .eq('id', chatId)
    .single();
  return data?.user_id === uid;
}
```

### Tokens JWT

- Les tokens sont vérifiés à chaque requête API
- Expiration automatique gérée par Supabase
- Refresh automatique côté client

## Mode Chat vs Mode Assistant de carrière

### Mode Chat

- **Usage** : Conversation libre avec l'IA
- **Interface** : Champ de texte, historique des messages
- **Fonctionnalités** :
  - Génération de texte (Markdown)
  - Génération d'images
  - Assistants personnalisés (GPTs)
  - Historique sauvegardé

### Mode Assistant de carrière

- **Usage** : Génération de contenu professionnel structuré
- **Interface** : Formulaire avec champs spécifiques
- **Fonctionnalités** :
  - Génération de CV
  - Génération de lettre de motivation
  - Suggestions d'amélioration
  - Historique des générations

Les deux modes utilisent la même API Grok mais avec des prompts différents et des formats de réponse structurés.

## Contributeurs

- [Kevin GREGOIRE](github.com/laxyny)
- [Arièle RATSIMBAZAFY](github.com/AriKode)