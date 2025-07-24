import { createContext } from "react";
import { User } from "shared/dist";

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
