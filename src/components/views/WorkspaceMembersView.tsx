import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Clock,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  Building2,
  Mail,
  UserCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { WorkspaceMember, WorkspaceInvite } from '../../types';
import { isInviteExpired } from '../../utils/workspace';
import { InviteMemberModal } from '../modals/InviteMemberModal';

export const WorkspaceMembersView: React.FC = () => {
  const {
    workspace,
    workspaceMembers,
    workspaceInvites,
    user,
    person1Name,
    person2Name,
    removeMember,
    updateMemberLinkedProfile,
    revokeInvite,
  } = useFinance();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  const isOwner = workspace?.ownerId === user?.uid || user?.uid === 'demo_user';

  const handleCopyInviteLink = (inviteId: string) => {
    const link = `${window.location.origin}/?invite=${inviteId}`;
    navigator.clipboard.writeText(link);
    setCopiedInviteId(inviteId);
    setTimeout(() => setCopiedInviteId(null), 2500);
  };

  const handleRemoveMember = async (member: WorkspaceMember) => {
    if (!window.confirm(`Are you sure you want to remove ${member.displayName || member.email} from this workspace? They will immediately lose access.`)) {
      return;
    }
    try {
      setDeletingMemberId(member.id);
      await removeMember(member.id);
    } finally {
      setDeletingMemberId(null);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      setRevokingInviteId(inviteId);
      await revokeInvite(inviteId);
    } finally {
      setRevokingInviteId(null);
    }
  };

  const pendingInvites = workspaceInvites.filter(
    (inv) => inv.status === 'pending' && !isInviteExpired(inv.expiresAt)
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-stone-900 tracking-tight">
            Workspace Members & Invitations
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage who has access to your shared finances and link logins to profiles
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite Member
          </button>
        )}
      </div>

      {/* Workspace Summary Card */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-900">
                  {workspace?.name || 'Our Shared Workspace'}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                  Private & Shared
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Owner: {workspace?.ownerEmail || 'You'} • {workspaceMembers.length} active member{workspaceMembers.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              Secured with Firestore Rules
            </span>
          </div>
        </div>
      </div>

      {/* Active Members Table */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-600" />
            <h3 className="text-sm font-bold text-stone-900">Active Members</h3>
          </div>
          <span className="text-xs text-stone-400">
            {workspaceMembers.length} member{workspaceMembers.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="divide-y divide-stone-100">
          {workspaceMembers.map((member) => {
            const isMe = member.id === user?.uid;
            const isMemberOwner = member.role === 'owner';

            return (
              <div
                key={member.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-800 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {member.displayName?.charAt(0) || member.email?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900 truncate">
                        {member.displayName || member.email}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-600">
                          You
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isMemberOwner
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {isMemberOwner ? 'Owner' : 'Member'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-12 sm:pl-0">
                  {/* Linked Profile Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-stone-500 whitespace-nowrap">Profile:</span>
                    {isOwner ? (
                      <select
                        value={member.linkedProfile}
                        onChange={(e) =>
                          updateMemberLinkedProfile(
                            member.id,
                            e.target.value as 'person1' | 'person2'
                          )
                        }
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-stone-200 bg-[#FAF8F5] text-stone-800 focus:ring-1 focus:ring-violet-500"
                      >
                        <option value="person1">{person1Name} (Person 1)</option>
                        <option value="person2">{person2Name} (Person 2)</option>
                      </select>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-100">
                        {member.linkedProfile === 'person1' ? person1Name : person2Name}
                      </span>
                    )}
                  </div>

                  {/* Remove Button for Owner */}
                  {isOwner && !isMemberOwner && !isMe && (
                    <button
                      onClick={() => handleRemoveMember(member)}
                      disabled={deletingMemberId === member.id}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Remove Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invitations */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-600" />
            <h3 className="text-sm font-bold text-stone-900">Pending Invitations</h3>
          </div>
          <span className="text-xs text-stone-400">
            {pendingInvites.length} pending
          </span>
        </div>

        {pendingInvites.length === 0 ? (
          <p className="text-xs text-stone-400 py-3 text-center">
            No active pending invitations. Use the "Invite Member" button above to send one.
          </p>
        ) : (
          <div className="divide-y divide-stone-100">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-800">{inv.inviteeEmail}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100">
                      Assigned to {inv.assignProfile === 'person1' ? person1Name : person2Name}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Single-use • Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyInviteLink(inv.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    {copiedInviteId === inv.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-stone-500" /> Copy Link
                      </>
                    )}
                  </button>

                  {isOwner && (
                    <button
                      onClick={() => handleRevokeInvite(inv.id)}
                      disabled={revokingInviteId === inv.id}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Revoke Invitation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />
    </div>
  );
};
