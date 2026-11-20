'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import {
  getSupabaseBrowserClient,
  getBrowserAuthToken,
  ensureAnonymousSession,
  determineTrustTier,
  signInWithGoogle as apiSignInWithGoogle,
  sendPhoneOtp as apiSendPhoneOtp,
  verifyPhoneOtp as apiVerifyPhoneOtp,
  sendEmailOtp as apiSendEmailOtp,
  verifyEmailOtp as apiVerifyEmailOtp,
  signOutUser as apiSignOutUser,
  UserTrustInfo,
} from '@/lib/supabase';
import { normalizeBangladeshiPhone } from '@/lib/bengali-utils';

export type AuthModalMode = 'login' | 'upgrade' | 'phone';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  trustInfo: UserTrustInfo;
  isAnonymous: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
  sendPhoneOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ success: boolean; error?: string }>;
  sendEmailOtp: (email: string, redirectTo?: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');

  const trustInfo = useMemo(() => determineTrustTier(user), [user]);
  const isAnonymous = trustInfo.tier === 'anonymous';

  const refreshUser = useCallback(async () => {
    try {
      const client = getSupabaseBrowserClient();
      const { data } = await client.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
    } catch {
      // Graceful fallback
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const client = getSupabaseBrowserClient();

    // 1. Initial session load
    client.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      } else {
        // Transparently provision anonymous session if needed
        await ensureAnonymousSession();
        const { data: newSession } = await client.auth.getSession();
        if (isMounted) {
          setSession(newSession.session);
          setUser(newSession.session?.user ?? null);
        }
      }
      setIsLoading(false);
    });

    // 2. Real-time auth state listener
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = useCallback((mode: AuthModalMode = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    try {
      const res = await apiSignInWithGoogle(redirectTo);
      if (res?.error) {
        return { error: res.error };
      }
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }, []);

  const sendPhoneOtp = useCallback(async (phone: string) => {
    const { normalized, isValid } = normalizeBangladeshiPhone(phone);
    if (!isValid) {
      return {
        success: false,
        error: 'সঠিক বাংলাদেশি মোবাইল নম্বর প্রদান করুন (যেমন: 017XXXXXXXX)।',
      };
    }

    try {
      const { error } = await apiSendPhoneOtp(normalized);
      if (error) {
        return {
          success: false,
          error: error.message || 'ওটিপি কোড পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
        };
      }
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'সার্ভারে সংযোগ করা যায়নি।',
      };
    }
  }, []);

  const verifyPhoneOtp = useCallback(async (phone: string, token: string) => {
    const { normalized, isValid } = normalizeBangladeshiPhone(phone);
    if (!isValid) {
      return {
        success: false,
        error: 'মোবাইল নম্বর সঠিক নয়।',
      };
    }

    const cleanToken = token.trim();
    if (cleanToken.length < 6) {
      return {
        success: false,
        error: 'সঠিক ৬ ডিজিটের ওটিপি কোড দিন।',
      };
    }

    try {
      const { data, error } = await apiVerifyPhoneOtp(normalized, cleanToken);
      if (error) {
        return {
          success: false,
          error: error.message || 'ভুল বা মেয়াদোত্তীর্ণ ওটিপি কোড।',
        };
      }

      if (data?.user) {
        setUser(data.user);
        setSession(data.session);
      }
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'ওটিপি যাচাই ব্যর্থ হয়েছে।',
      };
    }
  }, []);

  const sendEmailOtp = useCallback(async (email: string, redirectTo?: string) => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      return {
        success: false,
        error: 'সঠিক ইমেইল ঠিকানা দিন।',
      };
    }

    try {
      const { error } = await apiSendEmailOtp(trimmed, redirectTo);
      if (error) {
        return {
          success: false,
          error: error.message || 'ইমেইল কোড পাঠানো সম্ভব হয়নি।',
        };
      }
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'সার্ভারে সংযোগ করা যায়নি।',
      };
    }
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const trimmed = email.trim();
    const cleanToken = token.trim();
    if (!trimmed || cleanToken.length < 6) {
      return {
        success: false,
        error: 'সঠিক তথ্য দিন।',
      };
    }

    try {
      const { data, error } = await apiVerifyEmailOtp(trimmed, cleanToken);
      if (error) {
        return {
          success: false,
          error: error.message || 'ভুল বা মেয়াদোত্তীর্ণ ওটিপি কোড।',
        };
      }

      if (data?.user) {
        setUser(data.user);
        setSession(data.session);
      }
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'যাচাই ব্যর্থ হয়েছে।',
      };
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiSignOutUser();
      const client = getSupabaseBrowserClient();
      const { data } = await client.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAuthToken = useCallback(async () => {
    return await getBrowserAuthToken();
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      trustInfo,
      isAnonymous,
      isLoading,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      signInWithGoogle,
      sendPhoneOtp,
      verifyPhoneOtp,
      sendEmailOtp,
      verifyEmailOtp,
      signOut,
      getAuthToken,
      refreshUser,
    }),
    [
      user,
      session,
      trustInfo,
      isAnonymous,
      isLoading,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      signInWithGoogle,
      sendPhoneOtp,
      verifyPhoneOtp,
      sendEmailOtp,
      verifyEmailOtp,
      signOut,
      getAuthToken,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
