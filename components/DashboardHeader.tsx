'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './DashboardHeader.module.css';

interface DashboardHeaderProps {
  userName?: string;
  userEmail?: string;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
  activeSection?: 'dashboard' | 'analytics' | 'reports' | 'settings';
  isDarkMode?: boolean;
  onThemeToggle?: () => void;
}

export default function DashboardHeader({
  userName = 'John Doe',
  userEmail = 'john@example.com',
  notificationCount = 0,
  onNotificationClick,
  onSettingsClick,
  onLogout,
  activeSection = 'dashboard',
  isDarkMode = false,
  onThemeToggle,
}: DashboardHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Extract initials from user name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, []);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'analytics', label: 'Analytics', icon: 'chart' },
    { id: 'reports', label: 'Reports', icon: 'document' },
    { id: 'settings', label: 'Settings', icon: 'gear' },
  ];

  return (
    <header
      className={`${styles.header} ${isDarkMode ? styles.darkMode : styles.lightMode}`}
      role="banner"
    >
      <div className={styles.headerContainer}>
        {/* Left Section: Logo and Brand */}
        <div className={styles.leftSection}>
          <div className={styles.brandContainer}>
            {/* Dashboard Icon - Pure CSS Grid Icon */}
            <svg
              className={styles.dashboardIcon}
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span className={styles.brandName}>Dashboard</span>
          </div>
        </div>

        {/* Center Section: Navigation */}
        <nav className={styles.centerSection} ref={menuRef}>
          {/* Hamburger Menu Button - Mobile Only */}
          <button
            className={`${styles.hamburgerBtn} ${
              isMobileMenuOpen ? styles.active : ''
            }`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
          </button>

          {/* Navigation Menu */}
          <ul
            className={`${styles.navMenu} ${
              isMobileMenuOpen ? styles.mobileOpen : ''
            }`}
            id="mobile-nav-menu"
          >
            {navigationItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`${styles.navLink} ${
                    activeSection === item.id ? styles.active : ''
                  }`}
                  aria-current={activeSection === item.id ? 'page' : undefined}
                  onClick={(e) => {
                    if (isMobileMenuOpen) {
                      setIsMobileMenuOpen(false);
                    }
                  }}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right Section: User Profile and Controls */}
        <div className={styles.rightSection}>
          {/* Notification Bell */}
          <button
            className={styles.notificationBtn}
            onClick={onNotificationClick}
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
            title="Notifications"
          >
            {/* Bell Icon */}
            <svg
              className={styles.bellIcon}
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>

            {/* Notification Badge */}
            {notificationCount > 0 && (
              <span
                className={styles.notificationBadge}
                role="status"
                aria-label={`${notificationCount} unread notifications`}
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            className={styles.themeToggleBtn}
            onClick={onThemeToggle}
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
          >
            {isDarkMode ? (
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" />
                <line
                  x1="12"
                  y1="21"
                  x2="12"
                  y2="23"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" />
                <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" />
                <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* User Profile Dropdown */}
          <div className={styles.profileContainer} ref={profileRef}>
            <button
              className={styles.profileBtn}
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              aria-label="Open user menu"
              aria-expanded={isProfileDropdownOpen}
              aria-haspopup="menu"
              title={`${userName} (${userEmail})`}
            >
              {/* User Avatar */}
              <div className={styles.userAvatar}>{getInitials(userName)}</div>

              {/* Dropdown Arrow */}
              <svg
                className={`${styles.dropdownArrow} ${
                  isProfileDropdownOpen ? styles.open : ''
                }`}
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className={styles.profileDropdown} role="menu">
                <div className={styles.profileInfo}>
                  <div className={styles.profileDropdownAvatar}>
                    {getInitials(userName)}
                  </div>
                  <div className={styles.profileDetails}>
                    <div className={styles.profileName}>{userName}</div>
                    <div className={styles.profileEmail}>{userEmail}</div>
                  </div>
                </div>

                <hr className={styles.divider} />

                <button
                  className={styles.dropdownItem}
                  onClick={() => {
                    onSettingsClick?.();
                    setIsProfileDropdownOpen(false);
                  }}
                  role="menuitem"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="1" />
                    <path d="M12 1v6m0 6v6" />
                    <path d="M4.22 4.22l4.24 4.24m2.12 2.12l4.24 4.24" />
                    <path d="M1 12h6m6 0h6" />
                    <path d="M4.22 19.78l4.24-4.24m2.12-2.12l4.24-4.24" />
                  </svg>
                  Settings
                </button>

                <button
                  className={styles.dropdownItem}
                  onClick={() => {
                    onLogout?.();
                    setIsProfileDropdownOpen(false);
                  }}
                  role="menuitem"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M10 3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
                    <path d="M17 16l4-4m0 0l-4-4m4 4H7" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
