'use client';

import React, { useState } from 'react';
import DashboardHeader from './DashboardHeader';
import styles from './DashboardDemo.module.css';

/**
 * DashboardDemo Component
 * 
 * Demonstrates the DashboardHeader with:
 * - Sample dashboard content
 * - Dark/Light mode toggle
 * - Notification handling
 * - Responsive layout showcase
 */

export default function DashboardDemo() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const [activeSection, setActiveSection] = useState('dashboard');

  const handleNotificationClick = () => {
    alert('Notifications clicked!');
    setNotificationCount(0);
  };

  const handleSettingsClick = () => {
    alert('Settings clicked!');
  };

  const handleLogout = () => {
    alert('Logout clicked!');
  };

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`${styles.wrapper} ${isDarkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header */}
      <DashboardHeader
        userName="Alex Johnson"
        userEmail="alex.johnson@company.com"
        notificationCount={notificationCount}
        onNotificationClick={handleNotificationClick}
        onSettingsClick={handleSettingsClick}
        onLogout={handleLogout}
        activeSection={activeSection as 'dashboard' | 'analytics' | 'reports' | 'settings'}
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
      />

      {/* Main Content */}
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Page Title */}
          <section className={styles.headerSection}>
            <h1>Dashboard</h1>
            <p>Welcome back! Here's your dashboard overview.</p>
          </section>

          {/* Key Metrics */}
          <section className={styles.metricsSection}>
            <h2>Key Metrics</h2>
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricValue}>2,847</div>
                <div className={styles.metricLabel}>Total Users</div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricValue}>$12.5K</div>
                <div className={styles.metricLabel}>Revenue</div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricValue}>94.2%</div>
                <div className={styles.metricLabel}>Conversion Rate</div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricValue}>48h</div>
                <div className={styles.metricLabel}>Avg. Response Time</div>
              </div>
            </div>
          </section>

          {/* Activity Chart */}
          <section className={styles.chartSection}>
            <h2>Activity Overview</h2>
            <div className={styles.chart}>
              <div className={styles.chartBar} style={{ height: '30%' }}></div>
              <div className={styles.chartBar} style={{ height: '45%' }}></div>
              <div className={styles.chartBar} style={{ height: '60%' }}></div>
              <div className={styles.chartBar} style={{ height: '55%' }}></div>
              <div className={styles.chartBar} style={{ height: '75%' }}></div>
              <div className={styles.chartBar} style={{ height: '85%' }}></div>
              <div className={styles.chartBar} style={{ height: '90%' }}></div>
            </div>
            <div className={styles.chartLegend}>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </section>

          {/* Recent Activity */}
          <section className={styles.activitySection}>
            <h2>Recent Activity</h2>
            <div className={styles.activityList}>
              {[
                {
                  title: 'New user registered',
                  description: 'sarah.dev@company.com',
                  time: '2 hours ago',
                },
                {
                  title: 'Payment processed',
                  description: 'Order #12845 - $299.99',
                  time: '5 hours ago',
                },
                {
                  title: 'System update completed',
                  description: 'v2.5.0 deployed successfully',
                  time: '1 day ago',
                },
                {
                  title: 'Report generated',
                  description: 'Monthly analytics report',
                  time: '2 days ago',
                },
              ].map((activity, index) => (
                <div key={index} className={styles.activityItem}>
                  <div className={styles.activityIcon}>●</div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityTitle}>{activity.title}</div>
                    <div className={styles.activityDescription}>
                      {activity.description}
                    </div>
                  </div>
                  <div className={styles.activityTime}>{activity.time}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Responsive Info */}
          <section className={styles.infoSection}>
            <h2>Responsive Design Features</h2>
            <div className={styles.featureList}>
              <div className={styles.feature}>
                <span className={styles.featureBadge}>Mobile</span>
                <p>Hamburger menu toggles navigation, stacked layout, full-width cards</p>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureBadge}>Tablet</span>
                <p>Compact navigation with abbreviated labels, 2-column layout</p>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureBadge}>Desktop</span>
                <p>Full navigation visible, grid layouts, expanded information</p>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureBadge}>Dark Mode</span>
                <p>Toggle theme in the header - smooth color transitions</p>
              </div>
            </div>
          </section>

          {/* Code Example */}
          <section className={styles.codeSection}>
            <h2>Usage Example</h2>
            <pre className={styles.codeBlock}>
{`import DashboardHeader from '@/components/DashboardHeader';

export default function MyDashboard() {
  return (
    <DashboardHeader
      userName="John Doe"
      userEmail="john@example.com"
      notificationCount={3}
      activeSection="dashboard"
      isDarkMode={false}
      onNotificationClick={() => console.log('Notifications')}
      onSettingsClick={() => console.log('Settings')}
      onLogout={() => console.log('Logout')}
      onThemeToggle={() => console.log('Toggle theme')}
    />
  );
}`}
            </pre>
          </section>
        </div>
      </main>
    </div>
  );
}
