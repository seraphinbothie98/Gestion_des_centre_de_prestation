import React, { useState, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { isValidPhoneNumber } from '../../lib/phoneValidation';
import { Select } from '../../components/ui/Select';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, generateDocNumber, formatDate } from '../../lib/utils';
import { PaymentMethod } from '../../types';
import { GraduationCap, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';

interface QuickEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnrollmentCreated?: (enrollmentId: string) => void;
}

export const QuickEnrollmentModal: React.FC<QuickEnrollmentModalProps> = ({
  isOpen,
  onClose,
  onEnrollmentCreated,
}) => {
  const { currentTenant, currentUser } = useAuth();
  const { showToast } = useNotification();
  const state = dbStore.getState();

  // Learner State
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>(state.persons.find(p => p.types.includes('LEARNER'))?.id || state.persons[0]?.id || '');
  const [isCreatingNewLearner, setIsCreatingNewLearner] = useState(false);
  const [newLearnerName, setNewLearnerName] = useState('');
  const [newLearnerPhone, setNewLearnerPhone] = useState('');
  const [newLearnerEducation, setNewLearnerEducation] = useState('Licence / Bac+3');

  // Training & Session
  const [selectedSessionId, setSelectedSessionId] = useState<string>(state.trainingSessions[0]?.id || '');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Payment
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const selectedSession = useMemo(() => {
    return state.trainingSessions.find(s => s.id === selectedSessionId);
  }, [selectedSessionId, state.trainingSessions]);

  const selectedTraining = useMemo(() => {
    return state.trainings.find(t => t.id === selectedSession?.trainingId);
  }, [selectedSession, state.trainings]);

  const selectedPerson = useMemo(() => {
    return state.persons.find(p => p.id === selectedLearnerId);
  }, [selectedLearnerId, state.persons]);

  // Pricing calculation
  const basePrice = selectedSession ? selectedSession.price : 0;
  const discountAmount = (basePrice * Math.min(100, Math.max(0, discountPercent))) / 100;
  const finalAmount = basePrice - discountAmount;
  const dueAmount = Math.max(0, finalAmount - paymentAmount);

  // Available seats calculation
  const enrolledCount = state.enrollments.filter(e => e.sessionId === selectedSessionId && e.status !== 'CANCELLED').length;
  const maxCapacity = selectedSession ? selectedSession.capacity : 20;
  const availableSeats = Math.max(0, maxCapacity - enrolledCount);
  const isFull = availableSeats <= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isFull) {
      showToast('Session complète', 'La capacité maximale de cette session est atteinte.', 'DANGER');
      return;
    }

    let learnerId = selectedLearnerId;
    let learnerName = selectedPerson ? `${selectedPerson.firstName} ${selectedPerson.lastName}` : '';
    let learnerPhone = selectedPerson?.phone || '';

    if (isCreatingNewLearner) {
      if (!newLearnerName.trim()) {
        showToast('Erreur', 'Veuillez renseigner le nom de l\'apprenant', 'DANGER');
        return;
      }

      if (newLearnerPhone.trim() && !isValidPhoneNumber(newLearnerPhone, { allowEmpty: true })) {
        showToast('Erreur Téléphone', "Le numéro de téléphone de l'apprenant est invalide.", 'DANGER');
        return;
      }
      const parts = newLearnerName.trim().split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || firstName;
      const newPersonId = `p-${Date.now()}`;

      dbStore.updateState(draft => {
        draft.persons.unshift({
          id: newPersonId,
          tenantId: currentTenant?.id || 't-001',
          firstName,
          lastName,
          phone: newLearnerPhone,
          types: ['LEARNER', 'CUSTOMER'],
          isActive: true,
          createdAt: new Date().toISOString(),
          learnerProfile: {
            learnerNumber: `APP-${Date.now().toString().slice(-4)}`,
            educationLevel: newLearnerEducation,
            profession: 'Apprenant',
          }
        });
      });

      learnerId = newPersonId;
      learnerName = newLearnerName;
      learnerPhone = newLearnerPhone;
    }

    // Prevent duplicate enrollment in same session
    const alreadyEnrolled = state.enrollments.some(e => e.sessionId === selectedSessionId && e.learnerId === learnerId && e.status !== 'CANCELLED');
    if (alreadyEnrolled) {
      showToast('Déjà inscrit', 'Cet apprenant est déjà inscrit à cette session.', 'WARNING');
      return;
    }

    const enrollmentSeq = state.enrollments.length + 1;
    const enrollmentNumber = generateDocNumber('INS', enrollmentSeq);
    const enrollmentId = `enr-${Date.now()}`;

    dbStore.updateState(draft => {
      // 1. Create Enrollment
      draft.enrollments.unshift({
        id: enrollmentId,
        tenantId: currentTenant?.id || 't-001',
        sessionId: selectedSessionId,
        sessionCode: selectedSession?.sessionCode || '',
        trainingTitle: selectedSession?.trainingTitle || '',
        learnerId,
        learnerName,
        learnerPhone,
        enrollmentNumber,
        status: paymentAmount >= finalAmount ? 'CONFIRMED' : 'PENDING',
        price: basePrice,
        discountAmount,
        finalAmount,
        paidAmount: Math.min(finalAmount, paymentAmount),
        dueAmount,
        enrolledAt: new Date().toISOString(),
      });

      // Update enrolledCount on session
      const s = draft.trainingSessions.find(sess => sess.id === selectedSessionId);
      if (s) s.enrolledCount += 1;

      // 2. Record Payment if provided
      if (paymentAmount > 0) {
        const paymentNumber = generateDocNumber('PAY', draft.payments.length + 1);
        const openSession = draft.cashSessions.find(cs => cs.status === 'OPEN');
        const paymentId = `pay-${Date.now()}`;

        draft.payments.unshift({
          id: paymentId,
          tenantId: currentTenant?.id || 't-001',
          cashSessionId: openSession?.id,
          personId: learnerId,
          personName: learnerName,
          targetType: 'ENROLLMENT',
          enrollmentId,
          enrollmentNumber,
          paymentNumber,
          amount: paymentAmount,
          paymentMethod,
          reference: `INSCRIPTION-${enrollmentNumber}`,
          receivedByUserName: `${currentUser?.firstName} ${currentUser?.lastName}`,
          notes: `Frais d'inscription session ${selectedSession?.sessionCode}`,
          createdAt: new Date().toISOString(),
        });

        if (openSession && paymentMethod === 'CASH') {
          openSession.movements.unshift({
            id: `cm-${Date.now()}`,
            cashSessionId: openSession.id,
            movementType: 'INFLOW',
            amount: paymentAmount,
            category: 'Paiement Formation',
            reason: `Inscription ${enrollmentNumber} (${learnerName})`,
            paymentId,
            performedByUserName: `${currentUser?.firstName} ${currentUser?.lastName}`,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    dbStore.logAudit('ENROLLMENT_CREATED', 'ENROLLMENT', enrollmentId, null, {
      enrollmentNumber,
      learnerName,
      sessionCode: selectedSession?.sessionCode,
      paidAmount: paymentAmount,
    });

    showToast('Inscription confirmée', `Inscription ${enrollmentNumber} enregistrée avec succès !`, 'SUCCESS');
    onEnrollmentCreated?.(enrollmentId);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle Inscription à une Formation" maxWidth="3xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Learner */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-500" />
              1. Choix ou Création de l'Apprenant
            </h4>
            <button
              type="button"
              onClick={() => setIsCreatingNewLearner(!isCreatingNewLearner)}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isCreatingNewLearner ? 'Choisir apprenant existant' : '+ Créer nouvel apprenant'}
            </button>
          </div>

          {!isCreatingNewLearner ? (
            <Select
              label="Sélectionner l'apprenant"
              value={selectedLearnerId}
              onChange={(e) => setSelectedLearnerId(e.target.value)}
              options={state.persons.map(p => ({
                value: p.id,
                label: `${p.firstName} ${p.lastName} (${p.phone || 'Sans tél'})`,
              }))}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Nom & Prénom"
                placeholder="ex: Fodé Bangoura"
                value={newLearnerName}
                onChange={(e) => setNewLearnerName(e.target.value)}
                required
              />
              <PhoneInput
                label="Téléphone"
                placeholder="ex: +224 621..."
                value={newLearnerPhone}
                onChange={(e) => setNewLearnerPhone(e.target.value)}
              />
              <Input
                label="Niveau d'études"
                placeholder="ex: Master 1 / Professionnel"
                value={newLearnerEducation}
                onChange={(e) => setNewLearnerEducation(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Step 2: Training & Session Selection */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            2. Choix de la Session de Formation
          </h4>
          <Select
            label="Session disponible"
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            options={state.trainingSessions.map(s => ({
              value: s.id,
              label: `${s.sessionCode} — ${s.trainingTitle} (${s.scheduleDescription || 'Horaires standards'})`,
            }))}
          />

          {selectedSession && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Formateur</span>
                <span className="font-semibold">{selectedSession.trainerName || 'Non assigné'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Salle</span>
                <span className="font-semibold">{selectedSession.classroomName || 'Salle principale'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Dates</span>
                <span className="font-semibold">
                  {formatDate(selectedSession.startDate)} au {formatDate(selectedSession.endDate)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Places Restantes</span>
                <span
                  className={`font-extrabold ${
                    isFull ? 'text-rose-500' : 'text-emerald-500'
                  }`}
                >
                  {availableSeats} / {maxCapacity} places
                </span>
              </div>
            </div>
          )}

          {isFull && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-800/40">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Cette session est complète. Impossible d'inscrire de nouveaux apprenants.</span>
            </div>
          )}
        </div>

        {/* Step 3: Payment & Fees */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
            <span className="text-slate-400">Tarif standard de formation :</span>
            <span className="font-semibold">{formatCurrency(basePrice)}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Remise exceptionnelle (%)"
              type="number"
              min={0}
              max={100}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="bg-slate-800 border-slate-700 text-white"
            />
            <Input
              label="Montant encaissé"
              type="number"
              min={0}
              max={finalAmount}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Math.max(0, parseInt(e.target.value) || 0))}
              className="bg-slate-800 border-slate-700 text-white font-bold"
            />
            <Select
              label="Mode de paiement"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="bg-slate-800 border-slate-700 text-white"
              options={[
                { value: 'CASH', label: 'Espèces' },
                { value: 'ORANGE_MONEY', label: 'Orange Money' },
                { value: 'MTN_MOMO', label: 'MTN MoMo' },
                { value: 'BANK_TRANSFER', label: 'Virement bancaire' },
              ]}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div>
              <span className="text-[10px] uppercase text-slate-400 block">Total Final :</span>
              <span className="text-sm font-bold text-brand-400">{formatCurrency(finalAmount)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 block">Reste à payer :</span>
              <span className={`text-sm font-bold ${dueAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {formatCurrency(dueAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" icon={CheckCircle2} disabled={isFull}>
            Valider l'Inscription
          </Button>
        </div>
      </form>
    </Modal>
  );
};
