import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { isValidPhoneNumber } from '../../lib/phoneValidation';
import { Select } from '../../components/ui/Select';
import { Tabs } from '../../components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Supplier, PurchaseOrder, PurchaseOrderItem, Product, RequestingDepartment, SupplierDebt, SupplierPayment, FinancialAccount, PurchaseOrderPaymentStatus } from '../../types';
import { formatCurrency, formatDate, generateDocNumber } from '../../lib/utils';
import {
  getProductPurchaseUnits,
  resolveProductPurchasePrice,
  ProductUnitDefinition
} from '../../lib/stockEngine';
import {
  Truck, Plus, CheckCircle2, Phone, Mail, MapPin, Package,
  Layers, RotateCcw, AlertTriangle, ArrowDownRight, Printer,
  Search, Tag, Boxes, FileText, Check, ChevronDown, Trash2,
  Building2, Users, Edit, Power, Archive, Eye, DollarSign,
  PackageCheck, AlertCircle, Sparkles, Filter, X, CreditCard,
  Wallet, Landmark, Smartphone, ArrowUpRight
} from 'lucide-react';

interface POLineDraft {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  category: string;
  orderedQuantityPurchaseUnit: number;
  purchaseUnitName: string;
  conversionFactor: number;
  quantityInStockUnit: number;
  unitPricePurchaseUnit: number;
  unitPriceStockUnit: number;
  totalPrice: number;
  currentStock: number;
  baseUnit: string;
  conversionDescription: string;
  isSpecificPrice: boolean;
  hasPriceConfigured: boolean;
  availableUnits: ProductUnitDefinition[];
}

export const SuppliersView: React.FC = () => {
  const { currentTenant, currentUser, hasPermission, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();
  const [tick, setTick] = useState(0);

  const currentAgencyId = currentTenant?.id || 't-001';

  // Subscribe to real-time dbStore changes
  useEffect(() => {
    return dbStore.subscribe(() => {
      setTick(t => t + 1);
    });
  }, []);

  const state = dbStore.getState();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'orders' | 'debts' | 'suppliers' | 'departments'>('orders');

  // Filters for Purchase Orders
  const [poSearch, setPoSearch] = useState('');
  const [poSupplierFilter, setPoSupplierFilter] = useState('ALL');
  const [poDepartmentFilter, setPoDepartmentFilter] = useState('ALL');
  const [poStatusFilter, setPoStatusFilter] = useState<'ALL' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'>('ALL');
  const [poPaymentStatusFilter, setPoPaymentStatusFilter] = useState<'ALL' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CREDIT'>('ALL');

  // Debts Filters
  const [debtSearch, setDebtSearch] = useState('');
  const [debtStatusFilter, setDebtStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PARTIALLY_PAID' | 'PAID'>('ALL');

  // Modals state
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

  const [isNewPOModalOpen, setIsNewPOModalOpen] = useState(false);
  const [poForDetail, setPoForDetail] = useState<PurchaseOrder | null>(null);

  // Multi-Item Reception modal state
  const [poForReception, setPoForReception] = useState<PurchaseOrder | null>(null);
  const [receptionQuantities, setReceptionQuantities] = useState<Record<string, number>>({});
  const [receptionNotes, setReceptionNotes] = useState('');

  // Supplier Payment modal state
  const [poForPayment, setPoForPayment] = useState<PurchaseOrder | null>(null);
  const [debtForPayment, setDebtForPayment] = useState<SupplierDebt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentAccountId, setPaymentAccountId] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Supplier return modal state
  const [poForReturn, setPoForReturn] = useState<PurchaseOrder | null>(null);
  const [returnProductId, setReturnProductId] = useState<string>('');
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnReason, setReturnReason] = useState('Marchandise défectueuse à la livraison');

  // Requesting Departments management state
  const [isNewDeptModalOpen, setIsNewDeptModalOpen] = useState(false);
  const [deptToEdit, setDeptToEdit] = useState<RequestingDepartment | null>(null);
  const [deptSearch, setDeptSearch] = useState('');
  const [deptStatusFilter, setDeptStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'>('ALL');

  // Form state: New / Edit Supplier
  const [supName, setSupName] = useState('');
  const [supCompany, setSupCompany] = useState('');
  const [supContactPerson, setSupContactPerson] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // Form state: New / Edit Department
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptManagerName, setDeptManagerName] = useState('');
  const [deptDescription, setDeptDescription] = useState('');
  const [deptIsActive, setDeptIsActive] = useState(true);

  // Form state: Multi-Item Purchase Order (BC)
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poDepartmentId, setPoDepartmentId] = useState('');
  const [poOrderDate, setPoOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [poNotes, setPoNotes] = useState('');
  const [poLines, setPoLines] = useState<POLineDraft[]>([]);

  // Item selector inside New PO Modal
  const [selectedAddProductId, setSelectedAddProductId] = useState('');
  const [addArticleSearch, setAddArticleSearch] = useState('');
  const [isArticleDropdownOpen, setIsArticleDropdownOpen] = useState(false);

  // Active products from Agency Catalog
  const activeProducts = useMemo(() => {
    return (state.products || []).filter(p => (currentAgencyId === 'ALL' || p.tenantId === currentAgencyId) && p.isActive && !p.isArchived);
  }, [state.products, currentAgencyId, tick]);

  // Active requesting departments
  const activeDepartments = useMemo(() => {
    return (state.requestingDepartments || []).filter(d => (currentAgencyId === 'ALL' || d.tenantId === currentAgencyId) && d.isActive && !d.isArchived);
  }, [state.requestingDepartments, currentAgencyId, tick]);

  // Filtered active products for adding to PO
  const filteredProductsForAdd = useMemo(() => {
    if (!addArticleSearch.trim()) return activeProducts;
    const q = addArticleSearch.toLowerCase();
    return activeProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  }, [activeProducts, addArticleSearch]);

  // Agency Purchase Orders
  const agencyPurchaseOrders = useMemo(() => {
    if (currentAgencyId === 'ALL' || currentAgencyId === 'global') return state.purchaseOrders || [];
    return (state.purchaseOrders || []).filter(po => po.tenantId === currentAgencyId);
  }, [state.purchaseOrders, currentAgencyId, tick]);

  // Filtered Purchase Orders
  const filteredPurchaseOrders = useMemo(() => {
    return agencyPurchaseOrders.filter(po => {
      const matchesSearch =
        po.poNumber.toLowerCase().includes(poSearch.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(poSearch.toLowerCase()) ||
        (po.departmentName && po.departmentName.toLowerCase().includes(poSearch.toLowerCase())) ||
        po.items.some(it => it.productName.toLowerCase().includes(poSearch.toLowerCase()) || (it.productCode && it.productCode.toLowerCase().includes(poSearch.toLowerCase())));

      const matchesSupplier = poSupplierFilter === 'ALL' || po.supplierId === poSupplierFilter;
      const matchesDept = poDepartmentFilter === 'ALL' || po.departmentId === poDepartmentFilter;
      const matchesStatus = poStatusFilter === 'ALL' || po.status === poStatusFilter;
      const matchesPayment = poPaymentStatusFilter === 'ALL' || po.paymentStatus === poPaymentStatusFilter;

      return matchesSearch && matchesSupplier && matchesDept && matchesStatus && matchesPayment;
    });
  }, [agencyPurchaseOrders, poSearch, poSupplierFilter, poDepartmentFilter, poStatusFilter, poPaymentStatusFilter]);

  // Agency Financial Accounts (active)
  const agencyFinancialAccounts = useMemo(() => {
    return (state.financialAccounts || []).filter(a => (currentAgencyId === 'ALL' || a.tenantId === currentAgencyId) && a.isActive);
  }, [state.financialAccounts, currentAgencyId, tick]);

  // Agency Suppliers
  const agencySuppliers = useMemo(() => {
    if (currentAgencyId === 'ALL' || currentAgencyId === 'global') return state.suppliers || [];
    return (state.suppliers || []).filter(s => s.tenantId === currentAgencyId);
  }, [state.suppliers, currentAgencyId, tick]);

  // Agency Requesting Departments
  const agencyDepartments = useMemo(() => {
    if (currentAgencyId === 'ALL' || currentAgencyId === 'global') return state.requestingDepartments || [];
    return (state.requestingDepartments || []).filter(d => d.tenantId === currentAgencyId);
  }, [state.requestingDepartments, currentAgencyId, tick]);

  // Agency Supplier Debts
  const agencySupplierDebts = useMemo(() => {
    return (state.supplierDebts || []).filter(d => currentAgencyId === 'ALL' || d.tenantId === currentAgencyId);
  }, [state.supplierDebts, currentAgencyId, tick]);

  // Agency Supplier Payments
  const agencySupplierPayments = useMemo(() => {
    return (state.supplierPayments || []).filter(p => currentAgencyId === 'ALL' || p.tenantId === currentAgencyId);
  }, [state.supplierPayments, currentAgencyId, tick]);

  // Debts KPIs
  const debtMetrics = useMemo(() => {
    const totalRemaining = agencySupplierDebts.reduce((acc, d) => acc + (d.remainingAmount || 0), 0);
    const totalPaid = agencySupplierDebts.reduce((acc, d) => acc + (d.paidAmount || 0), 0);
    const totalInitial = agencySupplierDebts.reduce((acc, d) => acc + (d.initialAmount || 0), 0);
    const activeCount = agencySupplierDebts.filter(d => (d.remainingAmount || 0) > 0).length;
    const paidCount = agencySupplierDebts.filter(d => d.status === 'PAID').length;
    return { totalRemaining, totalPaid, totalInitial, activeCount, paidCount };
  }, [agencySupplierDebts]);

  // Filtered Debts
  const filteredDebts = useMemo(() => {
    return agencySupplierDebts.filter(d => {
      const matchesSearch =
        d.debtNumber.toLowerCase().includes(debtSearch.toLowerCase()) ||
        d.supplierName.toLowerCase().includes(debtSearch.toLowerCase()) ||
        d.poNumber.toLowerCase().includes(debtSearch.toLowerCase());

      let matchesStatus = true;
      if (debtStatusFilter === 'ACTIVE') matchesStatus = d.status === 'ACTIVE';
      else if (debtStatusFilter === 'PARTIALLY_PAID') matchesStatus = d.status === 'PARTIALLY_PAID';
      else if (debtStatusFilter === 'PAID') matchesStatus = d.status === 'PAID';

      return matchesSearch && matchesStatus;
    });
  }, [agencySupplierDebts, debtSearch, debtStatusFilter]);

  // Supplier Financial Stats for Cards
  const supplierFinancialStats = useMemo(() => {
    const stats: Record<string, { totalPurchased: number; totalPaid: number; totalDue: number; poCount: number }> = {};
    (state.purchaseOrders || []).filter(po => isSuperAdmin || po.tenantId === currentAgencyId).forEach(po => {
      if (!stats[po.supplierId]) {
        stats[po.supplierId] = { totalPurchased: 0, totalPaid: 0, totalDue: 0, poCount: 0 };
      }
      stats[po.supplierId].poCount += 1;
      stats[po.supplierId].totalPurchased += po.totalAmount || 0;
      stats[po.supplierId].totalPaid += po.paidAmount || 0;
      stats[po.supplierId].totalDue += po.dueAmount !== undefined ? po.dueAmount : Math.max(0, (po.totalAmount || 0) - (po.paidAmount || 0));
    });
    return stats;
  }, [state.purchaseOrders, currentAgencyId, isSuperAdmin, tick]);

  // Filtered Departments
  const filteredDepartments = useMemo(() => {
    return agencyDepartments.filter(d => {
      const matchesSearch =
        d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
        d.code.toLowerCase().includes(deptSearch.toLowerCase()) ||
        (d.managerName && d.managerName.toLowerCase().includes(deptSearch.toLowerCase()));

      let matchesStatus = true;
      if (deptStatusFilter === 'ACTIVE') matchesStatus = d.isActive && !d.isArchived;
      else if (deptStatusFilter === 'INACTIVE') matchesStatus = !d.isActive && !d.isArchived;
      else if (deptStatusFilter === 'ARCHIVED') matchesStatus = !!d.isArchived;

      return matchesSearch && matchesStatus;
    });
  }, [agencyDepartments, deptSearch, deptStatusFilter]);

  // Compute PO count per department
  const poCountByDepartment = useMemo(() => {
    const counts: Record<string, { total: number; amount: number }> = {};
    (state.purchaseOrders || []).forEach(po => {
      if (po.departmentId) {
        if (!counts[po.departmentId]) counts[po.departmentId] = { total: 0, amount: 0 };
        counts[po.departmentId].total += 1;
        counts[po.departmentId].amount += po.totalAmount || 0;
      }
    });
    return counts;
  }, [state.purchaseOrders, tick]);

  // Grand Total of current PO lines in creation modal
  const poGrandTotal = useMemo(() => {
    return poLines.reduce((acc, line) => acc + line.totalPrice, 0);
  }, [poLines]);

  // Payment Handlers
  const handleOpenPOPayment = (po: PurchaseOrder) => {
    const due = po.dueAmount !== undefined ? po.dueAmount : Math.max(0, po.totalAmount - (po.paidAmount || 0));
    setPoForPayment(po);
    setDebtForPayment(null);
    setPaymentAmount(due);
    setPaymentAccountId(agencyFinancialAccounts[0]?.id || '');
    setPaymentReference('');
    setPaymentNotes(`Règlement Bon de Commande ${po.poNumber}`);
  };

  const handleOpenDebtPayment = (debt: SupplierDebt) => {
    const po = (state.purchaseOrders || []).find(p => p.id === debt.purchaseOrderId) || null;
    setPoForPayment(po);
    setDebtForPayment(debt);
    setPaymentAmount(debt.remainingAmount);
    setPaymentAccountId(agencyFinancialAccounts[0]?.id || '');
    setPaymentReference('');
    setPaymentNotes(`Règlement Dette ${debt.debtNumber} - ${debt.supplierName}`);
  };

  const handleExecuteSupplierPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAccountId) {
      showToast('Validation', 'Veuillez sélectionner un compte financier valide pour ce paiement.', 'WARNING');
      return;
    }
    if (paymentAmount <= 0) {
      showToast('Validation', 'Le montant du paiement doit être strictement supérieur à zéro.', 'WARNING');
      return;
    }

    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Gestionnaire';

    let result;
    if (debtForPayment) {
      result = dbStore.recordSupplierDebtPayment(
        debtForPayment.id,
        paymentAmount,
        paymentAccountId,
        paymentReference,
        paymentNotes,
        currentAgencyId,
        performedBy,
        isSuperAdmin
      );
    } else if (poForPayment) {
      result = dbStore.recordSupplierPayment(
        poForPayment.id,
        paymentAmount,
        paymentAccountId,
        paymentReference,
        paymentNotes,
        currentAgencyId,
        performedBy,
        isSuperAdmin
      );
    }

    if (result && result.success) {
      showToast('Paiement Validé 💳', result.message, 'SUCCESS');
      setPoForPayment(null);
      setDebtForPayment(null);
    } else {
      showToast('Erreur Paiement', result?.message || 'Une erreur est survenue lors du paiement.', 'DANGER');
    }
  };

  // =========================================================================
  // MULTI-ITEM PURCHASE ORDER (BC) HANDLERS
  // =========================================================================

  const handleOpenNewPOModal = () => {
    if (activeProducts.length === 0) {
      showToast('Catalogue Vide', 'Aucun article actif disponible dans le catalogue pour émettre un bon de commande.', 'WARNING');
      return;
    }
    if (activeDepartments.length === 0) {
      showToast('Services Requis', 'Veuillez créer au moins un service demandeur avant d\'émettre un bon de commande.', 'WARNING');
      return;
    }

    setPoSupplierId(state.suppliers[0]?.id || '');
    setPoDepartmentId(activeDepartments[0]?.id || '');
    setPoOrderDate(new Date().toISOString().split('T')[0]);
    setPoNotes('');
    setAddArticleSearch('');
    setIsArticleDropdownOpen(false);

    // Initial default first item
    const firstProd = activeProducts[0];
    const initialLine = createPOLineDraft(firstProd, undefined, 10);

    setPoLines([initialLine]);
    setIsNewPOModalOpen(true);
  };

  const createPOLineDraft = (prod: Product, targetUnitName?: string, initialQty: number = 10): POLineDraft => {
    const availableUnits = getProductPurchaseUnits(prod);
    const priceResolution = resolveProductPurchasePrice(prod, targetUnitName);
    const factor = priceResolution.factorToBase > 0 ? priceResolution.factorToBase : 1;
    const unitPrice = priceResolution.unitPrice;
    const qty = Math.max(1, initialQty);
    const qtyInStock = Math.round(qty * factor);
    const unitPriceStock = factor > 0 ? Math.round(unitPrice / factor) : unitPrice;
    const total = qty * unitPrice;

    return {
      id: `draft-line-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: prod.id,
      productName: prod.name,
      productCode: prod.code,
      category: prod.category || 'Général',
      orderedQuantityPurchaseUnit: qty,
      purchaseUnitName: priceResolution.selectedUnitName,
      conversionFactor: factor,
      quantityInStockUnit: qtyInStock,
      unitPricePurchaseUnit: unitPrice,
      unitPriceStockUnit: unitPriceStock,
      totalPrice: total,
      currentStock: prod.currentStock,
      baseUnit: priceResolution.baseUnitName,
      conversionDescription: priceResolution.conversionDescription,
      isSpecificPrice: priceResolution.isSpecificPrice,
      hasPriceConfigured: priceResolution.hasPriceConfigured,
      availableUnits
    };
  };

  const handleAddProductToPOLines = (prod: Product) => {
    // Duplicate check: if already in lines, increase quantity or alert
    const existingIndex = poLines.findIndex(l => l.productId === prod.id);
    if (existingIndex >= 0) {
      const updated = [...poLines];
      const line = updated[existingIndex];
      line.orderedQuantityPurchaseUnit += 5;
      line.quantityInStockUnit = Math.round(line.orderedQuantityPurchaseUnit * line.conversionFactor);
      line.totalPrice = line.orderedQuantityPurchaseUnit * line.unitPricePurchaseUnit;
      setPoLines(updated);
      showToast(
        'Quantité Mise à Jour',
        `L'article « ${prod.name} » était déjà dans la commande. Sa quantité a été augmentée à ${line.orderedQuantityPurchaseUnit} ${line.purchaseUnitName}s.`,
        'INFO'
      );
      setAddArticleSearch('');
      setIsArticleDropdownOpen(false);
      return;
    }

    const newLine = createPOLineDraft(prod, undefined, 5);
    setPoLines([...poLines, newLine]);
    setAddArticleSearch('');
    setIsArticleDropdownOpen(false);
  };

  const handleUpdatePOLineUnit = (lineId: string, newUnitName: string) => {
    setPoLines(poLines.map(line => {
      if (line.id !== lineId) return line;
      const prod = activeProducts.find(p => p.id === line.productId) || (state.products || []).find(p => p.id === line.productId);
      if (!prod) return line;

      const priceResolution = resolveProductPurchasePrice(prod, newUnitName);
      const factor = priceResolution.factorToBase > 0 ? priceResolution.factorToBase : 1;
      const unitPrice = priceResolution.unitPrice;
      const qty = line.orderedQuantityPurchaseUnit;
      const qtyInStock = Math.round(qty * factor);
      const unitPriceStock = factor > 0 ? Math.round(unitPrice / factor) : unitPrice;
      const total = qty * unitPrice;

      return {
        ...line,
        purchaseUnitName: priceResolution.selectedUnitName,
        conversionFactor: factor,
        quantityInStockUnit: qtyInStock,
        unitPricePurchaseUnit: unitPrice,
        unitPriceStockUnit: unitPriceStock,
        totalPrice: total,
        conversionDescription: priceResolution.conversionDescription,
        isSpecificPrice: priceResolution.isSpecificPrice,
        hasPriceConfigured: priceResolution.hasPriceConfigured
      };
    }));
  };

  const handleUpdatePOLineQty = (lineId: string, newQty: number) => {
    const validQty = Math.max(1, newQty);
    setPoLines(poLines.map(line => {
      if (line.id !== lineId) return line;
      const qtyInStock = Math.round(validQty * line.conversionFactor);
      const total = validQty * line.unitPricePurchaseUnit;
      return {
        ...line,
        orderedQuantityPurchaseUnit: validQty,
        quantityInStockUnit: qtyInStock,
        totalPrice: total
      };
    }));
  };

  const handleUpdatePOLinePrice = (lineId: string, newPrice: number) => {
    const validPrice = Math.max(0, newPrice);
    setPoLines(poLines.map(line => {
      if (line.id !== lineId) return line;
      const unitCost = line.conversionFactor > 0 ? Math.round(validPrice / line.conversionFactor) : validPrice;
      const total = line.orderedQuantityPurchaseUnit * validPrice;
      return {
        ...line,
        unitPricePurchaseUnit: validPrice,
        unitPriceStockUnit: unitCost,
        totalPrice: total,
        hasPriceConfigured: validPrice > 0
      };
    }));
  };

  const handleRemovePOLine = (lineId: string) => {
    if (poLines.length <= 1) {
      showToast('Validation', 'Un bon de commande doit contenir au moins un article.', 'WARNING');
      return;
    }
    setPoLines(poLines.filter(l => l.id !== lineId));
  };

  const handleCreatePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!poSupplierId) {
      showToast('Validation', 'Veuillez sélectionner un fournisseur.', 'DANGER');
      return;
    }
    if (!poDepartmentId) {
      showToast('Validation', 'Veuillez sélectionner le service demandeur obligatoire.', 'DANGER');
      return;
    }
    if (poLines.length === 0) {
      showToast('Validation', 'Veuillez ajouter au moins un article dans la commande.', 'DANGER');
      return;
    }

    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Gestionnaire';

    const result = dbStore.createSecurePurchaseOrder(
      {
        supplierId: poSupplierId,
        departmentId: poDepartmentId,
        orderDate: poOrderDate,
        notes: poNotes.trim() || undefined,
        items: poLines.map(l => ({
          productId: l.productId,
          orderedQuantityPurchaseUnit: l.orderedQuantityPurchaseUnit,
          purchaseUnitName: l.purchaseUnitName,
          unitPricePurchaseUnit: l.unitPricePurchaseUnit
        }))
      },
      currentAgencyId,
      performedBy,
      isSuperAdmin
    );

    if (result.success && result.purchaseOrder) {
      showToast(
        'Bon de Commande Émis 📦',
        `Bon de commande ${result.purchaseOrder.poNumber} émis avec succès (${result.purchaseOrder.items.length} articles, ${formatCurrency(result.purchaseOrder.totalAmount)}).`,
        'SUCCESS'
      );
      setIsNewPOModalOpen(false);
    } else {
      showToast('Erreur', result.message, 'DANGER');
    }
  };

  // =========================================================================
  // MULTI-ITEM RECEPTION HANDLERS
  // =========================================================================

  const handleOpenMultiReception = (po: PurchaseOrder) => {
    const initialMap: Record<string, number> = {};
    po.items.forEach(it => {
      const remaining = it.orderedQuantityPurchaseUnit - (it.receivedQuantityPurchaseUnit || 0);
      initialMap[it.productId] = Math.max(0, remaining);
    });
    setPoForReception(po);
    setReceptionQuantities(initialMap);
    setReceptionNotes('Livraison conforme avec bon de livraison fournisseur');
  };

  const handleExecuteMultiReception = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForReception) return;

    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Responsable Réception';

    const result = dbStore.receiveSecurePurchaseOrder(
      poForReception.id,
      receptionQuantities,
      currentAgencyId,
      performedBy,
      isSuperAdmin,
      receptionNotes
    );

    if (result.success) {
      showToast('Réception Validée 🟢', result.message, 'SUCCESS');
      setPoForReception(null);
    } else {
      showToast('Erreur Réception', result.message, 'DANGER');
    }
  };

  // =========================================================================
  // SUPPLIER RETURN HANDLERS
  // =========================================================================

  const handleOpenReturn = (po: PurchaseOrder) => {
    setPoForReturn(po);
    setReturnProductId(po.items[0]?.productId || '');
    setReturnQty(1);
    setReturnReason('Carton endommagé / défaut fournisseur');
  };

  const handleExecuteSupplierReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForReturn) return;

    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Gestionnaire';

    const result = dbStore.returnSecurePurchaseOrder(
      poForReturn.id,
      returnProductId,
      returnQty,
      returnReason,
      currentAgencyId,
      performedBy,
      isSuperAdmin
    );

    if (result.success) {
      showToast('Retour Fournisseur Enregistré ↩️', result.message, 'WARNING');
      setPoForReturn(null);
    } else {
      showToast('Erreur Retour', result.message, 'DANGER');
    }
  };

  // =========================================================================
  // REQUESTING DEPARTMENT CRUD HANDLERS
  // =========================================================================

  const handleOpenCreateDepartment = () => {
    setDeptName('');
    setDeptCode('');
    setDeptManagerName('');
    setDeptDescription('');
    setDeptIsActive(true);
    setIsNewDeptModalOpen(true);
  };

  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = deptName.trim();
    if (!trimmedName) {
      showToast('Validation', 'Le nom du service est obligatoire.', 'DANGER');
      return;
    }

    let code = deptCode.trim().toUpperCase();
    if (!code) {
      code = trimmedName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    // Check duplicate name or code
    const existing = (state.requestingDepartments || []).find(
      d => (d.name.toLowerCase() === trimmedName.toLowerCase() || d.code.toUpperCase() === code) && !d.isArchived
    );
    if (existing) {
      showToast('Doublon', 'Un service portant ce nom ou ce code existe déjà.', 'DANGER');
      return;
    }

    const newDept: RequestingDepartment = {
      id: `dept-${Date.now()}`,
      tenantId: currentTenant?.id || 't-001',
      code,
      name: trimmedName,
      managerName: deptManagerName.trim() || undefined,
      description: deptDescription.trim() || undefined,
      isActive: deptIsActive,
      isArchived: false,
      createdAt: new Date().toISOString()
    };

    dbStore.updateState(draft => {
      if (!draft.requestingDepartments) draft.requestingDepartments = [];
      draft.requestingDepartments.push(newDept);
    });

    dbStore.logAudit('DEPARTMENT_CREATED', 'REQUESTING_DEPARTMENT', newDept.id, null, { name: newDept.name, code: newDept.code });
    showToast('Service Créé', `Le service « ${newDept.name} » a été ajouté avec succès.`, 'SUCCESS');
    setIsNewDeptModalOpen(false);
  };

  const handleOpenEditDepartment = (d: RequestingDepartment) => {
    setDeptToEdit(d);
    setDeptName(d.name);
    setDeptCode(d.code);
    setDeptManagerName(d.managerName || '');
    setDeptDescription(d.description || '');
    setDeptIsActive(d.isActive);
  };

  const handleSaveEditDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptToEdit) return;

    const trimmedName = deptName.trim();
    const code = deptCode.trim().toUpperCase();

    if (!trimmedName || !code) {
      showToast('Validation', 'Le nom et le code du service sont obligatoires.', 'DANGER');
      return;
    }

    const oldName = deptToEdit.name;

    dbStore.updateState(draft => {
      const d = draft.requestingDepartments?.find(item => item.id === deptToEdit.id);
      if (d) {
        d.name = trimmedName;
        d.code = code;
        d.managerName = deptManagerName.trim() || undefined;
        d.description = deptDescription.trim() || undefined;
        d.isActive = deptIsActive;
        d.updatedAt = new Date().toISOString();
      }

      // Propagate name change to POs if updated
      if (oldName !== trimmedName) {
        draft.purchaseOrders?.forEach(po => {
          if (po.departmentId === deptToEdit.id) {
            po.departmentName = trimmedName;
          }
        });
      }
    });

    dbStore.logAudit('DEPARTMENT_UPDATED', 'REQUESTING_DEPARTMENT', deptToEdit.id, { name: oldName }, { name: trimmedName, code });
    showToast('Service Modifié', `Le service « ${trimmedName} » a été mis à jour.`, 'SUCCESS');
    setDeptToEdit(null);
  };

  const handleToggleDepartmentActive = (d: RequestingDepartment) => {
    dbStore.updateState(draft => {
      const dept = draft.requestingDepartments?.find(item => item.id === d.id);
      if (dept) {
        dept.isActive = !dept.isActive;
        dept.updatedAt = new Date().toISOString();
      }
    });

    dbStore.logAudit('DEPARTMENT_STATUS_TOGGLED', 'REQUESTING_DEPARTMENT', d.id, { isActive: d.isActive }, { isActive: !d.isActive });
    showToast(
      d.isActive ? 'Service Désactivé' : 'Service Réactivé',
      `Le service « ${d.name} » est maintenant ${d.isActive ? 'inactif' : 'actif'}.`,
      'INFO'
    );
  };

  const handleArchiveDepartment = (d: RequestingDepartment) => {
    dbStore.updateState(draft => {
      const dept = draft.requestingDepartments?.find(item => item.id === d.id);
      if (dept) {
        dept.isArchived = true;
        dept.isActive = false;
        dept.archivedAt = new Date().toISOString();
      }
    });

    dbStore.logAudit('DEPARTMENT_ARCHIVED', 'REQUESTING_DEPARTMENT', d.id, null, { name: d.name });
    showToast('Service Archivé', `Le service « ${d.name} » a été archivé. Ses anciennes commandes restent intactes.`, 'SUCCESS');
  };

  const handleRestoreDepartment = (d: RequestingDepartment) => {
    dbStore.updateState(draft => {
      const dept = draft.requestingDepartments?.find(item => item.id === d.id);
      if (dept) {
        dept.isArchived = false;
        dept.isActive = true;
        dept.archivedAt = undefined;
        dept.updatedAt = new Date().toISOString();
      }
    });

    dbStore.logAudit('DEPARTMENT_RESTORED', 'REQUESTING_DEPARTMENT', d.id, null, { name: d.name });
    showToast('Service Restauré', `Le service « ${d.name} » est à nouveau actif.`, 'SUCCESS');
  };

  // =========================================================================
  // SUPPLIER CRUD HANDLERS
  // =========================================================================

  const handleOpenCreateSupplier = () => {
    setSupName('');
    setSupCompany('');
    setSupContactPerson('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setIsNewSupplierModalOpen(true);
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;

    if (supPhone.trim() && !isValidPhoneNumber(supPhone, { allowEmpty: true })) {
      showToast('Erreur Téléphone', 'Le numéro de téléphone du fournisseur est invalide (lettres ou caractères non autorisés).', 'DANGER');
      return;
    }

    const newId = `sup-${Date.now()}`;
    const newSup: Supplier = {
      id: newId,
      tenantId: currentTenant?.id || 't-001',
      name: supName.trim(),
      company: supCompany.trim() || undefined,
      contactPerson: supContactPerson.trim() || undefined,
      phone: supPhone.trim() || undefined,
      email: supEmail.trim() || undefined,
      address: supAddress.trim() || undefined,
      isActive: true,
    };

    dbStore.updateState(draft => {
      draft.suppliers.unshift(newSup);
    });

    dbStore.logAudit('SUPPLIER_CREATED', 'SUPPLIER', newId, null, { name: newSup.name });
    showToast('Fournisseur Ajouté', `Le fournisseur « ${newSup.name} » a été enregistré.`, 'SUCCESS');
    setIsNewSupplierModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-brand-500" />
            Fournisseurs, Commandes d'Achat (BC) & Services Demandeurs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Émission de bons de commande multi-articles, affectation par service demandeur, réceptions et traçabilité.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            icon={Building2}
            onClick={() => {
              setActiveTab('departments');
              handleOpenCreateDepartment();
            }}
            className="text-xs font-bold"
          >
            + Nouveau Service
          </Button>

          <Button
            variant="outline"
            icon={Truck}
            onClick={handleOpenCreateSupplier}
            className="text-xs font-bold"
          >
            + Nouveau Fournisseur
          </Button>

          <Button
            variant="primary"
            icon={Plus}
            onClick={handleOpenNewPOModal}
            className="font-bold text-xs"
          >
            Émettre un Bon de Commande (BC)
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs
        tabs={[
          { id: 'orders', label: `Bons de Commande Fournisseurs (${agencyPurchaseOrders.length})`, icon: FileText },
          { id: 'debts', label: `💳 Dettes Fournisseurs (${debtMetrics.activeCount})`, icon: CreditCard },
          { id: 'suppliers', label: `Fournisseurs Référencés (${agencySuppliers.length})`, icon: Truck },
          { id: 'departments', label: `⚙️ Services Demandeurs (${agencyDepartments.length})`, icon: Building2 },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* ========================================================================= */}
      {/* TAB 1: BONS DE COMMANDE FOURNISSEURS (MULTI-ARTICLES) */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <Card className="p-4 sm:p-6 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher par N° BC, fournisseur, service demandeur, article..."
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={poSupplierFilter}
                onChange={(e) => setPoSupplierFilter(e.target.value)}
                className="text-xs min-w-[160px]"
              >
                <option value="ALL">Tous les Fournisseurs</option>
                {state.suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>

              <Select
                value={poDepartmentFilter}
                onChange={(e) => setPoDepartmentFilter(e.target.value)}
                className="text-xs min-w-[160px]"
              >
                <option value="ALL">Tous les Services Demandeurs</option>
                {(state.requestingDepartments || []).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>

              <Select
                value={poStatusFilter}
                onChange={(e) => setPoStatusFilter(e.target.value as any)}
                className="text-xs min-w-[140px]"
              >
                <option value="ALL">Tous les Statuts</option>
                <option value="ORDERED">🟡 Commandé</option>
                <option value="PARTIALLY_RECEIVED">🟠 Partiellement Reçu</option>
                <option value="RECEIVED">🟢 Réceptionné</option>
                <option value="CANCELLED">🔴 Annulé</option>
              </Select>

              <Select
                value={poPaymentStatusFilter}
                onChange={(e) => setPoPaymentStatusFilter(e.target.value as any)}
                className="text-xs min-w-[150px]"
              >
                <option value="ALL">Tous les Paiements</option>
                <option value="UNPAID">🔴 Non Payée</option>
                <option value="PARTIALLY_PAID">🟠 Partielle</option>
                <option value="PAID">🟢 Totalement Payée</option>
                <option value="CREDIT">🟣 À Crédit</option>
              </Select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro & Date</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Service Demandeur</TableHead>
                  <TableHead>Articles & Multi-Lignes</TableHead>
                  <TableHead>Montant & Paiement</TableHead>
                  <TableHead>Statut Réception</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchaseOrders.map(po => {
                  const isFullyReceived = po.status === 'RECEIVED';
                  const isPartial = po.status === 'PARTIALLY_RECEIVED';
                  const itemsCount = po.items.length;
                  const due = po.dueAmount !== undefined ? po.dueAmount : Math.max(0, (po.totalAmount || 0) - (po.paidAmount || 0));

                  return (
                    <TableRow key={po.id}>
                      <TableCell>
                        <span className="font-mono font-bold text-xs text-brand-600 dark:text-brand-400 block cursor-pointer hover:underline" onClick={() => setPoForDetail(po)}>
                          {po.poNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">{formatDate(po.orderDate)}</span>
                      </TableCell>
                      <TableCell>
                        <strong className="text-xs text-slate-900 dark:text-white block">{po.supplierName}</strong>
                      </TableCell>
                      <TableCell>
                        <Badge variant="primary" size="sm" className="font-bold flex items-center gap-1 w-fit">
                          <Building2 className="w-3 h-3" />
                          {po.departmentName || 'Administration Générale'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {itemsCount} article(s) commandé(s)
                          </div>
                          <div className="text-[11px] text-slate-500 max-w-xs truncate">
                            {po.items.map(it => `${it.productName} (${it.orderedQuantityPurchaseUnit} ${it.purchaseUnitName || 'Carton'}s)`).join(', ')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <strong className="text-xs font-black text-slate-900 dark:text-white block">
                          {formatCurrency(po.totalAmount)}
                        </strong>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {po.paymentStatus === 'PAID' && (
                            <Badge variant="success" size="sm" className="text-[10px] font-bold">
                              🟢 Soldé
                            </Badge>
                          )}
                          {po.paymentStatus === 'PARTIALLY_PAID' && (
                            <Badge variant="warning" size="sm" className="text-[10px] font-bold">
                              🟠 Reste: {formatCurrency(due)}
                            </Badge>
                          )}
                          {(po.paymentStatus === 'UNPAID' || !po.paymentStatus) && (
                            <Badge variant="danger" size="sm" className="text-[10px] font-bold">
                              🔴 Non Payé
                            </Badge>
                          )}
                          {po.paymentStatus === 'CREDIT' && (
                            <Badge variant="outline" size="sm" className="text-[10px] font-bold border-amber-400 text-amber-600 dark:text-amber-400">
                              🟡 À Crédit ({formatCurrency(due)})
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isFullyReceived ? 'success' : isPartial ? 'warning' : 'outline'}
                          size="sm"
                          className="font-bold text-[10px]"
                        >
                          {isFullyReceived ? '🟢 Réceptionné' : isPartial ? '🟠 Partiellement Reçu' : '🟡 Commandé'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Eye}
                            onClick={() => setPoForDetail(po)}
                            className="h-8 w-8 p-0 text-slate-600 hover:text-brand-600"
                            title="Voir le détail de la commande"
                          />

                          {due > 0 && po.status !== 'CANCELLED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              icon={CreditCard}
                              onClick={() => handleOpenPOPayment(po)}
                              className="h-8 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-emerald-300"
                              title="Effectuer un paiement fournisseur"
                            >
                              Payer
                            </Button>
                          )}

                          {!isFullyReceived && (
                            <Button
                              size="sm"
                              variant="primary"
                              icon={CheckCircle2}
                              onClick={() => handleOpenMultiReception(po)}
                              className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700"
                            >
                              Réceptionner
                            </Button>
                          )}

                          {isFullyReceived && (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={RotateCcw}
                              onClick={() => handleOpenReturn(po)}
                              className="h-8 text-xs text-amber-600 hover:text-amber-700"
                              title="Retourner de la marchandise au fournisseur"
                            >
                              Retour
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredPurchaseOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                      Aucun bon de commande trouvé avec ces critères de recherche.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DETTES FOURNISSEURS & ÉCHÉANCES */}
      {/* ========================================================================= */}
      {activeTab === 'debts' && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-l-4 border-l-rose-500 bg-gradient-to-br from-white to-rose-50/20 dark:from-slate-900 dark:to-rose-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Dettes Restantes Dues</span>
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-2">
                {formatCurrency(debtMetrics.totalRemaining)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                {debtMetrics.activeCount} facture(s) en attente de règlement
              </span>
            </Card>

            <Card className="p-4 border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/20 dark:from-slate-900 dark:to-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Dettes Réglées</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {formatCurrency(debtMetrics.totalPaid)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                {debtMetrics.paidCount} facture(s) totalement soldée(s)
              </span>
            </Card>

            <Card className="p-4 border-l-4 border-l-brand-500 bg-gradient-to-br from-white to-brand-50/20 dark:from-slate-900 dark:to-brand-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Volume Total des Dettes</span>
                <DollarSign className="w-5 h-5 text-brand-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                {formatCurrency(debtMetrics.totalInitial)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                Engagements d'achats fournisseurs
              </span>
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50/20 dark:from-slate-900 dark:to-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Comptes Trésorerie Actifs</span>
                <Landmark className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-2">
                {agencyFinancialAccounts.length} compte(s)
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                Disponibles pour décaissement
              </span>
            </Card>
          </div>

          {/* Debts Table */}
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex-1 relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Rechercher par N° dette, fournisseur, N° bon de commande..."
                  value={debtSearch}
                  onChange={(e) => setDebtSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <Select
                value={debtStatusFilter}
                onChange={(e) => setDebtStatusFilter(e.target.value as any)}
                className="text-xs min-w-[160px]"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="ACTIVE">🔴 Dettes En Cours / Non Payées</option>
                <option value="PARTIALLY_PAID">🟠 Partiellement Réglées</option>
                <option value="PAID">🟢 Soldées / Payées</option>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Dette & Date</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Bon de Commande Lié</TableHead>
                    <TableHead className="text-right">Montant Initial</TableHead>
                    <TableHead className="text-right">Déjà Payé</TableHead>
                    <TableHead className="text-right">Reste Dû</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDebts.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <span className="font-mono font-bold text-xs text-brand-600 block">{d.debtNumber}</span>
                        <span className="text-[11px] text-slate-400">{formatDate(d.issueDate)}</span>
                      </TableCell>
                      <TableCell>
                        <strong className="text-xs text-slate-900 dark:text-white block">{d.supplierName}</strong>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" size="sm" className="font-mono font-bold">
                          {d.poNumber}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(d.initialAmount)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-emerald-600">
                        {formatCurrency(d.paidAmount)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-black text-rose-600 dark:text-rose-400">
                        {formatCurrency(d.remainingAmount)}
                      </TableCell>
                      <TableCell>
                        {d.status === 'PAID' ? (
                          <Badge variant="success" size="sm" className="font-bold text-[10px]">🟢 Soldée</Badge>
                        ) : d.status === 'PARTIALLY_PAID' ? (
                          <Badge variant="warning" size="sm" className="font-bold text-[10px]">🟠 Partielle</Badge>
                        ) : (
                          <Badge variant="danger" size="sm" className="font-bold text-[10px]">🔴 Non Soldée</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {d.remainingAmount > 0 ? (
                          <Button
                            size="sm"
                            variant="primary"
                            icon={CreditCard}
                            onClick={() => handleOpenDebtPayment(d)}
                            className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700"
                          >
                            Régler
                          </Button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-bold">Soldé ✓</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredDebts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                        Aucune dette fournisseur trouvée.
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
      {/* TAB 3: FOURNISSEURS RÉFÉRENCÉS */}
      {/* ========================================================================= */}
      {activeTab === 'suppliers' && (
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-brand-600" />
                Fournisseurs Partenaires ({(state.suppliers || []).length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Répertoire des fournisseurs agréés pour les approvisionnements et réceptions de stock.
              </p>
            </div>

            <Button
              variant="primary"
              icon={Plus}
              onClick={handleOpenCreateSupplier}
              className="text-xs font-bold"
            >
              + Nouveau Fournisseur
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agencySuppliers.map(s => {
              const fin = supplierFinancialStats[s.id] || { totalPurchased: 0, totalPaid: 0, totalDue: 0, poCount: 0 };
              return (
                <Card key={s.id} className="p-4 space-y-3 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">{s.name}</h4>
                    <Badge variant="success" size="sm">Actif</Badge>
                  </div>
                  {s.company && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">{s.company}</p>
                  )}
                  {s.contactPerson && (
                    <p className="text-xs text-slate-500">Contact : <strong>{s.contactPerson}</strong></p>
                  )}
                  <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {s.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {s.phone}</div>}
                    {s.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {s.email}</div>}
                    {s.address && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {s.address}</div>}
                  </div>

                  {/* Financial Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block font-bold">Total Acheté</span>
                      <strong className="text-slate-900 dark:text-white">{formatCurrency(fin.totalPurchased)}</strong>
                    </div>
                    <div className="bg-rose-50/50 dark:bg-rose-950/30 p-2 rounded-lg">
                      <span className="text-[10px] text-rose-500 block font-bold">Dette Restante</span>
                      <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(fin.totalDue)}</strong>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GESTION COMPLÈTE DES SERVICES DEMANDEURS */}
      {/* ========================================================================= */}
      {activeTab === 'departments' && (
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-600" />
                Gestion des Services Demandeurs
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Définissez les pôles, départements et services internes émetteurs de besoins d'achat et commandes.
              </p>
            </div>

            <Button
              variant="primary"
              icon={Plus}
              onClick={handleOpenCreateDepartment}
              className="text-xs font-bold"
            >
              + Nouveau Service
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex-1 relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher par nom de service, code ou responsable..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <Select
              value={deptStatusFilter}
              onChange={(e) => setDeptStatusFilter(e.target.value as any)}
              className="text-xs min-w-[150px]"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ACTIVE">🟢 Actifs uniquement</option>
              <option value="INACTIVE">⚪ Inactifs</option>
              <option value="ARCHIVED">🗃️ Archivés</option>
            </Select>
          </div>

          {/* Departments Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom du Service</TableHead>
                  <TableHead>Responsable Référent</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Commandes Associées</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map(d => {
                  const isArchived = !!d.isArchived;
                  const poStats = poCountByDepartment[d.id] || { total: 0, amount: 0 };

                  return (
                    <TableRow key={d.id} className={isArchived ? 'opacity-60 bg-slate-100/60 dark:bg-slate-900/60' : !d.isActive ? 'opacity-70 bg-slate-50' : ''}>
                      <TableCell className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                        {d.code}
                      </TableCell>
                      <TableCell>
                        <strong className="text-xs text-slate-900 dark:text-white block">
                          {d.name}
                        </strong>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                        {d.managerName || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-xs truncate" title={d.description}>
                        {d.description || '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={poStats.total > 0 ? 'primary' : 'outline'} size="sm" className="font-bold">
                          {poStats.total} BC ({formatCurrency(poStats.amount)})
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isArchived ? (
                          <Badge variant="secondary" size="sm" className="font-bold">
                            🗃️ Archivé
                          </Badge>
                        ) : (
                          <Badge variant={d.isActive ? 'success' : 'secondary'} size="sm" className="font-bold">
                            {d.isActive ? '🟢 Actif' : '⚪ Inactif'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isArchived && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                icon={Edit}
                                onClick={() => handleOpenEditDepartment(d)}
                                className="h-8 text-xs font-bold"
                              >
                                Modifier
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                icon={Power}
                                onClick={() => handleToggleDepartmentActive(d)}
                                className={`h-8 w-8 p-0 ${d.isActive ? 'text-amber-500 hover:text-amber-700' : 'text-emerald-500 hover:text-emerald-700'}`}
                                title={d.isActive ? 'Désactiver le service' : 'Réactiver le service'}
                              />

                              <Button
                                size="sm"
                                variant="ghost"
                                icon={Archive}
                                onClick={() => handleArchiveDepartment(d)}
                                className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700"
                                title="Archiver le service"
                              />
                            </>
                          )}

                          {isArchived && (
                            <Button
                              size="sm"
                              variant="outline"
                              icon={RotateCcw}
                              onClick={() => handleRestoreDepartment(d)}
                              className="h-8 text-xs text-emerald-600 font-bold"
                            >
                              Restaurer
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredDepartments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                      Aucun service demandeur trouvé.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOUVEAU BON DE COMMANDE (MULTI-ARTICLES & SERVICE DEMANDEUR) */}
      {/* ========================================================================= */}
      {isNewPOModalOpen && (
        <Modal
          isOpen={isNewPOModalOpen}
          onClose={() => setIsNewPOModalOpen(false)}
          title="Émettre un Bon de Commande Fournisseur Multi-Articles"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreatePurchaseOrder} className="space-y-4 pt-1">
            {/* Header: Supplier, Requesting Department & Order Date */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Fournisseur Référencé *
                  </label>
                  <Select
                    value={poSupplierId}
                    onChange={(e) => setPoSupplierId(e.target.value)}
                    required
                  >
                    {state.suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="font-bold text-brand-600 block mb-1">
                    Service Demandeur *
                  </label>
                  <Select
                    value={poDepartmentId}
                    onChange={(e) => setPoDepartmentId(e.target.value)}
                    required
                  >
                    {activeDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Date de Commande *
                  </label>
                  <Input
                    type="date"
                    value={poOrderDate}
                    onChange={(e) => setPoOrderDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Input
                  label="Instructions / Notes Internes (Optionnel)"
                  placeholder="ex: Livraison urgente sous 48h, commande groupée pour l'atelier..."
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Articles Selection Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-brand-500" />
                  Articles à Commander ({poLines.length})
                </h4>

                <span className="text-[11px] text-slate-500">
                  Total : <strong>{formatCurrency(poGrandTotal)}</strong>
                </span>
              </div>

              {/* Add article search bar */}
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="+ Rechercher et ajouter un article du catalogue (nom, référence, catégorie)..."
                    value={addArticleSearch}
                    onChange={(e) => {
                      setAddArticleSearch(e.target.value);
                      setIsArticleDropdownOpen(true);
                    }}
                    onFocus={() => setIsArticleDropdownOpen(true)}
                    className="pl-9 text-xs bg-brand-50/30 dark:bg-brand-950/20 border-brand-200"
                  />
                </div>

                {isArticleDropdownOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredProductsForAdd.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddProductToPOLines(p)}
                        className="w-full text-left p-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">
                              {p.code}
                            </span>
                            <strong className="text-slate-900 dark:text-white">{p.name}</strong>
                            <Badge variant="outline" size="sm" className="text-[9px] py-0">
                              {p.category}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            Stock : {p.currentStock} {p.unit}s • Base : {p.baseUnit || p.unit}
                            {p.packagings && p.packagings.length > 0 && ` • Cond. : ${p.packagings.map(pkg => `${pkg.unitName} (${pkg.factorToBase} ${p.baseUnit || p.unit}s)`).join(', ')}`}
                          </span>
                        </div>
                        <span className="text-brand-600 font-bold text-xs shrink-0 flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5" /> Ajouter
                        </span>
                      </button>
                    ))}

                    {filteredProductsForAdd.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Aucun article actif trouvé pour « {addArticleSearch} ».
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Multi-Item Lines Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/60">
                      <TableHead>Article & Référence</TableHead>
                      <TableHead className="w-24 text-center">Quantité</TableHead>
                      <TableHead className="w-36">Unité Achat</TableHead>
                      <TableHead className="w-48">Conversion & Équivalent Stock</TableHead>
                      <TableHead className="w-40 text-right">Prix Unitaire (GNF)</TableHead>
                      <TableHead className="w-32 text-right">Total Ligne</TableHead>
                      <TableHead className="w-10 text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poLines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <strong className="text-xs text-slate-900 dark:text-white block">{line.productName}</strong>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="font-mono font-semibold">{line.productCode}</span>
                            <span>• {line.category}</span>
                            <span>• Stock : {line.currentStock} {line.baseUnit}s</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={line.orderedQuantityPurchaseUnit}
                            onChange={(e) => handleUpdatePOLineQty(line.id, parseInt(e.target.value) || 1)}
                            className="text-xs font-black text-center h-9 border-brand-300 focus:border-brand-500"
                          />
                        </TableCell>

                        <TableCell>
                          <Select
                            value={line.purchaseUnitName}
                            onChange={(e) => handleUpdatePOLineUnit(line.id, e.target.value)}
                            className="text-xs font-bold h-9 bg-white dark:bg-slate-900"
                          >
                            {line.availableUnits.map((u) => (
                              <option key={u.unitName} value={u.unitName}>
                                {u.isBaseUnit ? `${u.unitName} (Base)` : `${u.unitName} (${u.factorToBase} ${line.baseUnit}s)`}
                              </option>
                            ))}
                          </Select>
                        </TableCell>

                        <TableCell className="text-xs">
                          <div className="bg-slate-50 dark:bg-slate-900/80 p-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800">
                            <div className="font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                              = {line.quantityInStockUnit.toLocaleString('fr-FR')} {line.baseUnit}{line.quantityInStockUnit > 1 && !line.baseUnit.endsWith('s') ? 's' : ''}
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {line.conversionDescription}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min="0"
                              value={line.unitPricePurchaseUnit}
                              onChange={(e) => handleUpdatePOLinePrice(line.id, parseInt(e.target.value) || 0)}
                              className="text-xs font-bold text-right h-9"
                            />
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>/{line.purchaseUnitName}</span>
                              {line.conversionFactor > 1 && (
                                <span>≈ {formatCurrency(line.unitPriceStockUnit)}/{line.baseUnit}</span>
                              )}
                            </div>
                            {!line.hasPriceConfigured && (
                              <Badge variant="warning" size="sm" className="text-[9px] py-0 px-1 font-bold block text-center">
                                ⚠️ Prix non configuré
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right font-black text-xs text-slate-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(line.totalPrice)}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Trash2}
                            onClick={() => handleRemovePOLine(line.id)}
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700"
                            title="Supprimer cette ligne"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Summary & Grand Total */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                <div>Fournisseur : <strong>{state.suppliers.find(s => s.id === poSupplierId)?.name}</strong></div>
                <div>Service demandeur : <strong>{(state.requestingDepartments || []).find(d => d.id === poDepartmentId)?.name}</strong></div>
                <div>Nombre d'articles : <strong>{poLines.length} ligne(s)</strong></div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-500 uppercase font-bold block">Montant Total Général</span>
                <strong className="text-xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(poGrandTotal)}
                </strong>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsNewPOModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" icon={CheckCircle2} className="font-bold">
                Émettre le Bon de Commande
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RÉCEPTION MULTI-ARTICLES PAR LIGNE */}
      {/* ========================================================================= */}
      {poForReception && (
        <Modal
          isOpen={!!poForReception}
          onClose={() => setPoForReception(null)}
          title={`Réception de Marchandises — ${poForReception.poNumber}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleExecuteMultiReception} className="space-y-4 pt-1">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 text-xs flex justify-between items-center">
              <div>
                <span className="text-emerald-800 dark:text-emerald-300 block">
                  Fournisseur : <strong>{poForReception.supplierName}</strong>
                </span>
                <span className="text-emerald-800 dark:text-emerald-300 block">
                  Service demandeur : <strong>{poForReception.departmentName || 'Administration Générale'}</strong>
                </span>
              </div>
              <Badge variant="outline" size="sm" className="font-mono font-bold">
                {poForReception.poNumber}
              </Badge>
            </div>

            {/* Reception Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead className="text-center">Commandé</TableHead>
                    <TableHead className="text-center">Déjà Reçu</TableHead>
                    <TableHead className="w-36 text-center">Reçu Aujourd'hui</TableHead>
                    <TableHead className="text-right">Impact Stock Direct</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poForReception.items.map(it => {
                    const remaining = it.orderedQuantityPurchaseUnit - (it.receivedQuantityPurchaseUnit || 0);
                    const qtyToday = receptionQuantities[it.productId] || 0;
                    const factor = it.conversionFactor || 1;
                    const stockUnits = qtyToday * factor;
                    const baseUnitName = it.stockUnitName || it.baseUnit || 'unité';

                    return (
                      <TableRow key={it.productId}>
                        <TableCell>
                          <strong className="text-xs text-slate-900 dark:text-white block">{it.productName}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">Réf: {it.productCode || '-'}</span>
                          <span className="text-[10px] text-slate-500 block">1 {it.purchaseUnitName} = {factor} {baseUnitName}s</span>
                        </TableCell>

                        <TableCell className="text-center text-xs font-bold">
                          <div>{it.orderedQuantityPurchaseUnit} {it.purchaseUnitName}(s)</div>
                          <span className="text-[10px] text-slate-400 font-normal">(= {it.quantityInStockUnit} {baseUnitName}s)</span>
                        </TableCell>

                        <TableCell className="text-center text-xs font-semibold text-slate-500">
                          <div>{it.receivedQuantityPurchaseUnit || 0} {it.purchaseUnitName}(s)</div>
                          <span className="text-[10px] text-slate-400 font-normal">(= {(it.receivedQuantityPurchaseUnit || 0) * factor} {baseUnitName}s)</span>
                        </TableCell>

                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={remaining}
                            value={qtyToday}
                            onChange={(e) => {
                              const val = Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0));
                              setReceptionQuantities({ ...receptionQuantities, [it.productId]: val });
                            }}
                            className="text-xs font-black text-center text-emerald-600 h-9 border-emerald-300"
                          />
                          <span className="text-[10px] text-slate-400 text-center block mt-0.5">
                            Reste : {remaining - qtyToday} {it.purchaseUnitName}(s)
                          </span>
                        </TableCell>

                        <TableCell className="text-right text-xs font-black text-emerald-600 whitespace-nowrap">
                          +{stockUnits.toLocaleString('fr-FR')} {baseUnitName}{stockUnits > 1 && !baseUnitName.endsWith('s') ? 's' : ''}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Notes de Réception (Bordereau de livraison, conformité...)
              </label>
              <Input
                type="text"
                value={receptionNotes}
                onChange={(e) => setReceptionNotes(e.target.value)}
                placeholder="ex: Reçu en bon état par M. Bah avec BL N° 9944..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setPoForReception(null)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                Valider la Réception en Stock
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DÉTAIL D'UN BON DE COMMANDE (PO DETAIL VIEW) */}
      {/* ========================================================================= */}
      {poForDetail && (
        <Modal
          isOpen={!!poForDetail}
          onClose={() => setPoForDetail(null)}
          title={`Bon de Commande — ${poForDetail.poNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 pt-1">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start gap-3">
              <div>
                <span className="font-mono text-[10px] text-brand-600 font-bold block">{poForDetail.poNumber}</span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                  Fournisseur : {poForDetail.supplierName}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>Service demandeur : <strong>{poForDetail.departmentName || 'Administration Générale'}</strong></span>
                  <span>• Date : {formatDate(poForDetail.orderDate)}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <Badge
                  variant={poForDetail.status === 'RECEIVED' ? 'success' : poForDetail.status === 'PARTIALLY_RECEIVED' ? 'warning' : 'outline'}
                  size="sm"
                  className="font-bold"
                >
                  {poForDetail.status === 'RECEIVED' ? '🟢 Réceptionné' : poForDetail.status === 'PARTIALLY_RECEIVED' ? '🟠 Partiellement Reçu' : '🟡 Commandé'}
                </Badge>
                {poForDetail.paymentStatus === 'PAID' ? (
                  <Badge variant="success" size="sm" className="font-bold text-[10px]">🟢 Paiement Soldé</Badge>
                ) : poForDetail.paymentStatus === 'PARTIALLY_PAID' ? (
                  <Badge variant="warning" size="sm" className="font-bold text-[10px]">🟠 Paiement Partiel</Badge>
                ) : (
                  <Badge variant="danger" size="sm" className="font-bold text-[10px]">🔴 Non Payé</Badge>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article & Référence</TableHead>
                    <TableHead className="text-center">Quantité</TableHead>
                    <TableHead>Conversion & Stock</TableHead>
                    <TableHead className="text-right">Prix Unitaire</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poForDetail.items.map((it, idx) => {
                    const baseUnitName = it.stockUnitName || it.baseUnit || 'unité';
                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          <strong className="text-xs text-slate-900 dark:text-white block">{it.productName}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">Réf: {it.productCode || '-'}</span>
                        </TableCell>
                        <TableCell className="text-center text-xs font-bold">
                          <div>{it.orderedQuantityPurchaseUnit} {it.purchaseUnitName}(s)</div>
                          {it.receivedQuantityPurchaseUnit !== undefined && it.receivedQuantityPurchaseUnit > 0 && (
                            <span className="text-[10px] text-emerald-600 block font-semibold">
                              Reçu : {it.receivedQuantityPurchaseUnit} {it.purchaseUnitName}(s)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                          <div className="font-semibold text-brand-600">
                            = {it.quantityInStockUnit.toLocaleString('fr-FR')} {baseUnitName}{it.quantityInStockUnit > 1 && !baseUnitName.endsWith('s') ? 's' : ''}
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            1 {it.purchaseUnitName} = {it.conversionFactor} {baseUnitName}s
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          <div>{formatCurrency(it.unitPricePurchaseUnit)}</div>
                          <span className="text-[10px] text-slate-400">/{it.purchaseUnitName}</span>
                        </TableCell>
                        <TableCell className="text-right text-xs font-black text-slate-900 dark:text-white">
                          {formatCurrency(it.totalPrice)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Financial Totals Breakdown */}
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Montant Total</span>
                <strong className="text-sm font-black text-slate-900 dark:text-white">
                  {formatCurrency(poForDetail.totalAmount)}
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-emerald-600 block">Déjà Réglé</span>
                <strong className="text-sm font-black text-emerald-600">
                  {formatCurrency(poForDetail.paidAmount || 0)}
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-rose-500 block">Reste Dû</span>
                <strong className="text-sm font-black text-rose-600 dark:text-rose-400">
                  {formatCurrency(poForDetail.dueAmount !== undefined ? poForDetail.dueAmount : Math.max(0, (poForDetail.totalAmount || 0) - (poForDetail.paidAmount || 0)))}
                </strong>
              </div>
            </div>

            {/* Payment Transactions History */}
            {agencySupplierPayments.filter(p => p.purchaseOrderId === poForDetail.id).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                  Historique des Règlements Fournisseur
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & N°</TableHead>
                        <TableHead>Compte Débité</TableHead>
                        <TableHead>Réf / Notes</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agencySupplierPayments.filter(p => p.purchaseOrderId === poForDetail.id).map(pay => (
                        <TableRow key={pay.id}>
                          <TableCell className="text-xs font-mono">
                            <div>{formatDate(pay.paymentDate)}</div>
                            <span className="text-[10px] text-slate-400">{pay.paymentNumber}</span>
                          </TableCell>
                          <TableCell className="text-xs font-semibold">
                            {pay.financialAccountName}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {pay.reference || pay.notes || '-'}
                          </TableCell>
                          <TableCell className="text-right text-xs font-black text-emerald-600">
                            {formatCurrency(pay.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {(poForDetail.dueAmount === undefined || poForDetail.dueAmount > 0) && (
                <Button
                  variant="primary"
                  icon={CreditCard}
                  onClick={() => {
                    const po = poForDetail;
                    setPoForDetail(null);
                    handleOpenPOPayment(po);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs"
                >
                  Enregistrer un Règlement ({formatCurrency(poForDetail.dueAmount !== undefined ? poForDetail.dueAmount : Math.max(0, (poForDetail.totalAmount || 0) - (poForDetail.paidAmount || 0)))})
                </Button>
              )}
              <div className="ml-auto">
                <Button variant="outline" onClick={() => setPoForDetail(null)}>
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PAIEMENT FOURNISSEUR & RÈGLEMENT DE DETTE */}
      {/* ========================================================================= */}
      {(poForPayment || debtForPayment) && (
        <Modal
          isOpen={!!(poForPayment || debtForPayment)}
          onClose={() => {
            setPoForPayment(null);
            setDebtForPayment(null);
          }}
          title={`Règlement Fournisseur — ${debtForPayment ? debtForPayment.debtNumber : poForPayment?.poNumber}`}
          maxWidth="md"
        >
          <form onSubmit={handleExecuteSupplierPayment} className="space-y-4 pt-1">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-emerald-800 dark:text-emerald-300 font-bold">
                  Fournisseur : {debtForPayment ? debtForPayment.supplierName : poForPayment?.supplierName}
                </span>
                <Badge variant="outline" size="sm" className="font-mono font-bold">
                  {debtForPayment ? debtForPayment.debtNumber : poForPayment?.poNumber}
                </Badge>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-emerald-200 dark:border-emerald-800 text-[11px]">
                <span className="text-slate-500">Reste à payer :</span>
                <strong className="text-rose-600 dark:text-rose-400 font-black">
                  {formatCurrency(debtForPayment ? debtForPayment.remainingAmount : (poForPayment?.dueAmount !== undefined ? poForPayment.dueAmount : Math.max(0, (poForPayment?.totalAmount || 0) - (poForPayment?.paidAmount || 0))))}
                </strong>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Compte Financier Débiteur (Source du Paiement) *
              </label>
              <Select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
                required
                className="font-bold text-xs"
              >
                {agencyFinancialAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.type === 'BANK' ? '🏦' : acc.type === 'MOBILE_MONEY' ? '📱' : '💵'} {acc.name} — Solde : {formatCurrency(acc.currentBalance)}
                  </option>
                ))}
              </Select>
              {agencyFinancialAccounts.length === 0 && (
                <p className="text-[11px] text-rose-500 mt-1 font-semibold">
                  ⚠️ Aucun compte financier actif trouvé pour cette agence.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Montant à Régler (GNF) *
              </label>
              <Input
                type="number"
                min="1"
                max={debtForPayment ? debtForPayment.remainingAmount : (poForPayment?.dueAmount !== undefined ? poForPayment.dueAmount : Math.max(0, (poForPayment?.totalAmount || 0) - (poForPayment?.paidAmount || 0)))}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
                required
                className="text-sm font-black text-emerald-600"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Vous pouvez saisir un montant partiel si le paiement est échelonné.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  N° Pièce / Référence
                </label>
                <Input
                  type="text"
                  placeholder="ex: Chèque N° 4022, Virement 88..."
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Observations / Motif
                </label>
                <Input
                  type="text"
                  placeholder="ex: Acompte 50%..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPoForPayment(null);
                  setDebtForPayment(null);
                }}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={CreditCard}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold"
              >
                Valider le Règlement
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOUVEAU SERVICE DEMANDEUR */}
      {/* ========================================================================= */}
      {isNewDeptModalOpen && (
        <Modal
          isOpen={isNewDeptModalOpen}
          onClose={() => setIsNewDeptModalOpen(false)}
          title="Création d'un Nouveau Service Demandeur"
          maxWidth="md"
        >
          <form onSubmit={handleCreateDepartment} className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Nom du Service *
              </label>
              <Input
                type="text"
                placeholder="ex: Direction Générale, Service Informatique, Magasin..."
                value={deptName}
                onChange={(e) => {
                  setDeptName(e.target.value);
                  if (!deptCode) {
                    setDeptCode(e.target.value.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  }
                }}
                required
                className="font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Code Service *
                </label>
                <Input
                  type="text"
                  placeholder="ex: SI, ADM, ATELIER"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  required
                  className="font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Responsable Référent
                </label>
                <Input
                  type="text"
                  placeholder="ex: M. Ousmane Bah"
                  value={deptManagerName}
                  onChange={(e) => setDeptManagerName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Description / Rôle du Service
              </label>
              <Input
                type="text"
                placeholder="ex: Gestion des systèmes informatiques et commandes d'équipements..."
                value={deptDescription}
                onChange={(e) => setDeptDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Statut
              </label>
              <Select
                value={deptIsActive ? 'ACTIVE' : 'INACTIVE'}
                onChange={(e) => setDeptIsActive(e.target.value === 'ACTIVE')}
              >
                <option value="ACTIVE">🟢 Actif (Disponible pour les bons de commande)</option>
                <option value="INACTIVE">⚪ Inactif</option>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" type="button" onClick={() => setIsNewDeptModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" icon={CheckCircle2} type="submit" className="font-bold">
                Créer le Service
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MODIFIER UN SERVICE DEMANDEUR */}
      {/* ========================================================================= */}
      {deptToEdit && (
        <Modal
          isOpen={!!deptToEdit}
          onClose={() => setDeptToEdit(null)}
          title={`Modifier le Service — ${deptToEdit.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEditDepartment} className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Nom du Service *
              </label>
              <Input
                type="text"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                required
                className="font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Code Service *
                </label>
                <Input
                  type="text"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  required
                  className="font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Responsable Référent
                </label>
                <Input
                  type="text"
                  value={deptManagerName}
                  onChange={(e) => setDeptManagerName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Description
              </label>
              <Input
                type="text"
                value={deptDescription}
                onChange={(e) => setDeptDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Statut
              </label>
              <Select
                value={deptIsActive ? 'ACTIVE' : 'INACTIVE'}
                onChange={(e) => setDeptIsActive(e.target.value === 'ACTIVE')}
              >
                <option value="ACTIVE">🟢 Actif</option>
                <option value="INACTIVE">⚪ Inactif</option>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" type="button" onClick={() => setDeptToEdit(null)}>
                Annuler
              </Button>
              <Button variant="primary" icon={CheckCircle2} type="submit" className="font-bold">
                Enregistrer les Modifications
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOUVEAU FOURNISSEUR */}
      {/* ========================================================================= */}
      {isNewSupplierModalOpen && (
        <Modal
          isOpen={isNewSupplierModalOpen}
          onClose={() => setIsNewSupplierModalOpen(false)}
          title="Créer un Fournisseur Partenaire"
        >
          <form onSubmit={handleCreateSupplier} className="space-y-4 pt-1">
            <Input
              label="Raison sociale / Nom de l'entreprise *"
              placeholder="ex: Papeterie Centrale de Guinée"
              value={supName}
              onChange={(e) => setSupName(e.target.value)}
              required
            />
            <Input
              label="Société / Enseigne"
              placeholder="ex: Papeterie Centrale SARL"
              value={supCompany}
              onChange={(e) => setSupCompany(e.target.value)}
            />
            <Input
              label="Personne de contact référente"
              placeholder="ex: M. Thierno Diallo"
              value={supContactPerson}
              onChange={(e) => setSupContactPerson(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <PhoneInput
                label="Téléphone"
                placeholder="+224 ..."
                value={supPhone}
                onChange={(e) => setSupPhone(e.target.value)}
              />
              <Input
                label="Email commercial"
                type="email"
                placeholder="contact@..."
                value={supEmail}
                onChange={(e) => setSupEmail(e.target.value)}
              />
            </div>
            <Input
              label="Adresse de l'entrepôt / Magasin"
              placeholder="ex: Marché Madina, Conakry"
              value={supAddress}
              onChange={(e) => setSupAddress(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsNewSupplierModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" className="font-bold">
                Enregistrer le Fournisseur
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RETOUR FOURNISSEUR */}
      {/* ========================================================================= */}
      {poForReturn && (
        <Modal
          isOpen={!!poForReturn}
          onClose={() => setPoForReturn(null)}
          title={`Retour Fournisseur — ${poForReturn.poNumber}`}
          maxWidth="md"
        >
          <form onSubmit={handleExecuteSupplierReturn} className="space-y-4 pt-1">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <strong>Fournisseur : {poForReturn.supplierName}</strong>
              <p>Service demandeur : {poForReturn.departmentName || 'Administration Générale'}</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Article à retourner *
              </label>
              <Select
                value={returnProductId}
                onChange={(e) => setReturnProductId(e.target.value)}
              >
                {poForReturn.items.map(it => (
                  <option key={it.productId} value={it.productId}>
                    {it.productName} ({it.orderedQuantityPurchaseUnit} {it.purchaseUnitName || 'Carton'}s)
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Quantité à retourner (Conditionnement d'achat) *
              </label>
              <Input
                type="number"
                min={1}
                value={returnQty}
                onChange={(e) => setReturnQty(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Motif du retour au fournisseur *
              </label>
              <Input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="ex: Erreur de grammage, marchandise mouillée à la livraison..."
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setPoForReturn(null)}>
                Annuler
              </Button>
              <Button variant="danger" type="submit" className="font-bold">
                Confirmer le Retour Fournisseur
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
