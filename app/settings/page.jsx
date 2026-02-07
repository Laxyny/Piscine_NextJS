"use client";
import { useState } from 'react';
import { useAuth } from '../../frontend/hooks/useAuth';
import { useSettings } from '../../frontend/context/SettingsContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '../../frontend/hooks/useAuth';
import { SettingsProvider } from '../../frontend/context/SettingsContext';
import { getDisplayName, getInitials } from '../../frontend/utils/displayName';

function SettingsContent() {
    const { user, logout, updateDisplayName } = useAuth();
    const { soundSettings, updateSoundSettings, playNotification } = useSettings();
    const [deleting, setDeleting] = useState(false);
    const [displayNameEdit, setDisplayNameEdit] = useState('');
    const [savingName, setSavingName] = useState(false);
    const [nameError, setNameError] = useState('');
    const router = useRouter();

    if (!user) return <div className="loading">Chargement...</div>;

    const currentDisplayName = getDisplayName(user);

    const handleSaveDisplayName = async () => {
        const name = (displayNameEdit || currentDisplayName).trim();
        if (!name) {
            setNameError('Indiquez un nom d\'affichage.');
            return;
        }
        setNameError('');
        setSavingName(true);
        try {
            await updateDisplayName(name);
            setDisplayNameEdit('');
        } catch (e) {
            setNameError('Impossible d\'enregistrer.');
        } finally {
            setSavingName(false);
        }
    };

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
                    {user?.photoURL ? (
                        <img src={user.photoURL} alt="" className="settings-avatar" />
                    ) : (
                        <span className="settings-avatar settings-avatar-initials">{getInitials(currentDisplayName)}</span>
                    )}
                    <div className="profile-details">
                        <div className="setting-row display-name-row">
                            <label>Nom d'affichage</label>
                            <div className="display-name-edit">
                                <input
                                    type="text"
                                    value={displayNameEdit !== '' ? displayNameEdit : currentDisplayName}
                                    onChange={(e) => { setDisplayNameEdit(e.target.value); setNameError(''); }}
                                    placeholder="Prénom Nom ou pseudo"
                                    className="display-name-input"
                                />
                                <button type="button" onClick={handleSaveDisplayName} className="save-display-name-btn" disabled={savingName}>
                                    {savingName ? 'Enregistrement...' : 'Enregistrer'}
                                </button>
                            </div>
                        </div>
                        {nameError && <p className="profile-error">{nameError}</p>}
                        <p className="profile-email">{user?.email}</p>
                    </div>
                </div>
                <button onClick={() => { logout(); router.push('/'); }} className="logout-btn">Se déconnecter</button>
            </section>

            {/* <section className="settings-section">
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
            </section> */}

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
