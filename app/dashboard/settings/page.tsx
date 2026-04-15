"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Settings, Clock, MessageSquare, BarChart3, Bell, Loader2, Check, AlertTriangle, BellRing } from 'lucide-react';

interface PollSchedule {
  enabled: boolean;
  time: string;
  frequency: string;
  customDays: number[];
  reminderEnabled: boolean;
  reminderIntervals: number[];
}

interface WeeklyReportSchedule {
  enabled: boolean;
  day: number;
  time: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Initialize with default values - these will be overwritten by fetchSettings
  const [pollSchedule, setPollSchedule] = useState<PollSchedule | null>(null);
  const [weeklyReportSchedule, setWeeklyReportSchedule] = useState<WeeklyReportSchedule | null>(null);
  const [whatsappAutomation, setWhatsappAutomation] = useState(false);
  const [whatsappVerified, setWhatsappVerified] = useState(false);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/whatsapp/settings?userId=me', {
        credentials: 'include',
      });
      const data = await res.json();
      
      // Set all values from the API response, or use defaults if not set
      setPollSchedule(data.pollSchedule || {
        enabled: true,
        time: '20:00',
        frequency: 'daily',
        customDays: [],
        reminderEnabled: true,
        reminderIntervals: [5, 10, 20, 30],
      });
      
      setWeeklyReportSchedule(data.weeklyReportSchedule || {
        enabled: true,
        day: 0,
        time: '09:00',
      });
      
      if (data.whatsappAutomation !== undefined) {
        setWhatsappAutomation(data.whatsappAutomation);
      } else {
        setWhatsappAutomation(true);
      }
      
      if (data.whatsappVerified !== undefined) {
        setWhatsappVerified(data.whatsappVerified);
      }
      
      setHasLoadedSettings(true);
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Set default values on error
      setPollSchedule({
        enabled: true,
        time: '20:00',
        frequency: 'daily',
        customDays: [],
        reminderEnabled: true,
        reminderIntervals: [5, 10, 20, 30],
      });
      setWeeklyReportSchedule({
        enabled: true,
        day: 0,
        time: '09:00',
      });
      setWhatsappAutomation(true);
      setHasLoadedSettings(true);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/whatsapp/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: 'me',
          settings: {
            pollSchedule,
            weeklyReportSchedule,
            whatsappAutomation,
          },
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  const daysOfWeek = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];

  if (loading || !hasLoadedSettings || !pollSchedule || !weeklyReportSchedule) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Settings className="text-blue-600" size={28} />
          Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
          Customize your habit tracking and notification preferences
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* WhatsApp Automation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-green-600" size={20} />
                <CardTitle className="text-lg font-bold">WhatsApp Automation</CardTitle>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsappAutomation}
                  onChange={(e) => setWhatsappAutomation(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-green-500"></div>
                <span className="ms-3 text-sm font-medium text-slate-900 dark:text-slate-300">
                  {whatsappAutomation ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
          </CardHeader>
          {!whatsappVerified && whatsappAutomation && (
            <CardContent>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                Please verify your WhatsApp number to enable automation.
              </div>
            </CardContent>
          )}
        </Card>

        {/* Poll Schedule */}
        <Card className={!whatsappAutomation ? 'opacity-50' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-purple-600" size={20} />
                <CardTitle className="text-lg font-bold">Daily Poll</CardTitle>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pollSchedule.enabled}
                  onChange={(e) => setPollSchedule({ ...pollSchedule, enabled: e.target.checked })}
                  disabled={!whatsappAutomation}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 ${!whatsappAutomation ? 'cursor-not-allowed' : ''}`}></div>
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Receive a daily poll to track your habit completion
            </p>
            
            {pollSchedule.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Frequency</label>
                  <select
                    value={pollSchedule.frequency}
                    onChange={(e) => setPollSchedule({ ...pollSchedule, frequency: e.target.value })}
                    disabled={!whatsappAutomation}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekends">Weekends</option>
                    <option value="custom">Custom Days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                    <Clock size={12} /> Poll Time
                  </label>
                  <div className="relative">
                    <Input
                      type="time"
                      value={pollSchedule.time}
                      onChange={(e) => setPollSchedule({ ...pollSchedule, time: e.target.value })}
                      disabled={!whatsappAutomation}
                      className="w-full pl-10"
                    />
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    You'll receive your daily poll at this time
                  </p>
                </div>
              </div>
            )}

            {pollSchedule.frequency === 'custom' && pollSchedule.enabled && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Days</label>
                <div className="flex gap-2 flex-wrap">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => {
                        const newDays = pollSchedule.customDays.includes(day.value)
                          ? pollSchedule.customDays.filter(d => d !== day.value)
                          : [...pollSchedule.customDays, day.value];
                        setPollSchedule({ ...pollSchedule, customDays: newDays });
                      }}
                      disabled={!whatsappAutomation}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        pollSchedule.customDays.includes(day.value)
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Poll Reminder Settings */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BellRing className="text-orange-500" size={18} />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Poll Reminders</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pollSchedule.reminderEnabled}
                    onChange={(e) => setPollSchedule({ ...pollSchedule, reminderEnabled: e.target.checked })}
                    disabled={!whatsappAutomation || !pollSchedule.enabled}
                    className="sr-only peer"
                  />
                  <div className={`w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500 ${!whatsappAutomation || !pollSchedule.enabled ? 'cursor-not-allowed' : ''}`}></div>
                </label>
              </div>
              
              {pollSchedule.reminderEnabled && pollSchedule.enabled && (
                <div className="ml-6 space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    If you don't vote on the poll, we'll send friendly reminders at:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 15, 20, 30, 60].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => {
                          const current = pollSchedule.reminderIntervals;
                          const newIntervals = current.includes(mins)
                            ? current.filter(i => i !== mins)
                            : [...current, mins].sort((a, b) => a - b);
                          setPollSchedule({ ...pollSchedule, reminderIntervals: newIntervals });
                        }}
                        disabled={!whatsappAutomation}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          pollSchedule.reminderIntervals.includes(mins)
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {mins} min{mins > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                  {pollSchedule.reminderIntervals.length === 0 && (
                    <p className="text-xs text-red-500">Select at least one reminder interval</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Report */}
        <Card className={!whatsappAutomation ? 'opacity-50' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-indigo-600" size={20} />
                <CardTitle className="text-lg font-bold">Weekly Report</CardTitle>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={weeklyReportSchedule.enabled}
                  onChange={(e) => setWeeklyReportSchedule({ ...weeklyReportSchedule, enabled: e.target.checked })}
                  disabled={!whatsappAutomation}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${!whatsappAutomation ? 'cursor-not-allowed' : ''}`}></div>
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Receive a weekly summary of your habit progress
            </p>
            
            {weeklyReportSchedule.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Day</label>
                  <select
                    value={weeklyReportSchedule.day}
                    onChange={(e) => setWeeklyReportSchedule({ ...weeklyReportSchedule, day: parseInt(e.target.value) })}
                    disabled={!whatsappAutomation}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800"
                  >
                    {daysOfWeek.map((day) => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                    <Clock size={12} /> Time
                  </label>
                  <div className="relative">
                    <Input
                      type="time"
                      value={weeklyReportSchedule.time}
                      onChange={(e) => setWeeklyReportSchedule({ ...weeklyReportSchedule, time: e.target.value })}
                      disabled={!whatsappAutomation}
                      className="w-full pl-10"
                    />
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={saveSettings}
          disabled={saving || !whatsappAutomation}
          className="w-full sm:w-auto font-bold"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin mr-2" size={16} />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </div>
  );
}
