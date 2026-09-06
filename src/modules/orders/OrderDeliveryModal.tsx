import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Order, PaymentMethod, Payment, OrderItem } from '../../types';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, generateDocNumber, formatDate } from '../../lib/utils';
import { computeDynamicOrderStatus, computeDynamicDeliveryStatus } from '../../lib/pricingEngine';
import {
  Truck, CheckCircle2, AlertTriangle, DollarSign, ShieldAlert, X,
  Lock, Unlock, Layers, CheckSquare, Square
} from 'lucide-react';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { OpenCashModal } from '../cash/OpenCashModal';

interface OrderDeliveryModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onDeliverySuccess?: () => void;
}

export const OrderDeliveryModal: React.FC<OrderDeliveryModalProps> = ({
  order,
  isOpen,
  onClose,
  onDeliverySuccess,
}) => {
  const { currentTenant, currentUser, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const state = dbStore.getState();

  const openSession = state.cashSessions.find(cs => cs.status === 'OPEN');
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);

  if (!order) return null;

  const dueAmount = order.dueAmount !== undefined ? order.dueAmount : Math.max(0, order.totalAmount - order.paidAmount);
  const canDeliverUnpaid = hasPermission('orders.deliver_unpaid') || hasPermission('orders.*') || currentUser?.roles.some(r => r.code === 'ADMIN_CENTRE' || r.code === 'GERANT');

  // Selected item IDs to deliver in this delivery session
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() => {
    // By default, select ready/done items or undelivered items
    return order.items
      .filter(it => it.productionStatus !== 'DELIVERED' && it.productionStatus !== 'CANCELLED')
      .map(it => it.id);
  });

  // Mode state: 'SELECT' | 'PAY_AND_DELIVER' | 'DELIVER_UNPAID'
  const [deliveryMode, setDeliveryMode] = useState<'SELECT' | 'PAY_AND_DELIVER' | 'DELIVER_UNPAID'>('SELECT');

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState<number>(dueAmount);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentReference, setPaymentReference] = useState('');

  // Unpaid delivery reason
  const [unpaidReason, setUnpaidReason] = useState('');
  const [recipientName, setRecipientName] = useState(order.personName);

  // Generated receipt
  const [generatedPayment, setGeneratedPayment] = useState<Payment | null>(null);

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllSelected = selectedItemIds.length > 0 && selectedItemIds.length === order.items.filter(i => i.productionStatus !== 'CANCELLED').length;

  // 1. Handle Full or Partial Payment and Delivery
  const handlePayAndDeliver = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItemIds.length === 0) {
      showToast('Aucune prestation sélectionnée', 'Veuillez cocher au moins une prestation à livrer.', 'WARNING');
      return;
    }

    if (!openSession) {
      showToast('Caisse Fermée 🔒', 'La caisse est actuellement fermée. Veuillez ouvrir la caisse pour enregistrer le règlement à la livraison.', 'WARNING');
      setIsOpenCashModalOpen(true);
      return;
    }

    if (paymentAmount <= 0) {
      showToast('Montant Invalide', 'Veuillez saisir un montant à encaisser supérieur à 0 GNF.', 'DANGER');
      return;
    }

    if (paymentAmount > dueAmount) {
      showToast('Dépassement de Montant', `Le montant ne peut pas excéder le solde dû (${formatCurrency(dueAmount)}).`, 'DANGER');
      return;
    }

    const paySeq = state.payments.length + 1;
    const paymentId = `pay-${Date.now()}`;
    const paymentNumber = generateDocNumber('PAY', paySeq);
    const balanceBefore = dueAmount;
    const balanceAfter = Math.max(0, dueAmount - paymentAmount);
    const newPaidAmount = order.paidAmount + paymentAmount;
    const newPaymentStatus = balanceAfter === 0 ? 'PAID' : 'PARTIALLY_PAID';
    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Caissier';

    const newPayment: Payment = {
      id: paymentId,
      tenantId: currentTenant?.id || 't-001',
      personId: order.personId,
      personName: order.personName,
      targetType: 'ORDER',
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentNumber,
      amount: paymentAmount,
      balanceBefore,
      balanceAfter,
      paymentType: balanceAfter === 0 ? 'BALANCE_PAYMENT' : 'INSTALLMENT',
      paymentMethod,
      reference: paymentReference || `Règlement livraison ${order.orderNumber}`,
      cashSessionId: openSession?.id,
      receivedByUserName: performedBy,
      createdAt: new Date().toISOString(),
    };

    dbStore.updateState(draft => {
      const ord = draft.orders.find(o => o.id === order.id);
      if (ord) {
        // Update selected items production status to DELIVERED
        ord.items.forEach(it => {
          if (selectedItemIds.includes(it.id)) {
            it.productionStatus = 'DELIVERED';
            it.deliveredAt = new Date().toISOString();
            it.deliveredByUserName = performedBy;
          }
        });

        ord.paidAmount = newPaidAmount;
        ord.dueAmount = balanceAfter;
        ord.paymentStatus = newPaymentStatus;
        ord.status = computeDynamicOrderStatus(ord.items);
        ord.deliveryStatus = computeDynamicDeliveryStatus(ord.items);
        ord.deliveredAt = new Date().toISOString();
        ord.deliveredByUserId = currentUser?.id;
        ord.deliveredByUserName = performedBy;
        ord.deliveryNotes = `Livraison (${selectedItemIds.length} ligne(s)) avec règlement de ${formatCurrency(paymentAmount)} (Reçu ${paymentNumber}). Réceptionné par ${recipientName}.`;
        ord.updatedAt = new Date().toISOString();
      }

      // Add payment
      draft.payments.unshift(newPayment);

      // Add to cash session
      if (openSession) {
        const sess = draft.cashSessions.find(s => s.id === openSession.id);
        if (sess) {
          if (!sess.movements) sess.movements = [];
          sess.movements.unshift({
            id: `cm-${Date.now()}`,
            cashSessionId: sess.id,
            movementType: 'INFLOW',
            amount: paymentAmount,
            category: 'Commande / Prestations',
            reason: `Règlement livraison (${paymentMethod}) — Commande ${order.orderNumber}`,
            paymentId,
            isCommercialRevenue: true,
            performedByUserName: performedBy,
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    dbStore.logAudit('ORDER_DELIVERED_WITH_PAYMENT', 'ORDER', order.id, null, {
      paymentAmount,
      balanceAfter,
      deliveredLines: selectedItemIds.length,
      deliveredTo: recipientName,
      performedBy
    });

    showToast('Livraison & Règlement Validés 🟢', `Les prestations sélectionnées ont été livrées pour la commande ${order.orderNumber}.`, 'SUCCESS');
    if (onDeliverySuccess) onDeliverySuccess();
    setGeneratedPayment(newPayment);
  };

  // 2. Handle Unpaid / Debt Delivery
  const handleDeliverUnpaid = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItemIds.length === 0) {
      showToast('Aucune prestation sélectionnée', 'Veuillez cocher au moins une prestation à livrer.', 'WARNING');
      return;
    }

    if (!canDeliverUnpaid) {
      showToast('Autorisation Requise', 'Vous n\'avez pas l\'autorisation de livrer une commande non soldée.', 'DANGER');
      return;
    }

    if (!unpaidReason.trim()) {
      showToast('Motif Obligatoire', 'Veuillez obligatoirement justifier la livraison sans paiement complet.', 'DANGER');
      return;
    }

    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Caissier';

    dbStore.updateState(draft => {
      const ord = draft.orders.find(o => o.id === order.id);
      if (ord) {
        ord.items.forEach(it => {
          if (selectedItemIds.includes(it.id)) {
            it.productionStatus = 'DELIVERED';
            it.deliveredAt = new Date().toISOString();
            it.deliveredByUserName = performedBy;
          }
        });

        ord.status = computeDynamicOrderStatus(ord.items);
        ord.deliveryStatus = computeDynamicDeliveryStatus(ord.items);
        ord.isDeliveredUnpaid = dueAmount > 0;
        ord.deliveredAt = new Date().toISOString();
        ord.deliveredByUserId = currentUser?.id;
        ord.deliveredByUserName = performedBy;
        ord.deliveryNotes = `Livraison non soldée autorisée (${selectedItemIds.length} ligne(s)). Dette résiduelle: ${formatCurrency(dueAmount)}. Motif: ${unpaidReason}. Réceptionné par ${recipientName}.`;
        ord.updatedAt = new Date().toISOString();
      }
    });

    dbStore.logAudit('ORDER_DELIVERED_UNPAID', 'ORDER', order.id, null, {
      dueAmount,
      unpaidReason,
      deliveredLines: selectedItemIds.length,
      deliveredTo: recipientName,
      performedBy
    });

    showToast('Livraison Effectuée 🟠', `Prestations livrées avec maintien de la dette client (${formatCurrency(dueAmount)}).`, 'WARNING');
    if (onDeliverySuccess) onDeliverySuccess();
    onClose();
  };

  // 3. Simple Delivery (Order Already 100% Paid)
  const handleDeliverFullyPaid = () => {
    if (selectedItemIds.length === 0) {
      showToast('Aucune prestation sélectionnée', 'Veuillez cocher au moins une prestation à livrer.', 'WARNING');
      return;
    }

    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Caissier';

    dbStore.updateState(draft => {
      const ord = draft.orders.find(o => o.id === order.id);
      if (ord) {
        ord.items.forEach(it => {
          if (selectedItemIds.includes(it.id)) {
            it.productionStatus = 'DELIVERED';
            it.deliveredAt = new Date().toISOString();
            it.deliveredByUserName = performedBy;
          }
        });

        ord.status = computeDynamicOrderStatus(ord.items);
        ord.deliveryStatus = computeDynamicDeliveryStatus(ord.items);
        ord.deliveredAt = new Date().toISOString();
        ord.deliveredByUserId = currentUser?.id;
        ord.deliveredByUserName = performedBy;
        ord.deliveryNotes = `Livraison effectuée (${selectedItemIds.length} ligne(s)). Commande intégralement soldée. Réceptionné par ${recipientName}.`;
        ord.updatedAt = new Date().toISOString();
      }
    });

    dbStore.logAudit('ORDER_DELIVERED', 'ORDER', order.id, null, {
      deliveredLines: selectedItemIds.length,
      deliveredTo: recipientName,
      performedBy
    });

    showToast('Livraison Confirmée 🟢', `Les prestations ont été livrées au client ${recipientName}.`, 'SUCCESS');
    if (onDeliverySuccess) onDeliverySuccess();
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Procédure de Livraison — ${order.orderNumber}`}
        maxWidth="md"
      >
        <div className="space-y-4 pt-1">
          {/* Order & Client Info */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-[10px]">Client</span>
                <strong className="text-slate-900 dark:text-white">{order.personName}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Montant Total</span>
                <strong className="text-slate-900 dark:text-white">{formatCurrency(order.totalAmount)}</strong>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Déjà Encaissé</span>
                <span className="text-emerald-600 font-bold">{formatCurrency(order.paidAmount)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Solde Restant Dû</span>
                <strong className={`font-black ${dueAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {formatCurrency(dueAmount)}
                </strong>
              </div>
            </div>
          </div>

          {/* Prestations to deliver selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-brand-500" />
                Sélection des Prestations à Livrer ({selectedItemIds.length}/{order.items.length})
              </label>
              <button
                type="button"
                onClick={() => {
                  if (isAllSelected) {
                    setSelectedItemIds([]);
                  } else {
                    setSelectedItemIds(order.items.filter(i => i.productionStatus !== 'CANCELLED').map(i => i.id));
                  }
                }}
                className="text-[11px] font-bold text-brand-600 hover:underline"
              >
                {isAllSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {order.items.map((it, idx) => {
                const isDelivered = it.productionStatus === 'DELIVERED';
                const isSelected = selectedItemIds.includes(it.id);

                return (
                  <div
                    key={it.id || idx}
                    onClick={() => !isDelivered && toggleItemSelection(it.id)}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isDelivered
                        ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'bg-brand-50/60 dark:bg-brand-950/40 border-brand-300 dark:border-brand-800'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected || isDelivered}
                        disabled={isDelivered}
                        onChange={() => {}}
                        className="rounded text-brand-600"
                      />
                      <div>
                        <strong className="text-slate-900 dark:text-white block">
                          {it.serviceName || it.productName || it.description}
                        </strong>
                        <span className="text-[10px] text-slate-400">
                          Qté : {it.quantity} {it.unit} • Total : {formatCurrency(it.totalPrice)}
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant={
                        it.productionStatus === 'DELIVERED'
                          ? 'success'
                          : it.productionStatus === 'READY' || it.productionStatus === 'DONE'
                          ? 'primary'
                          : it.productionStatus === 'IN_PRODUCTION'
                          ? 'warning'
                          : 'outline'
                      }
                      size="sm"
                      className="font-bold text-[9px]"
                    >
                      {it.productionStatus === 'DELIVERED'
                        ? 'Déjà Livré'
                        : it.productionStatus === 'READY' || it.productionStatus === 'DONE'
                        ? 'Prêt'
                        : it.productionStatus === 'IN_PRODUCTION'
                        ? 'En Prod'
                        : 'En Attente'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recipient Name Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Nom du Réceptionnaire (Client ou Délégué) *
            </label>
            <Input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              required
              className="text-xs font-semibold"
            />
          </div>

          {/* If dueAmount == 0: Simple Delivery */}
          {dueAmount === 0 && (
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  Cette commande est <strong>intégralement soldée</strong>. Vous pouvez valider la remise des prestations sélectionnées.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  icon={CheckCircle2}
                  onClick={handleDeliverFullyPaid}
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  Confirmer la Remise au Client
                </Button>
              </div>
            </div>
          )}

          {/* If dueAmount > 0: Choose Pay & Deliver vs Deliver Unpaid */}
          {dueAmount > 0 && deliveryMode === 'SELECT' && (
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <strong className="block text-amber-900 dark:text-amber-200">
                    Solde restant dû : {formatCurrency(dueAmount)}
                  </strong>
                  <span>Choisissez l'action à réaliser pour la livraison :</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <Button
                  variant="primary"
                  icon={DollarSign}
                  onClick={() => setDeliveryMode('PAY_AND_DELIVER')}
                  className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 font-bold py-3 text-xs"
                >
                  Encaisser le Solde & Livrer
                </Button>

                {canDeliverUnpaid ? (
                  <Button
                    variant="outline"
                    icon={Truck}
                    onClick={() => setDeliveryMode('DELIVER_UNPAID')}
                    className="w-full justify-center text-amber-600 border-amber-300 hover:bg-amber-50 font-bold py-3 text-xs"
                  >
                    Livrer avec Dette (Non Soldé)
                  </Button>
                ) : (
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-slate-400" />
                    Livraison à crédit réservée aux Administrateurs.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode PAY_AND_DELIVER */}
          {dueAmount > 0 && deliveryMode === 'PAY_AND_DELIVER' && (
            <form onSubmit={handlePayAndDeliver} className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Montant Encaissé (GNF) *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={dueAmount}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
                    required
                    className="font-black text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Mode de Règlement *
                  </label>
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="text-xs font-semibold"
                  >
                    <option value="CASH">💵 Espèces</option>
                    <option value="ORANGE_MONEY">📱 Orange Money</option>
                    <option value="MTN_MOMO">📱 MTN MoMo</option>
                    <option value="BANK_TRANSFER">🏦 Virement Bancaire</option>
                    <option value="CARD">💳 Carte Bancaire</option>
                  </Select>
                </div>
              </div>

              {!openSession && (
                <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-bold">Caisse fermée. Ouvrez la caisse pour valider ce règlement.</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => setIsOpenCashModalOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-xs font-bold"
                  >
                    Ouvrir Caisse
                  </Button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDeliveryMode('SELECT')}>
                  Retour
                </Button>
                <Button type="submit" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                  Valider l'Encaissement & Livrer
                </Button>
              </div>
            </form>
          )}

          {/* Mode DELIVER_UNPAID */}
          {dueAmount > 0 && deliveryMode === 'DELIVER_UNPAID' && (
            <form onSubmit={handleDeliverUnpaid} className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Motif Obligatoire de la Livraison à Crédit *
                </label>
                <Input
                  type="text"
                  placeholder="ex: Client institutionnel, bon de commande administratif..."
                  value={unpaidReason}
                  onChange={(e) => setUnpaidReason(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded-xl text-xs text-rose-800 dark:text-rose-300">
                ⚠️ Une créance de <strong>{formatCurrency(dueAmount)}</strong> sera maintenue sur le compte de <strong>{order.personName}</strong>.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDeliveryMode('SELECT')}>
                  Retour
                </Button>
                <Button type="submit" variant="danger" className="font-bold">
                  Confirmer la Livraison Non Soldée
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Generated Receipt Modal */}
      {generatedPayment && (
        <PaymentReceiptModal
          payment={generatedPayment}
          order={order}
          onClose={() => {
            setGeneratedPayment(null);
            onClose();
          }}
        />
      )}

      {/* Open Cash Modal */}
      {isOpenCashModalOpen && (
        <OpenCashModal
          isOpen={isOpenCashModalOpen}
          onClose={() => setIsOpenCashModalOpen(false)}
          onSuccess={() => {
            setIsOpenCashModalOpen(false);
            showToast('Caisse Ouverte', 'Vous pouvez maintenant valider le règlement à la livraison.', 'SUCCESS');
          }}
        />
      )}
    </>
  );
};
