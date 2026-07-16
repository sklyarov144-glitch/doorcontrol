import React, { useState } from "react";
import { dataProvider } from "../../services/dataProvider";
import { StatusBadge } from "../components/UiPrimitives";
import { canManageUsers } from "../domain/permissions";
import { roleLabels } from "../domain/roles";
import { assignableRoles, canAssignRole, normalizeUser } from "../domain/users";
import { visibleUsersForManager } from "../domain/objectAccess";

export default function UsersPage({
  users,
  objects,
  currentUser,
  onSave,
  remoteAuth,
  demoPassword = "",
  provider = dataProvider,
}) {
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const visibleUsers = visibleUsersForManager(currentUser, users, objects);
  const canCreate = canManageUsers(currentUser);
  const objectNames = new Map(objects.map((object) => [object.id, object.name]));
  const buildingNames = new Map(
    objects.flatMap((object) =>
      (object.buildings ?? []).map((building) => [building.id, `${object.name} / ${building.name}`])
    )
  );

  const saveUser = async (values) => {
    const prepared = normalizeUser({ ...values, status: values.status ?? "active" });
    setSaving(true);
    setError("");
    try {
      if (remoteAuth) {
        if (prepared.id && users.some((user) => user.id === prepared.id)) {
          await provider.users.save(prepared);
        } else {
          await provider.users.invite({ ...prepared, id: undefined });
        }
        await onSave();
      } else {
        const nextUsers = prepared.id && users.some((user) => user.id === prepared.id)
          ? users.map((user) => user.id === prepared.id ? provider.users.update(prepared.id, prepared) ?? prepared : user)
          : [provider.users.create({ ...prepared, id: prepared.id || `user-${Date.now()}` }), ...users];
        await onSave(nextUsers.map((user) => normalizeUser({ ...user, status: "active" })));
      }
      setEditingUser(null);
    } catch (saveError) {
      setError(saveError?.message ?? "Не удалось сохранить пользователя");
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async (userId) => {
    await onSave(
      users.map((user) =>
        user.id === userId
          ? { ...user, password: demoPassword, updatedAt: new Date().toISOString() }
          : user
      )
    );
  };

  const changeAccountStatus = async (account, status) => {
    setSaving(true);
    setError("");
    try {
      if (remoteAuth) await provider.users.setAccountStatus(account.id, status);
      else provider.users.update(account.id, { status, isActive: status === "active" });
      await onSave();
    } catch (statusError) {
      setError(statusError?.message ?? "Не удалось изменить статус аккаунта");
    } finally {
      setSaving(false);
    }
  };

  const restoreAccountAccess = async (account) => {
    setSaving(true);
    setError("");
    try {
      await provider.users.restoreAccess(account.id);
      await onSave();
    } catch (restoreError) {
      setError(restoreError?.message ?? "Не удалось отправить письмо для восстановления доступа");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="users-page">
      <div className="tasks-hero">
        <div>
          <span>Пользователи и доступы</span>
          <h2>Команда, роли и назначения</h2>
          <p>Приглашения, роли, доступ к объектам и состояние аккаунтов.</p>
        </div>
        {canCreate && (
          <button
            className="primary-button"
            disabled={saving}
            onClick={() => setEditingUser({ status: "active", role: "itr", password: "", assignedObjectIds: [], assignedBuildingIds: [] })}
          >
            Добавить пользователя
          </button>
        )}
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="users-table-wrap">
        <table className="executive-table users-table">
          <thead><tr><th>ФИО</th><th>Роль</th><th>Должность</th><th>Email</th><th>Телефон</th><th>Статус</th><th>Объекты</th><th>Корпуса</th><th>Действия</th></tr></thead>
          <tbody>
            {visibleUsers.map((account) => (
              <tr key={account.id}>
                <td><div className="table-user"><span>{account.avatarUrl ? <img src={account.avatarUrl} alt="" /> : account.name.slice(0, 1)}</span><strong>{account.name}</strong></div></td>
                <td>{roleLabels[account.role]}</td>
                <td>{account.position}</td>
                <td>{account.email}</td>
                <td>{account.phone || "—"}</td>
                <td><StatusBadge value={account.status ?? "active"} /></td>
                <td>{["creator", "company_head"].includes(account.role) && !account.assignedObjectIds?.length ? "Все" : account.assignedObjectIds?.map((id) => objectNames.get(id)).filter(Boolean).join(", ") || "—"}</td>
                <td>{account.assignedBuildingIds?.map((id) => buildingNames.get(id)).filter(Boolean).join(", ") || "—"}</td>
                <td>
                  <div className="task-actions">
                    {canCreate && <button className="secondary-button slim" onClick={() => setEditingUser(account)}>Редактировать</button>}
                    {canCreate && account.id !== currentUser.id && (!remoteAuth || account.status !== "disabled") && <button className="secondary-button slim" disabled={saving} onClick={() => changeAccountStatus(account, "disabled")}>Отключить</button>}
                    {canCreate && remoteAuth && account.id !== currentUser.id && <button className="secondary-button slim" disabled={saving} onClick={() => restoreAccountAccess(account)}>{account.status === "disabled" ? "Восстановить доступ" : "Отправить ссылку входа"}</button>}
                    {canCreate && !remoteAuth && account.status === "disabled" && <button className="secondary-button slim" disabled={saving} onClick={() => changeAccountStatus(account, "active")}>Активировать</button>}
                    {canCreate && !remoteAuth && <button className="secondary-button slim" onClick={() => resetPassword(account.id)}>Сбросить пароль</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingUser && (
        <UserEditModal
          user={editingUser}
          currentUser={currentUser}
          objects={objects}
          remoteAuth={remoteAuth}
          onClose={() => setEditingUser(null)}
          onSave={saveUser}
          saving={saving}
        />
      )}
    </section>
  );
}

export function UserEditModal({ user, currentUser, objects, onClose, onSave, remoteAuth, saving = false }) {
  const isNew = !user.id;
  const [form, setForm] = useState(() => normalizeUser({
    ...user,
    id: user.id ?? `user-${Date.now()}`,
    name: user.name ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    position: user.position ?? "",
    role: user.role ?? "itr",
  }));
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const allowedRoles = assignableRoles(currentUser.role);
  const buildings = objects.flatMap((object) =>
    (object.buildings ?? []).map((building) => ({ ...building, objectName: object.name }))
  );
  const toggle = (field, id) => update(
    field,
    form[field].includes(id) ? form[field].filter((item) => item !== id) : [...form[field], id]
  );

  return (
    <div className="modal-backdrop">
      <form className="task-modal user-edit-modal" onSubmit={(event) => {
        event.preventDefault();
        if (!canAssignRole(currentUser.role, form.role)) return;
        onSave(form);
      }}>
        <div className="modal-title"><div><h2>{user.name ? "Редактировать пользователя" : "Добавить пользователя"}</h2><p>Роль, контакты и назначения.</p></div><button type="button" onClick={onClose}>×</button></div>
        <div className="task-form-grid">
          <label>ФИО<input value={form.name} onChange={(event) => update("name", event.target.value)} required /></label>
          <label>Email<input type="email" value={form.email} readOnly={remoteAuth && !isNew} onChange={(event) => update("email", event.target.value)} required /></label>
          <label>Телефон<input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label>
          <label>Должность<input value={form.position} onChange={(event) => update("position", event.target.value)} /></label>
          <label>Роль<select value={form.role} onChange={(event) => update("role", event.target.value)}>{allowedRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
          <label>Статус<input value={form.status ?? "active"} readOnly /></label>
          {!remoteAuth && isNew && <label>Временный пароль<input type="password" minLength={6} value={form.password} onChange={(event) => update("password", event.target.value)} required /></label>}
          {remoteAuth && isNew && <div className="invitation-hint">Пользователь получит письмо и самостоятельно задаст пароль по защищённой ссылке.</div>}
        </div>
        <h3 className="modal-subtitle">Назначенные объекты</h3>
        <div className="checkbox-grid">{objects.map((object) => <label key={object.id}><input type="checkbox" checked={form.assignedObjectIds.includes(object.id)} onChange={() => toggle("assignedObjectIds", object.id)} />{object.name}</label>)}</div>
        <h3 className="modal-subtitle">Назначенные корпуса</h3>
        <div className="checkbox-grid">{buildings.map((building) => <label key={building.id}><input type="checkbox" checked={form.assignedBuildingIds.includes(building.id)} onChange={() => toggle("assignedBuildingIds", building.id)} />{building.objectName} / {building.name}</label>)}</div>
        <div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button" disabled={saving}>Сохранить пользователя</button></div>
      </form>
    </div>
  );
}
