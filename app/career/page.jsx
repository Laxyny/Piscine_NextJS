"use client";
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../frontend/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '../../frontend/hooks/useAuth';
import { SettingsProvider } from '../../frontend/context/SettingsContext';
import ReactMarkdown from 'react-markdown';

function formatHistoryLabel(item) {
  const p = item.profile || {};
  const poste = p.poste || p.formation || p.nom;
  const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return poste ? `${poste} – ${date}` : (date || item.id?.slice(0, 8));
}

function CareerContent() {
  const { user, loading: authLoading, getToken } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState('cv');
  const [form, setForm] = useState({
    nom: '',
    formation: '',
    experiences: '',
    competences: '',
    poste: '',
    offreEmploi: ''
  });
  const [cvFile, setCvFile] = useState(null);
  const [cvText, setCvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const cvBlockRef = useRef(null);
  const lettreBlockRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/career', { headers });
      const data = await res.json();
      if (res.ok) setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = () => {
    if (!showHistory) fetchHistory();
    setShowHistory(!showHistory);
  };

  const selectHistoryItem = (item) => {
    setResult({
      id: item.id,
      cv: item.cv,
      lettre: item.lettre,
      suggestions: item.suggestions
    });
    setShowHistory(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    if (mode === 'cv') {
      if (!cvFile && !cvText.trim()) {
        setError('Choisissez un fichier CV (PDF) ou collez le texte de votre CV.');
        return;
      }
    } else {
      const hasForm = [form.nom, form.formation, form.experiences, form.competences, form.poste].some(
        (v) => v && String(v).trim().length > 0
      );
      if (!hasForm) {
        setError('Renseignez au moins un champ (nom, formation, expériences, compétences ou poste).');
        return;
      }
    }
    setLoading(true);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (mode === 'cv') {
        const fd = new FormData();
        fd.set('mode', 'cv');
        fd.set('offreEmploi', form.offreEmploi || '');
        if (cvFile) {
          fd.set('cvFile', cvFile);
        }
        if (cvText.trim()) {
          fd.set('cvText', cvText.trim());
        }
        const res = await fetch('/api/career', { method: 'POST', headers, body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        setResult(data);
      } else {
        headers['Content-Type'] = 'application/json';
        const res = await fetch('/api/career', {
          method: 'POST',
          headers,
          body: JSON.stringify({ mode: 'form', ...form })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        setResult(data);
      }
    } catch (e) {
      setError(e.message || 'Erreur lors de la génération.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async (ref, filename) => {
    if (!ref?.current) return;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(ref.current).save();
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading || !user) return <div className="loading">Chargement...</div>;

  return (
    <div className="settings-container">
      <header className="settings-header">
        <Link href="/" className="back-link">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Retour
        </Link>
        <h1>Assistant de carrière</h1>
        <button
          type="button"
          onClick={openHistory}
          className="save-btn"
          style={{ marginLeft: 'auto' }}
        >
          {showHistory ? 'Masquer l\'historique' : 'Voir l\'historique'}
        </button>
      </header>

      {showHistory && (
        <section className="settings-section career-history">
          <h2>Générations précédentes</h2>
          {historyLoading ? (
            <p className="loading">Chargement...</p>
          ) : history.length === 0 ? (
            <p>Aucune génération enregistrée.</p>
          ) : (
            <ul className="career-history-list">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="career-history-item"
                    onClick={() => selectHistoryItem(item)}
                  >
                    {formatHistoryLabel(item)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="settings-section">
        <h2>Comment souhaitez-vous procéder ?</h2>
        <div className="career-mode-toggle">
          <button
            type="button"
            className={mode === 'cv' ? 'save-btn' : 'career-mode-btn'}
            onClick={() => { setMode('cv'); setError(''); setResult(null); }}
          >
            J'envoie mon CV (PDF)
          </button>
          <button
            type="button"
            className={mode === 'form' ? 'save-btn' : 'career-mode-btn'}
            onClick={() => { setMode('form'); setError(''); setResult(null); setCvFile(null); setCvText(''); }}
          >
            Je remplis le formulaire
          </button>
        </div>
        <form onSubmit={handleSubmit} className="career-form">
          {mode === 'cv' ? (
            <>
              <div className="form-group">
                <label>Mon CV (PDF) – optionnel</label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                  className="career-file-input"
                />
                <small>Envoyez votre CV en PDF (avec texte sélectionnable).</small>
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>OU collez le texte de votre CV <span style={{ color: 'var(--error)' }}>*</span></label>
                <textarea
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  placeholder="Collez ici le texte de votre CV (même si mal formaté, l'IA saura le comprendre)..."
                  rows={8}
                />
                <small>Si vous avez un PDF, vous pouvez aussi copier-coller son contenu ici. L'IA comprendra même si le formatage n'est pas parfait.</small>
              </div>
              <div className="form-group">
                <label>Offre d'emploi – optionnel</label>
                <textarea
                  value={form.offreEmploi}
                  onChange={(e) => setForm({ ...form, offreEmploi: e.target.value })}
                  placeholder="Collez ici le texte de l'offre d'emploi..."
                  rows={5}
                />
              </div>
            </>
          ) : (
            <>
              <h3 style={{ marginBottom: '1rem' }}>Profil professionnel</h3>
              <div className="form-group">
                <label>Nom</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Prénom Nom"
                />
              </div>
              <div className="form-group">
                <label>Formation</label>
                <input
                  type="text"
                  value={form.formation}
                  onChange={(e) => setForm({ ...form, formation: e.target.value })}
                  placeholder="Diplômes, écoles..."
                />
              </div>
              <div className="form-group">
                <label>Expériences professionnelles</label>
                <textarea
                  value={form.experiences}
                  onChange={(e) => setForm({ ...form, experiences: e.target.value })}
                  placeholder="Postes, dates, missions..."
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>Compétences</label>
                <textarea
                  value={form.competences}
                  onChange={(e) => setForm({ ...form, competences: e.target.value })}
                  placeholder="Compétences techniques et transversales..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Poste ou domaine visé</label>
                <input
                  type="text"
                  value={form.poste}
                  onChange={(e) => setForm({ ...form, poste: e.target.value })}
                  placeholder="Ex: Développeur full-stack, Chef de projet..."
                />
              </div>
              <div className="form-group">
                <label>Offre d'emploi – optionnel</label>
                <textarea
                  value={form.offreEmploi}
                  onChange={(e) => setForm({ ...form, offreEmploi: e.target.value })}
                  placeholder="Collez ici le texte de l'offre d'emploi..."
                  rows={5}
                />
              </div>
            </>
          )}
          {error && <p className="career-error">{error}</p>}
          <button type="submit" className="save-btn" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Génération...' : 'Générer CV et lettre'}
          </button>
        </form>
      </section>

      {result && (
        <>
          <section className="settings-section career-result">
            <h2>CV</h2>
            <div ref={cvBlockRef} className="career-block markdown-content">
              <ReactMarkdown>{result.cv || '—'}</ReactMarkdown>
            </div>
            <div className="pdf-action-container">
              <button
                type="button"
                className="download-pdf-btn"
                onClick={() => downloadPdf(cvBlockRef, 'cv_adapte.pdf')}
              >
                Télécharger le CV en PDF
              </button>
            </div>
          </section>
          <section className="settings-section career-result">
            <h2>Lettre de motivation</h2>
            <div ref={lettreBlockRef} className="career-block markdown-content">
              <ReactMarkdown>{result.lettre || '—'}</ReactMarkdown>
            </div>
            <div className="pdf-action-container">
              <button
                type="button"
                className="download-pdf-btn"
                onClick={() => downloadPdf(lettreBlockRef, 'lettre_motivation.pdf')}
              >
                Télécharger la lettre en PDF
              </button>
            </div>
          </section>
          <section className="settings-section career-result">
            <h2>Suggestions</h2>
            <div className="career-block markdown-content">
              <ReactMarkdown>{result.suggestions || '—'}</ReactMarkdown>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function CareerPage() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <CareerContent />
      </AuthProvider>
    </SettingsProvider>
  );
}
