import React from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { BoutiqueSale } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Printer, Download, CheckCircle2, ShoppingBag, Store, Calendar, User, Phone, Tag } from 'lucide-react';

interface BoutiqueReceiptModalProps {
  sale: BoutiqueSale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BoutiqueReceiptModal: React.FC<BoutiqueReceiptModalProps> = ({
  sale,
  isOpen,
  onClose,
}) => {
  const { currentTenant } = useAuth();

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const branding = currentTenant?.settings?.branding;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ticket de Vente — ${sale.saleNumber}`}
      maxWidth="md"
    >
      <div className="space-y-4 pt-1">
        {/* Printable Receipt Paper Container */}
        <div id="printable-boutique-receipt" className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-slate-800 dark:text-slate-200 font-sans">
          {/* Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300 dark:border-slate-700">
            {branding?.showLogo && branding?.logoUrl && (
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="h-10 mx-auto mb-2 object-contain"
              />
            )}
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
              {currentTenant?.name || 'CENTRE DE PRESTATIONS & FORMATION'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {currentTenant?.address}
            </p>
            {currentTenant?.phone && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tél : {currentTenant.phone}
              </p>
            )}
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 rounded-full text-xs font-black">
              <Store className="w-3.5 h-3.5" />
              TICKET DE CAISSE BOUTIQUE
            </div>
          </div>

          {/* Sale Meta */}
          <div className="py-3 text-xs space-y-1.5 border-b border-dashed border-slate-200 dark:border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-500">N° Vente :</span>
              <strong className="font-mono text-slate-900 dark:text-white">{sale.saleNumber}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date & Heure :</span>
              <span>{formatDate(sale.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vendeur / Caisse :</span>
              <span>{sale.sellerUserName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Client :</span>
              <strong className="text-slate-900 dark:text-white">{sale.personName} {sale.personPhone ? `(${sale.personPhone})` : ''}</strong>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-3 border-b border-dashed border-slate-200 dark:border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400 grid grid-cols-12 pb-1">
              <span className="col-span-6">Désignation</span>
              <span className="col-span-2 text-center">Qté</span>
              <span className="col-span-4 text-right">Montant</span>
            </div>
            <div className="space-y-2 mt-1">
              {sale.items.map((item, idx) => (
                <div key={idx} className="text-xs grid grid-cols-12 items-start">
                  <div className="col-span-6 pr-1">
                    <strong className="block text-slate-900 dark:text-white text-[11px]">
                      {item.productName}
                    </strong>
                    <span className="text-[10px] text-slate-500">
                      {item.quantitySold} {item.unitLabel} @ {formatCurrency(item.unitSalePrice)}
                      {item.discountValue ? ` (Remise -${formatCurrency(item.discountValue)})` : ''}
                    </span>
                  </div>
                  <div className="col-span-2 text-center font-bold text-slate-700 dark:text-slate-300">
                    {item.quantitySold}
                  </div>
                  <div className="col-span-4 text-right font-black text-slate-900 dark:text-white">
                    {formatCurrency(item.finalPrice)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="py-3 space-y-1.5 text-xs border-b border-dashed border-slate-200 dark:border-slate-800">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Sous-total Brut :</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.totalDiscount > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Remises accordées :</span>
                <span>-{formatCurrency(sale.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>NET À PAYER :</span>
              <span className="text-base text-brand-600 dark:text-brand-400 font-extrabold">{formatCurrency(sale.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300 pt-1">
              <span>Mode de règlement :</span>
              <Badge variant="outline" size="sm" className="font-bold">
                {sale.paymentMethod}
              </Badge>
            </div>
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Montant Réglé :</span>
              <span>{formatCurrency(sale.paidAmount)}</span>
            </div>
            {sale.dueAmount > 0 ? (
              <div className="flex justify-between text-amber-700 dark:text-amber-400 font-extrabold p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
                <span>Reste Dû (Dette Client) :</span>
                <span>{formatCurrency(sale.dueAmount)}</span>
              </div>
            ) : (
              <div className="text-center py-1 text-emerald-600 font-bold flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Vente Intégralement Payée
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-center pt-3 text-[10px] text-slate-400 space-y-1">
            <p>Les marchandises vendues ne sont ni reprises ni échangées sans ticket.</p>
            <p className="font-semibold text-slate-500">Merci de votre visite et à très bientôt !</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button variant="primary" icon={Printer} onClick={handlePrint} className="bg-brand-600 hover:bg-brand-700 font-bold">
            Imprimer le Reçu
          </Button>
        </div>
      </div>
    </Modal>
  );
};
