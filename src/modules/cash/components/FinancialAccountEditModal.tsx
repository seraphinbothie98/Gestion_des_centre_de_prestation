import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { FinancialAccount, FinancialAccountType, PaymentMethod } from '../../../types';
import { dbStore } from '../../../server/db/mockStore';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { Edit3, CheckCircle2, ShieldAlert, CreditCard, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  account: FinancialAccount | null;
  onEditSuccess: () => void;
}

const ALL_PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'CASH', label: 'Espèces' },
  { id: 'ORANGE_MONEY', label: 'Orange Money' },
  { id: 'MTN_MOMO', label: 'MTN Mobile Money' },
  { id: 'BANK_TRANSFER', label: 'Virement Bancaire' },
  { id: 'CARD', label: 'Carte Bancaire' },
  { id: 'CHECK', label: 'Chèque' },
  { id: 'OTHER', label: 'Autre' }
];

export const FinancialAccountEditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  account,
  onEditSuccess
}) => {
  const { currentTenant, currentUser, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<FinancialAccountType>('CASH');
  const [description, setDescription] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isMainCash, setIsMainCash] = useState(false);
  const [isPettyCash, setIsPettyCash] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<PaymentMethod[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name || '');
      setCode(account.code || '');
      setType(account.type || 'CASH');
      setDescription(account.description || '');
      setBankName(account.bankName || '');
      setAccountNumber(account.accountNumber || '');
      setIsDefault(Boolean(account.isDefault));
      setIsMainCash(Boolean(account.isMainCash));
      setIsPettyCash(Boolean(account.isPettyCash));
      setSelectedMethods(account.associatedPaymentMethods || []);
    }
  }, [account, isOpen]);

  if (!account) return null;

  const toggleMethod = (method: PaymentMethod) => {
    setSelectedMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Validation', 'Le nom du compte est obligatoire.', 'WARNING');
      return;
    }

    setIsSubmitting(true);
    const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Administrateur';
    const tenantId = currentTenant?.id || account.tenantId;

    const res = dbStore.updateFinancialAccount(
      account.id,
      {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        description: description.trim() || undefined,
        bankName: bankName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        isDefault,
        isMainCash,
        isPettyCash,
        associatedPaymentMethods: selectedMethods
      },
      tenantId,
      userName,
      isSuperAdmin
    );

    setIsSubmitting(false);

    if (res.success) {
      showToast('Compte Mis à Jour 🟢', res.message, 'SUCCESS');
      onEditSuccess();
      onClose();
    } else {
      showToast('Erreur de Mise à Jour ❌', res.message, 'DANGER');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modifier le Compte Financier"
      maxWidth="lg"
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
              La modification du type, des rôles principaux ou des paramètres de ce compte sera enregistrée dans le journal d'audit administratif.
            </span>
          </div>
        </div>

        {/* General Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Nom du Compte *
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Caisse Centrale, Orange Money Kindia..."
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Code Compte
            </label>
            <Input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex: CP-01"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Type de Compte *
            </label>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as FinancialAccountType)}
              options={[
                { value: 'CASH', label: 'Espèces / Caisse Physique' },
                { value: 'BANK', label: 'Compte Bancaire (Virement, Chèque)' },
                { value: 'MOBILE_MONEY', label: 'Mobile Money (Orange, MTN, Wave)' },
                { value: 'ELECTRONIC', label: 'Portefeuille Électronique / Carte' },
                { value: 'OTHER', label: 'Autre Compte' }
              ]}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Établissement / Banque / Opérateur
            </label>
            <Input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Ex: Ecobank, Société Générale, Orange..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              N° de Compte / RIB / N° Téléphone
            </label>
            <Input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Ex: 00123456789 ou +224 620..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Description / Rôle
            </label>
            <Input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Dépenses courantes de l'agence..."
            />
          </div>
        </div>

        {/* Associated Payment Methods */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-brand-500" />
            Modes de Paiement Associés à ce Compte
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ALL_PAYMENT_METHODS.map(pm => {
              const isChecked = selectedMethods.includes(pm.id);
              return (
                <label
                  key={pm.id}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                    isChecked
                      ? 'bg-brand-50 dark:bg-brand-950/50 border-brand-300 dark:border-brand-700 text-brand-900 dark:text-brand-200 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleMethod(pm.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>{pm.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* System Flags */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Paramètres Spécifiques & Statuts Système
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Compte par Défaut</span>
                <span className="text-[10px] text-slate-500">Présélectionné lors des encaissements</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isMainCash}
                onChange={(e) => setIsMainCash(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Caisse Principale</span>
                <span className="text-[10px] text-slate-500">Liée aux sessions journalières</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPettyCash}
                onChange={(e) => setIsPettyCash(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Petite Caisse</span>
                <span className="text-[10px] text-slate-500">Pour petites dépenses</span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
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
            disabled={isSubmitting}
            className="text-xs font-bold"
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer les Modifications'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
