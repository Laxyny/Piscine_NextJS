# Modes de rendu des frameworks JavaScript

## Objectif de l’exercice

L'objectif est de comprendre quels **frameworks JavaScript** supportent les différents **modes de rendu des pages web** :

* **SSG** (Static Site Generation)
* **ISR** (Incremental Static Regeneration)
* **SSR** (Server Side Rendering)

---

## Rappel (à lire avant l’exercice)

> **SSG (Static Site Generation)**
> La page est générée **à l’avance**, lors du build.

> **ISR (Incremental Static Regeneration)**
> La page est statique mais **se régénère automatiquement** après un certain temps.

> **SSR (Server Side Rendering)**
> La page est générée **à chaque requête**.

---

## Énoncé de l’exercice

Vous disposez ci-dessous d’une liste de **frameworks JavaScript**. Pour chacun d’eux, indiquez **s’il supporte ou non** les modes de rendu suivants : SSG, ISR et SSR.

### Pour répondre :

1. Mettez un **X** dans la case correspondante lorsque le framework **supporte** le mode de rendu.
2. Laissez la case vide si le mode **n’est pas supporté**.

| Framework | SSG | ISR | SSR |
|----------|:---:|:---:|:---:|
| Next.js | X | X | X |
| Nuxt.js | X | X | X |
| NestJS | | | X |
| SvelteKit | X | X | X |
| Remix | | | X |
| Gatsby | X | X | |
| Astro | X | | X |
| Angular (Universal) | X | | X |
| Vue.js (seul) | | | |
| Qwik | X | | X |