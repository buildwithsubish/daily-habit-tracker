"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { 
  ArrowUpDown, ChevronDown, MoreHorizontal, 
  Search, Download, Trash2, Shield, 
  Mail, Calendar, Target, TrendingUp,
  UserCheck, UserMinus, Edit2, MoreVertical
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  stats: {
    habitCount: number;
    logCount: number;
    completedLogs: number;
    completionRate: string | number;
    lastActivity: string | null;
  };
}

export function UsersTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users?limit=100');
      const data = await res.json();
      return data.users || [];
    }
  });

  const columns: ColumnDef<User>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
          aria-label="Select all"
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(!!e.target.checked)}
          aria-label="Select row"
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent p-0 font-bold"
        >
          User Info
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="font-bold text-slate-900 flex items-center gap-2">
            {row.getValue("email")}
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Mail size={12} />
            {row.original.username}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => (
        <div className="text-slate-600 flex items-center gap-1.5 text-xs font-medium">
          <Calendar size={14} className="text-slate-400" />
          {new Date(row.getValue("createdAt")).toLocaleDateString()}
        </div>
      ),
    },
    {
      id: "engagement",
      header: "Engagement",
      cell: ({ row }) => {
        const stats = row.original.stats;
        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
               <Target size={14} className="text-indigo-500" />
               <span className="text-xs font-bold text-slate-700">{stats.habitCount} Habits</span>
            </div>
            <div className="flex items-center gap-2">
               <TrendingUp size={14} className="text-emerald-500" />
               <span className="text-xs font-bold text-slate-700">{stats.completionRate}% Rate</span>
            </div>
          </div>
        );
      }
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const lastActive = row.original.stats.lastActivity;
        return lastActive ? (
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-slate-400 border-slate-200">
            Inactive
          </Badge>
        );
      }
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        return (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
              <Edit2 size={16} />
            </Button>
            <Button 
               variant="ghost" 
               size="icon" 
               className="h-8 w-8 text-slate-400 hover:text-red-600"
               onClick={() => {
                  toast((t) => (
                    <div className="flex items-center gap-3">
                      <span>User suspended</span>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-7 px-2 text-[10px] font-bold"
                        onClick={() => {
                          toast.success("Action reverted");
                          toast.dismiss(t.id);
                        }}
                      >
                        Undo
                      </Button>
                    </div>
                  ));
               }}
            >
              <UserMinus size={16} />
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2 min-w-[300px]">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Filter users..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" className="text-slate-500">
             <Download size={18} />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {selectedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg"
              >
                <span className="text-sm font-bold text-indigo-600">{selectedCount} selected</span>
                <div className="h-4 w-[1px] bg-indigo-200 mx-1"></div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs font-bold text-red-600 hover:bg-red-100"
                  onClick={() => toast.success(`Bulk deleted ${selectedCount} users`)}
                >
                  <Trash2 size={14} className="mr-1" /> Delete
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <Button className="font-bold">
            Add New User
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-12">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="group transition-colors hover:bg-slate-50/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-slate-500 font-medium"
                  >
                    {isLoading ? "Loading users..." : "No users found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100 bg-slate-50/30">
          <div className="text-xs font-medium text-slate-500">
             Showing {table.getRowModel().rows.length} of {users.length} users
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 font-bold text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 font-bold text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
