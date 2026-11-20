'use client';

import * as React from 'react';
import {
  Users,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import type { AdminRole } from '@/lib/auth/permissions';

interface AdminUserRecord {
  user_id: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  last_login_at?: string | null;
}

export default function AdminsManagementPage() {
  const [admins, setAdmins] = React.useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<AdminRole>('moderator');
  const [inviteReason, setInviteReason] = React.useState('');
  const [inviteSubmitting, setInviteSubmitting] = React.useState(false);
  const [inviteError, setInviteError] = React.useState<string | null>(null);

  // Action dialog state
  const [actionTarget, setActionTarget] = React.useState<AdminUserRecord | null>(null);
  const [actionType, setActionType] = React.useState<'toggle_active' | 'change_role' | 'reset_mfa' | null>(null);
  const [newRole, setNewRole] = React.useState<AdminRole>('moderator');
  const [actionReason, setActionReason] = React.useState('');
  const [actionSubmitting, setActionSubmitting] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admins');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load administrator list.');
      } else {
        setAdmins(data.admins || []);
      }
    } catch {
      setError('Network error while querying administrator directory.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAdmins();
  }, []);

  const activeOwnerCount = admins.filter((a) => a.role === 'owner' && a.is_active).length;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteReason || inviteReason.length < 5) {
      setInviteError('Please provide a valid email and a detailed reason (min 5 chars).');
      return;
    }

    setInviteSubmitting(true);
    setInviteError(null);

    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          reason: inviteReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || 'Failed to invite administrator.');
        setInviteSubmitting(false);
        return;
      }

      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteReason('');
      setInviteSubmitting(false);
      await fetchAdmins();
    } catch {
      setInviteError('Network error while provisioning administrator.');
      setInviteSubmitting(false);
    }
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTarget || !actionReason || actionReason.length < 5) {
      setActionError('A non-empty reason of at least 5 characters is required.');
      return;
    }

    setActionSubmitting(true);
    setActionError(null);

    try {
      if (actionType === 'reset_mfa') {
        const res = await fetch('/api/admins/reset-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: actionTarget.user_id,
            reason: actionReason,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setActionError(data.error || 'Failed to reset MFA.');
          setActionSubmitting(false);
          return;
        }
      } else if (actionType === 'toggle_active') {
        const res = await fetch('/api/admins', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: actionTarget.user_id,
            isActive: !actionTarget.is_active,
            reason: actionReason,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setActionError(data.error || 'Failed to update administrator status.');
          setActionSubmitting(false);
          return;
        }
      } else if (actionType === 'change_role') {
        const res = await fetch('/api/admins', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: actionTarget.user_id,
            role: newRole,
            reason: actionReason,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setActionError(data.error || 'Failed to update administrator role.');
          setActionSubmitting(false);
          return;
        }
      }

      setActionTarget(null);
      setActionType(null);
      setActionReason('');
      setActionSubmitting(false);
      await fetchAdmins();
    } catch {
      setActionError('Network error while executing action.');
      setActionSubmitting(false);
    }
  };

  const filteredAdmins = admins.filter((a) =>
    a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Administrator Directory
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            ম্যানেজ অ্যাডমিন অ্যাকাউন্ট ও পারমিশন (মালিক নিয়ন্ত্রিত)
          </p>
        </div>

        <Button onClick={() => setIsInviteOpen(true)} className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Invite Administrator
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader>
              <CardTitle>Invite New Administrator</CardTitle>
              <CardDescription>
                Provision a privileged account. The user will be required to configure TOTP MFA upon initial login.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleInvite}>
              <CardContent className="space-y-4">
                {inviteError && (
                  <div className="p-3 text-sm rounded bg-red-500/10 border border-red-500/20 text-red-500">
                    {inviteError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Administrator Email</label>
                  <Input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@halchal.bd"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Assigned Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                    className="w-full h-10 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                  >
                    <option value="moderator">Moderator (নজরদারি ও রিভার্ট)</option>
                    <option value="content_editor">Content Editor (মূল্য ও কনটেন্ট)</option>
                    <option value="analyst">Analyst (রিড-অনলি বিশ্লেষণ ও এক্সপোর্ট)</option>
                    <option value="owner">Owner (পূর্ণ নিয়ন্ত্রণ)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Mandatory Audit Reason (কারণ)</label>
                  <Input
                    required
                    value={inviteReason}
                    onChange={(e) => setInviteReason(e.target.value)}
                    placeholder="e.g. Onboarding regional operational moderator for Chittagong"
                  />
                  <p className="text-xs text-zinc-500">
                    This justification is permanently stored in the immutable audit log.
                  </p>
                </div>
              </CardContent>

              <div className="flex items-center justify-end gap-2 p-6 pt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteOpen(false)}
                  disabled={inviteSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteSubmitting}>
                  {inviteSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send Privilege Invitation
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Action Dialog */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader>
              <CardTitle>
                {actionType === 'reset_mfa' && 'Reset Multi-Factor Authentication'}
                {actionType === 'toggle_active' &&
                  (actionTarget.is_active ? 'Deactivate Administrator' : 'Reactivate Administrator')}
                {actionType === 'change_role' && 'Modify Administrative Role'}
              </CardTitle>
              <CardDescription>Target: {actionTarget.email}</CardDescription>
            </CardHeader>
            <form onSubmit={handleExecuteAction}>
              <CardContent className="space-y-4">
                {actionError && (
                  <div className="p-3 text-sm rounded bg-red-500/10 border border-red-500/20 text-red-500">
                    {actionError}
                  </div>
                )}

                {actionType === 'reset_mfa' && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    This will delete all enrolled TOTP authenticators for {actionTarget.email}. The user will be required to re-enroll an authenticator app on their next login.
                  </p>
                )}

                {actionType === 'toggle_active' && actionTarget.is_active && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Deactivating this administrator will immediately revoke access to all panel dashboards and APIs.
                  </p>
                )}

                {actionType === 'change_role' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">New Role</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as AdminRole)}
                      className="w-full h-10 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                    >
                      <option value="moderator">Moderator</option>
                      <option value="content_editor">Content Editor</option>
                      <option value="analyst">Analyst (Read-Only)</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Reason for Action (অডিট কারণ)</label>
                  <Input
                    required
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="State operational rationale (min 5 characters)"
                  />
                </div>
              </CardContent>

              <div className="flex items-center justify-end gap-2 p-6 pt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActionTarget(null)}
                  disabled={actionSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={actionType === 'toggle_active' && actionTarget.is_active ? 'destructive' : 'default'}
                  disabled={actionSubmitting}
                >
                  {actionSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Confirm & Log Action
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Directory Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Active Administrators</CardTitle>
              <CardDescription>
                System currently protected by {activeOwnerCount} active owner(s). Sole owner cannot be removed.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading directory...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sign-In</TableHead>
                  <TableHead>Enrolled At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => {
                  const isSoleOwner = admin.role === 'owner' && admin.is_active && activeOwnerCount <= 1;

                  return (
                    <TableRow key={admin.user_id}>
                      <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                        {admin.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            admin.role === 'owner'
                              ? 'destructive'
                              : admin.role === 'moderator'
                              ? 'warning'
                              : admin.role === 'content_editor'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {admin.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {admin.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
                            <XCircle className="w-3.5 h-3.5" /> Deactivated
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500">
                        {admin.last_login_at
                          ? new Date(admin.last_login_at).toLocaleString('en-US', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActionTarget(admin);
                              setActionType('change_role');
                              setNewRole(admin.role);
                              setActionReason('');
                            }}
                            disabled={isSoleOwner}
                            title={isSoleOwner ? 'Cannot demote sole active owner' : 'Change Role'}
                          >
                            Change Role
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActionTarget(admin);
                              setActionType('reset_mfa');
                              setActionReason('');
                            }}
                            title="Force MFA Reset"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant={admin.is_active ? 'outline' : 'secondary'}
                            size="sm"
                            onClick={() => {
                              setActionTarget(admin);
                              setActionType('toggle_active');
                              setActionReason('');
                            }}
                            disabled={isSoleOwner}
                            title={isSoleOwner ? 'Cannot deactivate sole active owner' : 'Toggle Active'}
                          >
                            {admin.is_active ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
