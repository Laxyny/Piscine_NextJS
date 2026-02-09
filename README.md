---
title: ChatApp NextJS
emoji: 💬
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
app_port: 7860
---

# Piscine_NextJS# Cahier des charges – Projet Chat Web

## Objectif pédagogique
L’objectif de ce projet est de permettre aux apprenants de **créer une application de chat simple**, moderne et fonctionnelle, en utilisant **Next.js**, **JavaScript** et **Supabase**.

Le projet est volontairement simple, afin que les apprenants se concentrent sur :
- la compréhension du lien frontend / backend
- l’organisation d’un projet Next.js
- l’utilisation d’une base de données locale
- les bases d’une API web

Aucun TypeScript n’est utilisé dans ce projet.

## Contexte du projet
Vous devez développer une application web de type **chat**.

Le fonctionnement attendu est le suivant :
- un utilisateur écrit un message
- le message est envoyé au serveur
- une réponse est générée par une intelligence artificielle
- les messages sont enregistrés dans une base de données
- l’historique des messages est affiché à l’écran

L’application est contenue dans **un seul projet Next.js**, avec **un seul Dockerfile.**

## Technologies imposées
Les technologies suivantes doivent être utilisées :
- **Framework** : Next.js (App Router)
- **Langage** : JavaScript (pas de TypeScript)
- **Frontend** : React
- **Backend** : API Routes Next.js
- **Base de données** : Supabase (PostgreSQL)
- **Accès base de données** : Client Supabase (@supabase/supabase-js)
- **IA** : API Grok
- **Containerisation** : Docker (un seul Dockerfile)

## Architecture du projet (obligatoire)
La structure suivante doit être respectée.

### Description des répertoires
| Répertoire/Fichier      | Rôle                   | Description simple                                                      |
|------------------------|------------------------|-------------------------------------------------------------------------|
| ```frontend/```              | Interface utilisateur  | Contient tout le code React affiché à l’écran (composants, hooks, styles). |
| ```frontend/components/```   | Composants UI          | Composants React (chat, messages, formulaire, etc.).                    |
| ```frontend/hooks/```        | Logique frontend       | Hooks React pour gérer l’état et les appels API.                        |
| ```frontend/styles/```       | Styles                 | Fichiers CSS pour le style de l’application.                            |
| ```backend/```               | Logique serveur        | Contient toute la logique métier côté serveur.                          |
| ```backend/services/```      | Services               | Fonctions métier (appel IA, sauvegarde des messages).                   |
| ```backend/lib/```           | Outils backend         | Connexion Supabase (auth, client serveur).                                 |
| ```app/```                   | Next.js App Router     | Point d’entrée de l’application Next.js.                                |
| ```app/api/```               | API Routes             | API accessibles via /api/*.                                             |
| ```app/page.js```            | Page principale        | Page principale de l’application.                                       |
| ```supabase/migrations/```   | Schéma BDD             | Migrations SQL (tables, RLS).                                              |
| ```Dockerfile```             | Déploiement            | Instructions pour construire et lancer l’application avec Docker.       |
| ```package.json```           | Dépendances            | Liste des dépendances et scripts du projet.                             |
| ```README.md```              | Documentation          | Explication du projet et instructions de lancement.                     |

```
chat-app/

chat-app/
├── frontend/                # Interface utilisateur (React)
│   ├── components/          
│   ├── hooks/               
│   └── styles/              
│
├── backend/                 # Logique métier serveur
│   ├── services/            
│   ├── lib/                 
│   └── prisma/              
│
├── app/                     # Next.js App Router
│   ├── api/                 
│   ├── page.js              
│   └── layout.js           
│
├── supabase/migrations/     # Schéma SQL (tables, RLS)               
│
├── Dockerfile               
├── package.json             
└── README.md                
```

## Fonctionnalités attendues

### 1. Interface utilisateur
L’interface doit permettre :
- d’écrire un message dans un champ texte
- d’envoyer le message via un bouton
- d’afficher la liste des messages (utilisateur et IA)

L’interface doit rester simple et lisible.

### 2. Envoi d’un message
Lorsqu’un utilisateur envoie un message :
- le frontend appelle une route API (```/api/chat```)
- le backend reçoit le message
- le message est vérifié (non vide)
- le message est enregistré dans Supabase  

### 3. Réponse de l’IA
Le backend doit :
- envoyer le message à l’API Grok
- recevoir la réponse
- enregistrer la réponse dans Firebase
- renvoyer la réponse au frontend 

### 4. Base de données
La base de données doit contenir au minimum :
- le contenu du message
- le rôle du message (```user``` ou ```assistant```)
- la date de création

## Règles de développement
Les règles suivantes doivent être respectées :
- JavaScript uniquement (pas de TypeScript)
- séparation claire entre frontend et backend
- le frontend ne doit jamais accéder directement à la base de données
- toutes les requêtes passent par ```/api/*```
- code lisible et correctement indenté
- noms de fichiers simples et explicites

## Contraintes techniques
- un seul projet Next.js
- un seul Dockerfile
- pas de base de données externe
- pas d’authentification
- pas de fonctionnalités inutiles

## Livrables attendus
Les apprenants doivent fournir :
- le code source du projet
- un fichier ```README.md``` contenant :
    - les instructions pour lancer le projet
    - une explication de la structure des dossiers
    - une description du fonctionnement de l’application

## Critères d’évaluation
Le projet sera évalué selon :
- le respect du cahier des charges
- le bon fonctionnement du chat
- la clarté de l’architecture
- la lisibilité du code JavaScript
- la qualité du README

## Migration Supabase
La base de données et l’authentification utilisent **Supabase** (PostgreSQL + Supabase Auth).

**Variables d’environnement** (fichier `.env`) :
- `NEXT_PUBLIC_SUPABASE_URL` : URL du projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé anonyme (publique)
- `SUPABASE_SERVICE_ROLE_KEY` : clé service role (secrète, backend uniquement)
- `GROK_API_KEY` : clé API GroK pour l’IA

**Authentification** : inscription/connexion par email + mot de passe, plus connexion Google et GitHub (configurer les providers dans Supabase → Authentication → Providers). Les routes API vérifient le token JWT Supabase via l’en-tête `Authorization: Bearer <access_token>`.

## Objectif final
À la fin du projet, les apprenants doivent être capables de :
- créer une application Next.js en JavaScript
- comprendre le rôle des API Routes
- utiliser une base de données Supabase (PostgreSQL)
- organiser un projet web correctement

**Ce cahier des charges est volontairement simple et pédagogique.** L’objectif n’est pas la performance, mais la compréhension.