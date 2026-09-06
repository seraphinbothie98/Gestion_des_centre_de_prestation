import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/utils';
import { CashSession } from '../../types';
import { Unlock, Check, ShieldAlert } from 'lucide-react';

interface OpenCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (sessionId: string) => void;
  title?: string;
  contextMessage?: string;
}

export const OpenCashModal: React.FC<OpenCashModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Ouverture de la Caisse du Jour",
  contextMessage = "L'ouverture de la session de caisse avec son fonds initial est obligatoire avant tout encaissement ou création de commande."
}) => {
  const { currentTenant, currentUser } = useAuth();
  const { showToast } = useNotification();
  const state = dbStore.getState();

  const [openingBalance, setOpeningBalance] = useState<number>(100000);
  const [openingNotes, setOpeningNotes] = useState<string>('');

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if session is already open
    const existingActive = state.cashSessions.find(s => s.status === 'OPEN');
    if (existingActive) {
      showToast('Session Active', 'Une session de caisse est déjà active.', 'INFO');
      onSuccess?.(existingActive.id);
      onClose();
      return;
    }

    if (openingBalance < 0) {
      showToast('Montant Invalide', 'Le fonds de caisse initial ne peut pas être négatif.', 'DANGER');
      return;
    }

    const newSessionId = `cs-${Date.now()}`;
    const newSession: CashSession = {
      id: newSessionId,
      tenantId: currentTenant?.id || 't-001',
      cashRegisterId: state.cashRegisters[0]?.id || 'cr-001',
      cashRegisterName: state.cashRegisters[0]?.name || 'Caisse Principale',
      userId: currentUser?.id || 'u-01',
      userName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Caissier',
      openingBalance,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
      notes: openingNotes,
      movements: []
    };

    dbStore.updateState(draft => {
      draft.cashSessions = draft.cashSessions || [];
      draft.cashSessions.unshift(newSession);
    });

    dbStore.logAudit('CASH_SESSION_OPENED', 'CASH_SESSION', newSessionId, null, {
      openingBalance,
      userName: newSession.userName,
      notes: openingNotes
    });

    showToast(
      'Caisse Ouverte 🟢',
      `Session ouverte avec succès avec un fonds initial de ${formatCurrency(openingBalance)}. Vous pouvez désormais enregistrer des commandes et encaisser des paiements.`,
      'SUCCESS'
    );

    setOpeningNotes('');
    onSuccess?.(newSessionId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
    >
      <form onSubmit={handleOpenSession} className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
          <Unlock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <strong className="block font-bold mb-0.5">Étape Préalable Obligatoire</strong>
            {contextMessage}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
          <div>
            <span className="text-slate-400 block">Date d'Ouverture</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {formatDate(new Date().toISOString(), 'dd/MM/yyyy')}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Heure d'Ouverture</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {formatDate(new Date().toISOString(), 'HH:mm')}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-400 block">Caissier / Opérateur</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Caissier Connecté'}
            </span>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
            Fonds de Caisse Initial (GNF) *
          </label>
          <p className="text-[11px] text-slate-500 mb-1.5">
            Montant physique présent dans le tiroir-caisse au démarrage de la journée (≥ 0 GNF, non comptabilisé en CA).
          </p>
          <Input
            type="number"
            min="0"
            step="any"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(Math.max(0, parseInt(e.target.value) || 0))}
            required
            className="text-lg font-black text-slate-900 bg-white"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Observation / Note d'Ouverture (Facultatif)
          </label>
          <textarea
            rows={2}
            value={openingNotes}
            onChange={(e) => setOpeningNotes(e.target.value)}
            placeholder="Ex: Monnaie d'ouverture vérifiée et conforme..."
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" icon={Check} type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-bold">
            Confirmer l'Ouverture de Caisse
          </Button>
        </div>
      </form>
    </Modal>
  );
};
