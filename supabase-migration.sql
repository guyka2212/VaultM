-- VaultM Supabase Schema
-- Run this in Supabase SQL Editor

-- Profiles extending Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Groups
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view groups"
  ON public.groups FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create groups"
  ON public.groups FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Group members
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read group members"
  ON public.group_members FOR SELECT USING (true);

CREATE POLICY "Owner can add members"
  ON public.group_members FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owner can remove members"
  ON public.group_members FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND owner_id = auth.uid())
  );

-- Passwords (encrypted fields stored as TEXT)
CREATE TABLE IF NOT EXISTS public.passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view passwords"
  ON public.passwords FOR SELECT USING (
    owner_id = auth.uid() OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_members WHERE group_id = passwords.group_id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert passwords"
  ON public.passwords FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can update passwords"
  ON public.passwords FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owner can delete passwords"
  ON public.passwords FOR DELETE USING (owner_id = auth.uid());
