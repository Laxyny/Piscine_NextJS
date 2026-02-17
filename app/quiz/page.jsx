"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../frontend/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '../../frontend/hooks/useAuth';
import { SettingsProvider } from '../../frontend/context/SettingsContext';

function QuizContent() {
  const { user, loading: authLoading, getToken } = useAuth();
  const router = useRouter();

  const [view, setView] = useState('generate');
  const [form, setForm] = useState({ jobDescription: '', skills: '', questionCount: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user]);

  const getHeaders = useCallback(async () => {
    const token = await getToken();
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [getToken]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/quiz', { headers });
      const data = await res.json();
      if (res.ok) setHistory(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  };

  const openHistory = () => {
    if (!showHistory) fetchHistory();
    setShowHistory(!showHistory);
  };

  const loadQuiz = async (quizId) => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/quiz/${quizId}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setQuiz(data);
        setAnswers(data.questions.map(() => ({ answer: '' })));
        setCurrentQuestion(0);
        setEvaluation(null);
        setView('take');
        setShowHistory(false);
        if (data.responses && data.responses.length > 0) {
          setEvaluation(data.responses[0].evaluation);
          setView('results');
        }
      }
    } catch (e) { console.error(e); }
  };

  const deleteQuiz = async (quizId) => {
    if (!confirm('Voulez-vous vraiment supprimer ce quiz ?')) return;
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/quiz/${quizId}`, { method: 'DELETE', headers });
      if (res.ok) {
        setHistory(prev => prev.filter(q => q.id !== quizId));
        if (quiz?.id === quizId) {
          setQuiz(null);
          setEvaluation(null);
          setView('generate');
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.jobDescription.trim() && !form.skills.trim()) {
      setError('Renseignez une description de poste ou des competences.');
      return;
    }
    setLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jobDescription: form.jobDescription.trim(),
          skills: form.skills.trim(),
          questionCount: form.questionCount ? parseInt(form.questionCount) : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setQuiz(data);
      setAnswers(data.questions.map(() => ({ answer: '' })));
      setCurrentQuestion(0);
      setEvaluation(null);
      setView('take');
    } catch (e) { setError(e.message || 'Erreur lors de la generation.'); }
    finally { setLoading(false); }
  };

  const handleAnswerChange = (index, value) => {
    setAnswers(prev => {
      const next = [...prev];
      next[index] = { answer: value };
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/quiz/${quiz.id}/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ answers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setEvaluation(data.evaluation);
      setView('results');
    } catch (e) { setError(e.message || 'Erreur lors de la soumission.'); }
    finally { setSubmitting(false); }
  };

  const resetQuiz = () => {
    setQuiz(null);
    setAnswers([]);
    setEvaluation(null);
    setCurrentQuestion(0);
    setView('generate');
    setError('');
  };

  const retakeQuiz = () => {
    setAnswers(quiz.questions.map(() => ({ answer: '' })));
    setCurrentQuestion(0);
    setEvaluation(null);
    setView('take');
  };

  if (authLoading || !user) return <div className="loading">Chargement...</div>;

  const question = quiz?.questions?.[currentQuestion];
  const totalQuestions = quiz?.questions?.length || 0;
  const answeredCount = answers.filter(a => a.answer !== '' && a.answer !== null && a.answer !== undefined).length;
  const allAnswered = answeredCount === totalQuestions;

  return (
    <div className="settings-container career-page-container">
      <header className="settings-header">
        <Link href="/" className="back-link">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Retour
        </Link>
        <h1>Quiz technique</h1>
        <button type="button" onClick={openHistory} className="save-btn" style={{ marginLeft: 'auto' }}>
          {showHistory ? "Masquer l'historique" : "Mes quiz"}
        </button>
      </header>

      {showHistory && (
        <section className="settings-section career-history">
          <h2>Quiz precedents</h2>
          {historyLoading ? <p className="loading">Chargement...</p> : history.length === 0 ? <p>Aucun quiz enregistre.</p> : (
            <ul className="career-history-list">
              {history.map(item => (
                <li key={item.id}>
                  <div className="career-history-item-row">
                    <button type="button" className="career-history-item" onClick={() => loadQuiz(item.id)}>
                      <span style={{ fontWeight: 600 }}>{item.title}</span>
                      <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                        {item.questionCount} questions - {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </button>
                    <div className="career-history-actions">
                      <button type="button" className="delete-btn" title="Supprimer" onClick={() => deleteQuiz(item.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {view === 'generate' && (
        <section className="settings-section">
          <h2>Generer un quiz d'evaluation</h2>
          <form onSubmit={handleGenerate} className="career-form">
            <div className="form-group">
              <label>Description du poste</label>
              <textarea
                value={form.jobDescription}
                onChange={e => setForm({ ...form, jobDescription: e.target.value })}
                placeholder="Decrivez le poste, les missions, le contexte..."
                rows={6}
              />
            </div>
            <div className="form-group">
              <label>Competences recherchees</label>
              <textarea
                value={form.skills}
                onChange={e => setForm({ ...form, skills: e.target.value })}
                placeholder="JavaScript, React, Node.js, SQL, gestion de projet..."
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Nombre de questions (optionnel)</label>
              <input
                type="number"
                min="5"
                max="20"
                value={form.questionCount}
                onChange={e => setForm({ ...form, questionCount: e.target.value })}
                placeholder="8 a 15 par defaut"
              />
            </div>
            {error && <p className="career-error">{error}</p>}
            <button type="submit" className="save-btn" disabled={loading} style={{ marginTop: '1rem' }}>
              {loading ? 'Generation en cours...' : 'Generer le quiz'}
            </button>
          </form>
        </section>
      )}

      {view === 'take' && quiz && question && (
        <>
          <div className="quiz-progress-bar">
            <div className="quiz-progress-fill" style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}></div>
          </div>
          <div className="quiz-header-info">
            <span className="quiz-title">{quiz.title}</span>
            <span className="quiz-counter">Question {currentQuestion + 1} / {totalQuestions}</span>
          </div>

          <section className="settings-section quiz-question-card">
            <div className="quiz-question-type">
              {question.type === 'qcm' && 'QCM'}
              {question.type === 'open' && 'Question ouverte'}
              {question.type === 'practical' && 'Cas pratique'}
              <span className="quiz-points">{question.points} {question.points > 1 ? 'pts' : 'pt'}</span>
            </div>

            {question.type === 'practical' && question.context && (
              <div className="quiz-context">
                {question.context}
              </div>
            )}

            <p className="quiz-question-text">{question.question}</p>

            {question.type === 'qcm' && (
              <div className="quiz-options">
                {question.options.map((option, i) => (
                  <label
                    key={i}
                    className={`quiz-option ${answers[currentQuestion]?.answer === i ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`q-${currentQuestion}`}
                      checked={answers[currentQuestion]?.answer === i}
                      onChange={() => handleAnswerChange(currentQuestion, i)}
                    />
                    <span className="quiz-option-marker">{String.fromCharCode(65 + i)}</span>
                    <span className="quiz-option-text">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {(question.type === 'open' || question.type === 'practical') && (
              <textarea
                className="quiz-answer-input"
                value={answers[currentQuestion]?.answer || ''}
                onChange={e => handleAnswerChange(currentQuestion, e.target.value)}
                placeholder="Redigez votre reponse ici..."
                rows={question.type === 'practical' ? 8 : 5}
              />
            )}
          </section>

          <div className="quiz-navigation">
            <button
              type="button"
              className="cancel-btn"
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion(prev => prev - 1)}
            >
              Precedent
            </button>

            <div className="quiz-dots">
              {quiz.questions.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`quiz-dot ${i === currentQuestion ? 'current' : ''} ${answers[i]?.answer !== '' && answers[i]?.answer !== undefined && answers[i]?.answer !== null ? 'answered' : ''}`}
                  onClick={() => setCurrentQuestion(i)}
                />
              ))}
            </div>

            {currentQuestion < totalQuestions - 1 ? (
              <button
                type="button"
                className="save-btn"
                onClick={() => setCurrentQuestion(prev => prev + 1)}
              >
                Suivant
              </button>
            ) : (
              <button
                type="button"
                className="save-btn"
                disabled={!allAnswered || submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Evaluation en cours...' : 'Soumettre'}
              </button>
            )}
          </div>

          {error && <p className="career-error" style={{ textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="quiz-summary-strip">
            <span>{answeredCount} / {totalQuestions} reponses</span>
            {!allAnswered && <span className="quiz-warning">Completez toutes les questions avant de soumettre</span>}
          </div>
        </>
      )}

      {view === 'results' && evaluation && (
        <>
          <section className="settings-section quiz-results-header">
            <h2>{quiz?.title}</h2>
            <div className="quiz-score-display">
              <div className="quiz-score-circle" data-percentage={evaluation.percentage}>
                <svg viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" className="quiz-score-bg" />
                  <circle cx="60" cy="60" r="52" className="quiz-score-fill"
                    style={{ strokeDasharray: `${(evaluation.percentage / 100) * 327} 327` }} />
                </svg>
                <div className="quiz-score-value">
                  <span className="quiz-score-number">{evaluation.percentage}%</span>
                  <span className="quiz-score-label">{evaluation.totalScore} / {evaluation.maxScore}</span>
                </div>
              </div>
            </div>
            <p className="quiz-global-feedback">{evaluation.globalFeedback}</p>

            {evaluation.strengths && evaluation.strengths.length > 0 && (
              <div className="quiz-feedback-section">
                <h3>Points forts</h3>
                <ul className="quiz-feedback-list quiz-strengths">
                  {evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {evaluation.improvements && evaluation.improvements.length > 0 && (
              <div className="quiz-feedback-section">
                <h3>Axes d'amelioration</h3>
                <ul className="quiz-feedback-list quiz-improvements">
                  {evaluation.improvements.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </section>

          <section className="settings-section">
            <h2>Detail des reponses</h2>
            <div className="quiz-results-detail">
              {quiz?.questions?.map((q, i) => {
                const score = evaluation.scores?.find(s => s.questionId === q.id);
                return (
                  <div key={q.id} className={`quiz-result-item ${score?.correct ? 'correct' : 'incorrect'}`}>
                    <div className="quiz-result-header">
                      <span className="quiz-result-number">Q{i + 1}</span>
                      <span className="quiz-result-type">
                        {q.type === 'qcm' && 'QCM'}
                        {q.type === 'open' && 'Ouverte'}
                        {q.type === 'practical' && 'Cas pratique'}
                      </span>
                      <span className="quiz-result-score">{score?.earned ?? 0} / {score?.max ?? q.points}</span>
                    </div>
                    <p className="quiz-result-question">{q.question}</p>

                    <div className="quiz-result-answer">
                      <span className="quiz-result-answer-label">Votre reponse :</span>
                      {q.type === 'qcm' ? (
                        <span>{q.options?.[answers[i]?.answer] || 'Aucune reponse'}</span>
                      ) : (
                        <span>{answers[i]?.answer || 'Aucune reponse'}</span>
                      )}
                    </div>

                    {q.type === 'qcm' && (
                      <div className="quiz-result-correct">
                        <span className="quiz-result-answer-label">Reponse correcte :</span>
                        <span>{q.options?.[q.correctAnswer]}</span>
                      </div>
                    )}

                    {score?.feedback && (
                      <div className="quiz-result-feedback">{score.feedback}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="quiz-results-actions">
            <button type="button" className="cancel-btn" onClick={retakeQuiz}>Refaire le quiz</button>
            <button type="button" className="save-btn" onClick={resetQuiz}>Nouveau quiz</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function QuizPage() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <QuizContent />
      </AuthProvider>
    </SettingsProvider>
  );
}
