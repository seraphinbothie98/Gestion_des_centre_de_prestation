import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { FinancialAccount } from '../../../types';
import { dbStore } from '../../../server/db/mockStore';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { formatCurrency } from '../../../lib/utils';
import { Scale, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  account: FinancialAccount | null;
  onAdjustSuccess: () => void;
}

export const FinancialAccountAdjustBalanceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  account,
  onAdjustSuccess
}) => {
  const { currentTenant, currentUser, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [newBalance, setNewBalance] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setNewBalance(account.currentBalance);
      setReason('');
    }
  }, [account, isOpen]);

  if (!account) return null;

  const currentBalance = account.currentBalance || 0;
  const difference = (Number(newBalance) || 0) - currentBalance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Motif Obligatoire', 'Veuillez préciser la raison exacte de cet ajustement de solde.', 'DANGER');
      return;
    }

    setIsSubmitting(true);
    const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Administrateur';
    const tenantId = currentTenant?.id || account.tenantId;

    const res = dbStore.adjustFinancialAccountBalance(
      account.id,
      Number(newBalance) || 0,
      reason.trim(),
      tenantId,
      userName,
      isSuperAdmin
    );

    setIsSubmitting(false);

    if (res.success) {
      showToast('Solde Ajusté ⚖️', res.message, 'SUCCESS');
      onAdjustSuccess();
      onClose();
    } else {
      showToast('Erreur d\'Ajustement ❌', res.message, 'DANGER');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajustement Manuel du Solde"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mandatory Security Warning Banner */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-amber-800 dark:text-amber-300">
              Attention : cette action peut avoir un impact sur les données financières. Êtes-vous sûr de vouloir continuer ?
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 block">
              Tout ajustement de solde est audité, vérifié par le système et laisse une trace comptable indélébile avec justification obligatoire.
            </span>
          </div>
        </div>

        {/* Account Info Header */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Compte Sélectionné</span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              {account.name}
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                {account.code}
              </span>
            </h4>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Solde Actuel Système</span>
            <div className="text-sm font-black text-slate-900 dark:text-white">
              {formatCurrency(currentBalance, account.currency)}
            </div>
          </div>
        </div>

        {/* Input New Balance */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Nouveau Solde Réel Constaté ({account.currency}) *
          </label>
          <Input
            type="number"
            value={newBalance}
            onChange={(e) => setNewBalance(Number(e.target.value))}
            step="any"
            required
            className="text-lg font-black tracking-tight"
            placeholder="Ex: 450000"
          />
          <p className="text-[11px] text-slate-500">
            Saisissez le montant réel constaté après comptage physique, relevé bancaire ou relevé Mobile Money.
          </p>
        </div>

        {/* Live Discrepancy Card */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
          difference === 0
            ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
            : difference > 0
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {difference === 0 ? (
              <Scale className="w-5 h-5 text-slate-400" />
            ) : difference > 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            )}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
                {difference === 0 ? 'Aucun Écart' : difference > 0 ? 'Écart Positif (Surplus)' : 'Écart Négatif (Déficit)'}
              </span>
              <span className="text-xs font-semibold">
                {difference === 0
                  ? 'Le solde reste inchangé.'
                  : difference > 0
                  ? 'Un mouvement de crédit sera généré.'
                  : 'Un mouvement de débit sera généré.'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-base font-black">
              {difference > 0 ? '+' : ''}{formatCurrency(difference, account.currency)}
            </span>
          </div>
        </div>

        {/* Mandatory Reason */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            Motif / Justification Obligatoire *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            placeholder="Ex: Correction après vérification physique du coffre, régularisation de frais bancaires..."
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Toute modification manuelle est auditée et laisse une trace comptable indélébile.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs font-semibold"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={CheckCircle2}
            disabled={isSubmitting || !reason.trim()}
            className="text-xs font-bold"
          >
            {isSubmitting ? 'Validation...' : 'Valider l\'Ajustement'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
