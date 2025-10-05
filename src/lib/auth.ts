export type UserRole = "elderly" | "admin" | "companion";

export type AuthUser = {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
};

const FAKE_USERS: AuthUser[] = [
  {
    id: "u1",
    username: "mary.elder",
    password: "elder123",
    name: "Mary Thompson",
    role: "elderly",
  },
  {
    id: "u2",
    username: "admin.lee",
    password: "admin123",
    name: "Alex Lee",
    role: "admin",
  },
  {
    id: "u3",
    username: "sam.volunteer",
    password: "companion123",
    name: "Sam Rivera",
    role: "companion",
  },
];

const STORAGE_KEY = "elderease_auth_user";

export const loginWithCredentials = (username: string, password: string): AuthUser | null => {
  const matchedUser = FAKE_USERS.find(
    (user) => user.username.toLowerCase() === username.toLowerCase() && user.password === password,
  );
  if (!matchedUser) return null;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(matchedUser));
  return matchedUser;
};

export const logout = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const getCurrentUser = (): AuthUser | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const requireRoleRedirectPath = (role: UserRole): string => {
  if (role === "elderly") return "/elder";
  if (role === "admin") return "/admin";
  return "/companion";
};

export const getAllFakeUsers = (): AuthUser[] => FAKE_USERS;


