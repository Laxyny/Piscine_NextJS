"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [soundSettings, setSoundSettings] = useState({
    enabled: true,
    type: '1' 
  });

  useEffect(() => {
    const stored = localStorage.getItem('chatApp_settings');
    if (stored) {
      setSoundSettings(JSON.parse(stored));
    }
  }, []);

  const updateSoundSettings = (newSettings) => {
    const updated = { ...soundSettings, ...newSettings };
    setSoundSettings(updated);
    localStorage.setItem('chatApp_settings', JSON.stringify(updated));
  };

  const playNotification = () => {
    if (!soundSettings.enabled) return;

    let file = '/notification.mp3';
    if (soundSettings.type === 'random') {
      const opts = ['1', '2', '3'];
      const rand = opts[Math.floor(Math.random() * opts.length)];
      file = `/notification${rand}.mp3`; 
    } else {
       // Assuming user will provide notification1.mp3, notification2.mp3 etc.
       // For now, mapping all to the default file or hypothetically named files
       // To match your environment, we default to notification.mp3 if type is 1
       if (soundSettings.type === '1') file = '/notification.mp3';
       else file = `/notification${soundSettings.type}.mp3`;
    }

    // Fallback if specific files don't exist yet, we just play the main one
    // But logically this is where the switch happens
    const audio = new Audio(file);
    audio.play().catch(() => {});
  };

  return (
    <SettingsContext.Provider value={{ soundSettings, updateSoundSettings, playNotification }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
