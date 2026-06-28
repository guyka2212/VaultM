import { supabase } from './supabaseClient';
import { encrypt, decrypt } from './crypto.js';

let encryptionKey = null;

export function setEncryptionKey(key) {
  encryptionKey = key;
}

export function clearEncryptionKey() {
  encryptionKey = null;
}

// ---- Profiles ----

export async function getUsers() {
  const { data, error } = await supabase.from('profiles').select('id, username');
  if (error) throw error;
  return data || [];
}

export async function getUserByUsername(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, salt, email')
    .ilike('username', username)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function getProfileById(id) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, salt, email')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// ---- Groups ----

export async function getGroups() {
  const { data, error } = await supabase.from('groups').select('*');
  if (error) throw error;
  return data || [];
}

export async function getGroupById(groupId) {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();
  if (error) throw error;

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);
  if (error) throw error;

  return { ...data, members: (members || []).map(m => m.user_id) };
}

export async function createGroup(name, ownerId) {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;

  const { error: mErr } = await supabase
    .from('group_members')
    .insert({ group_id: data.id, user_id: ownerId });
  if (mErr) throw mErr;

  return { ...data, members: [ownerId] };
}

export async function addGroupMember(groupId, username) {
  const user = await getUserByUsername(username);
  if (!user) throw new Error('User not found');

  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: user.id });
  if (error) {
    if (error.code === '23505') throw new Error('User is already a member');
    throw error;
  }
}

// ---- Passwords ----

export async function getPasswords(userId, groupId = null) {
  let query = supabase.from('passwords').select('*').eq('owner_id', userId);

  if (groupId === null) {
    query = query.is('group_id', null);
  } else {
    query = query.eq('group_id', groupId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addPassword(entry) {
  if (!encryptionKey) throw new Error('Not authenticated');

  const encrypted = {
    owner_id: entry.userId,
    group_id: entry.groupId || null,
    domain: await encrypt(entry.domain, encryptionKey),
    username: await encrypt(entry.username, encryptionKey),
    password: await encrypt(entry.password, encryptionKey),
    note: entry.note ? await encrypt(entry.note, encryptionKey) : '',
  };

  const { data, error } = await supabase
    .from('passwords')
    .insert(encrypted)
    .select()
    .single();
  if (error) throw error;

  return { ...entry, id: data.id, createdAt: data.created_at };
}

export async function decryptEntry(entry) {
  if (!encryptionKey) throw new Error('Not authenticated');
  return {
    ...entry,
    domain: await decrypt(entry.domain, encryptionKey),
    username: await decrypt(entry.username, encryptionKey),
    password: await decrypt(entry.password, encryptionKey),
    note: entry.note ? await decrypt(entry.note, encryptionKey) : '',
  };
}

export async function deletePassword(id) {
  const { error } = await supabase.from('passwords').delete().eq('id', id);
  if (error) throw error;
}
