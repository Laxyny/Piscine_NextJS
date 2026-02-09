import fs from 'fs';
import path from 'path';

let cache = null;

function loadPrompts() {
  if (cache) return cache;
  const configPath = path.join(process.cwd(), 'config', 'prompts.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    cache = JSON.parse(raw);
    return cache;
  } catch (e) {
    console.warn('prompts.json not found or invalid, using defaults:', e.message);
    cache = {
      chat: {
        default_system: 'Tu es un assistant utile et professionnel. Tu utilises le Markdown pour formater tes réponses, surtout pour le code.',
        title_generation: "Génère un titre de conversation très court (3-5 mots max) qui résume ce message utilisateur. Si c'est du code, résume ce que fait le code. Ne mets pas de guillemets, pas de préfixe \"Titre:\", juste le texte brut."
      },
      career: {
        system: 'Tu es un expert en recrutement et en rédaction de CV et lettres de motivation. Réponds avec ## CV, ## Lettre de motivation, ## Suggestions.',
        system_with_offer: "Tu es un expert en recrutement. Adapte le CV et la lettre à l'offre d'emploi. Réponds avec ## CV, ## Lettre de motivation, ## Suggestions.",
        system_from_cv_pdf: "Tu es un expert en recrutement. Adapte le CV fourni à l'offre. Réponds avec ## CV, ## Lettre de motivation, ## Suggestions."
      }
    };
    return cache;
  }
}

export function getPrompt(key) {
  const prompts = loadPrompts();
  const parts = key.split('.');
  let v = prompts;
  for (const p of parts) {
    v = v?.[p];
  }
  return typeof v === 'string' ? v : null;
}
