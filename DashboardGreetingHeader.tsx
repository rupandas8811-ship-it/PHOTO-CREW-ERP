import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useRole } from './RoleContext';
import { AnimatedSalesGreeting } from './sales/AnimatedSalesGreeting';

export interface DashboardGreetingHeaderProps {
  dashboardTitle: string;
  userName?: string;
  userMobile?: string;
  className?: string;
}

const ROLE_PLACEHOLDERS = [
  'Sales Team',
  'Operations Team',
  'Production Team',
  'Business Owner',
  'Operation Staff',
  'Operations Staff',
  'Production Staff',
  'Staff',
  'Admin',
  'User',
];

export const DashboardGreetingHeader: React.FC<DashboardGreetingHeaderProps> = ({
  dashboardTitle,
  userName,
  userMobile,
  className = '',
}) => {
  const { currentUser, currentUserName, users = [], staff = [], productionStaff = [] } = useRole();

  // Minimization and manual expand/collapse state
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [manuallyExpanded, setManuallyExpanded] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Resolve user's actual display name
  const finalUserName = useMemo(() => {
    // If explicitly provided and not a placeholder, use it
    if (userName && !ROLE_PLACEHOLDERS.includes(userName.trim())) {
      return userName.trim();
    }

    // Try currentUser name
    if (currentUser?.name && !ROLE_PLACEHOLDERS.includes(currentUser.name.trim())) {
      return currentUser.name.trim();
    }
    if ((currentUser as any)?.full_name && !ROLE_PLACEHOLDERS.includes((currentUser as any).full_name.trim())) {
      return (currentUser as any).full_name.trim();
    }

    // Try currentUserName from context
    if (currentUserName && !ROLE_PLACEHOLDERS.includes(currentUserName.trim())) {
      return currentUserName.trim();
    }

    // Look up in users list
    if (currentUser?.id || currentUser?.email || currentUser?.mobile) {
      const matchedUser = (users || []).find((u: any) =>
        (currentUser?.id && (u.id === currentUser.id || (u as any).auth_user_id === currentUser.id)) ||
        (currentUser?.email && u.email && u.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser?.mobile && u.mobile && u.mobile === currentUser.mobile)
      );
      if (matchedUser?.name && !ROLE_PLACEHOLDERS.includes(matchedUser.name.trim())) {
        return matchedUser.name.trim();
      }
      if (matchedUser?.full_name && !ROLE_PLACEHOLDERS.includes(matchedUser.full_name.trim())) {
        return matchedUser.full_name.trim();
      }
    }

    // Look up in staff lists
    const allStaff = [...(staff || []), ...(productionStaff || [])];
    if (currentUser?.id || currentUser?.email || currentUser?.mobile) {
      const matchedStaff = allStaff.find((s: any) =>
        (currentUser?.id && s.staff_id === currentUser.id) ||
        (currentUser?.email && s.email && s.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser?.mobile && s.mobile && s.mobile === currentUser.mobile)
      );
      if (matchedStaff?.name && !ROLE_PLACEHOLDERS.includes(matchedStaff.name.trim())) {
        return matchedStaff.name.trim();
      }
    }

    return '';
  }, [userName, currentUser, currentUserName, users, staff, productionStaff]);

  // Fallback display name for the compact minimized header
  const displayName = useMemo(() => {
    if (finalUserName && finalUserName.trim()) return finalUserName.trim();
    if (userName && userName.trim()) return userName.trim();
    if (currentUser?.name && currentUser.name.trim()) return currentUser.name.trim();
    if (currentUserName && currentUserName.trim()) return currentUserName.trim();
    return '';
  }, [finalUserName, userName, currentUser, currentUserName]);

  // 2. Resolve user's actual mobile number
  const finalMobile = useMemo(() => {
    if (userMobile && userMobile.trim()) {
      return userMobile.trim();
    }

    if (currentUser?.mobile && currentUser.mobile.trim()) {
      return currentUser.mobile.trim();
    }
    if ((currentUser as any)?.phone && (currentUser as any).phone.trim()) {
      return (currentUser as any).phone.trim();
    }

    // Look up in users
    const matchedUser = (users || []).find((u: any) =>
      (currentUser?.id && (u.id === currentUser.id || (u as any).auth_user_id === currentUser.id)) ||
      (currentUser?.email && u.email && u.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.name && u.name && u.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
      (finalUserName && u.name && u.name.trim().toLowerCase() === finalUserName.toLowerCase())
    );
    if (matchedUser?.mobile && matchedUser.mobile.trim()) return matchedUser.mobile.trim();
    if ((matchedUser as any)?.phone && (matchedUser as any).phone.trim()) return (matchedUser as any).phone.trim();

    // Look up in staff
    const allStaff = [...(staff || []), ...(productionStaff || [])];
    const matchedStaff = allStaff.find((s: any) =>
      (currentUser?.id && s.staff_id === currentUser.id) ||
      (currentUser?.email && s.email && s.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.name && s.name && s.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
      (finalUserName && s.name && s.name.trim().toLowerCase() === finalUserName.toLowerCase())
    );
    if (matchedStaff?.mobile && matchedStaff.mobile.trim()) return matchedStaff.mobile.trim();
    if ((matchedStaff as any)?.phone && (matchedStaff as any).phone.trim()) return (matchedStaff as any).phone.trim();

    return '';
  }, [userMobile, currentUser, finalUserName, users, staff, productionStaff]);

  // 8-second automatic minimization lifecycle
  useEffect(() => {
    // Reset view to expanded when entering or switching dashboards
    setIsMinimized(false);
    setManuallyExpanded(false);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Automatically minimize after 8 seconds
    timerRef.current = setTimeout(() => {
      setIsMinimized(true);
      timerRef.current = null;
    }, 8000);

    // Clean up timer on unmount or when dashboard changes
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [dashboardTitle]);

  const handleManualMinimize = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setManuallyExpanded(false);
    setIsMinimized(true);
  };

  const handleManualExpand = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // If the user manually expands the section, keep it expanded until they minimize again or navigate
    setManuallyExpanded(true);
    setIsMinimized(false);
  };

  // Minimized View: compact header with dashboard name, logged-in user name, and expand button
  if (isMinimized) {
    return (
      <div 
        id={`welcome_minimized_${dashboardTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}`}
        className={`select-none transition-all duration-200 py-0.5 ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="leading-tight">
            <h1 className="text-sm sm:text-base font-bold text-white font-sans tracking-tight">
              {dashboardTitle}
            </h1>
            {displayName ? (
              <p className="text-xs sm:text-sm font-semibold text-amber-400 font-sans mt-0.5">
                {displayName}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleManualExpand}
            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/80 active:scale-95 transition-all cursor-pointer border border-transparent hover:border-zinc-700/60 shrink-0"
            title="Expand welcome section"
            aria-label="Expand welcome section"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-400 hover:text-amber-400" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded View: normal welcome section with greeting, welcome message, mobile, and minus (-) button
  return (
    <div 
      id={`welcome_expanded_${dashboardTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}`}
      className={`space-y-1 select-none transition-all duration-200 ${className}`}
    >
      {/* 1. Dashboard Heading row with minus (-) button */}
      <div className="flex items-center gap-2">
        <h1 className="text-sm sm:text-base font-bold text-white font-sans tracking-tight">
          {dashboardTitle}
        </h1>
        <button
          type="button"
          onClick={handleManualMinimize}
          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/80 active:scale-95 transition-all cursor-pointer border border-transparent hover:border-zinc-700/60 shrink-0"
          title="Minimize welcome section"
          aria-label="Minimize welcome section"
        >
          <Minus className="w-3.5 h-3.5 text-zinc-400 hover:text-amber-400" />
        </button>
      </div>

      {/* 2, 3, & 4. Greeting Details (hidden in minimized mode) */}
      <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:transition-none motion-reduce:animate-none">
        {/* 2 & 3. Animated Greeting Section (Time-Based Greeting + Personalized Welcome Message) */}
        <AnimatedSalesGreeting salesPersonName={finalUserName} />

        {/* 4. Logged-in User's Mobile Number (omitted if unavailable) */}
        {finalMobile ? (
          <p className="text-xs sm:text-sm font-mono text-zinc-400">
            {finalMobile}
          </p>
        ) : null}
      </div>
    </div>
  );
};

