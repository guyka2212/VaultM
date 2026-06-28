import { useState, useEffect } from 'react';
import * as storage from '../services/storage';
import { useToast } from '../contexts/ToastContext';

export default function PasswordList({ groupId, refreshKey }) {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [revealed, setRevealed] = useState(new Set());
  const { addToast } = useToast();

  async function loadEntries(gid) {
    const raw = storage.getPasswords(storage.getCurrentUser().id, gid === 'personal' ? null : gid);
    const decrypted = await Promise.all(raw.map(e => storage.decryptEntry(e)));
    setEntries(decrypted);
  }

  useEffect(() => {
    loadEntries(groupId);
    setRevealed(new Set());
    setSearch('');
  }, [groupId, refreshKey]);

  const filtered = entries.filter(e =>
    e.domain.toLowerCase().includes(search.toLowerCase()) ||
    e.username.toLowerCase().includes(search.toLowerCase())
  );

  function toggleReveal(id) {
    setRevealed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function copyPassword(entry) {
    navigator.clipboard.writeText(entry.password).then(() => {
      addToast('Password copied');
    }).catch(() => {
      addToast('Failed to copy', 'error');
    });
  }

  async function handleDelete(id) {
    storage.deletePassword(id);
    await loadEntries(groupId);
    addToast('Password deleted');
  }

  return (
    <div className="vault-content">
      <div className="vault-toolbar">
        <div className="search-box">
          <span className="search-box__icon">&#x1F50D;</span>
          <input
            type="text"
            placeholder="Search by domain or username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="vault-empty">
          {search ? 'No passwords match your search.' : 'No passwords yet. Add one to get started.'}
        </div>
      ) : (
        <div className="password-list">
          {filtered.map(entry => (
            <div key={entry.id} className="password-entry">
              <div className="password-entry__info">
                <div className="password-entry__domain">{entry.domain}</div>
                <div className="password-entry__username">{entry.username}</div>
                <div className="password-entry__password">
                  {revealed.has(entry.id) ? (
                    entry.password
                  ) : (
                    '•'.repeat(Math.min(entry.password.length, 20))
                  )}
                </div>
              </div>
              <div className="password-entry__actions">
                <button
                  className="btn btn--icon"
                  title={revealed.has(entry.id) ? 'Hide' : 'Reveal'}
                  onClick={() => toggleReveal(entry.id)}
                >
                  {revealed.has(entry.id) ? '\u{1F441}' : '\u{1F576}'}
                </button>
                <button
                  className="btn btn--icon"
                  title="Copy password"
                  onClick={() => copyPassword(entry)}
                >
                  &#x1F4CB;
                </button>
                <button
                  className="btn btn--icon btn--icon-danger"
                  title="Delete"
                  onClick={() => handleDelete(entry.id)}
                >
                  &#x1F5D1;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
