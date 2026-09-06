import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { dbStore, INITIAL_STATE } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Service, ServicePricingRule, ServicePriceHistory, DiscountAudit, DiscountRoleLimit, RoleCode, ConsumableMode, ServiceConsumableConfig, Product } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  Tag, Plus, Edit, Trash2, Search, Eye, History,
  TrendingDown, CheckCircle2, AlertCircle, ArrowUpDown,
  FileText, Layers, Percent, Power, Sparkles, Filter, Info,
  Sliders, ShieldCheck, BarChart3, Calculator, UserCheck, AlertTriangle, RefreshCw,
  Boxes, Package, Check, X, BoxSelect
} from 'lucide-react';

const COMMON_UNITS = [
  { value: 'page', label: '📄 Page (ex: Photocopie, Impression, Scan)' },
  { value: 'document', label: '📑 Document (ex: Reliure, Plastification)' },
  { value: 'feuille', label: '📃 Feuille (ex: Tirage bristol, cartonné)' },
  { value: 'exemplaire', label: '📚 Exemplaire (ex: Brochure, Rapport)' },
  { value: 'piece', label: '📦 Pièce / Unité (ex: Clé USB, Badge)' },
  { value: 'planche', label: '🖼️ Planche (ex: Photo d\'identité)' },
  { value: 'heure', label: '⏱️ Heure (ex: Location poste PC)' },
  { value: 'seance', label: '🎓 Séance / Atelier' },
  { value: 'forfait', label: '💼 Forfait / Pack global' },
];

export const ServicesPricingView: React.FC = () => {
  const { currentTenant, currentUser, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const state = dbStore.getState();

  const [activeTab, setActiveTab] = useState<'services' | 'history' | 'discounts' | 'stats' | 'limits'>('services');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
  const [serviceForTiers, setServiceForTiers] = useState<Service | null>(null);
  const [serviceForHistory, setServiceForHistory] = useState<Service | null>(null);
  const [serviceForConsumables, setServiceForConsumables] = useState<Service | null>(null);

  // Form State: Consumables Config
  const [consumableMode, setConsumableMode] = useState<ConsumableMode>('INTERNAL_VARIABLE');
  const [isClientSupportAllowed, setIsClientSupportAllowed] = useState(true);
  const [consumablesList, setConsumablesList] = useState<ServiceConsumableConfig[]>([]);

  // Form State: Add Service
  const [addName, setAddName] = useState('');
  const [addCategoryId, setAddCategoryId] = useState(state.serviceCategories[0]?.id || 'sc-01');
  const [addUnit, setAddUnit] = useState('page');
  const [addPrice, setAddPrice] = useState(500);
  const [addCost, setAddCost] = useState(150);
  const [addDescription, setAddDescription] = useState('');
  const [addIsActive, setAddIsActive] = useState(true);

  // Form State: Edit Service
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editUnit, setEditUnit] = useState('page');
  const [editPrice, setEditPrice] = useState(0);
  const [editCost, setEditCost] = useState(0);
  const [editDescription, setEditDescription] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPriceChangeReason, setEditPriceChangeReason] = useState('');

  // Form State: Add Tier Rule
  const [tierMinQty, setTierMinQty] = useState(100);
  const [tierMaxQty, setTierMaxQty] = useState<number | ''>('');
  const [tierUnitPrice, setTierUnitPrice] = useState(250);
  const [tierCustomerType, setTierCustomerType] = useState<'ALL' | 'STUDENT' | 'COMPANY' | 'VIP'>('ALL');

  // Role limits state from tenant
  const roleLimits: DiscountRoleLimit[] = currentTenant?.settings?.discountRoleLimits || [
    { roleCode: 'OPERATEUR', roleName: 'Opérateur de Production', maxDiscountPercent: 0, canGrantExceptional: false, requiresApprovalAbove: 0 },
    { roleCode: 'CAISSIER', roleName: 'Caissier & Accueil', maxDiscountPercent: 10, canGrantExceptional: true, requiresApprovalAbove: 10 },
    { roleCode: 'RESPONSABLE_FORMATION', roleName: 'Responsable Formation', maxDiscountPercent: 15, canGrantExceptional: true, requiresApprovalAbove: 15 },
    { roleCode: 'ADMIN_CENTRE', roleName: 'Admin du Centre', maxDiscountPercent: 50, canGrantExceptional: true, requiresApprovalAbove: 50 },
    { roleCode: 'SUPER_ADMIN', roleName: 'Super Administrateur', maxDiscountPercent: 100, canGrantExceptional: true, requiresApprovalAbove: 100 },
  ];

  // Categories Lookup
  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    state.serviceCategories.forEach(c => map.set(c.id, c.name));
    return map;
  }, [state.serviceCategories]);

  // Filtered Services List
  const filteredServices = useMemo(() => {
    return state.services.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code.toLowerCase().includes(search.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(search.toLowerCase())) ||
        (s.categoryName && s.categoryName.toLowerCase().includes(search.toLowerCase()));

      const matchesCat = categoryFilter === 'ALL' || s.categoryId === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? s.isActive : !s.isActive);

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [state.services, search, categoryFilter, statusFilter]);

  // Overall Financial Statistics on Discounts
  const discountStats = useMemo(() => {
    const audits = state.discountAudits || [];
    const totalDiscountAmount = audits.reduce((sum, d) => sum + d.discountAmount, 0);
    const totalGross = audits.reduce((sum, d) => sum + d.grossTotal, 0);
    const totalNet = totalGross - totalDiscountAmount;
    const avgDiscountPercent = audits.length > 0 ? (totalDiscountAmount / (totalGross || 1)) * 100 : 0;

    // Breakdown by discount type
    const tierCount = audits.filter(d => d.discountType === 'TIER').length;
    const exceptionalCount = audits.filter(d => d.discountType === 'EXCEPTIONAL').length;

    return {
      totalDiscountAmount,
      totalGross,
      totalNet,
      avgDiscountPercent: Number(avgDiscountPercent.toFixed(1)),
      count: audits.length,
      tierCount,
      exceptionalCount
    };
  }, [state.discountAudits]);

  // Open Create Modal
  const handleOpenAddModal = () => {
    setAddName('');
    setAddCategoryId(state.serviceCategories[0]?.id || 'sc-01');
    setAddUnit('page');
    setAddPrice(500);
    setAddCost(150);
    setAddDescription('');
    setAddIsActive(true);
    setIsAddModalOpen(true);
  };

  // Submit Create Service
  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      showToast('Erreur', 'Veuillez saisir le nom de la prestation.', 'DANGER');
      return;
    }

    const categoryObj = state.serviceCategories.find(c => c.id === addCategoryId);
    const code = addName.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 20);
    const newId = `srv-${Date.now()}`;

    const newService: Service = {
      id: newId,
      tenantId: currentTenant?.id || 't-001',
      categoryId: addCategoryId,
      categoryName: categoryObj?.name || 'Services Généraux',
      code: `SRV-${code}`,
      name: addName.trim(),
      description: addDescription.trim() || undefined,
      unit: addUnit,
      baseCost: addCost || 0,
      basePrice: addPrice,
      requiresFile: false,
      estimatedDurationMinutes: 5,
      isActive: addIsActive,
      pricingRules: []
    };

    dbStore.updateState(draft => {
      draft.services.unshift(newService);
    });

    dbStore.logAudit('SERVICE_CREATED', 'SERVICE', newId, null, {
      name: addName,
      unit: addUnit,
      basePrice: addPrice,
      category: categoryObj?.name
    });

    showToast('Prestation Créée', `Le service "${addName}" au tarif standard de ${formatCurrency(addPrice)}/${addUnit} a été ajouté.`, 'SUCCESS');
    setIsAddModalOpen(false);
  };

  // Open Edit Modal
  const handleOpenEditModal = (service: Service) => {
    setServiceToEdit(service);
    setEditName(service.name);
    setEditCategoryId(service.categoryId);
    setEditUnit(service.unit);
    setEditPrice(service.basePrice);
    setEditCost(service.baseCost || 0);
    setEditDescription(service.description || '');
    setEditIsActive(service.isActive);
    setEditPriceChangeReason('');
  };

  // Submit Edit Service & Pricing
  const handleSaveEditService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceToEdit) return;

    const oldPrice = serviceToEdit.basePrice;
    const isPriceChanged = oldPrice !== editPrice;
    const categoryObj = state.serviceCategories.find(c => c.id === editCategoryId);

    dbStore.updateState(draft => {
      const srv = draft.services.find(s => s.id === serviceToEdit.id);
      if (srv) {
        srv.name = editName.trim();
        srv.categoryId = editCategoryId;
        srv.categoryName = categoryObj?.name || srv.categoryName;
        srv.unit = editUnit;
        srv.basePrice = editPrice;
        srv.baseCost = editCost;
        srv.description = editDescription.trim() || undefined;
        srv.isActive = editIsActive;

        // If price changed, record in priceHistories
        if (isPriceChanged) {
          if (!draft.priceHistories) draft.priceHistories = [];
          const historyEntry: ServicePriceHistory = {
            id: `ph-${Date.now()}`,
            tenantId: currentTenant?.id || 't-001',
            serviceId: serviceToEdit.id,
            serviceName: editName.trim(),
            oldPrice: oldPrice,
            newPrice: editPrice,
            changedBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Administrateur',
            changeDate: new Date().toISOString(),
            reason: editPriceChangeReason.trim() || 'Ajustement tarifaire administrateur',
            createdAt: new Date().toISOString()
          };
          draft.priceHistories.unshift(historyEntry);
        }
      }
    });

    if (isPriceChanged) {
      dbStore.logAudit('SERVICE_PRICE_UPDATED', 'SERVICE', serviceToEdit.id, { price: oldPrice }, {
        price: editPrice,
        reason: editPriceChangeReason || 'Ajustement tarifaire'
      });
      showToast('Tarif Mis à Jour', `Le tarif standard de "${editName}" est passé de ${formatCurrency(oldPrice)} à ${formatCurrency(editPrice)}/${editUnit}. Les anciennes commandes conservent leur prix d'origine.`, 'SUCCESS');
    } else {
      dbStore.logAudit('SERVICE_UPDATED', 'SERVICE', serviceToEdit.id, null, { name: editName });
      showToast('Prestation Modifiée', `Les modifications de la prestation "${editName}" ont été enregistrées.`, 'SUCCESS');
    }

    setServiceToEdit(null);
  };

  // Toggle Active/Inactive
  const handleToggleStatus = (service: Service) => {
    const nextStatus = !service.isActive;
    dbStore.updateState(draft => {
      const srv = draft.services.find(s => s.id === service.id);
      if (srv) {
        srv.isActive = nextStatus;
      }
    });

    dbStore.logAudit(nextStatus ? 'SERVICE_ACTIVATED' : 'SERVICE_DEACTIVATED', 'SERVICE', service.id, null, { name: service.name });
    showToast(
      nextStatus ? 'Prestation Activée' : 'Prestation Désactivée',
      nextStatus
        ? `Le service "${service.name}" est disponible pour les nouvelles commandes.`
        : `Le service "${service.name}" a été désactivé (conservé dans l'historique des anciennes commandes).`,
      nextStatus ? 'SUCCESS' : 'WARNING'
    );
  };

  // Delete Service (Only if no orders linked)
  const handleDeleteService = (service: Service) => {
    const hasLinkedOrders = state.orders.some(o => o.items.some(i => i.serviceId === service.id));
    if (hasLinkedOrders) {
      showToast(
        'Suppression Impossible',
        `Ce service est présent dans l'historique des commandes. Désactivez-le plutôt pour le retirer des futures ventes.`,
        'WARNING'
      );
      return;
    }

    if (confirm(`Confirmez-vous la suppression définitive du service "${service.name}" ?`)) {
      dbStore.updateState(draft => {
        draft.services = draft.services.filter(s => s.id !== service.id);
      });
      dbStore.logAudit('SERVICE_DELETED', 'SERVICE', service.id, null, { name: service.name });
      showToast('Service Supprimé', `Le service "${service.name}" a été supprimé.`, 'SUCCESS');
    }
  };

  // Open Consumables Modal
  const handleOpenConsumablesModal = (service: Service) => {
    setServiceForConsumables(service);
    setConsumableMode(service.consumableMode || (service.consumptions && service.consumptions.length > 0 ? 'INTERNAL_VARIABLE' : 'NONE'));
    setIsClientSupportAllowed(service.isClientSupportAllowed ?? true);
    if (service.consumables && service.consumables.length > 0) {
      setConsumablesList([...service.consumables]);
    } else if (service.consumptions && service.consumptions.length > 0) {
      setConsumablesList(service.consumptions.map(c => {
        const prod = state.products.find(p => p.id === c.productId);
        return {
          productId: c.productId,
          productName: prod?.name || 'Consommable',
          quantityPerUnit: c.quantity,
          unit: prod?.unit || 'unité',
          isClientSupplied: false,
          isOptional: false
        };
      }));
    } else {
      setConsumablesList([]);
    }
  };

  const handleAddConsumableRow = () => {
    const availableProds = state.products.filter(p => (currentTenant?.id === 'global' || p.tenantId === currentTenant?.id) && !p.isArchived);
    const firstProd = availableProds[0];
    if (!firstProd) {
      showToast('Stock Vide', 'Veuillez d\'abord enregistrer des articles de stock dans votre agence.', 'WARNING');
      return;
    }
    setConsumablesList(prev => [
      ...prev,
      {
        productId: firstProd.id,
        productName: firstProd.name,
        quantityPerUnit: 1,
        unit: firstProd.unit || 'unité',
        isClientSupplied: false,
        isOptional: false
      }
    ]);
  };

  const handleUpdateConsumableRow = (index: number, field: keyof ServiceConsumableConfig, value: any) => {
    setConsumablesList(prev => {
      const updated = [...prev];
      if (field === 'productId') {
        const prod = state.products.find(p => p.id === value);
        updated[index] = {
          ...updated[index],
          productId: value,
          productName: prod?.name || updated[index].productName,
          unit: prod?.unit || updated[index].unit
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const handleRemoveConsumableRow = (index: number) => {
    setConsumablesList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveConsumables = () => {
    if (!serviceForConsumables) return;
    const res = dbStore.updateServiceConsumables(
      serviceForConsumables.id,
      consumableMode,
      consumablesList,
      isClientSupportAllowed,
      currentTenant?.id || 'global'
    );
    if (res.success) {
      showToast('Consommables Enregistrés', res.message, 'SUCCESS');
      setServiceForConsumables(null);
    } else {
      showToast('Erreur', res.message, 'DANGER');
    }
  };

  // Add Tier Rule to Service
  const handleAddTierRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForTiers) return;

    if (tierMinQty <= 0 || tierUnitPrice <= 0) {
      showToast('Erreur', 'Veuillez saisir une quantité minimale et un tarif valides.', 'DANGER');
      return;
    }

    const newRule: ServicePricingRule = {
      id: `pr-${Date.now()}`,
      serviceId: serviceForTiers.id,
      minQuantity: tierMinQty,
      maxQuantity: tierMaxQty === '' ? undefined : Number(tierMaxQty),
      unitPrice: tierUnitPrice,
      customerType: tierCustomerType
    };

    dbStore.updateState(draft => {
      const srv = draft.services.find(s => s.id === serviceForTiers.id);
      if (srv) {
        if (!srv.pricingRules) srv.pricingRules = [];
        srv.pricingRules.push(newRule);
        srv.pricingRules.sort((a, b) => a.minQuantity - b.minQuantity);
      }
    });

    dbStore.logAudit('PRICING_RULE_ADDED', 'SERVICE', serviceForTiers.id, null, newRule);
    showToast('Palier Dégressif Ajouté', `Tranche ${tierMinQty}${tierMaxQty ? '-' + tierMaxQty : '+'} à ${formatCurrency(tierUnitPrice)}/${serviceForTiers.unit} ajoutée.`, 'SUCCESS');

    const updatedSrv = dbStore.getState().services.find(s => s.id === serviceForTiers.id);
    if (updatedSrv) setServiceForTiers(updatedSrv);

    setTierMinQty(tierMaxQty !== '' ? Number(tierMaxQty) + 1 : tierMinQty + 50);
    setTierMaxQty('');
    setTierUnitPrice(Math.max(100, tierUnitPrice - 50));
  };

  // Delete Tier Rule
  const handleDeleteTierRule = (ruleId: string) => {
    if (!serviceForTiers) return;

    dbStore.updateState(draft => {
      const srv = draft.services.find(s => s.id === serviceForTiers.id);
      if (srv && srv.pricingRules) {
        srv.pricingRules = srv.pricingRules.filter(r => r.id !== ruleId);
      }
    });

    const updatedSrv = dbStore.getState().services.find(s => s.id === serviceForTiers.id);
    if (updatedSrv) setServiceForTiers(updatedSrv);
    showToast('Palier Supprimé', 'La tranche de tarification dégressive a été retirée.', 'INFO');
  };

  // Update Role Limits
  const handleUpdateRoleLimit = (roleCode: RoleCode, maxPercent: number, canGrant: boolean) => {
    dbStore.updateState(draft => {
      const tenant = draft.tenants.find(t => t.id === currentTenant?.id);
      if (tenant) {
        if (!tenant.settings.discountRoleLimits) {
          tenant.settings.discountRoleLimits = [...roleLimits];
        }
        const lim = (tenant.settings.discountRoleLimits as DiscountRoleLimit[]).find((l: DiscountRoleLimit) => l.roleCode === roleCode);
        if (lim) {
          lim.maxDiscountPercent = maxPercent;
          lim.canGrantExceptional = canGrant;
        }
      }
    });

    showToast('Seuil Mis à Jour', `Limite pour le poste ${roleCode} fixée à ${maxPercent}%.`, 'SUCCESS');
  };

  // Reset Services & Pricing Catalog
  const handleResetCatalog = () => {
    if (confirm("Attention : Voulez-vous réinitialiser le catalogue des prestations, la grille tarifaire de base, et remettre à zéro l'historique des modifications de prix et le journal des remises ?")) {
      dbStore.updateState(draft => {
        draft.services = JSON.parse(JSON.stringify(INITIAL_STATE.services));
        draft.serviceCategories = JSON.parse(JSON.stringify(INITIAL_STATE.serviceCategories));
        draft.discountAudits = [];
        draft.priceHistories = [];
      });

      dbStore.logAudit('SERVICES_AND_PRICING_RESET', 'SYSTEM', undefined, null, {
        performedBy: currentUser?.username
      });

      showToast(
        'Services & Tarifs Réinitialisés',
        'Le catalogue des prestations, la grille tarifaire et les historiques de remises ont été réinitialisés avec succès.',
        'SUCCESS'
      );
    }
  };

  const canManagePricing = hasPermission('pricing.update') || hasPermission('*') || currentUser?.roles[0]?.code === 'ADMIN_CENTRE' || currentUser?.roles[0]?.code === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-brand-500" />
            {canManagePricing ? "Services, Tarifs & Système de Remises" : "Catalogue des Prestations & Grille Tarifaire"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {canManagePricing
              ? "Tarifs standards de référence, paliers dégressifs automatiques, remises exceptionnelles et plafonds d'autorisation par poste."
              : "Consultation des tarifs standards et paliers dégressifs applicables aux commandes des clients."}
          </p>
        </div>

        {canManagePricing && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={handleResetCatalog}
              title="Réinitialiser le catalogue et remettre à zéro les remises"
              className="text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Réinitialiser Tarifs & Remises
            </Button>
            <Button variant="primary" icon={Plus} onClick={handleOpenAddModal} className="font-bold">
              Ajouter un Service
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 border-l-4 border-l-brand-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Catalogue</span>
            <Layers className="w-4 h-4 text-brand-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {state.services.length} services
          </h3>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">{state.services.filter(s => s.isActive).length} actifs</p>
        </Card>

        <Card className="p-3 sm:p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Paliers Volume</span>
            <TrendingDown className="w-4 h-4 text-purple-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-purple-600 mt-1">
            {state.services.filter(s => s.pricingRules && s.pricingRules.length > 0).length} configurés
          </h3>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Remises automatiques</p>
        </Card>

        <Card className="p-3 sm:p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Remises Totales</span>
            <Percent className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-lg sm:text-2xl font-extrabold text-emerald-600 mt-1">
            {formatCurrency(discountStats.totalDiscountAmount)}
          </h3>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">{discountStats.count} remises accordées</p>
        </Card>

        <Card className="p-3 sm:p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Taux Moyen</span>
            <Calculator className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1">
            {discountStats.avgDiscountPercent}%
          </h3>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Sur volume de vente</p>
        </Card>
      </div>

      {/* Navigation Tabs (Only for Admin with pricing management rights) */}
      {canManagePricing && (
        <Tabs
          tabs={[
            { id: 'services', label: 'Grille des Services & Tarifs', icon: Tag, count: state.services.length },
            { id: 'history', label: 'Historique des Tarifs', icon: History, count: (state.priceHistories || []).length },
            { id: 'discounts', label: 'Journal des Remises Accordées', icon: Percent, count: (state.discountAudits || []).length },
            { id: 'stats', label: 'Statistiques & Impact Financier', icon: BarChart3 },
            { id: 'limits', label: 'Seuils & Limites par Poste', icon: Sliders },
          ]}
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as any)}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 1: GRILLE DES SERVICES ET TARIFS (RESPONSIVE TABLE + MOBILE CARDS) */}
      {/* ========================================================================= */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <Card className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher service, code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL">Toutes les catégories</option>
                {state.serviceCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="ACTIVE">🟢 Actifs uniquement</option>
                <option value="INACTIVE">🔴 Inactifs uniquement</option>
              </select>
            </div>
          </Card>

          {/* Desktop Table View (Hidden on Mobile) */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service / Prestation</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Unité de Facturation</TableHead>
                  <TableHead>Tarif Standard (GNF)</TableHead>
                  <TableHead>Consommables & Mode</TableHead>
                  <TableHead>Paliers Dégressifs Automatiques</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map(srv => {
                  const tiersCount = srv.pricingRules?.length || 0;
                  const consumablesCount = srv.consumables?.length || (srv.consumptions?.length || 0);
                  const mode = srv.consumableMode || (consumablesCount > 0 ? 'INTERNAL_VARIABLE' : 'NONE');

                  return (
                    <TableRow key={srv.id} className={!srv.isActive ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/30' : ''}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-white block">
                            {srv.name}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="font-mono text-brand-600 dark:text-brand-400 font-semibold">{srv.code}</span>
                            {srv.description && <span>• {srv.description}</span>}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" size="sm">
                          {srv.categoryName || categoriesMap.get(srv.categoryId) || 'Général'}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <span className="capitalize text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {srv.unit}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {formatCurrency(srv.basePrice)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">/ {srv.unit}</span>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          {mode === 'NONE' ? (
                            <Badge variant="outline" size="sm" className="text-[10px] text-slate-400">
                              Sans consommable
                            </Badge>
                          ) : mode === 'CLIENT_SUPPLIED' ? (
                            <Badge variant="purple" size="sm" className="text-[10px]">
                              Support client
                            </Badge>
                          ) : mode === 'MIXED' ? (
                            <Badge variant="warning" size="sm" className="text-[10px]">
                              Mode Mixte ({consumablesCount})
                            </Badge>
                          ) : mode === 'INTERNAL_FIXED' ? (
                            <Badge variant="info" size="sm" className="text-[10px]">
                              Fixe ({consumablesCount} art.)
                            </Badge>
                          ) : (
                            <Badge variant="primary" size="sm" className="text-[10px]">
                              Variable ({consumablesCount} art.)
                            </Badge>
                          )}
                          {consumablesCount > 0 && srv.consumables && srv.consumables.length > 0 && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                              {srv.consumables.map(c => `${c.productName} (${c.quantityPerUnit} ${c.unit})`).join(', ')}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {tiersCount > 0 ? (
                          <div className="space-y-1">
                            <Badge variant="purple" size="sm">
                              {tiersCount} tranche{tiersCount > 1 ? 's' : ''} dégressive{tiersCount > 1 ? 's' : ''}
                            </Badge>
                            <div className="text-[10px] text-slate-500 space-x-1">
                              {srv.pricingRules.map((r) => (
                                <span key={r.id} className="inline-block bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  {r.minQuantity}{r.maxQuantity ? `-${r.maxQuantity}` : '+'}: {formatCurrency(r.unitPrice)}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Tarif unique fixe</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {srv.isActive ? (
                          <Badge variant="success" size="sm">🟢 Actif</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">🔴 Inactif</Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {canManagePricing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenConsumablesModal(srv)}
                              className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-lg transition-colors"
                              title="Configurer les consommables associés"
                            >
                              <Boxes className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(srv)}
                              className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Modifier tarif standard"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setServiceForTiers(srv)}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors"
                              title="Gérer les paliers dégressifs"
                            >
                              <TrendingDown className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setServiceForHistory(srv)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                              title="Historique des prix"
                            >
                              <History className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleToggleStatus(srv)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                srv.isActive
                                  ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              }`}
                              title={srv.isActive ? 'Désactiver' : 'Réactiver'}
                            >
                              <Power className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteService(srv)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <Badge variant="outline" size="sm">Tarif Officiel</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile Card View (Optimized for Smartphones & Touchscreens) */}
          <div className="md:hidden space-y-3">
            {filteredServices.map(srv => {
              const tiersCount = srv.pricingRules?.length || 0;
              return (
                <Card key={srv.id} className={`p-4 space-y-3 ${!srv.isActive ? 'opacity-60 bg-slate-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{srv.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-brand-600 font-bold">{srv.code}</span>
                        <Badge variant="outline" size="sm">{srv.categoryName || 'Général'}</Badge>
                      </div>
                    </div>
                    <Badge variant={srv.isActive ? 'success' : 'danger'} size="sm">
                      {srv.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Tarif Standard</span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {formatCurrency(srv.basePrice)} <span className="text-[10px] text-slate-400 font-normal">/ {srv.unit}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Paliers Dégressifs</span>
                      <span className="font-semibold text-purple-600 text-xs">
                        {tiersCount > 0 ? `${tiersCount} paliers actifs` : 'Tarif unique'}
                      </span>
                    </div>
                  </div>

                  {tiersCount > 0 && (
                    <div className="space-y-1 text-[11px] bg-purple-50 dark:bg-purple-950/30 p-2 rounded-lg text-purple-900 dark:text-purple-200">
                      <span className="font-bold block text-[10px] uppercase">Grille Volume :</span>
                      <div className="flex flex-wrap gap-1">
                        {srv.pricingRules.map(r => (
                          <span key={r.id} className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded text-[10px] border border-purple-200">
                            {r.minQuantity}{r.maxQuantity ? `-${r.maxQuantity}` : '+'}: <strong>{formatCurrency(r.unitPrice)}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons with Touch-friendly min heights (Only if Admin) */}
                  {canManagePricing && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[40px] text-brand-600"
                        onClick={() => handleOpenConsumablesModal(srv)}
                      >
                        <Boxes className="w-3.5 h-3.5 mr-1" /> Consommables
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[40px]"
                        onClick={() => handleOpenEditModal(srv)}
                      >
                        <Edit className="w-3.5 h-3.5 mr-1" /> Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[40px] text-purple-600"
                        onClick={() => setServiceForTiers(srv)}
                      >
                        <TrendingDown className="w-3.5 h-3.5 mr-1" /> Paliers
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`min-h-[40px] ${srv.isActive ? 'text-amber-600' : 'text-emerald-600'}`}
                        onClick={() => handleToggleStatus(srv)}
                      >
                        <Power className="w-3.5 h-3.5 mr-1" /> {srv.isActive ? 'Désactiver' : 'Activer'}
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HISTORIQUE DES TARIFS (VERSIONING) */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <Card className="p-4 sm:p-6 space-y-4">
          <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-brand-500" />
                Journal d'Évolution des Tarifs Standards
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Historique inaltérable de toutes les modifications de tarifs de référence.
              </p>
            </div>
            <Badge variant="primary" size="sm">{(state.priceHistories || []).length} Variations</Badge>
          </CardHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date / Heure</TableHead>
                <TableHead>Prestation / Service</TableHead>
                <TableHead>Ancien Tarif</TableHead>
                <TableHead>Nouveau Tarif</TableHead>
                <TableHead>Variation</TableHead>
                <TableHead>Auteur</TableHead>
                <TableHead>Justification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(state.priceHistories || []).map(ph => {
                const diff = ph.newPrice - ph.oldPrice;
                const percent = ph.oldPrice > 0 ? ((diff / ph.oldPrice) * 100).toFixed(1) : 0;
                return (
                  <TableRow key={ph.id}>
                    <TableCell>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        {formatDate(ph.changeDate || ph.createdAt, 'dd/MM/yyyy HH:mm')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-xs text-brand-600 dark:text-brand-400">
                        {ph.serviceName}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-500 line-through">
                        {formatCurrency(ph.oldPrice)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {formatCurrency(ph.newPrice)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {diff > 0 ? (
                        <span className="text-xs font-bold text-rose-600">+{formatCurrency(diff)} (+{percent}%)</span>
                      ) : diff < 0 ? (
                        <span className="text-xs font-bold text-emerald-600">{formatCurrency(diff)} ({percent}%)</span>
                      ) : (
                        <span className="text-xs text-slate-400">0 GNF</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-700 dark:text-slate-300">{ph.changedBy}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600 dark:text-slate-400 italic">
                        {ph.reason || 'Ajustement standard'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: JOURNAL DES REMISES ACCORDÉES (TRAÇABILITÉ TOTALE) */}
      {/* ========================================================================= */}
      {activeTab === 'discounts' && (
        <Card className="p-4 sm:p-6 space-y-4">
          <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-500" />
                Journal d'Audit des Remises & Réductions Accordées
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Chaque réduction accordée est consignée avec le prix de base, le prix accordé, le motif et l'auteur.
              </p>
            </div>
            <Badge variant="success" size="sm">{(state.discountAudits || []).length} Lignes</Badge>
          </CardHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date / Commande</TableHead>
                <TableHead>Service & Volume</TableHead>
                <TableHead>Tarif Standard</TableHead>
                <TableHead>Tarif Appliqué</TableHead>
                <TableHead>Remise Accordée</TableHead>
                <TableHead>Type & Motif</TableHead>
                <TableHead>Agent / Autorisateur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(state.discountAudits || []).map(da => (
                <TableRow key={da.id}>
                  <TableCell>
                    <span className="font-bold text-xs text-brand-600 block">{da.orderNumber}</span>
                    <span className="text-[10px] text-slate-400">{formatDate(da.createdAt, 'dd/MM/yyyy HH:mm')}</span>
                  </TableCell>

                  <TableCell>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white block">{da.serviceName}</span>
                    <span className="text-[11px] text-slate-500">{da.quantity} {da.unit}s</span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-slate-500 line-through">
                      {formatCurrency(da.standardPrice)} / {da.unit}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Total: {formatCurrency(da.grossTotal)}</span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs font-bold text-purple-600">
                      {formatCurrency(da.appliedPrice)} / {da.unit}
                    </span>
                    <span className="text-[10px] text-slate-900 dark:text-white font-bold block">
                      Net: {formatCurrency(da.grossTotal - da.discountAmount)}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge variant={da.discountType === 'TIER' ? 'purple' : 'warning'} size="sm">
                      -{formatCurrency(da.discountAmount)} (-{da.discountPercent}%)
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                      {da.discountType === 'TIER' ? 'Palier Quantité' : da.discountType === 'EXCEPTIONAL' ? 'Remise Exceptionnelle' : 'Profil Client'}
                    </span>
                    <span className="text-[10px] text-slate-500 italic max-w-xs block line-clamp-1">
                      « {da.discountReason} »
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-slate-700 dark:text-slate-300 block">{da.grantedByUserName}</span>
                    {da.authorizedByUserName && (
                      <span className="text-[10px] text-emerald-600 font-semibold block">
                        Validé par : {da.authorizedByUserName}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {(state.discountAudits || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-xs text-slate-400">
                    Aucune remise enregistrée pour l'instant.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STATISTIQUES & IMPACT FINANCIER DES REMISES */}
      {/* ========================================================================= */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-2">
              <span className="text-xs text-slate-400 font-semibold uppercase">Chiffre d'Affaires Brut Théorique</span>
              <h3 className="text-2xl font-black text-white">{formatCurrency(discountStats.totalGross)}</h3>
              <p className="text-[11px] text-slate-400">Valeur totale aux tarifs standards de référence</p>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-rose-950/40 to-slate-900 border-rose-900/30 text-white space-y-2">
              <span className="text-xs text-rose-300 font-semibold uppercase">Montant Total des Remises Accordées</span>
              <h3 className="text-2xl font-black text-rose-400">-{formatCurrency(discountStats.totalDiscountAmount)}</h3>
              <p className="text-[11px] text-rose-200/70">Soit {discountStats.avgDiscountPercent}% de remise moyenne globale</p>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-emerald-950/40 to-slate-900 border-emerald-900/30 text-white space-y-2">
              <span className="text-xs text-emerald-300 font-semibold uppercase">Chiffre d'Affaires Net Réel Encaissé</span>
              <h3 className="text-2xl font-black text-emerald-400">{formatCurrency(discountStats.totalNet)}</h3>
              <p className="text-[11px] text-emerald-200/70">Montant net réellement facturé aux clients</p>
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-500" />
                Répartition des Types de Remises
              </CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 space-y-1">
                <span className="font-extrabold text-sm text-purple-900 dark:text-purple-200 block">Paliers Quantitatifs Automatiques</span>
                <span className="text-2xl font-black text-purple-600">{discountStats.tierCount} transactions</span>
                <p className="text-xs text-purple-700 dark:text-purple-300">Appliqués automatiquement selon les volumes de tirage</p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 space-y-1">
                <span className="font-extrabold text-sm text-amber-900 dark:text-amber-200 block">Remises Exceptionnelles Négociées</span>
                <span className="text-2xl font-black text-amber-600">{discountStats.exceptionalCount} transactions</span>
                <p className="text-xs text-amber-700 dark:text-amber-300">Accordées manuellement avec justification obligatoire</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SEUILS & LIMITES DE REMISE PAR POSTE */}
      {/* ========================================================================= */}
      {activeTab === 'limits' && (
        <Card className="p-6 space-y-4">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-500" />
              Plafonds d'Autorisation des Remises par Poste
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Définissez pour chaque rôle le pourcentage maximal de remise qu'il peut accorder sans blocage ni validation supérieure.
            </p>
          </CardHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Poste / Rôle</TableHead>
                <TableHead>Remise Exceptionnelle</TableHead>
                <TableHead>Plafond Max Direct (%)</TableHead>
                <TableHead>Validation Supérieure</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roleLimits.map(lim => (
                <TableRow key={lim.roleCode}>
                  <TableCell>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">{lim.roleName}</span>
                    <span className="font-mono text-[10px] text-brand-600">{lim.roleCode}</span>
                  </TableCell>

                  <TableCell>
                    <Badge variant={lim.canGrantExceptional ? 'success' : 'secondary'} size="sm">
                      {lim.canGrantExceptional ? 'Autorisé' : 'Interdit (0%)'}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {lim.maxDiscountPercent} %
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {lim.maxDiscountPercent === 0
                        ? 'Remise manuelle bloquée'
                        : `Recommandée au-delà de ${lim.requiresApprovalAbove}%`}
                    </span>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const next = prompt(`Nouveau plafond max (%) pour ${lim.roleName} :`, String(lim.maxDiscountPercent));
                        if (next !== null) {
                          const val = parseInt(next) || 0;
                          handleUpdateRoleLimit(lim.roleCode, val, val > 0);
                        }
                      }}
                    >
                      Modifier Seuil
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AJOUTER UN SERVICE */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Ajouter une Prestation au Catalogue"
          maxWidth="md"
        >
          <form onSubmit={handleCreateService} className="space-y-4 pt-1">
            <Input
              label="Nom du service *"
              placeholder="ex: Photocopie A4, Impression N&B..."
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Catégorie"
                value={addCategoryId}
                onChange={(e) => setAddCategoryId(e.target.value)}
                options={state.serviceCategories.map(c => ({ value: c.id, label: c.name }))}
              />
              <Select
                label="Unité de facturation"
                value={addUnit}
                onChange={(e) => setAddUnit(e.target.value)}
                options={COMMON_UNITS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Tarif standard TTC (GNF) *"
                type="number"
                value={addPrice}
                onChange={(e) => setAddPrice(parseInt(e.target.value) || 0)}
                required
              />
              <Input
                label="Coût de revient estimé (GNF)"
                type="number"
                value={addCost}
                onChange={(e) => setAddCost(parseInt(e.target.value) || 0)}
              />
            </div>

            <Input
              label="Description / Consignes"
              placeholder="ex: Grammage papier, finitions..."
              value={addDescription}
              onChange={(e) => setAddDescription(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" icon={Plus}>
                Enregistrer la Prestation
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MODIFIER UN SERVICE ET SON TARIF STANDARD */}
      {/* ========================================================================= */}
      {serviceToEdit && (
        <Modal
          isOpen={Boolean(serviceToEdit)}
          onClose={() => setServiceToEdit(null)}
          title={`Modifier le Tarif : ${serviceToEdit.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEditService} className="space-y-4 pt-1">
            <Input
              label="Nom du service *"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Catégorie"
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                options={state.serviceCategories.map(c => ({ value: c.id, label: c.name }))}
              />
              <Select
                label="Unité de facturation"
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
                options={COMMON_UNITS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Ancien Tarif</span>
                <span className="text-sm font-extrabold text-slate-500 line-through block">
                  {formatCurrency(serviceToEdit.basePrice)} / {serviceToEdit.unit}
                </span>
              </div>
              <div>
                <Input
                  label="Nouveau Tarif (GNF) *"
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(parseInt(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            {serviceToEdit.basePrice !== editPrice && (
              <Input
                label="Motif du changement de tarif (pour l'historique d'audit)"
                placeholder="ex: Hausse du coût du papier A4 80g..."
                value={editPriceChangeReason}
                onChange={(e) => setEditPriceChangeReason(e.target.value)}
              />
            )}

            <Input
              label="Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span>
                <strong>Garantie de non-rétroactivité :</strong> Les anciennes commandes et factures conservent automatiquement leur prix d'origine ({formatCurrency(serviceToEdit.basePrice)}).
              </span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setServiceToEdit(null)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary">
                Enregistrer les Modifications
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GÉRER LES PALIERS DÉGRESSIFS (VOLUME BRACKETS) */}
      {/* ========================================================================= */}
      {serviceForTiers && (
        <Modal
          isOpen={Boolean(serviceForTiers)}
          onClose={() => setServiceForTiers(null)}
          title={`Paliers Dégressifs : ${serviceForTiers.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4 pt-1">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 text-xs text-purple-900 dark:text-purple-200">
              <span>Tarif de base standard : <strong>{formatCurrency(serviceForTiers.basePrice)} / {serviceForTiers.unit}</strong>. Les remises de volume s'appliquent automatiquement aux commandes.</span>
            </div>

            {/* List of existing tiers */}
            <div className="space-y-2">
              <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Tranches Dégressives Actuelles
              </h5>
              {(serviceForTiers.pricingRules || []).length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  {serviceForTiers.pricingRules.map(rule => (
                    <div key={rule.id} className="p-3 flex items-center justify-between bg-white dark:bg-slate-900">
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          Quantité : {rule.minQuantity} {rule.maxQuantity ? `à ${rule.maxQuantity}` : 'et plus'} {serviceForTiers.unit}s
                        </span>
                        <span className="text-[11px] text-slate-400 block">Profil : {rule.customerType}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-sm text-purple-600">
                          {formatCurrency(rule.unitPrice)} / {serviceForTiers.unit}
                        </span>
                        <button
                          onClick={() => handleDeleteTierRule(rule.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Supprimer cette tranche"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  Aucun palier dégressif configuré.
                </div>
              )}
            </div>

            {/* Add new tier rule form */}
            <form onSubmit={handleAddTierRule} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-brand-500" />
                Ajouter une Tranche de Quantité
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <Input
                  label="Qté Min"
                  type="number"
                  value={tierMinQty}
                  onChange={(e) => setTierMinQty(parseInt(e.target.value) || 0)}
                  required
                />
                <Input
                  label="Qté Max"
                  type="number"
                  placeholder="Illimité"
                  value={tierMaxQty}
                  onChange={(e) => setTierMaxQty(e.target.value === '' ? '' : parseInt(e.target.value))}
                />
                <Input
                  label="Prix Unitaire (GNF)"
                  type="number"
                  value={tierUnitPrice}
                  onChange={(e) => setTierUnitPrice(parseInt(e.target.value) || 0)}
                  required
                />
                <Select
                  label="Profil Client"
                  value={tierCustomerType}
                  onChange={(e) => setTierCustomerType(e.target.value as any)}
                  options={[
                    { value: 'ALL', label: 'Tous Clients' },
                    { value: 'STUDENT', label: 'Étudiants' },
                    { value: 'COMPANY', label: 'Entreprises' },
                    { value: 'VIP', label: 'VIP' },
                  ]}
                />
              </div>
              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" variant="primary" icon={Plus}>
                  Ajouter cette Tranche
                </Button>
              </div>
            </form>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="primary" onClick={() => setServiceForTiers(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HISTORIQUE DES PRIX DU SERVICE */}
      {/* ========================================================================= */}
      {serviceForHistory && (
        <Modal
          isOpen={Boolean(serviceForHistory)}
          onClose={() => setServiceForHistory(null)}
          title={`Historique des Variations : ${serviceForHistory.name}`}
          maxWidth="md"
        >
          <div className="space-y-3 pt-1 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px]">Tarif Actuel</span>
                <span className="text-base font-black text-brand-600">{formatCurrency(serviceForHistory.basePrice)} / {serviceForHistory.unit}</span>
              </div>
              <Badge variant={serviceForHistory.isActive ? 'success' : 'danger'}>
                {serviceForHistory.isActive ? 'Actif' : 'Inactif'}
              </Badge>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              {(state.priceHistories || [])
                .filter(ph => ph.serviceId === serviceForHistory.id)
                .map(ph => (
                  <div key={ph.id} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 line-through">{formatCurrency(ph.oldPrice)}</span>
                        <span>➔</span>
                        <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(ph.newPrice)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {formatDate(ph.changeDate || ph.createdAt, 'dd/MM/yyyy HH:mm')} • Par {ph.changedBy}
                      </span>
                      {ph.reason && <span className="text-[10px] text-slate-500 italic">« {ph.reason} »</span>}
                    </div>
                  </div>
                ))}
              {(state.priceHistories || []).filter(ph => ph.serviceId === serviceForHistory.id).length === 0 && (
                <div className="p-4 text-center text-slate-400">
                  Aucune modification de tarif enregistrée depuis la création.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setServiceForHistory(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIGURATION DES CONSOMMABLES ASSOCIÉS (GENERIC ENGINE) */}
      {/* ========================================================================= */}
      {serviceForConsumables && (
        <Modal
          isOpen={Boolean(serviceForConsumables)}
          onClose={() => setServiceForConsumables(null)}
          title={`Consommables Associés : ${serviceForConsumables.name}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 pt-1">
            {/* Header info */}
            <div className="p-3.5 bg-brand-50 dark:bg-brand-950/40 rounded-2xl border border-brand-200 dark:border-brand-900 text-xs flex items-start gap-2.5">
              <Boxes className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-brand-950 dark:text-brand-200">
                  Moteur Générique de Déduction des Consommables
                </p>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                  Configurez les articles de stock requis pour réaliser cette prestation ({serviceForConsumables.unit}). Le système vérifie la disponibilité et déduit automatiquement les quantités lors de la validation.
                </p>
              </div>
            </div>

            {/* Mode selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Mode de Consommation Stock
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'INTERNAL_VARIABLE',
                    title: 'Calculé selon quantité (Variable)',
                    desc: 'Ex: 1 feuille A4 consommée par page imprimée/copiée',
                    badge: 'Photocopie / Tirage'
                  },
                  {
                    id: 'INTERNAL_FIXED',
                    title: 'Quantité fixe par document',
                    desc: 'Ex: 1 spirale + 1 bristol + 1 transparent par reliure',
                    badge: 'Reliure / Finition'
                  },
                  {
                    id: 'CLIENT_SUPPLIED',
                    title: 'Support fourni par le client',
                    desc: 'Ex: Client apporte son tee-shirt (0 déduction support)',
                    badge: 'Pressage seul'
                  },
                  {
                    id: 'MIXED',
                    title: 'Mode mixte (Support client + Interne)',
                    desc: 'Support client non déduit, consommables internes déduits',
                    badge: 'Flocage / Sublimation'
                  },
                  {
                    id: 'NONE',
                    title: 'Aucun consommable (Prestation pure)',
                    desc: 'Service de conseil, saisie ou prestation sans matière',
                    badge: 'Main d\'œuvre'
                  }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setConsumableMode(opt.id as ConsumableMode)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      consumableMode === opt.id
                        ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-950/60 ring-2 ring-brand-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{opt.title}</span>
                      <Badge variant={consumableMode === opt.id ? 'primary' : 'outline'} size="sm" className="text-[9px]">
                        {opt.badge}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Client Support Toggle */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                  Autoriser le client à fournir son propre support ?
                </span>
                <span className="text-[11px] text-slate-400">
                  Permet au caissier de cocher « Support apporté par le client » lors de la commande pour annuler la déduction du support.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isClientSupportAllowed}
                  onChange={(e) => setIsClientSupportAllowed(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {/* Consumables Items List */}
            {consumableMode !== 'NONE' && consumableMode !== 'CLIENT_SUPPLIED' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-brand-500" />
                    Articles de Stock Nécessaires ({consumablesList.length})
                  </h5>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    icon={Plus}
                    onClick={handleAddConsumableRow}
                  >
                    Ajouter un article
                  </Button>
                </div>

                {consumablesList.length > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {consumablesList.map((row, index) => {
                      const availableProds = state.products.filter(
                        p => (currentTenant?.id === 'global' || p.tenantId === currentTenant?.id) && !p.isArchived
                      );
                      const selectedProd = availableProds.find(p => p.id === row.productId);

                      return (
                        <div
                          key={index}
                          className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm"
                        >
                          {/* Product select */}
                          <div className="flex-1 w-full">
                            <label className="text-[10px] text-slate-400 font-semibold block mb-1">Article en stock</label>
                            <select
                              value={row.productId}
                              onChange={(e) => handleUpdateConsumableRow(index, 'productId', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:border-brand-500"
                            >
                              {availableProds.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.currentStock ?? 0} {p.unit} en stock)
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Qty per unit */}
                          <div className="w-full sm:w-28">
                            <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                              {consumableMode === 'INTERNAL_FIXED' ? 'Qté / prestation' : 'Qté / unité'}
                            </label>
                            <input
                              type="number"
                              min="0.001"
                              step="any"
                              value={row.quantityPerUnit}
                              onChange={(e) => handleUpdateConsumableRow(index, 'quantityPerUnit', parseFloat(e.target.value) || 1)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center focus:outline-none focus:border-brand-500"
                            />
                          </div>

                          {/* Unit display */}
                          <div className="w-full sm:w-24">
                            <label className="text-[10px] text-slate-400 font-semibold block mb-1">Unité</label>
                            <span className="block px-2 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-300 text-center font-medium truncate">
                              {selectedProd?.unit || row.unit || 'unité'}
                            </span>
                          </div>

                          {/* Delete row */}
                          <div className="self-end sm:self-center sm:pt-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveConsumableRow(index)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="Retirer ce consommable"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Boxes className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Aucun article de stock associé pour le moment
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cliquez sur le bouton ci-dessus pour lier du papier, des spirales, des transparents ou pochettes.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setServiceForConsumables(null)}>
                Annuler
              </Button>
              <Button type="button" variant="primary" icon={Check} onClick={handleSaveConsumables}>
                Enregistrer la Configuration
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

