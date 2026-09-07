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
import { Equipment, EquipmentCategory, EquipmentStatus, EquipmentCondition, EquipmentMaintenance } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  Monitor, Plus, Wrench, AlertTriangle, CheckCircle2,
  Search, Eye, Edit, Trash2, ShieldCheck, Printer,
  Cpu, HardDrive, Laptop, Layers, Activity, Clock,
  MapPin, UserCheck, CheckSquare, DollarSign, Calendar
} from 'lucide-react';

export const EquipmentView: React.FC = () => {
  const { currentTenant, currentUser, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const state = dbStore.getState();

  const [activeTab, setActiveTab] = useState<'inventory' | 'maintenances' | 'stats'>('inventory');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [conditionFilter, setConditionFilter] = useState('ALL');

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [equipmentToEdit, setEquipmentToEdit] = useState<Equipment | null>(null);
  const [equipmentToView, setEquipmentToView] = useState<Equipment | null>(null);
  const [equipmentForMaintenance, setEquipmentForMaintenance] = useState<Equipment | null>(null);

  // New Equipment Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<EquipmentCategory>('IMPRESSION_PRODUCTION');
  const [newType, setNewType] = useState('Imprimante Laser Réseau');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAcquisitionDate, setNewAcquisitionDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSupplier, setNewSupplier] = useState('');
  const [newCostPrice, setNewCostPrice] = useState(5000000);
  const [newLocation, setNewLocation] = useState('Atelier Impression - Poste 1');
  const [newResponsible, setNewResponsible] = useState(currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Opérateur Production');
  const [newCondition, setNewCondition] = useState<EquipmentCondition>('EXCELLENT');
  const [newStatus, setNewStatus] = useState<EquipmentStatus>('EN_SERVICE');
  const [newWarrantyDate, setNewWarrantyDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Edit Equipment Form State
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<EquipmentCategory>('IMPRESSION_PRODUCTION');
  const [editType, setEditType] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editSerialNumber, setEditSerialNumber] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAcquisitionDate, setEditAcquisitionDate] = useState('');
  const [editSupplier, setEditSupplier] = useState('');
  const [editCostPrice, setEditCostPrice] = useState(0);
  const [editLocation, setEditLocation] = useState('');
  const [editResponsible, setEditResponsible] = useState('');
  const [editCondition, setEditCondition] = useState<EquipmentCondition>('BON');
  const [editStatus, setEditStatus] = useState<EquipmentStatus>('EN_SERVICE');
  const [editWarrantyDate, setEditWarrantyDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Maintenance Form State
  const [maintProblem, setMaintProblem] = useState('');
  const [maintTechnician, setMaintTechnician] = useState('Technicien Interne');
  const [maintAction, setMaintAction] = useState('');
  const [maintReplacedParts, setMaintReplacedParts] = useState('');
  const [maintCost, setMaintCost] = useState(0);
  const [maintStatus, setMaintStatus] = useState<'EN_COURS' | 'REPARE' | 'IRREPARABLE'>('EN_COURS');
  const [maintNotes, setMaintNotes] = useState('');

  // Filtered Equipment List
  const filteredEquipment = useMemo(() => {
    return (state.equipment || []).filter(eq => {
      const matchesSearch =
        eq.name.toLowerCase().includes(search.toLowerCase()) ||
        eq.inventoryNumber.toLowerCase().includes(search.toLowerCase()) ||
        (eq.brand && eq.brand.toLowerCase().includes(search.toLowerCase())) ||
        (eq.serialNumber && eq.serialNumber.toLowerCase().includes(search.toLowerCase())) ||
        (eq.location && eq.location.toLowerCase().includes(search.toLowerCase())) ||
        (eq.type && eq.type.toLowerCase().includes(search.toLowerCase()));

      const matchesCat = categoryFilter === 'ALL' || eq.category === categoryFilter;
      const matchesStat = statusFilter === 'ALL' || eq.status === statusFilter;
      const matchesCond = conditionFilter === 'ALL' || eq.condition === conditionFilter;

      return matchesSearch && matchesCat && matchesStat && matchesCond;
    });
  }, [state.equipment, search, categoryFilter, statusFilter, conditionFilter]);

  // KPIs
  const metrics = useMemo(() => {
    const all = state.equipment || [];
    const total = all.length;
    const inService = all.filter(e => e.status === 'EN_SERVICE').length;
    const inMaintenance = all.filter(e => e.status === 'EN_MAINTENANCE').length;
    const inBroken = all.filter(e => e.status === 'EN_PANNE').length;
    const computers = all.filter(e => e.category === 'INFORMATIQUE' || e.type.toLowerCase().includes('ordinateur') || e.type.toLowerCase().includes('pc')).length;
    const printers = all.filter(e => e.type.toLowerCase().includes('imprimante') || e.type.toLowerCase().includes('traceur')).length;
    const copiers = all.filter(e => e.type.toLowerCase().includes('photocopieuse') || e.type.toLowerCase().includes('copieur')).length;
    const totalValuation = all.reduce((acc, e) => acc + (e.costPrice || 0), 0);

    return { total, inService, inMaintenance, inBroken, computers, printers, copiers, totalValuation };
  }, [state.equipment]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setNewName('');
    setNewCategory('IMPRESSION_PRODUCTION');
    setNewType('Imprimante Laser Réseau');
    setNewBrand('HP');
    setNewModel('');
    setNewSerialNumber('');
    setNewDescription('');
    setNewAcquisitionDate(new Date().toISOString().split('T')[0]);
    setNewSupplier('BuroTic Guinée');
    setNewCostPrice(5000000);
    setNewLocation('Atelier Impression - Poste 1');
    setNewResponsible(currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Opérateur Production');
    setNewCondition('EXCELLENT');
    setNewStatus('EN_SERVICE');
    setNewWarrantyDate('');
    setNewNotes('');
    setIsNewModalOpen(true);
  };

  // Submit Create Equipment
  const handleCreateEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newBrand.trim()) {
      showToast('Erreur', 'Veuillez renseigner au moins le nom et la marque de l’équipement.', 'DANGER');
      return;
    }

    const seq = (state.equipment || []).length + 1;
    const invNumber = `MAT-${new Date().getFullYear()}-${seq.toString().padStart(4, '0')}`;
    const newId = `eq-${Date.now()}`;

    const newEquip: Equipment = {
      id: newId,
      tenantId: currentTenant?.id || 't-001',
      inventoryNumber: invNumber,
      name: newName.trim(),
      category: newCategory,
      type: newType.trim(),
      brand: newBrand.trim(),
      model: newModel.trim() || undefined,
      serialNumber: newSerialNumber.trim() || undefined,
      description: newDescription.trim() || undefined,
      acquisitionDate: newAcquisitionDate || undefined,
      supplier: newSupplier.trim() || undefined,
      costPrice: newCostPrice || undefined,
      location: newLocation.trim() || undefined,
      department: 'PRODUCTION_MATERIEL',
      responsiblePersonName: newResponsible.trim() || undefined,
      condition: newCondition,
      status: newStatus,
      warrantyEndDate: newWarrantyDate || undefined,
      notes: newNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    dbStore.updateState(draft => {
      if (!draft.equipment) draft.equipment = [];
      draft.equipment.unshift(newEquip);
    });

    dbStore.logAudit('EQUIPMENT_CREATED', 'EQUIPMENT', newId, null, {
      name: newName,
      inventoryNumber: invNumber,
      category: newCategory
    });

    showToast('Équipement Enregistré', `L'équipement ${newName} (${invNumber}) a été ajouté à l'inventaire.`, 'SUCCESS');
    setIsNewModalOpen(false);
  };

  // Open Edit Modal
  const handleOpenEdit = (eq: Equipment) => {
    setEquipmentToEdit(eq);
    setEditName(eq.name);
    setEditCategory((eq.category as EquipmentCategory) || 'IMPRESSION_PRODUCTION');
    setEditType(eq.type);
    setEditBrand(eq.brand);
    setEditModel(eq.model || '');
    setEditSerialNumber(eq.serialNumber || '');
    setEditDescription(eq.description || '');
    setEditAcquisitionDate(eq.acquisitionDate || '');
    setEditSupplier(eq.supplier || '');
    setEditCostPrice(eq.costPrice || 0);
    setEditLocation(eq.location || '');
    setEditResponsible(eq.responsiblePersonName || '');
    setEditCondition(eq.condition);
    setEditStatus(eq.status);
    setEditWarrantyDate(eq.warrantyEndDate || '');
    setEditNotes(eq.notes || '');
  };

  // Submit Edit Equipment
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentToEdit) return;

    dbStore.updateState(draft => {
      const eq = (draft.equipment || []).find(item => item.id === equipmentToEdit.id);
      if (eq) {
        eq.name = editName.trim();
        eq.category = editCategory;
        eq.type = editType.trim();
        eq.brand = editBrand.trim();
        eq.model = editModel.trim() || undefined;
        eq.serialNumber = editSerialNumber.trim() || undefined;
        eq.description = editDescription.trim() || undefined;
        eq.acquisitionDate = editAcquisitionDate || undefined;
        eq.supplier = editSupplier.trim() || undefined;
        eq.costPrice = editCostPrice;
        eq.location = editLocation.trim() || undefined;
        eq.responsiblePersonName = editResponsible.trim() || undefined;
        eq.condition = editCondition;
        eq.status = editStatus;
        eq.warrantyEndDate = editWarrantyDate || undefined;
        eq.notes = editNotes.trim() || undefined;
        eq.updatedAt = new Date().toISOString();
      }
    });

    dbStore.logAudit('EQUIPMENT_UPDATED', 'EQUIPMENT', equipmentToEdit.id, { name: equipmentToEdit.name }, { name: editName, status: editStatus });
    showToast('Équipement Modifié', `La fiche de ${editName} a été mise à jour.`, 'SUCCESS');
    setEquipmentToEdit(null);
  };

  // Open Maintenance Modal
  const handleOpenMaintenance = (eq: Equipment) => {
    setEquipmentForMaintenance(eq);
    setMaintProblem('Bourrage régulier ou dysfonctionnement');
    setMaintTechnician(currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Technicien Interne');
    setMaintAction('');
    setMaintReplacedParts('');
    setMaintCost(0);
    setMaintStatus('EN_COURS');
    setMaintNotes('');
  };

  // Submit Maintenance Record
  const handleSaveMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentForMaintenance) return;

    const newMaintId = `maint-${Date.now()}`;
    const newMaint: EquipmentMaintenance = {
      id: newMaintId,
      tenantId: currentTenant?.id || 't-001',
      equipmentId: equipmentForMaintenance.id,
      equipmentName: equipmentForMaintenance.name,
      reportedDate: new Date().toISOString().split('T')[0],
      problemDescription: maintProblem.trim(),
      technicianName: maintTechnician.trim() || undefined,
      actionTaken: maintAction.trim() || undefined,
      replacedParts: maintReplacedParts.trim() || undefined,
      cost: maintCost || 0,
      resolutionDate: maintStatus === 'REPARE' ? new Date().toISOString().split('T')[0] : undefined,
      status: maintStatus,
      notes: maintNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    dbStore.updateState(draft => {
      if (!draft.equipmentMaintenances) draft.equipmentMaintenances = [];
      draft.equipmentMaintenances.unshift(newMaint);

      // Update equipment status accordingly
      const eq = (draft.equipment || []).find(item => item.id === equipmentForMaintenance.id);
      if (eq) {
        if (maintStatus === 'EN_COURS') eq.status = 'EN_MAINTENANCE';
        else if (maintStatus === 'REPARE') eq.status = 'EN_SERVICE';
        else if (maintStatus === 'IRREPARABLE') eq.status = 'HORS_SERVICE';
        eq.updatedAt = new Date().toISOString();
      }
    });

    dbStore.logAudit('EQUIPMENT_MAINTENANCE_LOGGED', 'EQUIPMENT', equipmentForMaintenance.id, null, {
      problem: maintProblem,
      status: maintStatus,
      cost: maintCost
    });

    showToast('Maintenance Enregistrée', `L'intervention sur ${equipmentForMaintenance.name} a été consignée.`, 'SUCCESS');
    setEquipmentForMaintenance(null);
  };

  // Delete Equipment
  const handleDeleteEquipment = (eq: Equipment) => {
    if (confirm(`Confirmez-vous la suppression définitive de l'équipement "${eq.name}" (${eq.inventoryNumber}) ?`)) {
      dbStore.updateState(draft => {
        draft.equipment = (draft.equipment || []).filter(item => item.id !== eq.id);
      });
      dbStore.logAudit('EQUIPMENT_DELETED', 'EQUIPMENT', eq.id, null, { name: eq.name });
      showToast('Équipement Supprimé', `L'équipement ${eq.name} a été supprimé du parc.`, 'SUCCESS');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Monitor className="w-6 h-6 text-brand-500" />
            Parc Matériel & Équipements du Centre
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Inventaire technique, imprimantes, photocopieuses, PC, maintenance préventive et suivi des pannes.
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={handleOpenCreateModal}>
          Nouvel Équipement
        </Button>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-brand-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Parc Total</span>
            <HardDrive className="w-4 h-4 text-brand-500" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {metrics.total} matériels
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Valorisation : {formatCurrency(metrics.totalValuation)}</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">En Service (Opérationnel)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-xl font-extrabold text-emerald-600 mt-1">
            {metrics.inService}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Disponibles pour la production</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">En Maintenance</span>
            <Wrench className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-xl font-extrabold text-amber-600 mt-1">
            {metrics.inMaintenance}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">En cours de révision ou réparation</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">En Panne (Arrêt)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className="text-xl font-extrabold text-rose-600 mt-1">
            {metrics.inBroken}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Intervention urgente requise</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'inventory', label: 'Parc & Inventaire des Équipements', icon: Monitor, count: (state.equipment || []).length },
          { id: 'maintenances', label: 'Journal des Pannes & Maintenances', icon: Wrench, count: (state.equipmentMaintenances || []).length },
          { id: 'stats', label: 'Statistiques & Synthèse du Parc', icon: Activity },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* ========================================================================= */}
      {/* TAB 1: PARC & INVENTAIRE */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, marque, n° inventaire, série..."
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
                <option value="IMPRESSION_PRODUCTION">🖨️ Impression & Production</option>
                <option value="INFORMATIQUE">💻 Informatique & Réseau</option>
                <option value="AUTRE">🔌 Autres Équipements</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="EN_SERVICE">🟢 En Service</option>
                <option value="EN_MAINTENANCE">🟠 En Maintenance</option>
                <option value="EN_PANNE">🔴 En Panne</option>
                <option value="HORS_SERVICE">⛔ Hors Service</option>
                <option value="EN_STOCK">📦 En Réserve / Stock</option>
              </select>

              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tous les états physiques</option>
                <option value="EXCELLENT">✨ Excellent État</option>
                <option value="BON">👍 Bon État</option>
                <option value="MOYEN">⚠️ État Moyen</option>
                <option value="DEGRADE">❌ Dégradé / Usé</option>
              </select>
            </div>
          </Card>

          {/* Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Inventaire & Équipement</TableHead>
                  <TableHead>Catégorie & Type</TableHead>
                  <TableHead>Emplacement & Responsable</TableHead>
                  <TableHead>N° Série & Garantie</TableHead>
                  <TableHead>État Physique</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map(eq => {
                  return (
                    <TableRow key={eq.id} className={eq.status === 'EN_PANNE' ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-white block">
                            {eq.name}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="font-mono text-brand-600 dark:text-brand-400 font-bold">{eq.inventoryNumber}</span>
                            <span>• {eq.brand} {eq.model || ''}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold block">
                          {eq.type}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {eq.category === 'IMPRESSION_PRODUCTION' ? 'Impression / Atelier' : eq.category === 'INFORMATIQUE' ? 'Informatique' : 'Général'}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {eq.location || 'Atelier'}
                        </span>
                        {eq.responsiblePersonName && (
                          <span className="text-[10px] text-slate-400 block">Resp: {eq.responsiblePersonName}</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400 block">
                          {eq.serialNumber || 'N/A'}
                        </span>
                        {eq.warrantyEndDate && (
                          <span className="text-[10px] text-emerald-600 block">Garantie: {formatDate(eq.warrantyEndDate, 'dd/MM/yyyy')}</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          size="sm"
                          variant={
                            eq.condition === 'EXCELLENT' ? 'success' :
                            eq.condition === 'BON' ? 'primary' :
                            eq.condition === 'MOYEN' ? 'warning' : 'danger'
                          }
                        >
                          {eq.condition}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {eq.status === 'EN_SERVICE' ? (
                          <Badge variant="success" size="sm">🟢 En Service</Badge>
                        ) : eq.status === 'EN_MAINTENANCE' ? (
                          <Badge variant="warning" size="sm">🟠 En Maintenance</Badge>
                        ) : eq.status === 'EN_PANNE' ? (
                          <Badge variant="danger" size="sm">🔴 En Panne</Badge>
                        ) : eq.status === 'HORS_SERVICE' ? (
                          <Badge variant="outline" size="sm">⛔ Hors Service</Badge>
                        ) : (
                          <Badge variant="secondary" size="sm">📦 En Stock</Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEquipmentToView(eq)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Fiche Technique"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenMaintenance(eq)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                            title="Signaler panne / Maintenance"
                          >
                            <Wrench className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(eq)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-lg transition-colors"
                            title="Modifier l'équipement"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteEquipment(eq)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Supprimer l'équipement"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: JOURNAL DES MAINTENANCES & INCIDENTS */}
      {/* ========================================================================= */}
      {activeTab === 'maintenances' && (
        <Card className="p-6 space-y-4">
          <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                Journal Chronologique des Pannes & Maintenances
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Historique des pannes constatées, interventions techniques, pièces remplacées et coûts.
              </p>
            </div>
            <Badge variant="primary" size="sm">{(state.equipmentMaintenances || []).length} Interventions</Badge>
          </CardHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Équipement Concerné</TableHead>
                <TableHead>Problème Constaté</TableHead>
                <TableHead>Intervention / Action</TableHead>
                <TableHead>Technicien / Prestataire</TableHead>
                <TableHead>Coût</TableHead>
                <TableHead>Résultat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(state.equipmentMaintenances || []).map(m => (
                <TableRow key={m.id}>
                  <TableCell>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      {formatDate(m.reportedDate, 'dd MMM yyyy')}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {m.equipmentName}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-medium block">
                      {m.problemDescription}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-slate-700 dark:text-slate-300 block">
                      {m.actionTaken || 'En cours de diagnostic'}
                    </span>
                    {m.replacedParts && (
                      <span className="text-[10px] text-slate-400">Pièces: {m.replacedParts}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {m.technicianName || 'Interne'}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {m.cost ? formatCurrency(m.cost) : '0 GNF'}
                    </span>
                  </TableCell>

                  <TableCell>
                    {m.status === 'REPARE' ? (
                      <Badge variant="success" size="sm">✅ Réparé</Badge>
                    ) : m.status === 'EN_COURS' ? (
                      <Badge variant="warning" size="sm">⏳ En Cours</Badge>
                    ) : (
                      <Badge variant="danger" size="sm">❌ Irréparable</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STATISTIQUES & INVENTAIRE DU PARC */}
      {/* ========================================================================= */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-5 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase">💻 Ordinateurs & Serveurs</span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">{metrics.computers}</h4>
              <p className="text-xs text-slate-400">Stations de travail, PC portables et serveurs</p>
            </Card>

            <Card className="p-5 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase">🖨️ Imprimantes & Traceurs</span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">{metrics.printers}</h4>
              <p className="text-xs text-slate-400">Imprimantes laser réseau et traceurs grand format</p>
            </Card>

            <Card className="p-5 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase">📑 Photocopieuses Professionnelles</span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">{metrics.copiers}</h4>
              <p className="text-xs text-slate-400">Copieurs multifonctions couleur et N&B haut débit</p>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOUVEL ÉQUIPEMENT */}
      {/* ========================================================================= */}
      {isNewModalOpen && (
        <Modal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          title="Ajouter un Équipement au Parc"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateEquipment} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nom de l'équipement *"
                placeholder="ex: HP LaserJet Enterprise M608dn"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <Input
                label="Marque *"
                placeholder="ex: HP, Canon, Dell, Epson..."
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Catégorie"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                options={[
                  { value: 'IMPRESSION_PRODUCTION', label: '🖨️ Impression & Production' },
                  { value: 'INFORMATIQUE', label: '💻 Informatique & Réseau' },
                  { value: 'AUTRE', label: '🔌 Autre Équipement' },
                ]}
              />
              <Input
                label="Type d'équipement"
                placeholder="ex: Imprimante Laser, PC Fixe..."
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                required
              />
              <Input
                label="Modèle précis"
                placeholder="ex: M608dn, C3530i..."
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Numéro de Série"
                placeholder="ex: CNB1N12345"
                value={newSerialNumber}
                onChange={(e) => setNewSerialNumber(e.target.value)}
              />
              <Input
                label="Date d'acquisition"
                type="date"
                value={newAcquisitionDate}
                onChange={(e) => setNewAcquisitionDate(e.target.value)}
              />
              <Input
                label="Prix d'acquisition (GNF)"
                type="number"
                value={newCostPrice}
                onChange={(e) => setNewCostPrice(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Emplacement dans le centre"
                placeholder="ex: Atelier Impression - Poste 1"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
              />
              <Input
                label="Responsable / Utilisateur assigné"
                value={newResponsible}
                onChange={(e) => setNewResponsible(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="État physique"
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value as any)}
                options={[
                  { value: 'EXCELLENT', label: '✨ Excellent État' },
                  { value: 'BON', label: '👍 Bon État' },
                  { value: 'MOYEN', label: '⚠️ État Moyen' },
                  { value: 'DEGRADE', label: '❌ Dégradé / Usé' },
                ]}
              />
              <Select
                label="Statut initial"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as any)}
                options={[
                  { value: 'EN_SERVICE', label: '🟢 En Service' },
                  { value: 'EN_MAINTENANCE', label: '🟠 En Maintenance' },
                  { value: 'EN_PANNE', label: '🔴 En Panne' },
                  { value: 'EN_STOCK', label: '📦 En Réserve / Stock' },
                ]}
              />
            </div>

            <Input
              label="Description & Observations"
              placeholder="Capacités techniques, options installées..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsNewModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" icon={Plus}>
                Enregistrer l'Équipement
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MODIFIER L'ÉQUIPEMENT */}
      {/* ========================================================================= */}
      {equipmentToEdit && (
        <Modal
          isOpen={Boolean(equipmentToEdit)}
          onClose={() => setEquipmentToEdit(null)}
          title={`Modifier l'Équipement : ${equipmentToEdit.name}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nom de l'équipement *"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
              <Input
                label="Marque *"
                value={editBrand}
                onChange={(e) => setEditBrand(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Catégorie"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as any)}
                options={[
                  { value: 'IMPRESSION_PRODUCTION', label: '🖨️ Impression & Production' },
                  { value: 'INFORMATIQUE', label: '💻 Informatique & Réseau' },
                  { value: 'AUTRE', label: '🔌 Autre Équipement' },
                ]}
              />
              <Input
                label="Type d'équipement"
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                required
              />
              <Input
                label="Modèle"
                value={editModel}
                onChange={(e) => setEditModel(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Numéro de Série"
                value={editSerialNumber}
                onChange={(e) => setEditSerialNumber(e.target.value)}
              />
              <Input
                label="Prix d'acquisition (GNF)"
                type="number"
                value={editCostPrice}
                onChange={(e) => setEditCostPrice(parseInt(e.target.value) || 0)}
              />
              <Input
                label="Emplacement"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="État physique"
                value={editCondition}
                onChange={(e) => setEditCondition(e.target.value as any)}
                options={[
                  { value: 'EXCELLENT', label: '✨ Excellent État' },
                  { value: 'BON', label: '👍 Bon État' },
                  { value: 'MOYEN', label: '⚠️ État Moyen' },
                  { value: 'DEGRADE', label: '❌ Dégradé / Usé' },
                ]}
              />
              <Select
                label="Statut opérationnel"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                options={[
                  { value: 'EN_SERVICE', label: '🟢 En Service' },
                  { value: 'EN_MAINTENANCE', label: '🟠 En Maintenance' },
                  { value: 'EN_PANNE', label: '🔴 En Panne' },
                  { value: 'HORS_SERVICE', label: '⛔ Hors Service' },
                  { value: 'EN_STOCK', label: '📦 En Stock' },
                ]}
              />
            </div>

            <Input
              label="Observations / Notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setEquipmentToEdit(null)}>
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
      {/* MODAL: SIGNALER PANNE / MAINTENANCE */}
      {/* ========================================================================= */}
      {equipmentForMaintenance && (
        <Modal
          isOpen={Boolean(equipmentForMaintenance)}
          onClose={() => setEquipmentForMaintenance(null)}
          title={`Enregistrer une Panne / Maintenance : ${equipmentForMaintenance.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveMaintenance} className="space-y-4 pt-1">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 text-xs text-amber-900 dark:text-amber-200">
              <span>Équipement : <strong>{equipmentForMaintenance.name}</strong> ({equipmentForMaintenance.inventoryNumber})</span>
            </div>

            <Input
              label="Problème constaté / Panne signalée *"
              placeholder="ex: Bourrage papier récurrent, erreur code E000020..."
              value={maintProblem}
              onChange={(e) => setMaintProblem(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Intervenant / Technicien"
                placeholder="ex: Sékou Touré (Interne) ou SAV Canon"
                value={maintTechnician}
                onChange={(e) => setMaintTechnician(e.target.value)}
              />
              <Input
                label="Coût de l'intervention (GNF)"
                type="number"
                value={maintCost}
                onChange={(e) => setMaintCost(parseInt(e.target.value) || 0)}
              />
            </div>

            <Input
              label="Action effectuée / Réparation"
              placeholder="ex: Nettoyage complet, affûtage lame, remplacement tambour..."
              value={maintAction}
              onChange={(e) => setMaintAction(e.target.value)}
            />

            <Input
              label="Pièces remplacées"
              placeholder="ex: Courroie, lame, condensateur..."
              value={maintReplacedParts}
              onChange={(e) => setMaintReplacedParts(e.target.value)}
            />

            <Select
              label="Statut de l'intervention"
              value={maintStatus}
              onChange={(e) => setMaintStatus(e.target.value as any)}
              options={[
                { value: 'EN_COURS', label: '⏳ En cours (Équipement en maintenance)' },
                { value: 'REPARE', label: '✅ Réparé (Remise en service immédiate)' },
                { value: 'IRREPARABLE', label: '❌ Irréparable (Mettre hors service)' },
              ]}
            />

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setEquipmentForMaintenance(null)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" icon={Wrench}>
                Consigner l'Intervention
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FICHE TECHNIQUE DÉTAILLÉE */}
      {/* ========================================================================= */}
      {equipmentToView && (
        <Modal
          isOpen={Boolean(equipmentToView)}
          onClose={() => setEquipmentToView(null)}
          title={`Fiche Matériel : ${equipmentToView.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4 pt-1 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-400 block text-[11px]">N° Inventaire</span>
                <span className="font-mono font-bold text-brand-600">{equipmentToView.inventoryNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Marque & Modèle</span>
                <span className="font-bold text-slate-900 dark:text-white">{equipmentToView.brand} {equipmentToView.model}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">N° de Série</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{equipmentToView.serialNumber || 'Non renseigné'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Emplacement</span>
                <span className="font-bold text-slate-900 dark:text-white">{equipmentToView.location || 'Atelier'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">État Physique</span>
                <span className="font-bold text-emerald-600">{equipmentToView.condition}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Statut</span>
                <span className="font-bold text-brand-600">{equipmentToView.status}</span>
              </div>
            </div>

            {/* Maintenances for this equipment */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                Historique des Maintenances pour cet équipement :
              </h5>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {(state.equipmentMaintenances || [])
                  .filter(m => m.equipmentId === equipmentToView.id)
                  .map(m => (
                    <div key={m.id} className="p-3 flex items-center justify-between bg-white dark:bg-slate-900">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{m.problemDescription}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(m.reportedDate, 'dd/MM/yyyy')} • Technicien : {m.technicianName}</span>
                      </div>
                      <Badge variant={m.status === 'REPARE' ? 'success' : 'warning'} size="sm">
                        {m.status}
                      </Badge>
                    </div>
                  ))}
                {(state.equipmentMaintenances || []).filter(m => m.equipmentId === equipmentToView.id).length === 0 && (
                  <div className="p-4 text-center text-slate-400">
                    Aucune panne ou maintenance enregistrée pour cet équipement.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setEquipmentToView(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
