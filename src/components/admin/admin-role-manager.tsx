"use client";

import { useState } from "react";
import { Loader2, Shield } from "lucide-react";
import { updateUserRoleAction } from "@/lib/actions/admin";
import {
  assignableRoles,
  roleLabel,
  USER_ROLE_LABELS,
  type AppUserRole,
} from "@/lib/admin/roles";
import { useAdminAction } from "@/hooks/use-admin-action";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { AdminSectionCard } from "@/components/admin/admin-page";

interface AdminRoleManagerProps {
  userId: string;
  userName: string;
  currentRole: AppUserRole;
  actorRole: AppUserRole;
  actorId: string;
}

export function AdminRoleManager({
  userId,
  userName,
  currentRole,
  actorRole,
  actorId,
}: AdminRoleManagerProps) {
  const { pending, run } = useAdminAction();
  const { confirm, dialog } = useConfirm();
  const [selectedRole, setSelectedRole] = useState<AppUserRole>(currentRole);
  const isSelf = userId === actorId;
  const options = assignableRoles(actorRole);
  const canEdit = options.length > 0 && !isSelf;
  const hasChange = selectedRole !== currentRole;

  async function handleSave() {
    if (!hasChange) return;

    const label = USER_ROLE_LABELS[selectedRole];
    const confirmed = await confirm({
      title: `Attribuer le rôle « ${label} » ?`,
      description: `Cette action prend effet immédiatement pour ${userName}.`,
      confirmLabel: "Attribuer",
    });
    if (!confirmed) return;

    await run(
      () => updateUserRoleAction(userId, selectedRole),
      { success: `Rôle mis à jour : ${label}.` }
    );
  }

  return (
    <>
      {dialog}
    <AdminSectionCard
      title="Rôle et accès"
      description="Définissez les droits d'accès à l'espace administration."
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <label htmlFor="admin-user-role" className="text-sm font-medium text-primary">
            Rôle actuel
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              <Shield className="h-4 w-4" />
              {roleLabel(currentRole)}
            </span>
            {isSelf && (
              <span className="text-xs text-muted-foreground">
                Vous ne pouvez pas modifier votre propre rôle.
              </span>
            )}
          </div>
          {canEdit ? (
            <Select
              id="admin-user-role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as AppUserRole)}
              disabled={pending}
              className="mm-admin-filter-input mt-3 max-w-xs w-full"
            >
              {options.map((role) => (
                <option key={role} value={role}>
                  {USER_ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
          ) : (
            !isSelf && (
              <p className="text-sm text-muted-foreground">
                Seul un super administrateur peut modifier ce compte.
              </p>
            )
          )}
        </div>

        {canEdit && (
          <Button
            type="button"
            variant="secondary"
            className="rounded-full"
            disabled={pending || !hasChange}
            onClick={() => void handleSave()}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer le rôle
          </Button>
        )}
      </div>
    </AdminSectionCard>
    </>
  );
}
