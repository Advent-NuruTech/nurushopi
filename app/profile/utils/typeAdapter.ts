// app/profile/utils/typeAdapter.ts
export type ContextAppUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
};

export type LocalAppUser = {
  id?: string;
  name?: string;
  email?: string;
  imageUrl?: string;
};

export const adaptAppUser = (contextUser: ContextAppUser | null): LocalAppUser | null => {
  if (!contextUser) return null;
  
  return {
    id: contextUser.id,
    name: contextUser.name ?? undefined,
    email: contextUser.email ?? undefined,
    imageUrl: contextUser.imageUrl ?? undefined,
  };
};