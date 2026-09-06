import React, { useState, useMemo } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { FinancialAccount } from '../../../types';
import { dbStore } from '../../../server/db/mockStore';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { formatCurrency } from '../../../lib/utils';
import {
  Trash2, AlertTriangle, ArrowRightLeft, ShieldAlert,
  CheckCircle2, Archive, PowerOff, ShieldCheck
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  account: FinancialAccount | null;
  agencyAccounts: FinancialAccount[];
  onActionSuccess: () => void;
  onOpenResetModal?: () => void;
}

export const FinancialAccountDeleteAssistantModal: React.FC<Props> = ({
  isOpen,
  onClose,
  account,
  agencyAccounts,
  onActionSuccess,
  onOpenResetModal
}) => {
  const { currentTenant, currentUser, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [transferReason, setTransferReason] = useState('Transfert de solde avant clôture / suppression');
  const [isProcessing, setIsProcessing] = useState(false);

  const availableDestinations = useMemo(() => {
    if (!account) return [];
    return agencyAccounts.filter(a => a.id !== account.id && a.isActive && !a.isArchived);
  }, [agencyAccounts, account]);

  // Set default destination
  React.useEffect(() => {
    if (availableDestinations.length > 0 && !destinationAccountId) {
      setDestinationAccountId(availableDestinations[0].id);
    }
  }, [availableDestinations, destinationAccountId]);

  if (!account) return null;

  const currentAgencyId = currentTenant?.id || account.tenantId;
  const deleteCheck = dbStore.canDeleteFinancialAccount(account.id, currentAgencyId, isSuperAdmin);
  const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Administrateur';

  // Handler: Transfer full balance
  const handleTransferBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationAccountId) {
      showToast('Validation', 'Veuillez sélectionner un compte de destination actif.', 'WARNING');
      return;
    }

    setIsProcessing(true);
    const res = dbStore.transferBalanceBeforeDelete(
      account.id,
      destinationAccountId,
      transferReason,
      currentAgencyId,
      userName,
      isSuperAdmin
    );
    setIsProcessing(false);

    if (res.success) {
      showToast('Solde Transféré 🔄', res.message, 'SUCCESS');
      onActionSuccess();
    } else {
      showToast('Erreur de Transfert ❌', res.message, 'DANGER');
    }
  };

  // Handler: Permanent Delete (Clean accounts only)
  const handlePermanentDelete = () => {
    setIsProcessing(true);
    const res = dbStore.deleteFinancialAccount(account.id, currentAgencyId, userName, isSuperAdmin);
    setIsProcessing(false);

    if (res.success) {
      showToast('Compte Supprimé 🗑️', res.message, 'SUCCESS');
      onActionSuccess();
      onClose();
    } else {
      showToast('Suppression Refusée ❌', res.message, 'DANGER');
    }
  };

  // Handler: Deactivate Account
  const handleDeactivate = () => {
    setIsProcessing(true);
    const res = dbStore.toggleFinancialAccountStatus(account.id, currentAgencyId, userName, isSuperAdmin);
    setIsProcessing(false);

    if (res.success) {
      showToast('Compte Désactivé ⚡', res.message, 'INFO');
      onActionSuccess();
      onClose();
    } else {
      showToast('Action Échouée ❌', res.message, 'DANGER');
    }
  };

  // Handler: Archive Account
  const handleArchive = () => {
    setIsProcessing(true);
    const res = dbStore.archiveFinancialAccount(account.id, currentAgencyId, userName, isSuperAdmin);
    setIsProcessing(false);

    if (res.success) {
      showToast('Compte Archivé 📦', res.message, 'SUCCESS');
      onActionSuccess();
      onClose();
    } else {
      showToast('Archivage Refusé ❌', res.message, 'DANGER');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assistant de Suppression & Sécurité du Compte"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Mandatory Security Warning Banner */}
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-rose-800 dark:text-rose-300">
              Attention : cette action peut avoir un impact sur les données financières. Êtes-vous sûr de vouloir continuer ?
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 block">
              La suppression définitive ou l'archivage d'un compte financier modifie la structure de trésorerie de l'agence.
            </span>
          </div>
        </div>

        {/* Account Summary Banner */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Compte Concerné</span>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              {account.name}
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                {account.code}
              </span>
            </h4>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Solde Actuel</span>
            <div className="text-sm font-black text-slate-900 dark:text-white">
              {formatCurrency(account.currentBalance, account.currency)}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CASE 0: MAIN CASH OR DEFAULT ACCOUNT BLOCK */}
        {/* ========================================================================= */}
        {deleteCheck.isMainCash && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl space-y-2 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <span>Protection Obligatoire : Caisse Principale</span>
            </div>
            <p className="text-xs">
              Ce compte est configuré comme la <strong>Caisse Principale</strong> de l'agence. Il ne peut pas être supprimé directement.
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Pour pouvoir le supprimer ou le désactiver, vous devez d'abord désigner un autre compte de caisse comme Caisse Principale dans la modification de compte.
            </p>
          </div>
        )}

        {deleteCheck.isDefault && !deleteCheck.isMainCash && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl space-y-2 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <span>Compte par Défaut</span>
            </div>
            <p className="text-xs">
              Ce compte est défini comme <strong>Compte par Défaut</strong> pour les encaissements. Veuillez désigner un autre compte par défaut avant sa suppression.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 1: ACCOUNT HAS ACTIVE BALANCE (>0) -> OBLIGATORY TRANSFER WIZARD */}
        {/* ========================================================================= */}
        {account.currentBalance > 0 && !deleteCheck.isMainCash && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-blue-800/80 rounded-2xl space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200">
                  Étape 1 Obligatoire : Vider le Solde Actif
                </h4>
                <p className="text-[11px] text-blue-800 dark:text-blue-300">
                  Un compte avec un solde supérieur à zéro ne peut pas être supprimé. Transférez le solde vers un autre compte actif de l'agence.
                </p>
              </div>
            </div>

            {availableDestinations.length === 0 ? (
              <div className="text-xs text-rose-600 font-semibold p-2 bg-rose-50 dark:bg-rose-950/60 rounded-lg">
                Aucun autre compte financier actif trouvé pour recevoir les fonds. Veuillez créer ou activer un autre compte.
              </div>
            ) : (
              <form onSubmit={handleTransferBalance} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Compte Destinataire des Fonds *
                    </label>
                    <Select
                      value={destinationAccountId}
                      onChange={(e) => setDestinationAccountId(e.target.value)}
                      options={availableDestinations.map(d => ({
                        value: d.id,
                        label: `${d.name} (${formatCurrency(d.currentBalance, d.currency)})`
                      }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Montant Transféré
                    </label>
                    <div className="p-2 bg-white dark:bg-slate-900 border rounded-lg text-xs font-black text-brand-600">
                      {formatCurrency(account.currentBalance, account.currency)} (Solde total)
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {onOpenResetModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenResetModal();
                      }}
                      className="text-[11px] text-rose-600 hover:underline font-semibold"
                    >
                      Ou réinitialiser directement à 0 GNF →
                    </button>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    icon={ArrowRightLeft}
                    disabled={isProcessing || !destinationAccountId}
                    className="text-xs font-bold"
                  >
                    {isProcessing ? 'Transfert...' : 'Transférer le Solde Maintenant'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 2: ACCOUNT HAS FINANCIAL MOVEMENTS / HISTORY -> CANNOT HARD DELETE */}
        {/* ========================================================================= */}
        {account.currentBalance === 0 && deleteCheck.hasMovements && !deleteCheck.isMainCash && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Historique Comptable Conservé ({deleteCheck.movementCount} opérations)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  « Ce compte contient des données historiques et ne peut pas être supprimé définitivement afin de garantir l'intégrité de la comptabilité. »
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <PowerOff className="w-4 h-4 text-amber-500" />
                  Option 1 : Désactivation
                </span>
                <p className="text-[11px] text-slate-500">
                  Le compte ne pourra plus recevoir de paiements ni d'opérations, mais son historique reste consultable.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeactivate}
                  disabled={isProcessing}
                  className="w-full text-xs font-bold text-amber-600 border-amber-300 hover:bg-amber-50"
                >
                  {account.isActive ? 'Désactiver le Compte' : 'Compte Déjà Inactif'}
                </Button>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Archive className="w-4 h-4 text-indigo-500" />
                  Option 2 : Archivage
                </span>
                <p className="text-[11px] text-slate-500">
                  Archive le compte de manière permanente hors des listes actives tout en conservant les écritures.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleArchive}
                  disabled={isProcessing || account.isArchived}
                  className="w-full text-xs font-bold text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                >
                  {account.isArchived ? 'Déjà Archivé' : 'Archiver Définitivement'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 3: CLEAN ACCOUNT (0 BALANCE, 0 MOVEMENTS) -> PERMANENT DELETE ALLOWED */}
        {/* ========================================================================= */}
        {deleteCheck.canDeleteDirectly && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 rounded-2xl space-y-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Suppression Définitive Autorisée
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Ce compte n'a jamais enregistré d'opérations et possède un solde de 0 GNF. Sa suppression définitive est sécurisée et autorisée.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="danger"
                icon={Trash2}
                onClick={handlePermanentDelete}
                disabled={isProcessing}
                className="text-xs font-bold shadow-md shadow-rose-600/30"
              >
                {isProcessing ? 'Suppression...' : 'Supprimer Définitivement le Compte'}
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs font-semibold"
          >
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
