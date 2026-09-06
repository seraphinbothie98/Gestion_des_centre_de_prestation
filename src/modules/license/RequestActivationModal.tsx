import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { isValidPhoneNumber } from '../../lib/phoneValidation';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { dbStore } from '../../server/db/mockStore';
import { ActivationRequest, LicensePlan } from '../../types';
import { ShieldCheck, Send, CheckCircle2, Sparkles, Building } from 'lucide-react';

interface RequestActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RequestActivationModal: React.FC<RequestActivationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentTenant, currentUser } = useAuth();
  const { showToast } = useNotification();

  const [desiredPlan, setDesiredPlan] = useState<LicensePlan>('PROFESSIONAL');
  const [contactName, setContactName] = useState(
    currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''
  );
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || currentTenant?.phone || '');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || currentTenant?.email || '');
  const [message, setMessage] = useState(
    `Bonjour, nous avons testé la version d'essai de Centre Management System et souhaitons souscrire à la licence définitive pour ${currentTenant?.name || 'notre centre'}. Merci de nous transmettre les modalités de paiement.`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !currentUser) return;

    if (!contactPhone.trim() || !isValidPhoneNumber(contactPhone, { allowEmpty: false, required: true })) {
      showToast('Erreur Téléphone', 'Veuillez saisir un numéro de téléphone valide sans lettres ni caractères interdits.', 'DANGER');
      return;
    }

    setIsSubmitting(true);

    const newRequest: ActivationRequest = {
      id: `act-req-${Date.now()}`,
      tenantId: currentTenant.id,
      tenantName: currentTenant.name,
      userId: currentUser.id,
      userName: contactName.trim() || `${currentUser.firstName} ${currentUser.lastName}`,
      userPhone: contactPhone.trim(),
      userEmail: contactEmail.trim(),
      message: message.trim(),
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    dbStore.updateState(draft => {
      const targetTenant = draft.tenants.find(t => t.id === currentTenant.id);
      if (targetTenant) {
        if (!targetTenant.activationRequests) targetTenant.activationRequests = [];
        targetTenant.activationRequests.unshift(newRequest);
      }

      // Notify Super Admins
      draft.notifications.unshift({
        id: `notif-lic-${Date.now()}`,
        tenantId: currentTenant.id,
        title: "Demande d'Activation de Licence Reçue",
        message: `${newRequest.userName} (${currentTenant.name}) demande l'activation de la licence ${desiredPlan}.`,
        type: 'SUCCESS',
        link: '/licenses',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    dbStore.logAudit('LICENSE_ACTIVATION_REQUESTED', 'TENANT', currentTenant.id, null, {
      plan: desiredPlan,
      requester: contactName,
      phone: contactPhone
    });

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
      showToast(
        'Demande transmise',
        "Votre demande d'activation a été transmise avec succès à l'administration centrale.",
        'SUCCESS'
      );
      if (onSuccess) onSuccess();
    }, 600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Demande d'Activation de Licence Définitive"
      maxWidth="md"
    >
      {isSent ? (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Demande d'Activation Transmise !
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Notre équipe commerciale prend contact avec vous sous 24h ouvrées pour finaliser l'activation de votre centre.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-left text-xs space-y-1.5 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-400">Centre :</span>
              <strong className="text-slate-800 dark:text-slate-200">{currentTenant?.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Formule demandée :</span>
              <strong className="text-brand-600">{desiredPlan}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Statut :</span>
              <strong className="text-amber-500">EN ATTENTE DE VALIDATION</strong>
            </div>
          </div>

          <Button variant="primary" onClick={onClose} className="w-full font-bold">
            Retour à l'Application
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs">
          <div className="p-3 bg-brand-50 dark:bg-brand-950/50 rounded-xl border border-brand-200 dark:border-brand-900/60 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-brand-600 shrink-0" />
            <span className="text-brand-950 dark:text-brand-200 leading-snug">
              Débloquez l'accès illimité, le support prioritaire et les sauvegardes automatiques pour <strong>{currentTenant?.name}</strong>.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Formule de Licence Souhaitée
              </label>
              <Select
                value={desiredPlan}
                onChange={(e) => setDesiredPlan(e.target.value as LicensePlan)}
                className="w-full text-xs font-semibold"
                options={[
                  { value: 'PROFESSIONAL', label: '⭐ Professionnel (Recommandé)' },
                  { value: 'ENTERPRISE', label: '🏢 Entreprise & Réseau' },
                  { value: 'UNLIMITED', label: '👑 Illimitée / Permanente' },
                  { value: 'STARTER', label: '🚀 Starter' },
                ]}
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Nom du Responsable *
              </label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                placeholder="Nom complet"
                className="text-xs"
              />
            </div>

            <PhoneInput
              label="Téléphone de Contact"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              required
              placeholder="+224 6XX XX XX XX"
            />

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Email Professionnel
              </label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@centre.com"
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Message / Précisions particulières
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
              placeholder="Indiquez vos besoins particuliers ou toute question..."
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              variant="primary"
              type="submit"
              icon={Send}
              isLoading={isSubmitting}
              className="font-bold shadow-md bg-brand-600 hover:bg-brand-700"
            >
              Transmettre la Demande
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
