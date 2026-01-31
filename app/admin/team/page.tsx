"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Users2, Shield, UserPlus, MoreVertical, ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const team = [
  { name: 'Admin User', role: 'Super Admin', email: 'admin@habit.com', status: 'active' },
  { name: 'Sarah Editor', role: 'Editor', email: 'sarah@habit.com', status: 'active' },
  { name: 'Mike Viewer', role: 'Viewer', email: 'mike@habit.com', status: 'inactive' },
];

export default function AdminTeamPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Team Management</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Manage administrative access and role-based permissions</p>
        </div>
        
        <Button className="font-bold shadow-lg shadow-indigo-600/20">
           <UserPlus size={16} className="mr-2" /> Invite Member
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {team.map((member, i) => (
            <Card key={i} className="group hover:border-indigo-600 transition-all">
               <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                     <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xl">
                        {member.name[0]}
                     </div>
                     <button className="text-slate-400 hover:text-slate-900">
                        <MoreVertical size={18} />
                     </button>
                  </div>
                  
                  <div className="space-y-1">
                     <h3 className="font-bold text-slate-900">{member.name}</h3>
                     <p className="text-xs text-slate-500 font-medium">{member.email}</p>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                     <Badge 
                        variant="secondary" 
                        className={cn(
                          "font-bold text-[10px] uppercase",
                          member.role === 'Super Admin' ? "bg-indigo-100 text-indigo-700" :
                          member.role === 'Editor' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {member.role === 'Super Admin' && <Shield size={10} className="mr-1" />}
                        {member.role}
                     </Badge>
                     
                     <div className="flex items-center gap-1.5">
                        <div className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          member.status === 'active' ? "bg-emerald-500" : "bg-slate-300"
                        )}></div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{member.status}</span>
                     </div>
                  </div>
               </CardContent>
            </Card>
         ))}
      </div>

      <Card>
        <CardHeader>
           <CardTitle className="text-lg font-bold">Role Permissions Matrix</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="relative w-full overflow-auto">
              <table className="w-full text-sm border-collapse">
                 <thead>
                    <tr className="bg-slate-50/50">
                       <th className="p-4 text-left font-bold text-slate-500 uppercase text-[10px] border border-slate-100">Capability</th>
                       <th className="p-4 text-center font-bold text-slate-500 uppercase text-[10px] border border-slate-100">Admin</th>
                       <th className="p-4 text-center font-bold text-slate-500 uppercase text-[10px] border border-slate-100">Editor</th>
                       <th className="p-4 text-center font-bold text-slate-500 uppercase text-[10px] border border-slate-100">Viewer</th>
                    </tr>
                 </thead>
                 <tbody>
                    {[
                      { cap: 'Manage Users', a: true, e: true, v: false },
                      { cap: 'Configure Billing', a: true, e: false, v: false },
                      { cap: 'Edit Templates', a: true, e: true, v: false },
                      { cap: 'Export Reports', a: true, e: true, v: true },
                      { cap: 'Delete System Data', a: true, e: false, v: false },
                    ].map((row, i) => (
                       <tr key={i}>
                          <td className="p-4 border border-slate-100 font-bold text-slate-700">{row.cap}</td>
                          <td className="p-4 border border-slate-100 text-center">
                             {row.a ? <ShieldCheck className="mx-auto text-indigo-600" size={18} /> : <ShieldAlert className="mx-auto text-slate-200" size={18} />}
                          </td>
                          <td className="p-4 border border-slate-100 text-center">
                             {row.e ? <ShieldCheck className="mx-auto text-indigo-600" size={18} /> : <ShieldAlert className="mx-auto text-slate-200" size={18} />}
                          </td>
                          <td className="p-4 border border-slate-100 text-center">
                             {row.v ? <ShieldCheck className="mx-auto text-indigo-600" size={18} /> : <ShieldAlert className="mx-auto text-slate-200" size={18} />}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
