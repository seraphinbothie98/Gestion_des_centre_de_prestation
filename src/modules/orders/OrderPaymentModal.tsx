import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Order, PaymentMethod, Payment } from '../../types';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, generateDocNumber, formatDate } from '../../lib/utils';
import { evaluateTenantSubscription } from '../../lib/licenseEngine';
import { DollarSign, CheckCircle2, History, AlertCircle, Receipt, Lock, Unlock } from 'lucide-react';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { OpenCashModal } from '../cash/OpenCashModal';

interface OrderPaymentModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

export const OrderPaymentModal: React.FC<OrderPaymentModalProps> = ({
  order,
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  const { currentTenant, currentUser } = useAuth();
  const { showToast } = useNotification();
  const state = dbStore.getState();

  const openSession = state.cashSessions.find(cs => cs.status === 'OPEN');
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);

  if (!order) return null;

  const dueAmount = order.dueAmount !== undefined ? order.dueAmount : Math.max(0, order.totalAmount - order.paidAmount);

  // Form State
  const [amountToPay, setAmountToPay] = useState<number>(dueAmount);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [generatedPayment, setGeneratedPayment] = useState<Payment | null>(null);

  // Order's linked payments history
  const orderPayments = state.payments.filter(p => p.orderId === order.id);

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();

    // RÈGLE ABSOLUE: Blocage si période d'essai expirée
    const evalRes = evaluateTenantSubscription(currentTenant);
    if (evalRes.isExpired || evalRes.isSuspended) {
      showToast('Période d\'Essai Expirée', "Votre période d'essai de 45 jours est arrivée à son terme. Veuillez contacter l'administrateur pour activer votre licence.", 'DANGER');
      return;
    }

    // RÈGLE ABSOLUE: Interdire le paiement d'une dette si la caisse est fermée
    if (!openSession) {
      showToast('Caisse Fermée 🔒', 'La caisse est actuellement fermée. Veuillez ouvrir la caisse pour encaisser ce paiement.', 'WARNING');
      setIsOpenCashModalOpen(true);
      return;
    }

    if (amountToPay <= 0) {
      showToast('Montant Invalide', 'Le montant du versement doit être supérieur à 0 GNF.', 'DANGER');
      return;
    }

    if (amountToPay > dueAmount) {
      showToast('Dépassement de Solde', `Le montant saisi (${formatCurrency(amountToPay)}) dépasse le solde restant dû (${formatCurrency(dueAmount)}).`, 'DANGER');
      return;
    }

    const paySeq = state.payments.length + 1;
    const paymentId = `pay-${Date.now()}`;
    const paymentNumber = generateDocNumber('PAY', paySeq);
    const balanceBefore = dueAmount;
    const balanceAfter = Math.max(0, dueAmount - amountToPay);
    const newPaidAmount = order.paidAmount + amountToPay;
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
      amount: amountToPay,
      balanceBefore,
      balanceAfter,
      paymentType: balanceAfter === 0 ? 'BALANCE_PAYMENT' : 'INSTALLMENT',
      paymentMethod,
      reference: paymentReference || `Règlement commande ${order.orderNumber}`,
      cashSessionId: openSession?.id,
      receivedByUserName: performedBy,
      notes: paymentNotes,
      createdAt: new Date().toISOString(),
    };

    dbStore.updateState(draft => {
      // 1. Update Order financial balance
      const ord = draft.orders.find(o => o.id === order.id);
      if (ord) {
        ord.paidAmount = newPaidAmount;
        ord.dueAmount = balanceAfter;
        ord.paymentStatus = newPaymentStatus;
        ord.updatedAt = new Date().toISOString();
      }

      // 2. Add Payment record
      draft.payments.unshift(newPayment);

      // 3. Add movement to active Cash Session
      if (openSession) {
        const sess = draft.cashSessions.find(s => s.id === openSession.id);
        if (sess) {
          sess.movements.unshift({
            id: `cm-${Date.now()}`,
            cashSessionId: sess.id,
            movementType: 'INFLOW',
            amount: amountToPay,
            category: 'Règlement Commande / Dette',
            reason: balanceAfter === 0
              ? `Solde final ${paymentMethod} — Commande ${order.orderNumber} (${order.personName})`
              : `Acompte / Dette ${paymentMethod} — Commande ${order.orderNumber} (${order.personName})`,
            paymentId,
            performedByUserName: performedBy,
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    // Synchronisation automatique avec Finance & Trésorerie
    dbStore.recordIncomingPayment({
      tenantId: currentTenant?.id || 't-001',
      amount: amountToPay,
      paymentMethod,
      reference: paymentNumber,
      category: 'CLIENT_PAYMENT',
      categoryLabel: 'Règlement Commande',
      relatedEntityId: order.id,
      relatedEntityType: 'ORDER',
      performedByUserName: performedBy,
      notes: `Règlement commande ${order.orderNumber} (${order.personName})`
    });

    dbStore.logAudit('PAYMENT_COLLECTED', 'PAYMENT', paymentId, null, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: amountToPay,
      balanceBefore,
      balanceAfter,
      paymentMethod,
      performedBy
    });

    // Déduction dynamique du stock magasin si la commande est soldée et non encore déduite
    if (balanceAfter === 0 && !order.stockDeducted) {
      dbStore.deductConsumablesForOrder(order.id, currentTenant?.id || order.tenantId, performedBy);
    }

    showToast(
      balanceAfter === 0 ? 'Commande Intégralement Soldée 🟢' : 'Paiement Encaissé 🟠',
      `Encaissement de ${formatCurrency(amountToPay)} enregistré. Reste à payer : ${formatCurrency(balanceAfter)}.`,
      'SUCCESS'
    );

    if (onPaymentSuccess) onPaymentSuccess();
    setGeneratedPayment(newPayment);
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !generatedPayment}
        onClose={onClose}
        title={`Encaissement Règlement — Commande ${order.orderNumber}`}
        maxWidth="lg"
      >
        {!openSession ? (
          <div className="p-6 sm:p-8 text-center bg-amber-50/70 dark:bg-amber-950/40 rounded-3xl border-2 border-dashed border-amber-300 dark:border-amber-900/60 space-y-4 my-2">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/60 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <Badge variant="danger" size="md" className="mb-2 font-bold">
                🔴 Session de Caisse Fermée
              </Badge>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Ouverture de la Caisse Requise
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                La caisse est actuellement fermée. Pour pouvoir encaisser ce versement de dette client ({formatCurrency(dueAmount)} restant dû), vous devez d'abord ouvrir la session de caisse du jour avec le fonds initial.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={onClose}
              >
                Fermer
              </Button>
              <Button
                variant="primary"
                icon={Unlock}
                type="button"
                onClick={() => setIsOpenCashModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 font-extrabold"
              >
                Ouvrir la Caisse du Jour
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Order Financial Summary Box */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Commande</span>
              <strong className="text-base text-slate-900 dark:text-white block mt-0.5">
                {formatCurrency(order.totalAmount)}
              </strong>
              <span className="text-slate-500">Client : {order.personName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Déjà Réglé</span>
              <strong className="text-base text-emerald-600 block mt-0.5">
                {formatCurrency(order.paidAmount)}
              </strong>
              <span className="text-slate-500">{orderPayments.length} versement(s)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-extrabold block">
                Solde Restant Dû (Dette)
              </span>
              <strong className="text-lg text-amber-800 dark:text-amber-300 block mt-0.5 font-black">
                {formatCurrency(dueAmount)}
              </strong>
            </div>
          </div>

          {dueAmount === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-900 dark:text-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <strong className="text-xs font-bold block">Cette commande est intégralement payée !</strong>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Aucune dette résiduelle. Vous pouvez consulter l'historique des règlements ci-dessous.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProcessPayment} className="space-y-4">
              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-500 font-semibold">Montant rapide :</span>
                <button
                  type="button"
                  onClick={() => setAmountToPay(dueAmount)}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                >
                  🟢 Solder la totalité ({formatCurrency(dueAmount)})
                </button>
                {dueAmount > 10000 && (
                  <button
                    type="button"
                    onClick={() => setAmountToPay(Math.round(dueAmount / 2))}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                  >
                    🟠 50% du solde ({formatCurrency(Math.round(dueAmount / 2))})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
                    Montant Encaissé (GNF) *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={dueAmount}
                    step="any"
                    value={amountToPay}
                    onChange={(e) => setAmountToPay(parseInt(e.target.value) || 0)}
                    required
                    className="text-lg font-black text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Nouveau reste après encaissement : <strong>{formatCurrency(Math.max(0, dueAmount - amountToPay))}</strong>
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
                    Mode de Règlement *
                  </label>
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    options={[
                      { value: 'CASH', label: '💵 Espèces (Tiroir Caisse)' },
                      { value: 'ORANGE_MONEY', label: '📱 Orange Money' },
                      { value: 'MTN_MOMO', label: '📱 MTN Mobile Money' },
                      { value: 'BANK_TRANSFER', label: '🏦 Virement bancaire' },
                      { value: 'CARD', label: '💳 Carte bancaire' },
                      { value: 'CHECK', label: '📑 Chèque' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <Input
                  label="Référence / Reçu externe (Facultatif)"
                  placeholder="ex: ID Transaction Orange Money, N° chèque..."
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" type="button" onClick={onClose}>
                  Annuler
                </Button>
                <Button variant="primary" icon={DollarSign} type="submit">
                  Valider l'Encaissement ({formatCurrency(amountToPay)})
                </Button>
              </div>
            </form>
          )}

          {/* Payment History List for this order */}
          {orderPayments.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase">
                <History className="w-4 h-4 text-brand-500" />
                Historique des Versements ({orderPayments.length})
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {orderPayments.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">Versement #{orderPayments.length - idx}</span>
                        <Badge variant="outline" size="sm">{p.paymentMethod}</Badge>
                        <span className="text-[10px] text-slate-400 font-mono">{p.paymentNumber}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(p.createdAt, 'dd/MM/yyyy HH:mm')} • Par {p.receivedByUserName || 'Caissier'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-emerald-600 text-sm">+{formatCurrency(p.amount)}</span>
                      <button
                        type="button"
                        onClick={() => setGeneratedPayment(p)}
                        className="text-[10px] text-brand-600 hover:underline block font-semibold"
                      >
                        Voir reçu
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}
      </Modal>

      {/* Payment Receipt Modal if a payment was just completed or clicked */}
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

      {/* Reusable Cash Session Open Modal */}
      <OpenCashModal
        isOpen={isOpenCashModalOpen}
        onClose={() => setIsOpenCashModalOpen(false)}
        contextMessage={`L'ouverture de la session de caisse permet d'enregistrer et de ventiler l'encaissement de la dette client (${formatCurrency(dueAmount)} restant dû).`}
      />
    </>
  );
};
