import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { dbStore } from '../../server/db/mockStore';
import { formatDate } from '../../lib/utils';
import { History, Shield, Activity } from 'lucide-react';

export const AuditView: React.FC = () => {
  const state = dbStore.getState();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-brand-500" />
            Piste d'Audit & Traçabilité Immuable
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Journalisation en temps réel de l'ensemble des créations, modifications de statuts et opérations financières.
          </p>
        </div>
      </div>

      {/* Audit Logs Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Heure</TableHead>
              <TableHead>Action / Événement</TableHead>
              <TableHead>Entité Concernée</TableHead>
              <TableHead>Auteur de l'action</TableHead>
              <TableHead>Détails & Payload JSON</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.auditLogs.map(log => (
              <TableRow key={log.id}>
                <TableCell>
                  <span className="font-mono text-xs text-slate-500">
                    {formatDate(log.createdAt, 'dd/MM/yyyy HH:mm:ss')}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="primary" size="sm" className="font-mono">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {log.entityType}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {log.userName}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-[11px] text-slate-500 truncate max-w-md block bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                    {JSON.stringify(log.newValues || log.oldValues || {})}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
