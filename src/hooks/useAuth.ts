import React, { useState, createContext, useContext, ReactNode } from "react";
import type { User, SetupData } from "../types";

interface AuthContextValue {
  isAuthenticated: boolean;
  user: User | null;
  login: (keypair: File) => Promise<void>;
  logout: () => void;
  setup: (data: SetupData) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  const login = async (_keypair: File): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const mockUser: User = {
      id: "1",
      username: "lobster_lover",
      displayName: "Claw Master",
      createdAt: new Date().toISOString(),
    };
    
    setUser(mockUser);
    setIsAuthenticated(true);
  };

  const logout = (): void => {
    setUser(null);
    setIsAuthenticated(false);
  };

  const setup = async (data: SetupData): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const newUser: User = {
      id: Math.random().toString(36).substring(7),
      username: data.username,
      displayName: data.displayName,
      avatar: data.avatar,
      createdAt: new Date().toISOString(),
    };
    
    setUser(newUser);
    setIsAuthenticated(true);
  };

  const contextValue: AuthContextValue = {
    isAuthenticated,
    user,
    login,
    logout,
    setup,
  };

  return React.createElement(
    AuthContext.Provider,
    { value: contextValue },
    children
  );
}