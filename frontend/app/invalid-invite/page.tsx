'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { XCircle, Zap } from 'lucide-react';
import Link from 'next/link';

const messages: Record<string, string> = {
  expired: 'This invite link has expired.',
  revoked: 'This invite link has been revoked.',
  maxed: 'This invite link has reached its maximum number of uses.',
  invalid: 'This invite link is invalid.',
  error: 'We could not validate this invite link.',
};

function InvalidInviteContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'invalid';
  const message = messages[reason] || messages.invalid;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">TaskFlow</span>
        </div>

        <div className="bg-red-500/10 rounded-2xl border border-red-500/20 p-8">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Invite Link Invalid</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">{message}</p>
          <p className="text-slate-500 text-xs">
            Please contact your workspace admin to request a new invite link.
          </p>
        </div>

        <div className="mt-6">
          <Link
            href="/login"
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function InvalidInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
          <div className="text-center max-w-sm">
            <div className="inline-flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">TaskFlow</span>
            </div>
          </div>
        </div>
      }
    >
      <InvalidInviteContent />
    </Suspense>
  );
}
