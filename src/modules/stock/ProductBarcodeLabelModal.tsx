import React from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Printer, Barcode, Tag } from 'lucide-react';

interface ProductBarcodeLabelModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductBarcodeLabelModal: React.FC<ProductBarcodeLabelModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  if (!product) return null;

  const handlePrint = () => {
    window.print();
  };

  const barcodeVal = product.barcode || product.code;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Étiquette & Code-Barres — ${product.name}`}
      maxWidth="sm"
    >
      <div className="space-y-4 pt-1 text-center">
        {/* Printable Label Container */}
        <div
          id="printable-product-label"
          className="p-5 bg-white rounded-2xl border-2 border-slate-300 text-slate-900 shadow-sm mx-auto max-w-[280px] space-y-2 font-sans"
        >
          <div className="border-b border-slate-200 pb-1.5">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">
              {product.category}
            </span>
            <h4 className="text-xs font-black text-slate-900 leading-tight">
              {product.name}
            </h4>
            <span className="text-[10px] font-mono text-slate-500">
              Réf: {product.code}
            </span>
          </div>

          {/* Barcode Visual Representation */}
          <div className="py-2 flex flex-col items-center justify-center">
            {/* SVG Simulated Barcode Lines */}
            <div className="h-10 w-44 bg-slate-900 flex items-center justify-center p-1 rounded">
              <div className="h-full w-full bg-white flex items-center justify-between px-1">
                {[4, 2, 6, 1, 3, 5, 2, 4, 1, 3, 2, 5, 3, 1, 4, 2, 6, 3].map((w, i) => (
                  <div
                    key={i}
                    style={{ width: `${w * 1.5}px` }}
                    className="h-full bg-slate-900"
                  />
                ))}
              </div>
            </div>
            <span className="font-mono text-[11px] tracking-widest text-slate-800 font-bold mt-1">
              {barcodeVal}
            </span>
          </div>

          {/* Pricing & Unit Details */}
          <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[9px] text-slate-400 block">Unité</span>
              <strong className="text-[11px] text-slate-700 font-bold capitalize">
                {product.unit}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-400 block">Prix TTC</span>
              <strong className="text-sm font-black text-slate-900">
                {formatCurrency(product.salePrice || product.costPrice)}
              </strong>
            </div>
          </div>

          {product.purchaseUnit && product.conversionFactor && product.conversionFactor > 1 && (
            <div className="text-[9px] text-slate-500 bg-slate-100 py-1 rounded">
              Carton ({product.conversionFactor} {product.unit}s) :{' '}
              <strong>
                {formatCurrency(
                  product.salePricePerPurchaseUnit ||
                    (product.salePrice || product.costPrice) * product.conversionFactor
                )}
              </strong>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="primary"
            icon={Printer}
            onClick={handlePrint}
            className="bg-slate-900 hover:bg-black text-white font-bold"
          >
            Imprimer l'Étiquette
          </Button>
        </div>
      </div>
    </Modal>
  );
};
