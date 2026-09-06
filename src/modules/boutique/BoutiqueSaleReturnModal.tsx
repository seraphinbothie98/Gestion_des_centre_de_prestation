import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { BoutiqueSale, BoutiqueSaleItem, PaymentMethod } from '../../types';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency } from '../../lib/utils';
import { RotateCcw, AlertTriangle, CheckCircle2, ShieldAlert, Package, Lock, Unlock } from 'lucide-react';
import { OpenCashModal } from '../cash/OpenCashModal';

interface BoutiqueSaleReturnModalProps {
  sale: BoutiqueSale | null;
  isOpen: boolean;
  onClose: () => void;
  onReturnSuccess?: () => void;
}

export const BoutiqueSaleReturnModal: React.FC<BoutiqueSaleReturnModalProps> = ({
  sale,
  isOpen,
  onClose,
  onReturnSuccess,
}) => {
  const { currentTenant, currentUser } = useAuth();
  const { showToast } = useNotification();
  const state = dbStore.getState();

  const openSession = state.cashSessions.find(cs => cs.status === 'OPEN');
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);

  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnReason, setReturnReason] = useState('Erreur de commande / Non conforme');
  const [restockInStore, setRestockInStore] = useState<boolean>(true);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('CASH');

  if (!sale || !sale.items || sale.items.length === 0) return null;

  const currentItem = sale.items[selectedItemIndex] || sale.items[0];
  const maxReturnQty = currentItem.stockDeduction;

  const handleSelectArticle = (idx: number) => {
    setSelectedItemIndex(idx);
    const item = sale.items[idx];
    setReturnQty(1);
    setRefundAmount(item.unitSalePrice);
  };

  const handleQtyChange = (qty: number) => {
    const validQty = Math.max(1, Math.min(qty, maxReturnQty));
    setReturnQty(validQty);
    // Suggest refund amount proportionally
    const refundPerUnit = currentItem.finalPrice / currentItem.stockDeduction;
    setRefundAmount(Math.round(refundPerUnit * validQty));
  };

  const handleProcessReturn = (e: React.FormEvent) => {
    e.preventDefault();

    if (refundAmount > 0 && !openSession) {
      showToast('Caisse Fermée 🔒', 'La caisse est fermée. Veuillez ouvrir la caisse pour enregistrer le décaissement de remboursement.', 'WARNING');
      setIsOpenCashModalOpen(true);
      return;
    }

    const returnId = `ret-${Date.now()}`;
    const returnNumber = `RET-${Date.now().toString().slice(-6)}`;
    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Caissier';

    dbStore.updateState(draft => {
      // 1. If restock, increase product stock
      if (restockInStore) {
        const prod = draft.products.find(p => p.id === currentItem.productId);
        if (prod) {
          const oldStock = prod.currentStock;
          prod.currentStock += returnQty;
          prod.updatedAt = new Date().toISOString();

          if (!draft.stockMovements) draft.stockMovements = [];
          draft.stockMovements.unshift({
            id: `mov-${Date.now()}`,
            tenantId: currentTenant?.id || 't-001',
            productId: prod.id,
            productName: prod.name,
            movementType: 'CUSTOMER_RETURN',
            quantity: returnQty,
            oldStock,
            newStock: prod.currentStock,
            unitUsed: currentItem.unitLabel,
            unitCost: prod.costPrice,
            totalCost: prod.costPrice * returnQty,
            sourceLocation: 'Client',
            destinationLocation: sale.location || 'BOUTIQUE',
            relatedSaleId: sale.id,
            reason: `Retour client vente ${sale.saleNumber} - ${returnReason}`,
            performedByUserName: performedBy,
            createdAt: new Date().toISOString()
          });
        }
      }

      // 2. If refund amount > 0, record in cash session movements and expenses
      if (refundAmount > 0 && openSession) {
        const activeSess = draft.cashSessions.find(cs => cs.id === openSession.id);
        if (activeSess) {
          if (!activeSess.movements) activeSess.movements = [];
          activeSess.movements.push({
            id: `cmov-${Date.now()}`,
            cashSessionId: openSession.id,
            movementType: 'REFUND',
            amount: refundAmount,
            category: 'Remboursement Client Boutique',
            reason: `Remboursement retour article "${currentItem.productName}" (Vente ${sale.saleNumber}) - ${returnReason}`,
            isCommercialRevenue: false,
            performedByUserName: performedBy,
            createdAt: new Date().toISOString()
          });
        }

        if (!draft.expenses) draft.expenses = [];
        draft.expenses.unshift({
          id: `exp-${Date.now()}`,
          tenantId: currentTenant?.id || 't-001',
          cashSessionId: openSession.id,
          expenseNumber: `REM-${Date.now().toString().slice(-6)}`,
          category: 'Remboursement Client Boutique',
          description: `Remboursement retour article "${currentItem.productName}" (Vente ${sale.saleNumber}) - ${returnReason}`,
          amount: refundAmount,
          paymentMethod: refundMethod,
          recipientName: sale.personName,
          createdByName: performedBy,
          createdAt: new Date().toISOString()
        });
      }

      // 3. Save boutique return log
      if (!draft.boutiqueSaleReturns) draft.boutiqueSaleReturns = [];
      draft.boutiqueSaleReturns.unshift({
        id: returnId,
        tenantId: currentTenant?.id || 't-001',
        returnNumber,
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        productId: currentItem.productId,
        productName: currentItem.productName,
        quantityReturned: returnQty,
        returnReason,
        restockInStore,
        refundAmount,
        refundMethod,
        performedByUserName: performedBy,
        createdAt: new Date().toISOString()
      });
    });

    dbStore.logAudit('BOUTIQUE_SALE_RETURN', 'BOUTIQUE_SALE', sale.id, null, {
      saleNumber: sale.saleNumber,
      product: currentItem.productName,
      qty: returnQty,
      refund: refundAmount,
      restock: restockInStore
    });

    showToast('Retour Enregistré', `Le retour de ${returnQty} unité(s) pour la vente ${sale.saleNumber} a été validé.`, 'SUCCESS');
    if (onReturnSuccess) onReturnSuccess();
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Enregistrer un Retour Client — ${sale.saleNumber}`}
        maxWidth="md"
      >
        <form onSubmit={handleProcessReturn} className="space-y-4 pt-1">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <strong className="flex items-center gap-1.5 font-bold">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              Procédure de Retour Marchandise Boutique
            </strong>
            <p className="text-[11px]">
              Client : <strong>{sale.personName}</strong> • Date d'achat : <strong>{sale.createdAt.split('T')[0]}</strong>
            </p>
          </div>

          {/* Select Item */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Article retourné *
            </label>
            <Select
              value={selectedItemIndex.toString()}
              onChange={(e) => handleSelectArticle(parseInt(e.target.value))}
            >
              {sale.items.map((item, idx) => (
                <option key={idx} value={idx}>
                  {item.productName} — {item.quantitySold} {item.unitLabel} ({formatCurrency(item.finalPrice)})
                </option>
              ))}
            </Select>
          </div>

          {/* Return Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Quantité retournée (Unité de base) *
              </label>
              <Input
                type="number"
                min="1"
                max={maxReturnQty}
                value={returnQty}
                onChange={(e) => handleQtyChange(parseInt(e.target.value) || 1)}
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Max vendue : {maxReturnQty} unité(s)
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Montant du remboursement (GNF) *
              </label>
              <Input
                type="number"
                min="0"
                max={sale.totalAmount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(parseInt(e.target.value) || 0)}
                required
                className="font-bold text-rose-600"
              />
            </div>
          </div>

          {/* Restock checkbox */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-900 dark:text-white">
              <input
                type="checkbox"
                checked={restockInStore}
                onChange={(e) => setRestockInStore(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
              />
              Réintégrer la marchandise dans le stock vendable (+{returnQty})
            </label>
            <p className="text-[10px] text-slate-500 pl-6">
              {restockInStore
                ? "L'article est intact et sera remis en rayon dans l'inventaire boutique."
                : "L'article est endommagé ou impropre à la vente. Aucun stock ne sera rajouté."}
            </p>
          </div>

          {/* Return Reason */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Motif du retour *
            </label>
            <Input
              type="text"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="ex: Produit non conforme, erreur de référence, défaut d'emballage..."
              required
            />
          </div>

          {refundAmount > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Mode de remboursement caisse *
              </label>
              <Select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
              >
                <option value="CASH">Espèces (Tiroir-caisse)</option>
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="MTN_MOMONEY">MTN Mobile Money</option>
                <option value="BANK_TRANSFER">Virement Bancaire</option>
              </Select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Annuler
            </Button>
            <Button variant="danger" icon={RotateCcw} type="submit" className="font-bold">
              Valider le Retour Client
            </Button>
          </div>
        </form>
      </Modal>

      {/* Open Cash Modal if cash session is closed */}
      <OpenCashModal
        isOpen={isOpenCashModalOpen}
        onClose={() => setIsOpenCashModalOpen(false)}
        contextMessage="L'ouverture de la session de caisse permet de décaisser le montant du remboursement client."
      />
    </>
  );
};
