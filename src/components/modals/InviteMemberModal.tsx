import React, { useState } from 'react';
import { X, Mail, UserPlus, Copy, Check, Sparkles, Shield, Clock } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose }) => {
  const { createInvite, person1Name, person2Name, workspace } = useFinance();
  const [email, setEmail] = useState('');
  const [assignProfile, setAssignProfile] = useState<'person1' | 'person2'>('person2');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await createInvite(email.trim().toLowerCase(), assignProfile);
      setGeneratedLink(res.inviteLink);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to create invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setEmail('');
    setGeneratedLink(null);
    setError(null);
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
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">Invite to Workspace</h2>
              <p className="text-[11px] text-stone-500">
                Share {workspace?.name || 'Money Desk'} with your partner
              </p>
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
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {generatedLink ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-stone-900">Invitation Ready!</h3>
                <p className="text-xs text-stone-500">
                  Send this single-use link to <strong className="text-stone-800">{email}</strong>.
                  It will expire in 7 days and can only be redeemed with that Google account.
                </p>
              </div>

              {/* Link Box */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-stone-200 shadow-xs">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="w-full text-xs font-mono bg-transparent text-stone-700 select-all outline-hidden truncate"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shrink-0 flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-medium text-violet-700 hover:underline"
                >
                  Invite another person
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Partner's Google Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@gmail.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:ring-2 focus:ring-violet-500 shadow-xs"
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  Must match the Google account they sign in with.
                </p>
              </div>

              {/* Profile Attribution */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Assign Past & New Records To
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignProfile('person2')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      assignProfile === 'person2'
                        ? 'border-violet-500 bg-violet-50/70 text-violet-900 shadow-xs'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <span className="block text-xs font-bold text-stone-900">{person2Name}</span>
                    <span className="text-[10px] text-stone-500">Person 2 profile (Recommended)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignProfile('person1')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      assignProfile === 'person1'
                        ? 'border-violet-500 bg-violet-50/70 text-violet-900 shadow-xs'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <span className="block text-xs font-bold text-stone-900">{person1Name}</span>
                    <span className="text-[10px] text-stone-500">Person 1 profile</span>
                  </button>
                </div>
              </div>

              {/* Security info */}
              <div className="p-3 rounded-xl bg-violet-50/60 border border-violet-100 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-violet-900 leading-relaxed">
                  The invite expires in 7 days and works only once. Uninvited accounts cannot access this workspace.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 bg-white hover:bg-stone-50 border border-stone-200 transition-colors shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Generating...' : 'Generate Invite Link'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
