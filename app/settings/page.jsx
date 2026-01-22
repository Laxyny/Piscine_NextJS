"use client";
import { useState } from 'react';
import { useAuth } from '../../frontend/hooks/useAuth';
import { useSettings } from '../../frontend/context/SettingsContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '../../frontend/hooks/useAuth';
import { SettingsProvider } from '../../frontend/context/SettingsContext';

function SettingsContent() {
    const { user, logout } = useAuth();
    const { soundSettings, updateSoundSettings, playNotification } = useSettings();
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();

    if (!user) return <div className="loading">Chargement...</div>;

    const handleClearHistory = async () => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer TOUTES vos conversations ? Cette action est irréversible.')) return;
        
        setDeleting(true);
        try {
            await fetch(`/api/chat/settings?userId=${user.uid}`, { method: 'DELETE' });
            alert('Historique supprimé.');
            router.push('/');
        } catch (e) {
            alert('Erreur lors de la suppression.');
        } finally {
            setDeleting(false);
        }
    };

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
                <h1>Paramètres</h1>
            </header>

            <section className="settings-section">
                <h2>Profil</h2>
                <div className="profile-info">
                    <img src={user?.photoURL} alt="Avatar" className="settings-avatar"/>
                    <div>
                        <p><strong>{user?.displayName}</strong></p>
                        <p>{user?.email}</p>
                    </div>
                </div>
                <button onClick={logout} className="logout-btn">Se déconnecter</button>
            </section>

            <section className="settings-section">
                <h2>Notifications sonores</h2>
                <div className="setting-row">
                    <label>Activer le son</label>
                    <input 
                        type="checkbox" 
                        checked={soundSettings.enabled} 
                        onChange={(e) => updateSoundSettings({ enabled: e.target.checked })}
                    />
                </div>
                
                {soundSettings.enabled && (
                    <div className="setting-row">
                        <label>Son de notification</label>
                        <select 
                            value={soundSettings.type}
                            onChange={(e) => {
                                updateSoundSettings({ type: e.target.value });
                            }}
                        >
                            <option value="1">Son 1 (Défaut)</option>
                            <option value="2">Son 2</option>
                            <option value="3">Son 3</option>
                            <option value="random">Aléatoire</option>
                        </select>
                        <button onClick={playNotification} className="test-sound-btn">Test</button>
                    </div>
                )}
            </section>

            <section className="settings-section danger-zone">
                <h2>Zone de danger</h2>
                <button 
                    onClick={handleClearHistory} 
                    className="delete-all-btn"
                    disabled={deleting}
                >
                    {deleting ? 'Suppression...' : 'Supprimer toutes les conversations'}
                </button>
            </section>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <SettingsProvider>
            <AuthProvider>
                <SettingsContent />
            </AuthProvider>
        </SettingsProvider>
    );
}
