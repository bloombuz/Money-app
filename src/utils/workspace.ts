import { Workspace, WorkspaceInvite, WorkspaceMember, OwnerType } from '../types';

/**
 * Generate a clean, secure invite ID token
 */
export function generateInviteToken(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = 'inv_';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Check if a workspace invite is expired based on current timestamp
 */
export function isInviteExpired(expiresAt: string, now: Date = new Date()): boolean {
  try {
    const exp = new Date(expiresAt).getTime();
    return Number.isNaN(exp) || now.getTime() > exp;
  } catch {
    return true;
  }
}

/**
 * Validate whether a user can redeem a given invite
 */
export function canRedeemInvite(
  invite: WorkspaceInvite,
  userEmail?: string | null,
  isEmailVerified: boolean = true,
  now: Date = new Date()
): { valid: boolean; reason?: string } {
  if (invite.status === 'accepted') {
    return { valid: false, reason: 'This invitation has already been accepted.' };
  }
  if (invite.status === 'revoked') {
    return { valid: false, reason: 'This invitation has been revoked by the workspace owner.' };
  }
  if (isInviteExpired(invite.expiresAt, now)) {
    return { valid: false, reason: 'This invitation has expired.' };
  }
  if (!userEmail) {
    return { valid: false, reason: 'Please sign in with your Google account to accept.' };
  }

  const cleanUserEmail = userEmail.trim().toLowerCase();
  const cleanInviteeEmail = invite.inviteeEmail.trim().toLowerCase();

  if (cleanUserEmail !== cleanInviteeEmail) {
    return {
      valid: false,
      reason: `This invitation was issued to ${invite.inviteeEmail}. You are signed in as ${userEmail}.`,
    };
  }

  return { valid: true };
}

/**
 * Get user's assigned default owner tag based on their workspace membership
 */
export function getDefaultOwnerForMember(member?: WorkspaceMember | null): OwnerType {
  if (!member) return 'person1';
  return member.linkedProfile || 'person1';
}

/**
 * Check if a user is the owner of a workspace
 */
export function isWorkspaceOwner(workspace: Workspace | null | undefined, uid: string): boolean {
  if (!workspace || !uid) return false;
  return workspace.ownerId === uid;
}

/**
 * Check if a user is an active member of a workspace
 */
export function isWorkspaceMember(workspace: Workspace | null | undefined, uid: string): boolean {
  if (!workspace || !uid) return false;
  return workspace.memberUids.includes(uid) || workspace.ownerId === uid;
}
