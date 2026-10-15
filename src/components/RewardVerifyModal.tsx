import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertCircle, Loader2, ArrowLeft, Store, Sparkles } from 'lucide-react';
import { findRewardAuditDetails, RewardAuditDetails } from '../lib/rewardAudit';
import { RewardAuditCard } from './RewardAuditCard';
import { redeemLoyaltyCard } from '../lib/db';
import { AuthSession } from '../types/database';

interface RewardVerifyModalProps {
  voucherCode: string;
  session?: AuthSession | null;
  onClose: () => void;
  onGoToDashboard?: () => void;
}

export const RewardVerifyModal: React.FC<RewardVerifyModalProps> = ({
  voucherCode,
  session,
  onClose,
  onGoToDashboard,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [audit, setAudit] = useState<RewardAuditDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAudit() {
      if (!voucherCode) return;
      setLoading(true);
      setError(null);
      try {
        const res = await findRewardAuditDetails(voucherCode, session?.business?.id, session?.business);
        if (res) {
          setAudit(res);
        } else {
          setError(`No reward voucher found with code "${voucherCode}". Please check the code or QR code.`);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to inspect reward voucher details.');
      } finally {
        setLoading(false);
      }
    }
    fetchAudit();
  }, [voucherCode, session?.business?.id]);

  const handleRedeem = async () => {
    if (!audit || !audit.is_valid) return;
    setIsRedeeming(true);
    try {
      if (audit.type === 'scratch') {
        const res = await fetch('/api/scratch/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: audit.voucher_code,
            businessId: audit.business_id,
            redeemedBy: session?.user?.full_name || 'Counter Staff',
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setRedeemSuccess('🎉 Scratch reward redeemed successfully!');
          setAudit((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'redeemed',
                  is_redeemed: true,
                  is_valid: false,
                  redeemed_at: new Date().toISOString(),
                  redeemed_at_formatted: new Date().toLocaleString(),
                  redeemed_by: session?.user?.full_name || 'Counter Staff',
                }
              : null
          );
        } else {
          setError(data.error || 'Failed to redeem scratch coupon');
        }
      } else {
        // Loyalty card
        if (audit.raw_loyalty_card?.id) {
          const updated = await redeemLoyaltyCard(
            audit.raw_loyalty_card.id,
            audit.business_id,
            session?.user?.full_name || 'Counter Staff'
          );
          if (updated) {
            setRedeemSuccess('🎉 Loyalty reward applied and marked redeemed!');
            setAudit((prev) =>
              prev
                ? {
                    ...prev,
                    status: 'redeemed',
                    is_redeemed: true,
                    is_valid: false,
                    redeemed_at: new Date().toISOString(),
                    redeemed_at_formatted: new Date().toLocaleString(),
                    redeemed_by: session?.user?.full_name || 'Counter Staff',
                  }
                : null
            );
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Redemption error occurred.');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-purple-200 flex flex-col my-8">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#1E1B4B] via-[#2E1065] to-[#4C1D95] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/30 border border-purple-400/40 flex items-center justify-center text-amber-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded">
                  QR Reward Verification
                </span>
              </div>
              <h3 className="text-base font-black tracking-tight mt-0.5">
                Reward History & Origin Inspector
              </h3>
              <p className="text-[11px] text-purple-200">
                Kab Mila & Kaise Mila Full Audit
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-purple-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-neutral-600">
                Inspecting reward voucher details from database...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Verification Notice</span>
              </div>
              <p>{error}</p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : audit ? (
            <div className="space-y-4">
              {redeemSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between">
                  <span>{redeemSuccess}</span>
                </div>
              )}

              {/* Reward Audit Card displaying Kab Mila and Kaise Mila */}
              <RewardAuditCard
                audit={audit}
                onRedeem={handleRedeem}
                isRedeeming={isRedeeming}
                showActions={true}
              />
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-3 text-xs">
          {session && onGoToDashboard ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToDashboard();
              }}
              className="text-purple-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Go to Business Dashboard</span>
              <span>→</span>
            </button>
          ) : (
            <span className="text-neutral-400 text-[11px]">
              LocalBoost Customer Loyalty & Review Rewards
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
