import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import * as storage from '../services/storage';
import { deriveEncryptionKey, exportKey, importKey, generateSalt } from '../services/crypto';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        storage.getProfileById(session.user.id).then(async profile => {
          const keyB64 = sessionStorage.getItem('vaultm_encryption_key');
          if (keyB64) {
            try {
              const key = await importKey(keyB64);
              storage.setEncryptionKey(key);
            } catch {
              sessionStorage.removeItem('vaultm_encryption_key');
            }
          }
          setUser({ id: profile.id, username: profile.username });
          setLoading(false);
        }).catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        storage.clearEncryptionKey();
        sessionStorage.removeItem('vaultm_encryption_key');
        setUser(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  async function login(username, password) {
    const profile = await storage.getUserByUsername(username);
    if (!profile) throw new Error('Invalid username or password');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: `${username}@vaultm.app`,
      password,
    });
    if (signInError) throw new Error('Invalid username or password');

    const salt = Uint8Array.from(atob(profile.salt), c => c.charCodeAt(0));
    const key = await deriveEncryptionKey(password, salt);
    const keyB64 = await exportKey(key);
    storage.setEncryptionKey(key);
    sessionStorage.setItem('vaultm_encryption_key', keyB64);
    setUser({ id: profile.id, username: profile.username });
  }

  async function register(username, password) {
    const existing = await storage.getUserByUsername(username);
    if (existing) throw new Error('Username already exists');

    const salt = generateSalt();
    const saltB64 = btoa(String.fromCharCode(...salt));
    const key = await deriveEncryptionKey(password, salt);
    const keyB64 = await exportKey(key);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: `${username}@vaultm.app`,
      password,
    });
    if (signUpError) throw signUpError;
    if (!signUpData.user) throw new Error('Registration failed. Check that email confirmation is disabled in Supabase settings.');

    const { error: profileError } = await supabase.from('profiles').insert({
      id: signUpData.user.id,
      username,
      salt: saltB64,
    });
    if (profileError) throw profileError;

    storage.setEncryptionKey(key);
    sessionStorage.setItem('vaultm_encryption_key', keyB64);
    setUser({ id: signUpData.user.id, username });
  }

  async function logout() {
    await supabase.auth.signOut();
    storage.clearEncryptionKey();
    sessionStorage.removeItem('vaultm_encryption_key');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
