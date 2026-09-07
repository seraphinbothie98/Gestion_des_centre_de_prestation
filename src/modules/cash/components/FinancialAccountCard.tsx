import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { FinancialAccount } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { useAuth } from '../../../context/AuthContext';
import {
  Landmark, Smartphone, Wallet, Edit, Eye, Scale,
  MoreVertical, ArrowRightLeft, Power, AlertOctagon, Trash2, CheckCircle2, Lock
} from 'lucide-react';

interface FinancialAccountCardProps {
  account: FinancialAccount;
  onViewDetail: (account: FinancialAccount) => void;
  onEdit: (account: FinancialAccount) => void;
  onAdjust: (account: FinancialAccount) => void;
  onTransfer: (fromAccountId: string) => void;
  onToggleStatus: (account: FinancialAccount) => void;
  onReset: (account: FinancialAccount) => void;
  onDelete: (account: FinancialAccount) => void;
}

export const FinancialAccountCard: React.FC<FinancialAccountCardProps> = ({
  account,
  onViewDetail,
  onEdit,
  onAdjust,
  onTransfer,
  onToggleStatus,
  onReset,
  onDelete
}) => {
  const { canManageSensitiveFinancials } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const isCash = account?.type === 'CASH';
  const isBank = account?.type === 'BANK';
  const isMomo = account?.type === 'MOBILE_MONEY';

  const isArchived = Boolean(account?.isArchived);
  const isActive = Boolean(account?.isActive) && !isArchived;

  return (
    <Card
      className={`p-4 sm:p-5 flex flex-col justify-between border transition-all duration-200 w-full overflow-hidden ${
        isArchived
          ? 'opacity-50 bg-slate-100 dark:bg-slate-950/60 border-dashed border-slate-300 dark:border-slate-800'
          : !isActive
          ? 'opacity-75 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
          : 'border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-brand-300 dark:hover:border-brand-800'
      }`}
    >
      <div className="space-y-3.5 w-full min-w-0">
        {/* Header with Type Icon, Name and Status */}
        <div className="flex items-start justify-between gap-2 w-full min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm shrink-0 ${
                isBank
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                  : isMomo
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              }`}
            >
              {isBank ? <Landmark className="w-5 h-5" /> : isMomo ? <Smartphone className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight truncate" title={account?.name}>
                  {account?.name || 'Compte sans nom'}
                </h4>
                {account?.isDefault && (
                  <span className="bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                    Défaut
                  </span>
                )}
                {account?.isMainCash && (
                  <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                    Caisse Principale
                  </span>
                )}
                {account?.isPettyCash && (
                  <span className="bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                    Petite Caisse
                  </span>
                )}
              </div>
              <span className="font-mono text-[10px] text-slate-400 uppercase font-semibold block mt-0.5 truncate">
                Code: {account?.code || '—'} • {isBank ? 'Banque' : isMomo ? 'Mobile Money' : 'Caisse Espèces'}
              </span>
            </div>
          </div>

          <Badge
            variant={isArchived ? 'outline' : isActive ? 'success' : 'outline'}
            size="sm"
            className="font-bold text-[10px] shrink-0"
          >
            {isArchived ? 'Archivé' : isActive ? 'Actif' : 'Inactif'}
          </Badge>
        </div>

        {/* Balance Display Box */}
        <div className="bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 w-full">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Solde Disponible</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5 truncate">
            {formatCurrency(account?.currentBalance || 0, account?.currency || 'GNF')}
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-200/50 dark:border-slate-800/80">
            <span className="truncate">Initial: {formatCurrency(account?.initialBalance || 0, account?.currency || 'GNF')}</span>
            <span className="shrink-0 font-semibold">{account?.currency || 'GNF'}</span>
          </div>
        </div>

        {/* Details & Payment Methods */}
        <div className="text-xs text-slate-500 space-y-1 w-full min-w-0">
          {(account?.bankName || account?.accountNumber) && (
            <div className="flex justify-between items-center text-[11px] gap-2">
              {account?.bankName && <span className="truncate">Banque : <strong>{account.bankName}</strong></span>}
              {account?.accountNumber && <span className="font-mono text-[10px] shrink-0">N° {account.accountNumber}</span>}
            </div>
          )}
          {account?.description && (
            <p className="text-[11px] text-slate-400 italic line-clamp-1">{account.description}</p>
          )}
          {account?.associatedPaymentMethods && account.associatedPaymentMethods.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              {account.associatedPaymentMethods.map(pm => (
                <span key={pm} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {pm.replace('_', ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Bar with Responsive flex-wrap and Smart Dropdown */}
      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 w-full">
        <div className="flex flex-wrap items-center justify-between gap-1.5 w-full">
          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            <Button
              size="sm"
              variant="primary"
              icon={Eye}
              onClick={() => onViewDetail(account)}
              className="text-xs font-bold h-8 px-2.5 flex-1 xs:flex-none justify-center"
              title="Consulter la fiche détaillée du compte"
            >
              Voir fiche
            </Button>

            {/* SENSITIVE ACTION: Modifier - Only for Authorized Admins */}
            {canManageSensitiveFinancials && (
              <Button
                size="sm"
                variant="outline"
                icon={Edit}
                onClick={() => onEdit(account)}
                className="text-xs font-bold h-8 px-2 flex-1 xs:flex-none justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Modifier les informations du compte"
              >
                Modifier
              </Button>
            )}

            {/* SENSITIVE ACTION: Ajuster Solde - Only for Authorized Admins */}
            {canManageSensitiveFinancials && (
              <Button
                size="sm"
                variant="outline"
                icon={Scale}
                onClick={() => onAdjust(account)}
                className="text-xs font-bold h-8 px-2 flex-1 xs:flex-none justify-center text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                title="Ajuster le solde manuellement avec motif d'audit"
              >
                Ajuster
              </Button>
            )}
          </div>

          {/* Secondary & Destructive Actions Dropdown Menu [ ⋮ Actions ] */}
          <div className="relative shrink-0" ref={menuRef}>
            <Button
              size="sm"
              variant="outline"
              icon={MoreVertical}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`h-8 px-2 text-xs font-bold transition-colors ${
                isMenuOpen
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
              title="Actions secondaires et gestion administrative"
            >
              <span className="hidden sm:inline ml-0.5">Actions</span>
            </Button>

            {/* Dropdown Popup */}
            {isMenuOpen && (
              <div
                className="absolute right-0 bottom-full mb-1.5 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))' }}
              >
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Gestion Opérationnelle
                </div>

                {/* Transfert de fonds */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onTransfer(account.id);
                  }}
                  disabled={!isActive || (account.currentBalance || 0) <= 0}
                  className="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2.5 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ArrowRightLeft className="w-4 h-4 text-brand-500 shrink-0" />
                  <div>
                    <span className="block font-bold">Transférer des fonds</span>
                    <span className="text-[10px] text-slate-400 font-normal">Virement vers un autre compte</span>
                  </div>
                </button>

                {/* SENSITIVE ACTIONS SECTION: Only visible to authorized administrators */}
                {canManageSensitiveFinancials && (
                  <>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <div className="px-3 py-1 text-[9px] font-black text-rose-500 uppercase tracking-wider">
                      Administration Sensible
                    </div>

                    {/* Activer / Désactiver */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onToggleStatus(account);
                      }}
                      disabled={isArchived}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                        isActive
                          ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      <Power className="w-4 h-4 shrink-0" />
                      <div>
                        <span className="block font-bold">{isActive ? 'Désactiver le compte' : 'Réactiver le compte'}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {isActive ? 'Suspendre temporairement' : 'Rendre disponible pour les opérations'}
                        </span>
                      </div>
                    </button>

                    {/* Réinitialiser le solde à 0 */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onReset(account);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2.5 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                    >
                      <AlertOctagon className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <span className="block font-bold">Réinitialiser le solde</span>
                        <span className="text-[10px] text-slate-400 font-normal">Remise à 0 GNF sécurisée</span>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    {/* Supprimer ou Archiver */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDelete(account);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                      <div>
                        <span className="block font-bold">Supprimer / Archiver</span>
                        <span className="text-[10px] text-slate-400 font-normal">Suppression assistée ou archivage</span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
