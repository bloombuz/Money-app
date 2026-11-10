import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, AlertCircle, LogIn, LogOut, Building2, Users, Shield } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { canRedeemInvite } from '../../utils/workspace';

interface AcceptInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AcceptInviteModal: React.FC<AcceptInviteModalProps> = ({ isOpen, onClose }) => {
  const {
    pendingInviteToAccept,
    user,
    signIn,
    signOut,
    redeemInvite,
    person1Name,
    person2Name,
  } = useFinance();

  const [isRedeeming, setIsRedeeming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !pendingInviteToAccept) return null;

  const invite = pendingInviteToAccept;
  const validation = canRedeemInvite(invite, user?.email, user?.emailVerified ?? true);

  const assignedProfileName =
    invite.assignProfile === 'person1' ? person1Name : person2Name;

  const handleAccept = async () => {
    try {
      setIsRedeeming(true);
      setErrorMessage(null);
      const res = await redeemInvite(invite.id);
      if (res.success) {
        setSuccessMessage(`Joined "${invite.workspaceName}" successfully!`);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMessage(res.error || 'Failed to accept invitation');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to accept invitation');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-[#FAF8F5] rounded-3xl shadow-xl border border-stone-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-200/80 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">Workspace Invitation</h2>
              <p className="text-[11px] text-stone-500">Shared Money Desk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {successMessage ? (
            <div className="p-6 text-center space-y-3 bg-white rounded-2xl border border-emerald-100 shadow-xs">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Welcome to the Workspace!</h3>
              <p className="text-xs text-stone-500">{successMessage}</p>
            </div>
          ) : (
            <>
              {/* Workspace Card */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                      Invitation to Join
                    </span>
                    <h3 className="text-base font-bold text-stone-900 mt-0.5">
                      {invite.workspaceName}
                    </h3>
                  </div>
                  <span className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </span>
                </div>

                <div className="text-xs text-stone-600 space-y-1 pt-2 border-t border-stone-100">
                  <p>
                    <strong>Invited by:</strong> {invite.inviterName} ({invite.inviterEmail})
                  </p>
                  <p>
                    <strong>Assigned Profile:</strong>{' '}
                    <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 font-semibold border border-violet-100">
                      {assignedProfileName}
                    </span>
                  </p>
                  <p>
                    <strong>Intended for:</strong> <code className="text-stone-800">{invite.inviteeEmail}</code>
                  </p>
                </div>
              </div>

              {/* Status and Actions */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {errorMessage}
                </div>
              )}

              {!user ? (
                <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs text-center space-y-3">
                  <p className="text-xs text-stone-600">
                    Sign in with Google using <strong>{invite.inviteeEmail}</strong> to accept.
                  </p>
                  <button
                    onClick={signIn}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In with Google
                  </button>
                </div>
              ) : !validation.valid ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800">Cannot Accept Invitation</p>
                      <p className="text-[11px] mt-0.5 text-amber-700 leading-relaxed">
                        {validation.reason}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={signOut}
                    className="w-full py-2 bg-white text-stone-800 border border-stone-200 hover:bg-stone-50 rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    Sign Out & Switch Account
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-violet-50/60 border border-violet-100 flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-violet-900 leading-relaxed">
                      Accepting will link your Google account to this workspace. You will see all shared income,
                      expenses, accounts, and payments in real time.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 bg-white hover:bg-stone-50 border border-stone-200 shadow-xs"
                    >
                      Decline
                    </button>
                    <button
                      onClick={handleAccept}
                      disabled={isRedeeming}
                      className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isRedeeming ? 'Joining...' : 'Accept & Join Workspace'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
