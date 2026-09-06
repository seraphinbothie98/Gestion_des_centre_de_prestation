import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { ProductionJob, ProductionStatus, OrderPriority } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { computeDynamicOrderStatus, computeDynamicDeliveryStatus } from '../../lib/pricingEngine';
import {
  Factory, Play, Pause, CheckCircle2, Clock,
  AlertCircle, MessageSquare, User, Filter, ArrowRight,
  Layers, Palette, Printer, Scissors, Camera, Copy
} from 'lucide-react';

export const ProductionView: React.FC = () => {
  const { currentTenant, currentUser } = useAuth();
  const { showToast } = useNotification();
  const state = dbStore.getState();

  const [selectedJob, setSelectedJob] = useState<ProductionJob | null>(null);
  const [jobNote, setJobNote] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | OrderPriority>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');

  const jobs = useMemo(() => {
    return state.productionJobs.filter(j => {
      const matchPrio = priorityFilter === 'ALL' || j.priority === priorityFilter;
      const matchDept = departmentFilter === 'ALL' || j.department === departmentFilter;
      return matchPrio && matchDept;
    });
  }, [state.productionJobs, priorityFilter, departmentFilter]);

  const pendingJobs = jobs.filter(j => j.status === 'TODO' || j.status === 'PENDING');
  const inProgressJobs = jobs.filter(j => j.status === 'IN_PROGRESS');
  const pausedJobs = jobs.filter(j => j.status === 'PAUSED');
  const doneJobs = jobs.filter(j => j.status === 'DONE' || j.status === 'READY');

  const handleUpdateJobStatus = (jobId: string, newStatus: ProductionStatus) => {
    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Opérateur Atelier';

    dbStore.updateState(draft => {
      const job = draft.productionJobs.find(j => j.id === jobId);
      if (job) {
        job.status = newStatus;
        job.assignedToUser = currentUser?.id;
        job.assignedToUserName = performedBy;

        if (newStatus === 'IN_PROGRESS' && !job.startedAt) {
          job.startedAt = new Date().toISOString();
        }
        if (newStatus === 'DONE' || newStatus === 'READY') {
          job.completedAt = new Date().toISOString();
          job.durationMinutes = Math.floor(Math.random() * 30) + 15;
        }

        // Update corresponding item in parent order
        const order = draft.orders.find(o => o.id === job.orderId);
        if (order) {
          const item = order.items.find(it => it.id === job.orderItemId || it.serviceName === job.serviceName);
          if (item) {
            item.productionStatus = newStatus;
            if (newStatus === 'IN_PRODUCTION') item.startedAt = new Date().toISOString();
            if (newStatus === 'DONE' || newStatus === 'READY') item.completedAt = new Date().toISOString();
          }

          // Recompute order global status
          order.status = computeDynamicOrderStatus(order.items);
          order.deliveryStatus = computeDynamicDeliveryStatus(order.items);
          order.updatedAt = new Date().toISOString();

          if (newStatus === 'DONE' || newStatus === 'READY') {
            draft.notifications.unshift({
              id: `notif-prod-${Date.now()}`,
              tenantId: currentTenant?.id || 't-001',
              title: 'Prestation Prête',
              message: `La prestation "${job.itemDescription}" de la commande ${job.orderNumber} (${job.personName}) est prête.`,
              type: 'SUCCESS',
              link: '/orders',
              isRead: false,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    });

    dbStore.logAudit('PRODUCTION_STATUS_UPDATED', 'PRODUCTION_JOB', jobId, null, { newStatus });
    showToast('Atelier', `Prestation passée au statut : ${newStatus}`, 'SUCCESS');
  };

  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    dbStore.updateState(draft => {
      const j = draft.productionJobs.find(item => item.id === selectedJob.id);
      if (j) {
        j.notes = jobNote;
      }
    });

    showToast('Enregistré', 'Notes et observations atelier sauvegardées.', 'SUCCESS');
    setSelectedJob(null);
  };

  const renderJobCard = (job: ProductionJob) => {
    const isUrgent = job.priority === 'URGENT' || job.priority === 'HIGH';
    return (
      <div
        key={job.id}
        className={`p-4 bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 hover:shadow-md ${
          isUrgent
            ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="font-mono font-extrabold text-xs text-brand-600 dark:text-brand-400">
            {job.orderNumber}
          </span>
          <div className="flex items-center gap-1">
            {job.department && (
              <Badge variant="outline" size="sm" className="text-[9px]">
                {job.department}
              </Badge>
            )}
            <Badge
              variant={
                job.priority === 'URGENT'
                  ? 'danger'
                  : job.priority === 'HIGH'
                  ? 'warning'
                  : 'secondary'
              }
              size="sm"
            >
              {job.priority}
            </Badge>
          </div>
        </div>

        <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
          {job.itemDescription}
        </h4>
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          <span>Client : <strong>{job.personName}</strong></span>
          <span className="font-bold">{job.quantity} {job.unit}</span>
        </div>

        {job.notes && (
          <div className="mt-2 text-[11px] bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
            💬 {job.notes}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[90px]">{job.assignedToUserName || 'Non assigné'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {(job.status === 'TODO' || job.status === 'PENDING') && (
              <Button
                size="sm"
                variant="primary"
                icon={Play}
                onClick={() => handleUpdateJobStatus(job.id, 'IN_PROGRESS')}
                className="text-xs font-bold"
              >
                Démarrer
              </Button>
            )}

            {job.status === 'IN_PROGRESS' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Pause}
                  onClick={() => handleUpdateJobStatus(job.id, 'PAUSED')}
                  className="text-xs"
                >
                  Pause
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={CheckCircle2}
                  onClick={() => handleUpdateJobStatus(job.id, 'DONE')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                >
                  Terminer
                </Button>
              </>
            )}

            {job.status === 'PAUSED' && (
              <Button
                size="sm"
                variant="primary"
                icon={Play}
                onClick={() => handleUpdateJobStatus(job.id, 'IN_PROGRESS')}
                className="text-xs font-bold"
              >
                Reprendre
              </Button>
            )}

            {(job.status === 'DONE' || job.status === 'READY') && (
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Prête
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Factory className="w-6 h-6 text-brand-500" />
            Atelier de Production — Suivi par Prestation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pilotage granulaire des travaux : Design, Impression, Façonnage, Photocopie et Photo numérique.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs font-semibold"
          >
            <option value="ALL">Tous les Pôles</option>
            <option value="PHOTOCOPY">Photocopie</option>
            <option value="PRINT">Impression</option>
            <option value="DESIGN">Infographie & Design</option>
            <option value="FINISHING">Façonnage & Reliure</option>
            <option value="PHOTO">Photo Numérique</option>
          </Select>

          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="text-xs font-semibold"
          >
            <option value="ALL">Toutes Priorités</option>
            <option value="URGENT">🔴 Urgentes</option>
            <option value="HIGH">🟠 Hautes</option>
            <option value="NORMAL">🟢 Normales</option>
          </Select>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Colonne 1 : À Traiter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/60">
            <span className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              En Attente
            </span>
            <Badge variant="warning" size="sm" className="font-extrabold">{pendingJobs.length}</Badge>
          </div>
          <div className="space-y-3 min-h-[300px]">
            {pendingJobs.map(renderJobCard)}
            {pendingJobs.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-2xl">
                Aucune prestation en attente.
              </div>
            )}
          </div>
        </div>

        {/* Colonne 2 : En Cours */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-brand-50 dark:bg-brand-950/40 rounded-2xl border border-brand-200 dark:border-brand-900/60">
            <span className="font-bold text-xs text-brand-900 dark:text-brand-200 flex items-center gap-1.5">
              <Play className="w-4 h-4 text-brand-500 animate-pulse" />
              En Fabrication
            </span>
            <Badge variant="primary" size="sm" className="font-extrabold">{inProgressJobs.length}</Badge>
          </div>
          <div className="space-y-3 min-h-[300px]">
            {inProgressJobs.map(renderJobCard)}
            {inProgressJobs.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-2xl">
                Aucun travail en cours.
              </div>
            )}
          </div>
        </div>

        {/* Colonne 3 : En Pause */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Pause className="w-4 h-4 text-slate-500" />
              En Pause
            </span>
            <Badge variant="secondary" size="sm" className="font-extrabold">{pausedJobs.length}</Badge>
          </div>
          <div className="space-y-3 min-h-[300px]">
            {pausedJobs.map(renderJobCard)}
            {pausedJobs.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-2xl">
                Aucune tâche en pause.
              </div>
            )}
          </div>
        </div>

        {/* Colonne 4 : Terminées */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900/60">
            <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Prêtes / Terminées
            </span>
            <Badge variant="success" size="sm" className="font-extrabold">{doneJobs.length}</Badge>
          </div>
          <div className="space-y-3 min-h-[300px]">
            {doneJobs.map(renderJobCard)}
            {doneJobs.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-2xl">
                Aucune prestation prête.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
