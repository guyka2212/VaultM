import { createContext, useContext, useState, useEffect } from 'react';
import * as storage from '../services/storage';
import { hashPassword, deriveEncryptionKey, exportKey, importKey, generateSalt } from '../services/crypto';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = storage.getCurrentUser();
    if (!saved) {
      setLoading(false);
      return;
    }
    const keyB64 = sessionStorage.getItem('vaultm_encryption_key');
    if (keyB64) {
      importKey(keyB64).then(key => {
        storage.setEncryptionKey(key);
        setUser(saved);
      }).catch(() => {
        sessionStorage.removeItem('vaultm_encryption_key');
        storage.clearCurrentUser();
      }).finally(() => setLoading(false));
    } else {
      storage.clearCurrentUser();
      setLoading(false);
    }
  }, []);

  async function login(username, password) {
    const found = storage.getUserByUsername(username);
    if (!found) throw new Error('Invalid username or password');
    const hash = await hashPassword(password, new Uint8Array(found.salt));
    if (hash !== found.passwordHash) throw new Error('Invalid username or password');
    const key = await deriveEncryptionKey(password, new Uint8Array(found.salt));
    const keyB64 = await exportKey(key);
    storage.setEncryptionKey(key);
    sessionStorage.setItem('vaultm_encryption_key', keyB64);
    storage.setCurrentUser(found);
    setUser(found);
  }

  async function register(username, password) {
    if (storage.getUserByUsername(username)) {
      throw new Error('Username already exists');
    }
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const created = storage.createUser(username, passwordHash, salt);
    const key = await deriveEncryptionKey(password, salt);
    const keyB64 = await exportKey(key);
    storage.setEncryptionKey(key);
    sessionStorage.setItem('vaultm_encryption_key', keyB64);
    storage.setCurrentUser(created);
    setUser(created);
  }

  function logout() {
    storage.clearCurrentUser();
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
