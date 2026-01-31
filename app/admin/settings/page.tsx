"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  Settings, Globe, Shield, Mail, 
  Key, Database, Cloud, Palette
} from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-slate-500 text-sm font-medium mt-1">Configure global application parameters, API keys, and branding</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="text-indigo-600" size={20} />
              <CardTitle className="text-lg font-bold">General Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase">App Name</label>
                   <Input defaultValue="Daily Habit Tracker" />
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase">Support Email</label>
                   <Input defaultValue="support@habit-tracker.com" />
                </div>
             </div>
             <Button className="font-bold">Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="text-indigo-600" size={20} />
              <CardTitle className="text-lg font-bold">API & Integrations</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                         <Cloud className="text-blue-500" size={18} />
                      </div>
                      <div>
                         <p className="text-sm font-bold text-slate-900">AWS S3 Storage</p>
                         <p className="text-xs text-slate-500">Connected to us-east-1</p>
                      </div>
                   </div>
                   <Button variant="ghost" size="sm" className="font-bold text-indigo-600">Configure</Button>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                         <Mail className="text-orange-500" size={18} />
                      </div>
                      <div>
                         <p className="text-sm font-bold text-slate-900">SendGrid SMTP</p>
                         <p className="text-xs text-slate-500">api_key_hidden_********</p>
                      </div>
                   </div>
                   <Button variant="ghost" size="sm" className="font-bold text-indigo-600">Update Key</Button>
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="border-red-100 bg-red-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="text-red-600" size={20} />
              <CardTitle className="text-lg font-bold text-red-900">Danger Zone</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
             <p className="text-sm text-red-700 font-medium">Permanently delete all user data and system logs. This action cannot be undone.</p>
             <Button variant="destructive" className="font-bold">Purge System Data</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
