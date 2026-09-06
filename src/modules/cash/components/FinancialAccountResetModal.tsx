import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { FinancialAccount } from '../../../types';
import { dbStore } from '../../../server/db/mockStore';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { formatCurrency } from '../../../lib/utils';
import { AlertOctagon, Lock, ShieldAlert, CheckCircle2, AlertTriangle, Key } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  account: FinancialAccount | null;
  onResetSuccess: () => void;
}

export const FinancialAccountResetModal: React.FC<Props> = ({
  isOpen,
  onClose,
  account,
  onResetSuccess
}) => {
  const { currentTenant, currentUser, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [hasConfirmedCheckbox, setHasConfirmedCheckbox] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [resetReason, setResetReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasConfirmedCheckbox(false);
      setKeywordInput('');
      setAdminPassword('');
      setResetReason('');
      setIsSubmitting(false);
    }
  }, [isOpen, account]);

  if (!account) return null;

  const currentBalance = account.currentBalance || 0;
  const isKeywordValid = keywordInput.trim().toUpperCase() === 'RÉINITIALISER' || keywordInput.trim().toUpperCase() === 'REINITIALISER';
  const canSubmit = hasConfirmedCheckbox && isKeywordValid && adminPassword.trim().length > 0 && resetReason.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) {
      showToast('Validation Requise', 'Veuillez remplir toutes les conditions de sécurité pour continuer.', 'WARNING');
      return;
    }

    setIsSubmitting(true);
    const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Administrateur';
    const tenantId = currentTenant?.id || account.tenantId;

    const res = dbStore.resetFinancialAccount(
      account.id,
      keywordInput,
      adminPassword,
      resetReason,
      tenantId,
      userName,
      isSuperAdmin
    );

    setIsSubmitting(false);

    if (res.success) {
      showToast('Compte Réinitialisé 🔄', res.message, 'SUCCESS');
      onResetSuccess();
      onClose();
    } else {
      showToast('Échec de la Réinitialisation ❌', res.message, 'DANGER');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Réinitialisation Individuelle d'un Compte Financier"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Critical Warning Banner */}
        <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-800 rounded-2xl p-4 text-rose-900 dark:text-rose-200 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/30">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-rose-600 dark:text-rose-400">
                Opération Critique Sécurisée
              </span>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Attention : cette action peut avoir un impact sur les données financières. Êtes-vous sûr de vouloir continuer ?
              </h4>
              <p className="text-xs font-bold text-rose-700 dark:text-rose-300 mt-0.5">
                Vous êtes sur le point de réinitialiser le compte « {account.name} » ({account.code}).
              </p>
            </div>
          </div>

          <div className="text-xs space-y-1 pt-2 border-t border-rose-200 dark:border-rose-900/60 font-medium">
            <p><strong>Conséquences de l'opération :</strong></p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800 dark:text-rose-300">
              <li>Le solde actuel ({formatCurrency(currentBalance, account.currency)}) sera <strong>ramené à 0 {account.currency}</strong>.</li>
              <li>Le solde initial du compte sera réinitialisé à 0 {account.currency}.</li>
              <li>Un mouvement de clôture et un enregistrement d'audit seront créés.</li>
              <li><strong>Les autres comptes financiers de l'agence ne seront JAMAIS modifiés.</strong></li>
            </ul>
          </div>
        </div>

        {/* Security Step 1: Confirmation Checkbox */}
        <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasConfirmedCheckbox}
            onChange={(e) => setHasConfirmedCheckbox(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
          />
          <div className="text-xs">
            <span className="font-bold text-slate-900 dark:text-white block">
              1. Confirmation explicite
            </span>
            <span className="text-slate-500">
              Je confirme vouloir remettre le solde de ce compte spécifique à 0 {account.currency}.
            </span>
          </div>
        </label>

        {/* Security Step 2: Keyword Input */}
        <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>2. Saisie du mot-clé de sécurité *</span>
            <span className="font-mono text-[10px] text-rose-600 bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded font-bold">
              RÉINITIALISER
            </span>
          </label>
          <Input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder="Tapez RÉINITIALISER"
            className={`font-mono text-sm tracking-wider uppercase ${
              isKeywordValid ? 'border-emerald-500 focus:ring-emerald-500 text-emerald-700 dark:text-emerald-300' : ''
            }`}
            required
          />
          <p className="text-[10px] text-slate-400">
            Tapez exactement le mot <strong>RÉINITIALISER</strong> en majuscules pour déverrouiller.
          </p>
        </div>

        {/* Security Step 3: Admin Password & Reason */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              3. Mot de Passe Administrateur *
            </label>
            <Input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Votre mot de passe"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
              4. Motif Obligatoire *
            </label>
            <Input
              type="text"
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
              placeholder="Ex: Clôture annuelle, remise à zéro périodique"
              required
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-400 italic">
            Sans validation complète, l'opération est annulée.
          </span>
          <div className="flex items-center gap-2">
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
              variant="danger"
              icon={AlertOctagon}
              disabled={!canSubmit || isSubmitting}
              className="text-xs font-black shadow-md shadow-rose-600/30"
            >
              {isSubmitting ? 'Réinitialisation...' : 'Confirmer la Réinitialisation'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
