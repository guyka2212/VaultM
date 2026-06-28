import { useState } from 'react';
import * as storage from '../services/storage';
import { getPasswordStrength, getStrengthLabel, getStrengthColor, generatePassword } from '../services/passwordUtils';
import { useToast } from '../contexts/ToastContext';

export default function AddPasswordModal({ onClose, groupId, onSaved }) {
  const [domain, setDomain] = useState('');
  const [entryUsername, setEntryUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const strength = getPasswordStrength(password);
  const strengthLabel = getStrengthLabel(strength);
  const strengthColor = getStrengthColor(strength);

  function handleGenerate() {
    setPassword(generatePassword());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!domain.trim() || !entryUsername.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }

    setSaving(true);
    try {
      const cur = storage.getCurrentUser();
      await storage.addPassword({
        userId: cur.id,
        groupId: groupId || null,
        domain: domain.trim(),
        username: entryUsername.trim(),
        password: password,
      });
      addToast('Password saved');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Add Password</h2>
          <button className="modal__close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal__form">
          <div className="form-group">
            <label htmlFor="add-domain">Domain / Website</label>
            <input
              id="add-domain"
              type="text"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="e.g. google.com"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="add-username">Username / Email</label>
            <input
              id="add-username"
              type="text"
              value={entryUsername}
              onChange={e => setEntryUsername(e.target.value)}
              placeholder="e.g. user@example.com"
            />
          </div>

          <div className="form-group">
            <div className="password-input-row">
              <label htmlFor="add-password">Password</label>
              <button type="button" className="btn btn--small btn--outline" onClick={handleGenerate}>
                Generate
              </button>
            </div>
            <input
              id="add-password"
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter a password"
            />
            {password && (
              <div className="strength-meter">
                <div className="strength-meter__bar">
                  <div
                    className="strength-meter__fill"
                    style={{
                      width: `${((strength + 1) / 5) * 100}%`,
                      backgroundColor: strengthColor,
                    }}
                  />
                </div>
                <span className="strength-meter__label" style={{ color: strengthColor }}>
                  {strengthLabel}
                </span>
              </div>
            )}
          </div>

          <div className="modal__actions">
            <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
