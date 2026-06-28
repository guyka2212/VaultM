import { encrypt, decrypt } from './crypto.js';

const KEYS = {
  users: 'vaultm_users',
  passwords: 'vaultm_passwords',
  groups: 'vaultm_groups',
  currentUser: 'vaultm_currentUser',
  nextId: 'vaultm_nextId',
};

let encryptionKey = null;

export function setEncryptionKey(key) {
  encryptionKey = key;
}

export function clearEncryptionKey() {
  encryptionKey = null;
}

function getData(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function setData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getNextId() {
  const id = getData(KEYS.nextId) || 1;
  setData(KEYS.nextId, id + 1);
  return id;
}

export function getUsers() {
  return getData(KEYS.users) || [];
}

export function createUser(username, passwordHash, salt) {
  const users = getUsers();
  const user = { id: getNextId(), username, passwordHash, salt: Array.from(salt), createdAt: new Date().toISOString() };
  users.push(user);
  setData(KEYS.users, users);
  return { ...user };
}

export function getUserByUsername(username) {
  const users = getUsers();
  return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export function getCurrentUser() {
  return getData(KEYS.currentUser);
}

export function setCurrentUser(user) {
  setData(KEYS.currentUser, user);
}

export function clearCurrentUser() {
  localStorage.removeItem(KEYS.currentUser);
}

export function getAllPasswords() {
  return getData(KEYS.passwords) || [];
}

export function getPasswords(userId, groupId = null) {
  const all = getAllPasswords();
  return all.filter(p => p.userId === userId && p.groupId === groupId);
}

export async function addPassword(entry) {
  if (!encryptionKey) throw new Error('Not authenticated');

  const all = getAllPasswords();
  const newEntry = {
    ...entry,
    id: getNextId(),
    createdAt: new Date().toISOString(),
    domain: await encrypt(entry.domain, encryptionKey),
    username: await encrypt(entry.username, encryptionKey),
    password: await encrypt(entry.password, encryptionKey),
  };
  all.push(newEntry);
  setData(KEYS.passwords, all);
  return { ...entry, id: newEntry.id, createdAt: newEntry.createdAt };
}

export async function decryptEntry(entry) {
  if (!encryptionKey) throw new Error('Not authenticated');
  return {
    ...entry,
    domain: await decrypt(entry.domain, encryptionKey),
    username: await decrypt(entry.username, encryptionKey),
    password: await decrypt(entry.password, encryptionKey),
  };
}

export function deletePassword(id) {
  const all = getAllPasswords();
  setData(KEYS.passwords, all.filter(p => p.id !== id));
}

export function getAllGroups() {
  return getData(KEYS.groups) || [];
}

export function getGroups(userId) {
  const all = getAllGroups();
  return all.filter(g => g.ownerId === userId || g.members.includes(userId));
}

export function createGroup(name, ownerId) {
  const all = getAllGroups();
  const group = { id: getNextId(), name, ownerId, members: [ownerId], createdAt: new Date().toISOString() };
  all.push(group);
  setData(KEYS.groups, all);
  return { ...group };
}

export function getGroupById(groupId) {
  const all = getAllGroups();
  return all.find(g => g.id === groupId) || null;
}

export function addGroupMember(groupId, username) {
  const user = getUserByUsername(username);
  if (!user) throw new Error('User not found');
  const all = getAllGroups();
  const group = all.find(g => g.id === groupId);
  if (!group) throw new Error('Group not found');
  if (group.members.includes(user.id)) throw new Error('User is already a member');
  group.members.push(user.id);
  setData(KEYS.groups, all);
  return { ...group };
}
