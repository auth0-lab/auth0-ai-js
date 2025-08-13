import { createContext } from "react";

export interface User {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  [key: string]: any;
}

export interface Auth0ContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  error: string | null;
  login: (targetUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string>;
}

export const Auth0Context = createContext<Auth0ContextType | undefined>(
  undefined
);
