import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { evaluateTenantSubscription } from '../../lib/licenseEngine';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Clock, ShieldAlert, Phone, ShieldCheck, Sparkles, AlertTriangle } from 'lucide-react';
import { ContactSupportModal } from '../../modules/license/ContactSupportModal';
import { RequestActivationModal } from '../../modules/license/RequestActivationModal';

export const TrialBanner: React.FC = () => {
  const { currentTenant } = useAuth();
  const [showContactModal, setShowContactModal] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);

  if (!currentTenant) return null;

  const evaluation = evaluateTenantSubscription(currentTenant);

  // Only display banner if in active TRIAL mode (expired accounts see the dedicated Expired Screen)
  if (evaluation.status !== 'TRIAL') return null;

  const isUrgent = evaluation.daysRemaining <= 3;
  const isWarning = evaluation.daysRemaining <= 7;
  const isNotice = evaluation.daysRemaining <= 15;

  return (
    <>
      <div
        className={`w-full py-1.5 px-4 text-xs flex flex-wrap items-center justify-between gap-2 border-b transition-colors shadow-sm ${
          isUrgent
            ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-950 dark:text-rose-100 border-rose-200 dark:border-rose-900/60'
            : isWarning
            ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-950 dark:text-amber-100 border-amber-200 dark:border-amber-900/60'
            : isNotice
            ? 'bg-yellow-50 dark:bg-yellow-950/80 text-yellow-950 dark:text-yellow-100 border-yellow-200 dark:border-yellow-900/60'
            : 'bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-100 border-emerald-200/60 dark:border-emerald-900/40'
        }`}
      >
        <div className="flex items-center gap-2">
          <Badge
            variant={isUrgent ? 'danger' : isWarning ? 'warning' : 'success'}
            size="sm"
            className="font-extrabold uppercase tracking-wider text-[10px]"
          >
            {isUrgent ? '🔴 Urgence' : isWarning ? '🟠 Avertissement' : '🟢 Version d’Essai'}
          </Badge>

          <span className="font-semibold hidden sm:inline">
            {evaluation.warningMessage}
          </span>
          <span className="font-semibold sm:hidden">
            Essai : reste {evaluation.daysRemaining}j
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={Phone}
            onClick={() => setShowContactModal(true)}
            className="h-6 text-[11px] px-2 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Contacter l'administrateur
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={ShieldCheck}
            onClick={() => setShowActivationModal(true)}
            className="h-6 text-[11px] px-2.5 font-bold shadow-xs bg-brand-600 hover:bg-brand-700"
          >
            Demander l'activation
          </Button>
        </div>
      </div>

      {/* Contact Support Modal */}
      <ContactSupportModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        supportContact={evaluation.supportContact}
        tenantName={currentTenant.name}
        onOpenActivationRequest={() => setShowActivationModal(true)}
      />

      {/* Activation Request Modal */}
      <RequestActivationModal
        isOpen={showActivationModal}
        onClose={() => setShowActivationModal(false)}
      />
    </>
  );
};
