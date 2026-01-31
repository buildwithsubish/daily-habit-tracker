"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CreditCard, DollarSign, ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';

export default function AdminBillingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Revenue</h1>
        <p className="text-slate-500 text-sm font-medium mt-1">Manage platform subscriptions, Stripe integration, and financial overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="bg-slate-900 text-white border-none shadow-xl">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-slate-400">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-3xl font-black">$24,500.00</div>
               <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold mt-2">
                  <ArrowUpRight size={14} /> +15.2% from last month
               </div>
            </CardContent>
         </Card>

         <Card className="border-slate-200">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-slate-500">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-3xl font-black text-slate-900">428</div>
               <div className="flex items-center gap-1 text-indigo-600 text-xs font-bold mt-2">
                  <Zap size={14} /> 12 new this week
               </div>
            </CardContent>
         </Card>

         <Card className="border-slate-200">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-slate-500">Churn Rate</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-3xl font-black text-slate-900">2.4%</div>
               <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-2">
                  -0.4% improvement
               </div>
            </CardContent>
         </Card>
      </div>

      <Card>
        <CardHeader>
           <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">Stripe Integration</CardTitle>
              <Badge className="bg-emerald-500">Connected</Badge>
           </div>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-4">
                 <div className="h-10 w-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                    <CreditCard className="text-indigo-600" size={20} />
                 </div>
                 <div>
                    <p className="text-sm font-bold text-slate-900">Platform Account</p>
                    <p className="text-xs text-slate-500">acct_1N2M3L4K5J6I7H8G</p>
                 </div>
              </div>
              <Button variant="outline" size="sm" className="font-bold">Manage on Stripe</Button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                 <p className="text-xs font-bold text-slate-400 uppercase">Payouts</p>
                 <p className="text-xl font-black text-slate-900">$1,200.00</p>
                 <p className="text-xs text-slate-500">Next payout: Feb 3, 2026</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                 <p className="text-xs font-bold text-slate-400 uppercase">Success Rate</p>
                 <p className="text-xl font-black text-slate-900">99.8%</p>
                 <p className="text-xs text-emerald-500 font-medium">All systems operational</p>
              </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
