"use client";
import Chat from '../frontend/components/Chat';
import { AuthProvider } from '../frontend/hooks/useAuth';
import { SettingsProvider } from '../frontend/context/SettingsContext';

export default function Home() {
    return (
        <main>
            <SettingsProvider>
                <AuthProvider>
                    <Chat />
                </AuthProvider>
            </SettingsProvider>
        </main>
    );
}
