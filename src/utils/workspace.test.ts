import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateInviteToken,
  isInviteExpired,
  canRedeemInvite,
  getDefaultOwnerForMember,
  isWorkspaceOwner,
  isWorkspaceMember,
} from './workspace';
import { Workspace, WorkspaceInvite, WorkspaceMember } from '../types';

test('generateInviteToken generates unique alphanumeric token with inv_ prefix', () => {
  const token1 = generateInviteToken();
  const token2 = generateInviteToken();
  assert.match(token1, /^inv_[a-z0-9]{16}$/);
  assert.match(token2, /^inv_[a-z0-9]{16}$/);
  assert.notEqual(token1, token2);
});

test('isInviteExpired checks expiration dates against current time', () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();

  assert.equal(isInviteExpired(future), false);
  assert.equal(isInviteExpired(past), true);
  assert.equal(isInviteExpired('invalid-date'), true);
});

test('canRedeemInvite validates email matching, expiration, and status', () => {
  const baseInvite: WorkspaceInvite = {
    id: 'inv_123',
    workspaceId: 'ws_abc',
    workspaceName: 'Family Budget',
    inviterUid: 'uid_1',
    inviterEmail: 'owner@example.com',
    inviterName: 'Owner',
    inviteeEmail: 'partner@example.com',
    assignProfile: 'person2',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    status: 'pending',
  };

  // 1. Success case: matching email and unexpired
  const validCheck = canRedeemInvite(baseInvite, 'partner@example.com', true);
  assert.equal(validCheck.valid, true);

  // 2. Case insensitive email matching
  const caseCheck = canRedeemInvite(baseInvite, 'Partner@Example.COM', true);
  assert.equal(caseCheck.valid, true);

  // 3. Different email
  const diffCheck = canRedeemInvite(baseInvite, 'stranger@example.com', true);
  assert.equal(diffCheck.valid, false);
  assert.match(diffCheck.reason || '', /was issued to/);

  // 4. Signed out (no email)
  const noEmailCheck = canRedeemInvite(baseInvite, null, false);
  assert.equal(noEmailCheck.valid, false);

  // 5. Already accepted
  const acceptedInvite = { ...baseInvite, status: 'accepted' as const };
  const acceptedCheck = canRedeemInvite(acceptedInvite, 'partner@example.com', true);
  assert.equal(acceptedCheck.valid, false);
  assert.match(acceptedCheck.reason || '', /already been accepted/);

  // 6. Revoked
  const revokedInvite = { ...baseInvite, status: 'revoked' as const };
  const revokedCheck = canRedeemInvite(revokedInvite, 'partner@example.com', true);
  assert.equal(revokedCheck.valid, false);
  assert.match(revokedCheck.reason || '', /revoked/);
});

test('getDefaultOwnerForMember attributes member to person1 or person2', () => {
  const member1: WorkspaceMember = {
    id: 'u1',
    workspaceId: 'ws1',
    email: 'm1@example.com',
    role: 'owner',
    linkedProfile: 'person1',
    joinedAt: new Date().toISOString(),
  };
  const member2: WorkspaceMember = {
    id: 'u2',
    workspaceId: 'ws1',
    email: 'm2@example.com',
    role: 'member',
    linkedProfile: 'person2',
    joinedAt: new Date().toISOString(),
  };

  assert.equal(getDefaultOwnerForMember(member1), 'person1');
  assert.equal(getDefaultOwnerForMember(member2), 'person2');
  assert.equal(getDefaultOwnerForMember(null), 'person1');
});

test('isWorkspaceOwner and isWorkspaceMember enforce membership gates', () => {
  const ws: Workspace = {
    id: 'ws_1',
    name: 'Home Desk',
    ownerId: 'uid_owner',
    ownerEmail: 'owner@example.com',
    memberUids: ['uid_owner', 'uid_partner'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assert.equal(isWorkspaceOwner(ws, 'uid_owner'), true);
  assert.equal(isWorkspaceOwner(ws, 'uid_partner'), false);
  assert.equal(isWorkspaceOwner(ws, 'uid_stranger'), false);

  assert.equal(isWorkspaceMember(ws, 'uid_owner'), true);
  assert.equal(isWorkspaceMember(ws, 'uid_partner'), true);
  assert.equal(isWorkspaceMember(ws, 'uid_stranger'), false);
});
