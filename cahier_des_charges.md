# Atelier --- Construire une plateforme IA d'évaluation de candidats

## Build an AI Hiring Platform with Next.js + Supabase + LLMs

## Objectif pédagogique

Développer une plateforme d'évaluation de candidats basée sur
l'intelligence artificielle permettant d'automatiser la présélection
dans un processus de recrutement.

Cet atelier vise à renforcer les compétences des participants sur :

-   JavaScript moderne
-   Next.js
-   Supabase
-   APIs d'intelligence artificielle (Groq ou équivalent)
-   Architecture full-stack
-   Conception de produits numériques

## Contexte du projet

Les recruteurs reçoivent souvent un volume important de candidatures
difficile à analyser manuellement.

L'objectif est de concevoir une application web capable de :

-   Générer automatiquement des quiz techniques
-   Analyser des CV via un modèle de langage (LLM)
-   Classer les candidats selon leur pertinence

La solution doit être conçue comme un outil SaaS utilisable par un
recruteur.

## Fonctionnalités attendues

### 1. Générateur de quiz IA

-   Entrée : description de poste ou compétences recherchées
-   Sortie : quiz personnalisé
-   Formats :
    -   QCM
    -   Réponses ouvertes
    -   Mini-cas pratiques

### 2. Analyse automatique de CV (LLM uniquement)

-   Import de fichier PDF
-   Extraction des compétences via modèle LLM
-   Comparaison avec les exigences du poste
-   Calcul d'un score de pertinence

### 3. Classement intelligent

-   Classement automatique des candidats
-   Pondération configurable :
    -   Expérience
    -   Score au test
    -   Adéquation des compétences

## Stack technique imposée

-   Frontend : Next.js + Tailwind
-   Backend : Supabase (authentification, base de données, stockage)
-   Intelligence artificielle : API Groq ou équivalent
-   Analyse de CV : Modèle LLM uniquement
-   Déploiement : Vercel ou solution équivalente

## Livrables attendus

-   Application fonctionnelle
-   Code source structuré (GitHub)
-   Documentation technique (README)
-   Présentation finale de 10 minutes

## Critères d'évaluation

  Critère                  Pondération
  ------------------------ -------------
  Architecture             15%
  Fonctionnalités IA       30%
  Expérience utilisateur   15%
  Qualité du code          15%
  Originalité              25%

## Défi final

Construire un prototype crédible pouvant être utilisé par une entreprise
pour filtrer efficacement des candidats dans un processus de
recrutement.

## Références de plateformes similaires

### Qwizly

Qwizly est une plateforme éducative qui utilise l'intelligence
artificielle pour transformer des documents pédagogiques (PDF, Word,
etc.) en quiz, fiches, flashcards ou résumés afin d'optimiser
l'apprentissage.

Fonctionnement général :

1.  L'utilisateur envoie un document
2.  Le système analyse le contenu
3.  Des questions sont générées automatiquement
4.  Les questions suivantes s'adaptent au niveau de l'utilisateur

Cette logique illustre un exemple de génération automatisée de contenu
d'évaluation basée sur l'IA.

### Testbyai

Testbyai : Préparez vos entretiens d'embauche avec l'IA.

Entraînez-vous sans limite avec un générateur de quiz intelligent, conçu
pour booster vos compétences techniques et réussir vos entretiens.
