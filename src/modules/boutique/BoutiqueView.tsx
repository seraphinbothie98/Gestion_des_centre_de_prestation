import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Product, BoutiqueSale, BoutiqueSaleItem, PaymentMethod, Person } from '../../types';
import { formatCurrency, formatDate, generateDocNumber } from '../../lib/utils';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { isValidPhoneNumber } from '../../lib/phoneValidation';
import {
  Store, ShoppingCart, Plus, Minus, Trash2, Search, Barcode,
  DollarSign, CheckCircle2, AlertTriangle, ArrowRight, Printer,
  RotateCcw, History, TrendingUp, Percent, Tag, Lock, Unlock,
  CreditCard, Wallet, User, Phone, Package, Layers, Sparkles, UserPlus
} from 'lucide-react';
import { BoutiqueReceiptModal } from './BoutiqueReceiptModal';
import { BoutiqueSaleReturnModal } from './BoutiqueSaleReturnModal';
import { OpenCashModal } from '../cash/OpenCashModal';
import {
  getAvailableProductUnits,
  formatSmartStockBreakdown,
  getUnitConversionFactor
} from '../../lib/stockEngine';

interface CartItem {
  product: Product;
  selectedUnit: string;
  conversionFactorApplied: number;
  quantity: number;
  unitPrice: number;
  discountType: 'NONE' | 'PERCENTAGE' | 'FIXED' | 'WHOLESALE';
  discountValue: number;
}

export const BoutiqueView: React.FC = () => {
  const { currentTenant, currentUser, hasPermission, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();
  const state = dbStore.getState();

  const currentAgencyId = currentTenant?.id || 't-001';

  // Isolated Agency Datasets (Multi-tenant security)
  const agencyProducts = useMemo(() => {
    return dbStore.getProductsByTenant(currentAgencyId);
  }, [state.products, currentAgencyId]);

  const agencyPersons = useMemo(() => {
    if (currentAgencyId === 'ALL' || currentAgencyId === 'global') return state.persons || [];
    return (state.persons || []).filter(p => p.tenantId === currentAgencyId);
  }, [state.persons, currentAgencyId]);

  const agencySales = useMemo(() => {
    if (currentAgencyId === 'ALL' || currentAgencyId === 'global') return state.boutiqueSales || [];
    return (state.boutiqueSales || []).filter(s => s.tenantId === currentAgencyId);
  }, [state.boutiqueSales, currentAgencyId]);

  const agencyReturns = useMemo(() => {
    if (currentAgencyId === 'ALL' || currentAgencyId === 'global') return state.boutiqueSaleReturns || [];
    return (state.boutiqueSaleReturns || []).filter(r => r.tenantId === currentAgencyId);
  }, [state.boutiqueSaleReturns, currentAgencyId]);

  const openSession = state.cashSessions.find(cs => cs.tenantId === currentAgencyId && cs.status === 'OPEN');
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);

  // Quick Client Creation Modal in Boutique
  const [isQuickClientModalOpen, setIsQuickClientModalOpen] = useState(false);
  const [quickClientLastName, setQuickClientLastName] = useState('');
  const [quickClientFirstName, setQuickClientFirstName] = useState('');
  const [quickClientPhone, setQuickClientPhone] = useState('');
  const [quickClientType, setQuickClientType] = useState('Particulier');
  const [quickClientCompany, setQuickClientCompany] = useState('');

  // Tabs: 'pos' | 'history' | 'returns' | 'analytics'
  const [activeTab, setActiveTab] = useState<'pos' | 'history' | 'returns' | 'analytics'>('pos');

  // Search and Filter in POS
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState('Client Comptoir');
  const [customCustomerPhone, setCustomCustomerPhone] = useState('');
  const [cartNotes, setCartNotes] = useState('');

  // Checkout Modal State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Modals for receipts and returns
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<BoutiqueSale | null>(null);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<BoutiqueSale | null>(null);

  // Categories list from agency products
  const categories = useMemo(() => {
    const set = new Set(agencyProducts.map(p => p.category).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [agencyProducts]);

  // Filtered Products for POS (agency scoped)
  const activeProducts = useMemo(() => {
    return agencyProducts.filter(p => {
      if (!p.isActive || p.isArchived) return false;
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.includes(search));
      const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [agencyProducts, search, categoryFilter]);

  // Handle Add to Cart
  const handleAddToCart = (product: Product, targetUnitName?: string) => {
    const availableUnits = getAvailableProductUnits(product).filter(u => u.isAllowedForSale !== false);
    const chosenUnit = targetUnitName
      ? (availableUnits.find(u => u.unitName.toLowerCase() === targetUnitName.toLowerCase()) || availableUnits[0])
      : (availableUnits.find(u => u.unitName.toLowerCase() === (product.defaultSaleUnit || product.baseUnit || product.unit).toLowerCase()) || availableUnits[0]);

    const unitName = chosenUnit ? chosenUnit.unitName : (product.baseUnit || product.unit);
    const factor = chosenUnit ? chosenUnit.factorToBase : 1;
    const defaultPrice = chosenUnit?.salePrice || (product.salePrice ? product.salePrice * factor : product.costPrice * factor);

    const existingIndex = cartItems.findIndex(
      item => item.product.id === product.id && item.selectedUnit.toLowerCase() === unitName.toLowerCase()
    );

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          product,
          selectedUnit: unitName,
          conversionFactorApplied: factor,
          quantity: 1,
          unitPrice: defaultPrice,
          discountType: 'NONE',
          discountValue: 0
        }
      ]);
    }
  };

  // Handle Barcode Scan / Enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matchedProduct = agencyProducts.find(
      p => p.isActive && !p.isArchived && (p.barcode === barcodeInput.trim() || p.code.toUpperCase() === barcodeInput.trim().toUpperCase())
    );

    if (matchedProduct) {
      handleAddToCart(matchedProduct);
      showToast('Article Ajouté', `${matchedProduct.name} ajouté au panier.`, 'SUCCESS');
      setBarcodeInput('');
    } else {
      showToast('Article Non Trouvé', `Aucun article avec le code-barres "${barcodeInput}" dans votre agence.`, 'WARNING');
    }
  };

  // Cart item mutations
  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...cartItems];
    updated[index].quantity = newQty;
    setCartItems(updated);
  };

  const handleSelectUnit = (index: number, newUnitName: string) => {
    const updated = [...cartItems];
    const item = updated[index];
    const availableUnits = getAvailableProductUnits(item.product);
    const unitMeta = availableUnits.find(u => u.unitName.toLowerCase() === newUnitName.toLowerCase()) || availableUnits[0];

    item.selectedUnit = unitMeta ? unitMeta.unitName : newUnitName;
    item.conversionFactorApplied = unitMeta ? unitMeta.factorToBase : 1;
    item.unitPrice = unitMeta?.salePrice || (item.product.salePrice ? item.product.salePrice * item.conversionFactorApplied : item.product.costPrice * item.conversionFactorApplied);
    setCartItems(updated);
  };

  const handleUpdatePrice = (index: number, newPrice: number) => {
    const updated = [...cartItems];
    updated[index].unitPrice = Math.max(0, newPrice);
    setCartItems(updated);
  };

  const handleUpdateDiscount = (index: number, discountType: 'NONE' | 'PERCENTAGE' | 'FIXED' | 'WHOLESALE', val: number = 0) => {
    const updated = [...cartItems];
    const item = updated[index];
    item.discountType = discountType;
    if (discountType === 'WHOLESALE' && item.product.wholesalePrice) {
      const regularPrice = item.product.wholesalePrice * (item.conversionFactorApplied || 1);
      item.unitPrice = regularPrice;
      item.discountValue = 0;
    } else {
      item.discountValue = val;
    }
    setCartItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleCreateQuickClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientLastName.trim()) {
      showToast('Nom Requis', 'Veuillez saisir au moins le nom du client.', 'WARNING');
      return;
    }
    if (quickClientPhone.trim() && !isValidPhoneNumber(quickClientPhone, { allowEmpty: true })) {
      showToast('Téléphone Invalide', 'Le numéro de téléphone est invalide.', 'DANGER');
      return;
    }

    const newPersonId = `p-${Date.now()}`;
    const seq = (state.persons || []).length + 1;
    const customerCode = `CLT-${new Date().getFullYear()}-${seq.toString().padStart(4, '0')}`;
    const fullName = `${quickClientFirstName.trim()} ${quickClientLastName.trim()}`.trim();

    const newPerson: Person = {
      id: newPersonId,
      tenantId: currentAgencyId,
      firstName: quickClientFirstName.trim(),
      lastName: quickClientLastName.trim(),
      phone: quickClientPhone.trim() || undefined,
      types: ['CUSTOMER'],
      isActive: true,
      createdAt: new Date().toISOString(),
      customerProfile: {
        customerNumber: customerCode,
        companyName: quickClientCompany.trim() || undefined,
        isCompany: quickClientType === 'Entreprise' || Boolean(quickClientCompany.trim()),
        discountRate: 0,
        creditLimit: 1000000
      }
    };

    dbStore.updateState(draft => {
      draft.persons.unshift(newPerson);
    });

    dbStore.logAudit('CLIENT_CREATED', 'CLIENT', newPersonId, null, {
      name: fullName,
      customerNumber: customerCode,
      type: quickClientType,
      tenantId: currentAgencyId
    });

    setSelectedPersonId(newPersonId);
    setCustomCustomerName(fullName);
    setCustomCustomerPhone(quickClientPhone.trim());
    setIsQuickClientModalOpen(false);
    showToast('Client Créé 🎉', `Le client « ${fullName} » (${quickClientType}) a été enregistré.`, 'SUCCESS');
  };

  // Cart Calculations
  const cartCalculations = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalAmount = 0;
    let totalCost = 0;

    const computedItems: BoutiqueSaleItem[] = cartItems.map(item => {
      const factor = item.conversionFactorApplied || 1;
      const unitLabel = item.selectedUnit;
      const stockDeduction = item.quantity * factor;
      const itemSubtotal = item.quantity * item.unitPrice;

      let itemDiscount = 0;
      if (item.discountType === 'PERCENTAGE') {
        itemDiscount = Math.round((itemSubtotal * (item.discountValue || 0)) / 100);
      } else if (item.discountType === 'FIXED') {
        itemDiscount = Math.min(itemSubtotal, item.discountValue || 0);
      }

      const itemFinalPrice = Math.max(0, itemSubtotal - itemDiscount);
      const itemTotalCost = stockDeduction * (item.product.costPrice || 0);
      const itemMargin = itemFinalPrice - itemTotalCost;
      const itemMarginPct = itemFinalPrice > 0 ? (itemMargin / itemFinalPrice) * 100 : 0;

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalAmount += itemFinalPrice;
      totalCost += itemTotalCost;

      return {
        productId: item.product.id,
        productCode: item.product.code,
        productName: item.product.name,
        unitSold: (factor > 1 ? 'PURCHASE_UNIT' : 'STOCK_UNIT') as any,
        unitLabel,
        quantitySold: item.quantity,
        conversionFactor: factor,
        stockDeduction,
        unitCostPrice: item.product.costPrice,
        unitSalePrice: item.unitPrice,
        subtotal: itemSubtotal,
        discountType: item.discountType,
        discountValue: itemDiscount,
        finalPrice: itemFinalPrice,
        totalCost: itemTotalCost,
        marginAmount: itemMargin,
        marginPercentage: parseFloat(itemMarginPct.toFixed(2))
      };
    });

    const grossMargin = totalAmount - totalCost;
    const marginPercentage = totalAmount > 0 ? parseFloat(((grossMargin / totalAmount) * 100).toFixed(2)) : 0;

    return {
      items: computedItems,
      subtotal,
      totalDiscount,
      totalAmount,
      totalCost,
      grossMargin,
      marginPercentage
    };
  }, [cartItems]);

  // Open Checkout Modal
  const handleOpenCheckout = () => {
    if (cartItems.length === 0) {
      showToast('Panier Vide', 'Veuillez ajouter au moins un article dans le panier.', 'WARNING');
      return;
    }

    if (!openSession) {
      showToast('Caisse Fermée 🔒', 'La caisse est actuellement fermée. Veuillez ouvrir la session de caisse pour encaisser des ventes.', 'WARNING');
      setIsOpenCashModalOpen(true);
      return;
    }

    setPaidAmount(cartCalculations.totalAmount);
    setIsCheckoutModalOpen(true);
  };

  // Submit Sale & Checkout
  const handleCompleteSale = (e: React.FormEvent) => {
    e.preventDefault();

    if (!openSession) {
      showToast('Caisse Fermée 🔒', 'La caisse est actuellement fermée. Veuillez ouvrir la session de caisse.', 'WARNING');
      setIsOpenCashModalOpen(true);
      return;
    }

    if (paidAmount < 0) {
      showToast('Montant Invalide', 'Le montant réglé ne peut pas être négatif.', 'DANGER');
      return;
    }

    const saleSeq = (state.boutiqueSales || []).length + 1;
    const saleId = `vnt-${Date.now()}`;
    const saleNumber = generateDocNumber('VNT', saleSeq);
    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Caissière Boutique';
    const dueAmount = Math.max(0, cartCalculations.totalAmount - paidAmount);
    const paymentStatus = dueAmount === 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

    // Find person if registered
    const person = state.persons.find(p => p.id === selectedPersonId);
    const customerName = person ? `${person.firstName} ${person.lastName}` : customCustomerName;
    const customerPhone = person ? person.phone : customCustomerPhone;

    const newSale: BoutiqueSale = {
      id: saleId,
      tenantId: currentTenant?.id || 't-001',
      saleNumber,
      cashSessionId: openSession.id,
      personId: person?.id,
      personName: customerName,
      personPhone: customerPhone || undefined,
      items: cartCalculations.items,
      subtotal: cartCalculations.subtotal,
      totalDiscount: cartCalculations.totalDiscount,
      totalAmount: cartCalculations.totalAmount,
      totalCost: cartCalculations.totalCost,
      grossMargin: cartCalculations.grossMargin,
      marginPercentage: cartCalculations.marginPercentage,
      paymentMethod,
      paidAmount,
      dueAmount,
      paymentStatus,
      deliveryStatus: 'DELIVERED',
      location: 'BOUTIQUE',
      sellerUserId: currentUser?.id,
      sellerUserName: performedBy,
      notes: cartNotes || undefined,
      createdAt: new Date().toISOString()
    };

    dbStore.updateState(draft => {
      // 1. Add Boutique Sale
      if (!draft.boutiqueSales) draft.boutiqueSales = [];
      draft.boutiqueSales.unshift(newSale);

      // 2. Deduct stock for each sold article & record movement
      cartCalculations.items.forEach(item => {
        const prod = draft.products.find(p => p.id === item.productId);
        if (prod) {
          const oldStock = prod.currentStock;
          prod.currentStock = Math.max(0, prod.currentStock - item.stockDeduction);
          prod.updatedAt = new Date().toISOString();

          // Deduct from location stock if available
          if (prod.stockByLocation && prod.stockByLocation['BOUTIQUE'] !== undefined) {
            prod.stockByLocation['BOUTIQUE'] = Math.max(0, prod.stockByLocation['BOUTIQUE'] - item.stockDeduction);
          }

          if (!draft.stockMovements) draft.stockMovements = [];
          draft.stockMovements.unshift({
            id: `mov-${Date.now()}-${item.productId}`,
            tenantId: currentTenant?.id || 't-001',
            productId: prod.id,
            productName: prod.name,
            movementType: 'BOUTIQUE_SALE',
            quantity: -item.stockDeduction,
            oldStock,
            newStock: prod.currentStock,
            unitUsed: item.unitLabel,
            quantityInStockUnit: -item.stockDeduction,
            unitCost: prod.costPrice,
            totalCost: item.totalCost,
            sourceLocation: 'BOUTIQUE',
            destinationLocation: 'Client',
            relatedSaleId: saleId,
            reason: `Vente boutique ${saleNumber} (${item.quantitySold} ${item.unitLabel} = -${item.stockDeduction} ${prod.unit})`,
            performedByUserName: performedBy,
            createdAt: new Date().toISOString()
          });
        }
      });

      // 3. Register cash payment into active session
      if (paidAmount > 0 && openSession) {
        const activeSess = draft.cashSessions.find(cs => cs.id === openSession.id);
        if (activeSess) {
          if (!activeSess.movements) activeSess.movements = [];
          activeSess.movements.push({
            id: `cmov-${Date.now()}`,
            cashSessionId: openSession.id,
            movementType: 'INFLOW',
            amount: paidAmount,
            category: 'Vente Boutique Directe',
            reason: `Encaissement Vente Boutique ${saleNumber}`,
            isCommercialRevenue: true,
            performedByUserName: performedBy,
            createdAt: new Date().toISOString()
          });
        }

        if (!draft.payments) draft.payments = [];
        draft.payments.unshift({
          id: `pay-${Date.now()}`,
          tenantId: currentTenant?.id || 't-001',
          cashSessionId: openSession.id,
          paymentNumber: generateDocNumber('PAY', draft.payments.length + 1),
          personId: person?.id || 'p-comptoir',
          personName: customerName,
          targetType: 'ORDER',
          amount: paidAmount,
          balanceBefore: cartCalculations.totalAmount,
          balanceAfter: dueAmount,
          paymentType: dueAmount === 0 ? 'BALANCE_PAYMENT' : 'ADVANCE',
          paymentMethod,
          reference: `Vente Boutique ${saleNumber}`,
          notes: `Règlement vente directe comptoir ${saleNumber}`,
          receivedByUserName: performedBy,
          createdAt: new Date().toISOString()
        });
      }
    });

    if (paidAmount > 0) {
      dbStore.recordIncomingPayment({
        tenantId: currentTenant?.id || 't-001',
        amount: paidAmount,
        paymentMethod,
        reference: `Vente Boutique ${saleNumber}`,
        category: 'BOUTIQUE_SALE',
        categoryLabel: 'Vente Boutique Directe',
        relatedEntityId: saleId,
        relatedEntityType: 'BOUTIQUE_SALE',
        performedByUserName: performedBy,
        notes: `Encaissement vente comptoir ${saleNumber} (${customerName})`
      });
    }

    dbStore.logAudit('BOUTIQUE_SALE_COMPLETED', 'BOUTIQUE_SALE', saleId, null, {
      saleNumber,
      totalAmount: cartCalculations.totalAmount,
      paidAmount,
      dueAmount,
      grossMargin: cartCalculations.grossMargin
    });

    showToast('Vente Validée 🟢', `La vente ${saleNumber} a été enregistrée avec succès.`, 'SUCCESS');
    setIsCheckoutModalOpen(false);
    setCartItems([]);
    setSelectedPersonId('');
    setCustomCustomerName('Client Comptoir');
    setCustomCustomerPhone('');
    setCartNotes('');
    setSelectedSaleForReceipt(newSale);
  };

  // Boutique KPIs for Analytics Tab
  const analyticsMetrics = useMemo(() => {
    const sales = agencySales;
    const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalCost = sales.reduce((acc, s) => acc + s.totalCost, 0);
    const totalMargin = sales.reduce((acc, s) => acc + s.grossMargin, 0);
    const totalDiscounts = sales.reduce((acc, s) => acc + s.totalDiscount, 0);
    const totalDebts = sales.reduce((acc, s) => acc + s.dueAmount, 0);
    const averageMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    const averageBasket = sales.length > 0 ? totalRevenue / sales.length : 0;

    // Top selling products
    const productCounts: Record<string, { name: string; qty: number; revenue: number; margin: number }> = {};
    sales.forEach(sale => {
      sale.items.forEach(it => {
        if (!productCounts[it.productId]) {
          productCounts[it.productId] = { name: it.productName, qty: 0, revenue: 0, margin: 0 };
        }
        productCounts[it.productId].qty += it.stockDeduction;
        productCounts[it.productId].revenue += it.finalPrice;
        productCounts[it.productId].margin += it.marginAmount;
      });
    });

    const topProducts = Object.values(productCounts).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return {
      salesCount: sales.length,
      totalRevenue,
      totalCost,
      totalMargin,
      totalDiscounts,
      totalDebts,
      averageMarginPct,
      averageBasket,
      topProducts
    };
  }, [agencySales]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="w-6 h-6 text-brand-500" />
            Boutique & Vente Directe au Comptoir (POS)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Caisse enregistreuse, vente au carton ou au paquet, remises, calcul de marge en direct et reçu instantané.
          </p>
        </div>

        {/* Cash Status Indicator */}
        <div className="flex items-center gap-3">
          {openSession ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-extrabold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Caisse Ouverte ({openSession.cashRegisterName})
            </div>
          ) : (
            <Button
              variant="primary"
              icon={Unlock}
              onClick={() => setIsOpenCashModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 font-extrabold text-xs"
            >
              🔓 Ouvrir la Caisse du Jour
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'pos', label: 'Caisse & Point de Vente', icon: ShoppingCart },
          { id: 'history', label: `Historique Ventes (${agencySales.length})`, icon: History },
          { id: 'returns', label: `Retours & Remboursements (${agencyReturns.length})`, icon: RotateCcw },
          { id: 'analytics', label: 'Statistiques & Marges', icon: TrendingUp },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* ========================================================================= */}
      {/* TAB 1: POINT DE VENTE (POS) */}
      {/* ========================================================================= */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Product Catalogue (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search & Barcode Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="sm:col-span-7 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom ou code article..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <form onSubmit={handleBarcodeSubmit} className="sm:col-span-5 flex gap-1.5">
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Scanner code..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="pl-9 text-xs font-mono"
                  />
                </div>
                <Button type="submit" size="sm" variant="secondary" className="text-xs px-2.5">
                  Scan
                </Button>
              </form>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    categoryFilter === cat
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {cat === 'ALL' ? 'Tous les Rayons' : cat}
                </button>
              ))}
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {activeProducts.map((product) => {
                const availableUnits = getAvailableProductUnits(product).filter(u => u.isAllowedForSale !== false);
                const isOutOfStock = product.currentStock <= 0;
                const isLowStock = product.currentStock <= product.minStockAlert && product.currentStock > 0;

                return (
                  <Card
                    key={product.id}
                    className={`p-3.5 flex flex-col justify-between transition-all hover:border-brand-300 hover:shadow-md ${
                      isOutOfStock ? 'opacity-60 bg-slate-50 dark:bg-slate-950' : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700">
                            {product.imageUrl ? (
                              <img
                                key={product.imageUrl}
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span>📦</span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                            {product.code}
                          </span>
                        </div>
                        <Badge
                          variant={isOutOfStock ? 'danger' : isLowStock ? 'warning' : 'success'}
                          size="sm"
                          className="font-bold text-[9px]"
                        >
                          {isOutOfStock ? 'Rupture' : `${product.currentStock.toLocaleString('fr-FR')} ${product.baseUnit || product.unit}`}
                        </Badge>
                      </div>

                      <h4 className="text-xs font-black text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                        {product.name}
                      </h4>

                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {product.description || product.category}
                      </p>

                      {/* Smart stock badge */}
                      {product.packagings && product.packagings.length > 0 && product.currentStock > 0 && (
                        <div className="mt-1 text-[10px] font-semibold text-brand-700 dark:text-brand-300 bg-brand-50/70 dark:bg-brand-950/50 px-1.5 py-0.5 rounded border border-brand-200/60 dark:border-brand-900/60 inline-block">
                          {formatSmartStockBreakdown(product.currentStock, product)}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-400 font-semibold">Prix de Base</span>
                        <strong className="text-xs font-black text-brand-600 dark:text-brand-400">
                          {formatCurrency(product.salePrice || product.costPrice)} / {product.baseUnit || product.unit}
                        </strong>
                      </div>

                      {/* Multi-unit Add Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {availableUnits.map((u) => {
                          const unitPrice = u.salePrice || (product.salePrice ? product.salePrice * u.factorToBase : product.costPrice * u.factorToBase);
                          return (
                            <Button
                              key={u.unitName}
                              size="sm"
                              variant={u.level === 1 ? 'outline' : 'primary'}
                              disabled={isOutOfStock}
                              onClick={() => handleAddToCart(product, u.unitName)}
                              className={`text-[10px] font-bold py-1 px-2 h-auto ${
                                u.level === 1
                                  ? 'border-brand-300 text-brand-700 dark:text-brand-300'
                                  : 'bg-slate-800 hover:bg-slate-900 text-white'
                              }`}
                              title={`Ajouter 1 ${u.unitName} (${u.factorToBase} ${product.baseUnit || product.unit}s) à ${formatCurrency(unitPrice)}`}
                            >
                              +1 {u.unitName} <span className="text-[9px] opacity-80">({formatCurrency(unitPrice)})</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                );
              })}

              {activeProducts.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                  Aucun article correspondant à la recherche.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Shopping Cart & POS Checkout (5 Cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-lg space-y-4 sticky top-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-brand-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Panier de Vente ({cartItems.length} article{cartItems.length > 1 ? 's' : ''})
                </h3>
              </div>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Vider
                </button>
              )}
            </div>

            {/* Customer Selector */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">
                  Client & Compte
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setQuickClientLastName('');
                    setQuickClientFirstName('');
                    setQuickClientPhone('');
                    setQuickClientType('Particulier');
                    setQuickClientCompany('');
                    setIsQuickClientModalOpen(true);
                  }}
                  className="text-[10px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Nouveau Client
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Select
                    value={selectedPersonId}
                    onChange={(e) => {
                      setSelectedPersonId(e.target.value);
                      const p = agencyPersons.find(per => per.id === e.target.value);
                      if (p) {
                        setCustomCustomerName(`${p.firstName} ${p.lastName}`.trim());
                        setCustomCustomerPhone(p.phone || '');
                      }
                    }}
                    className="text-xs"
                  >
                    <option value="">-- Client de passage --</option>
                    {agencyPersons.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} {p.phone ? `(${p.phone})` : ''}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Input
                    type="text"
                    value={customCustomerName}
                    onChange={(e) => setCustomCustomerName(e.target.value)}
                    className="text-xs"
                    placeholder="Nom client"
                  />
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {cartItems.map((item, idx) => {
                const availableUnits = getAvailableProductUnits(item.product).filter(u => u.isAllowedForSale !== false);
                const factor = item.conversionFactorApplied || 1;
                const totalDeducted = item.quantity * factor;
                const itemTotal = item.quantity * item.unitPrice;
                const itemCost = totalDeducted * (item.product.costPrice || 0);
                const itemMargin = itemTotal - itemCost;

                return (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-xs text-slate-900 dark:text-white block">
                          {item.product.name}
                        </strong>
                        <span className="text-[10px] text-slate-500">
                          Réf: {item.product.code} • Stock : {item.product.currentStock.toLocaleString('fr-FR')} {item.product.baseUnit || item.product.unit}s
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Unit Selector & Stepper */}
                    <div className="grid grid-cols-12 gap-2 items-center text-xs">
                      {/* Dynamic Unit Dropdown */}
                      <div className="col-span-5">
                        {availableUnits.length > 1 ? (
                          <Select
                            value={item.selectedUnit}
                            onChange={(e) => handleSelectUnit(idx, e.target.value)}
                            className="text-[11px] font-bold py-1 bg-white dark:bg-slate-700"
                          >
                            {availableUnits.map(u => (
                              <option key={u.unitName} value={u.unitName}>
                                {u.unitName} (x{u.factorToBase})
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block pl-1">
                            {item.selectedUnit}
                          </span>
                        )}
                      </div>

                      {/* Quantity Stepper */}
                      <div className="col-span-4 flex items-center justify-center gap-1 bg-white dark:bg-slate-700 rounded-lg p-0.5 border border-slate-200 dark:border-slate-600">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 font-bold"
                        >
                          -
                        </button>
                        <span className="text-xs font-black w-6 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 font-bold"
                        >
                          +
                        </button>
                      </div>

                      {/* Price Total */}
                      <div className="col-span-3 text-right">
                        <strong className="text-xs font-black text-slate-900 dark:text-white">
                          {formatCurrency(itemTotal)}
                        </strong>
                      </div>
                    </div>

                    {/* Stock impact & Live Margin display */}
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-500">
                      <span>
                        Impact Stock : <strong className="text-rose-600 font-bold">-{totalDeducted.toLocaleString('fr-FR')} {item.product.baseUnit || item.product.unit}s</strong>
                        {factor > 1 && (
                          <span className="text-slate-400 ml-1">({item.quantity} {item.selectedUnit} = {totalDeducted} {item.product.baseUnit || item.product.unit}s)</span>
                        )}
                      </span>
                      <span>
                        Marge : <strong className="text-emerald-600 font-bold">+{formatCurrency(itemMargin)}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}

              {cartItems.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  Le panier est vide. Cliquez sur un article à gauche pour l'ajouter.
                </div>
              )}
            </div>

            {/* Financial Summary & Margins */}
            {cartItems.length > 0 && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl space-y-2 text-xs border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Sous-total Brut :</span>
                  <span className="font-bold">{formatCurrency(cartCalculations.subtotal)}</span>
                </div>

                {cartCalculations.totalDiscount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Remises :</span>
                    <span>-{formatCurrency(cartCalculations.totalDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-700">
                  <span>TOTAL NET :</span>
                  <span className="text-lg text-brand-600 dark:text-brand-400 font-black">
                    {formatCurrency(cartCalculations.totalAmount)}
                  </span>
                </div>

                {/* Profitability KPI */}
                <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Marge brute prévisionnelle :</span>
                  <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                    +{formatCurrency(cartCalculations.grossMargin)} ({cartCalculations.marginPercentage}%)
                  </span>
                </div>
              </div>
            )}

            {/* Checkout Action Button */}
            <Button
              variant="primary"
              size="lg"
              disabled={cartItems.length === 0}
              onClick={handleOpenCheckout}
              className="w-full justify-center py-3.5 text-sm font-extrabold bg-brand-600 hover:bg-brand-700 shadow-md"
            >
              Encaisser la Vente ({formatCurrency(cartCalculations.totalAmount)})
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HISTORIQUE DES VENTES BOUTIQUE */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Historique des Ventes Comptoir
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Liste complète des ventes, reçus délivrés, marges générées et statuts de paiement.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Vente</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Articles Vendus</TableHead>
                  <TableHead>Total Net</TableHead>
                  <TableHead>Marge Brute</TableHead>
                  <TableHead>Mode Paiement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencySales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {sale.saleNumber}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDate(sale.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {sale.personName}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                      {sale.items.map(it => `${it.quantitySold} ${it.unitLabel} ${it.productName}`).join(', ')}
                    </TableCell>
                    <TableCell className="text-xs font-black text-slate-900 dark:text-white">
                      {formatCurrency(sale.totalAmount)}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-emerald-600">
                      +{formatCurrency(sale.grossMargin)} ({sale.marginPercentage}%)
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" size="sm">
                        {sale.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={sale.paymentStatus === 'PAID' ? 'success' : sale.paymentStatus === 'PARTIALLY_PAID' ? 'warning' : 'danger'}
                        size="sm"
                        className="font-bold"
                      >
                        {sale.paymentStatus === 'PAID' ? 'Payé' : sale.paymentStatus === 'PARTIALLY_PAID' ? 'Partiel' : 'Impayé'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Printer}
                          onClick={() => setSelectedSaleForReceipt(sale)}
                          className="h-8 text-xs font-bold"
                        >
                          Reçu
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={RotateCcw}
                          onClick={() => setSelectedSaleForReturn(sale)}
                          className="h-8 text-xs text-amber-600 hover:text-amber-700"
                        >
                          Retour
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {agencySales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-400 text-xs">
                      Aucune vente enregistrée pour le moment dans cette agence.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RETOURS MARCHANDISES */}
      {/* ========================================================================= */}
      {activeTab === 'returns' && (
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Journal des Retours & Remboursements Clients
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Traçabilité des articles retournés au magasin boutique avec motif, réintégration en stock et impact caisse.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Retour</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Réf Vente</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead>Qté Retournée</TableHead>
                  <TableHead>Stock Réintégré ?</TableHead>
                  <TableHead>Remboursement</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Opérateur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(state.boutiqueSaleReturns || []).map((ret) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-mono font-bold text-xs">{ret.returnNumber}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(ret.createdAt)}</TableCell>
                    <TableCell className="text-xs font-mono font-semibold">{ret.saleNumber}</TableCell>
                    <TableCell className="text-xs font-bold text-slate-900 dark:text-white">{ret.productName}</TableCell>
                    <TableCell className="text-xs font-black text-rose-600">-{ret.quantityReturned}</TableCell>
                    <TableCell>
                      <Badge variant={ret.restockInStore ? 'success' : 'danger'} size="sm">
                        {ret.restockInStore ? '🟢 Oui (+ Stock)' : '🔴 Non (Mis au rebut)'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-900 dark:text-white">
                      {ret.refundAmount > 0 ? formatCurrency(ret.refundAmount) : '0 GNF'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">{ret.returnReason}</TableCell>
                    <TableCell className="text-xs text-slate-500">{ret.performedByUserName}</TableCell>
                  </TableRow>
                ))}

                {(state.boutiqueSaleReturns || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-400 text-xs">
                      Aucun retour client enregistré.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STATISTIQUES & MARGES */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-l-4 border-l-brand-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Chiffre d'Affaires Boutique</span>
                <DollarSign className="w-4 h-4 text-brand-500" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                {formatCurrency(analyticsMetrics.totalRevenue)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{analyticsMetrics.salesCount} vente(s) réalisée(s)</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Marge Brute Totale</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-xl font-extrabold text-emerald-600 mt-1">
                +{formatCurrency(analyticsMetrics.totalMargin)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Taux de marge moyen : {analyticsMetrics.averageMarginPct.toFixed(1)}%</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Panier Moyen</span>
                <ShoppingCart className="w-4 h-4 text-purple-500" />
              </div>
              <h3 className="text-xl font-extrabold text-purple-600 mt-1">
                {formatCurrency(analyticsMetrics.averageBasket)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Par transaction comptoir</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Crédits / Impayés Boutique</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="text-xl font-extrabold text-amber-600 mt-1">
                {formatCurrency(analyticsMetrics.totalDebts)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Intégré au suivi des créances clients</p>
            </Card>
          </div>

          {/* Top Products Table */}
          <Card className="p-5">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Top 5 des Articles les Plus Vendus (Par Chiffre d'Affaires)
            </h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>Quantité Vendue (Base)</TableHead>
                    <TableHead>Chiffre d'Affaires</TableHead>
                    <TableHead>Marge Brute</TableHead>
                    <TableHead>Rentabilité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsMetrics.topProducts.map((p, idx) => {
                    const marginPct = p.revenue > 0 ? (p.margin / p.revenue) * 100 : 0;
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-bold text-xs text-slate-900 dark:text-white">
                          #{idx + 1} {p.name}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">{p.qty} unité(s)</TableCell>
                        <TableCell className="text-xs font-black text-slate-900 dark:text-white">
                          {formatCurrency(p.revenue)}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-emerald-600">
                          +{formatCurrency(p.margin)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="success" size="sm" className="font-bold">
                            {marginPct.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {analyticsMetrics.topProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                        Aucune vente pour calculer le top articles.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CHECKOUT / ENCAISSEMENT */}
      {/* ========================================================================= */}
      {isCheckoutModalOpen && (
        <Modal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          title="Encaissement de la Vente Boutique"
          maxWidth="md"
        >
          <form onSubmit={handleCompleteSale} className="space-y-4 pt-1">
            {/* Total and Change Box */}
            <div className="p-4 bg-brand-50 dark:bg-brand-950/40 rounded-2xl border border-brand-200 text-center space-y-1">
              <span className="text-[10px] text-brand-700 dark:text-brand-300 font-bold uppercase block">
                Total Net à Payer
              </span>
              <h2 className="text-2xl font-black text-brand-900 dark:text-brand-100">
                {formatCurrency(cartCalculations.totalAmount)}
              </h2>
              <span className="text-xs text-slate-500">
                Client : <strong>{selectedPersonId ? state.persons.find(p => p.id === selectedPersonId)?.firstName : customCustomerName}</strong>
              </span>
            </div>

            {/* Payment Mode Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Mode de Règlement *
              </label>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                <option value="CASH">Espèces (Tiroir-caisse)</option>
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="MTN_MOMONEY">MTN Mobile Money</option>
                <option value="BANK_TRANSFER">Virement Bancaire</option>
                <option value="CHEQUE">Chèque</option>
                <option value="OTHER">Autre / Crédit accordé</option>
              </Select>
            </div>

            {/* Amount Paid Input */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Montant Reçu / Encaissé (GNF) *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseInt(e.target.value) || 0)}
                  required
                  className="font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {paidAmount >= cartCalculations.totalAmount ? 'Monnaie à Rendre' : 'Reste Dû (Dette)'}
                </label>
                <div className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center justify-between ${
                  paidAmount >= cartCalculations.totalAmount
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <span>{paidAmount >= cartCalculations.totalAmount ? 'Monnaie :' : 'Dette :'}</span>
                  <span>{formatCurrency(Math.abs(paidAmount - cartCalculations.totalAmount))}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Notes ou Référence (Optionnel)
              </label>
              <Input
                type="text"
                value={cartNotes}
                onChange={(e) => setCartNotes(e.target.value)}
                placeholder="ex: Numéro de transaction OM, bon d'achat..."
              />
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" type="button" onClick={() => setIsCheckoutModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" icon={CheckCircle2} type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-bold px-5">
                Confirmer l'Encaissement & Imprimer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* RECEIPT / TICKET MODAL */}
      {/* ========================================================================= */}
      {selectedSaleForReceipt && (
        <BoutiqueReceiptModal
          sale={selectedSaleForReceipt}
          isOpen={!!selectedSaleForReceipt}
          onClose={() => setSelectedSaleForReceipt(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* RETURN MODAL */}
      {/* ========================================================================= */}
      {selectedSaleForReturn && (
        <BoutiqueSaleReturnModal
          sale={selectedSaleForReturn}
          isOpen={!!selectedSaleForReturn}
          onClose={() => setSelectedSaleForReturn(null)}
          onReturnSuccess={() => {
            setSelectedSaleForReturn(null);
            setActiveTab('returns');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* QUICK NEW CLIENT MODAL (BOUTIQUE CONTEXT) */}
      {/* ========================================================================= */}
      {isQuickClientModalOpen && (
        <Modal
          isOpen={isQuickClientModalOpen}
          onClose={() => setIsQuickClientModalOpen(false)}
          title="Nouveau Client Boutique"
          maxWidth="md"
        >
          <form onSubmit={handleCreateQuickClient} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nom de famille *"
                placeholder="ex: Bah, Camara, Diallo..."
                value={quickClientLastName}
                onChange={(e) => setQuickClientLastName(e.target.value)}
                required
              />
              <Input
                label="Prénom (Optionnel)"
                placeholder="ex: Amadou"
                value={quickClientFirstName}
                onChange={(e) => setQuickClientFirstName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PhoneInput
                label="Téléphone"
                placeholder="ex: +224 622 00 00 00"
                value={quickClientPhone}
                onChange={(e) => setQuickClientPhone(e.target.value)}
              />
              <Select
                label="Type de Client Boutique"
                value={quickClientType}
                onChange={(e) => setQuickClientType(e.target.value)}
                options={[
                  { value: 'Particulier', label: 'Particulier (Grand Public)' },
                  { value: 'Entreprise', label: 'Entreprise / Société' },
                  { value: 'Organisation', label: 'Organisation / ONG / École' },
                  { value: 'Revendeur', label: 'Revendeur / Grossiste' },
                  { value: 'Autre', label: 'Autre' },
                ]}
              />
            </div>

            {quickClientType === 'Entreprise' && (
              <Input
                label="Raison Sociale / Société"
                placeholder="ex: SOGEA SATOM, TotalEnergies..."
                value={quickClientCompany}
                onChange={(e) => setQuickClientCompany(e.target.value)}
              />
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" type="button" onClick={() => setIsQuickClientModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" icon={UserPlus} type="submit" className="bg-brand-600 hover:bg-brand-500">
                Créer et Sélectionner
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* REUSABLE CASH OPEN MODAL */}
      {/* ========================================================================= */}
      <OpenCashModal
        isOpen={isOpenCashModalOpen}
        onClose={() => setIsOpenCashModalOpen(false)}
        contextMessage="L'ouverture de la session de caisse permet d'enregistrer et de ventiler les encaissements de la boutique."
      />
    </div>
  );
};
