import React from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Payment, Order } from '../../types';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Printer, Download, CheckCircle2, Receipt, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PaymentReceiptModalProps {
  payment: Payment | null;
  order?: Order | null;
  onClose: () => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  payment,
  order,
  onClose,
}) => {
  const { currentTenant } = useAuth();
  const state = dbStore.getState();

  if (!payment) return null;

  const linkedOrder = order || state.orders.find(o => o.id === payment.orderId);
  const totalOrderAmount = linkedOrder?.totalAmount || (payment.balanceBefore || payment.amount);
  const balanceBefore = payment.balanceBefore !== undefined
    ? payment.balanceBefore
    : totalOrderAmount;
  const balanceAfter = payment.balanceAfter !== undefined
    ? payment.balanceAfter
    : Math.max(0, balanceBefore - payment.amount);

  const officialStamp = currentTenant?.settings?.digitalSignatures?.find(s => s.type === 'STAMP' && s.isActive);
  const cashierSig = currentTenant?.settings?.digitalSignatures?.find(s => s.type === 'DIRECTOR' && s.isActive);

  const qrPayload = JSON.stringify({
    receipt: payment.paymentNumber,
    order: payment.orderNumber,
    client: payment.personName,
    amount: payment.amount,
    date: payment.createdAt,
    balanceAfter
  });

  return (
    <Modal
      isOpen={!!payment}
      onClose={onClose}
      title={`Reçu de Paiement — ${payment.paymentNumber}`}
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Printable Ticket / Receipt Body */}
        <div id="payment-receipt-sheet" className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-5 shadow-sm text-slate-800 dark:text-slate-200">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest block">
                {currentTenant?.name || 'CENTRE PRESTATION ET FORMATION'}
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase mt-0.5">
                REÇU DE RÈGLEMENT OFFICIEL
              </h3>
              <p className="text-xs text-slate-500">
                N° Reçu : <strong>{payment.paymentNumber}</strong>
              </p>
            </div>
            <div className="text-right">
              <Badge variant={balanceAfter === 0 ? 'success' : 'warning'} size="sm">
                {balanceAfter === 0 ? '🟢 Commande Soldée' : '🟠 Paiement Partiel'}
              </Badge>
              <p className="text-[11px] text-slate-400 mt-1">
                {formatDate(payment.createdAt, 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
          </div>

          {/* Client & Order Details */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Client / Bénéficiaire</span>
              <strong className="text-slate-900 dark:text-white text-sm block">{payment.personName}</strong>
              {linkedOrder?.personPhone && <span className="text-slate-500">{linkedOrder.personPhone}</span>}
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Commande Associée</span>
              <strong className="text-brand-600 font-mono text-sm block">{payment.orderNumber || 'Prestation'}</strong>
              <span className="text-slate-500">Opérateur : {payment.receivedByUserName || 'Caissier'}</span>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-xs font-bold">
              <span>Désignation</span>
              <span>Montant (GNF)</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="p-3 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total initial de la commande :</span>
                <span className="font-semibold">{formatCurrency(totalOrderAmount)}</span>
              </div>
              <div className="p-3 flex justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <span className="text-slate-600 dark:text-slate-400">Solde restant avant ce versement :</span>
                <span className="font-semibold">{formatCurrency(balanceBefore)}</span>
              </div>
              <div className="p-3 flex justify-between bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Montant encaissé ce jour ({payment.paymentMethod}) :
                </span>
                <span className="text-base text-emerald-600 dark:text-emerald-400 font-extrabold">
                  +{formatCurrency(payment.amount)}
                </span>
              </div>
              <div className="p-3 flex justify-between font-black text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800/80">
                <span>Reste à payer (Dette résiduelle) :</span>
                <span className={`text-base ${balanceAfter > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatCurrency(balanceAfter)}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures, Stamp & QR Code */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 items-end text-center">
            {/* QR Code */}
            <div className="flex flex-col items-center justify-center">
              <QRCodeSVG value={qrPayload} size={64} level="M" />
              <span className="text-[9px] text-slate-400 mt-1 font-mono">Authenticité certifiée</span>
            </div>

            {/* Cashier Sign */}
            <div>
              <span className="text-[10px] font-bold text-slate-600 block uppercase">Visa Caissier</span>
              <p className="text-[10px] text-slate-400">{payment.receivedByUserName || 'Caisse'}</p>
              <div className="h-12 border-b border-dashed border-slate-300 flex items-center justify-center">
                <span className="text-[9px] text-slate-400 italic">Signature Validée</span>
              </div>
            </div>

            {/* Official Stamp */}
            <div>
              <span className="text-[10px] font-bold text-slate-600 block uppercase">Cachet du Centre</span>
              <div className="h-12 flex items-center justify-center border-b border-dashed border-slate-300">
                {officialStamp ? (
                  <img src={officialStamp.imageUrl} alt="Cachet" className="max-h-10 object-contain opacity-80" />
                ) : (
                  <span className="text-[9px] text-slate-400 italic">Cachet Officiel</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="primary"
            icon={Printer}
            onClick={() => window.print()}
          >
            Imprimer le Reçu
          </Button>
        </div>
      </div>
    </Modal>
  );
};
