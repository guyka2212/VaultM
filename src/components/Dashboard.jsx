import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import * as storage from '../services/storage';
import PasswordList from './PasswordList';
import AddPasswordModal from './AddPasswordModal';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  const [activeView, setActiveView] = useState('personal');
  const [groups, setGroups] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [groupError, setGroupError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  function loadGroups() {
    setGroups(storage.getGroups(user.id));
  }

  useEffect(() => {
    loadGroups();
  }, [user.id]);

  function handleCreateGroup(e) {
    e.preventDefault();
    setGroupError('');
    if (!groupName.trim()) {
      setGroupError('Group name is required');
      return;
    }
    try {
      const g = storage.createGroup(groupName.trim(), user.id);
      loadGroups();
      setActiveView(g.id);
      setShowCreateGroup(false);
      setGroupName('');
      addToast(`Group "${g.name}" created`);
    } catch (err) {
      setGroupError(err.message);
    }
  }

  function handleInvite(e) {
    e.preventDefault();
    setInviteError('');
    if (!inviteUsername.trim()) {
      setInviteError('Username is required');
      return;
    }
    const gid = activeView === 'personal' ? null : activeView;
    if (!gid) return;
    try {
      storage.addGroupMember(gid, inviteUsername.trim());
      loadGroups();
      setInviteUsername('');
      setShowInvite(false);
      addToast('Member invited');
    } catch (err) {
      setInviteError(err.message);
    }
  }

  const activeGroup = activeView !== 'personal'
    ? groups.find(g => g.id === activeView)
    : null;

  const isOwner = activeGroup && activeGroup.ownerId === user.id;

  const availableUsers = storage.getUsers().filter(u =>
    u.id !== user.id && (!activeGroup || !activeGroup.members.includes(u.id))
  );

  function getActiveTitle() {
    if (activeView === 'personal') return 'Personal Vault';
    return activeGroup ? activeGroup.name : 'Vault';
  }

  function triggerRefresh() {
    setRefreshKey(k => k + 1);
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar__logo">
          <span className="sidebar__logo-icon">&#x1F512;</span>
          <span className="sidebar__logo-text">VaultM</span>
        </div>

        <nav className="sidebar__nav">
          <button
            className={`sidebar__item ${activeView === 'personal' ? 'sidebar__item--active' : ''}`}
            onClick={() => setActiveView('personal')}
          >
            <span className="sidebar__item-icon">&#x1F4C1;</span>
            <span>Personal Vault</span>
          </button>

          {groups.length > 0 && (
            <div className="sidebar__section">
              <div className="sidebar__section-title">Groups</div>
              {groups.map(g => (
                <button
                  key={g.id}
                  className={`sidebar__item ${activeView === g.id ? 'sidebar__item--active' : ''}`}
                  onClick={() => setActiveView(g.id)}
                >
                  <span className="sidebar__item-icon">&#x1F465;</span>
                  <span>{g.name}</span>
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className="sidebar__bottom">
          <button className="btn btn--sidebar" onClick={() => setShowCreateGroup(true)}>
            + Create Group
          </button>
          <div className="sidebar__user">
            <span className="sidebar__user-name">{user.username}</span>
            <button className="btn-link" onClick={logout}>Logout</button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="main__header">
          <div className="main__header-left">
            <h1 className="main__title">{getActiveTitle()}</h1>
            {activeGroup && isOwner && (
              <button
                className="btn btn--small btn--outline"
                onClick={() => setShowInvite(true)}
              >
                Invite Member
              </button>
            )}
          </div>
          <button className="btn btn--primary" onClick={() => setShowAddModal(true)}>
            + Add Password
          </button>
        </header>

        <PasswordList groupId={activeView} refreshKey={refreshKey} />
      </main>

      {showAddModal && (
        <AddPasswordModal
          onClose={() => setShowAddModal(false)}
          groupId={activeView === 'personal' ? null : activeView}
          onSaved={triggerRefresh}
        />
      )}

      {showCreateGroup && (
        <div className="modal-overlay" onClick={() => setShowCreateGroup(false)}>
          <div className="modal modal--small" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Create Group</h2>
              <button className="modal__close" onClick={() => setShowCreateGroup(false)}>&times;</button>
            </div>
            {groupError && <div className="auth-error">{groupError}</div>}
            <form onSubmit={handleCreateGroup} className="modal__form">
              <div className="form-group">
                <label htmlFor="group-name">Group Name</label>
                <input
                  id="group-name"
                  type="text"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="e.g. Work, Family"
                  autoFocus
                />
              </div>
              <div className="modal__actions">
                <button type="button" className="btn btn--outline" onClick={() => setShowCreateGroup(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInvite && activeGroup && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="modal modal--small" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Invite to {activeGroup.name}</h2>
              <button className="modal__close" onClick={() => setShowInvite(false)}>&times;</button>
            </div>
            {inviteError && <div className="auth-error">{inviteError}</div>}
            {availableUsers.length === 0 && (
              <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                No other registered users found. All existing users are already members.
              </p>
            )}
            {availableUsers.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>
                  Registered Users
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {availableUsers.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setInviteUsername(u.username);
                      }}
                      style={{
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.8rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        background: inviteUsername === u.username ? '#6366f1' : '#fff',
                        color: inviteUsername === u.username ? '#fff' : '#374151',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {u.username}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <form onSubmit={handleInvite} className="modal__form">
              <div className="form-group">
                <label htmlFor="invite-username">Or type username</label>
                <input
                  id="invite-username"
                  type="text"
                  value={inviteUsername}
                  onChange={e => setInviteUsername(e.target.value)}
                  placeholder="Enter username to invite"
                  autoFocus
                />
              </div>
              <div className="modal__actions">
                <button type="button" className="btn btn--outline" onClick={() => setShowInvite(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
