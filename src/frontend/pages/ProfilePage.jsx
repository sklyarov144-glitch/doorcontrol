import React, { useState } from "react";
import { roleLabels } from "../domain/roles";
import { normalizeUser } from "../domain/users";
import { isPrivilegedMfaRole } from "../domain/mfa";
import MfaPage from "./MfaPage";

export default function ProfilePage({ user, objects, onSave, onAvatarUpload, remoteAuth = false, mfaAuth = null }) {
  const [form, setForm] = useState({ ...user, oldPassword: "", newPassword: "" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };
  const assignedObjects = objects.filter((object) => form.assignedObjectIds?.includes(object.id));
  const assignedBuildings = objects
    .flatMap((object) =>
      (object.buildings ?? []).map((building) => ({ ...building, objectName: object.name }))
    )
    .filter((building) => form.assignedBuildingIds?.includes(building.id));

  const uploadAvatar = async (file) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const avatar = await onAvatarUpload(file);
      setForm((current) => ({ ...current, ...avatar }));
      setSaved(false);
    } catch {
      setError("Не удалось загрузить аватар");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.newPassword && !form.oldPassword) {
      setError("Введите текущий пароль, чтобы подтвердить смену пароля");
      return;
    }
    if (!remoteAuth && form.newPassword && form.oldPassword !== user.password) {
      setError("Текущий пароль указан неверно");
      return;
    }

    const { oldPassword, newPassword, ...profile } = form;
    setSaving(true);
    try {
      const savedProfile = await onSave(
        normalizeUser({
          ...profile,
          password: remoteAuth ? undefined : newPassword || user.password,
        }),
        { oldPassword, newPassword }
      );
      setForm((current) => ({
        ...current,
        ...savedProfile,
        oldPassword: "",
        newPassword: "",
        password: remoteAuth ? undefined : newPassword || user.password,
      }));
      setSaved(true);
    } catch {
      setError("Не удалось сохранить профиль. Проверьте текущий пароль и соединение.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="profile-panel">
      <div className="profile-card">
        <div className="profile-avatar">
          <div>{form.avatarUrl ? <img src={form.avatarUrl} alt="Аватар" /> : form.name.slice(0, 1)}</div>
          <label>
            {uploading ? "Загрузка..." : "Загрузить аватар"}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(event) => uploadAvatar(event.target.files?.[0])}
            />
          </label>
        </div>
        <form onSubmit={submit}>
          <div className="profile-grid">
            <label>ФИО<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
            <label>Должность<input value={form.position} readOnly /></label>
            <label>Роль<input value={roleLabels[form.role]} readOnly /></label>
            <label>Email<input type="email" value={form.email} readOnly={remoteAuth} onChange={(event) => update("email", event.target.value)} /></label>
            <label>Телефон<input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label>
            <label>Статус<input value={form.status} readOnly /></label>
            <label className="profile-password">Текущий пароль<input type="password" value={form.oldPassword} onChange={(event) => update("oldPassword", event.target.value)} placeholder="Введите старый пароль" /></label>
            <label className="profile-password">Новый пароль<input type="password" value={form.newPassword} onChange={(event) => update("newPassword", event.target.value)} placeholder="Оставьте пустым, если не меняете" /></label>
          </div>
          <div className="profile-assignments">
            <div><span>Назначенные объекты</span><strong>{assignedObjects.map((object) => object.name).join(", ") || "Все / не ограничено"}</strong></div>
            <div><span>Назначенные корпуса</span><strong>{assignedBuildings.map((building) => `${building.objectName} / ${building.name}`).join(", ") || "Не указаны"}</strong></div>
          </div>
          <button className="primary-button" disabled={saving || uploading}>{saving ? "Сохранение..." : "Сохранить профиль"}</button>
          {error && <div className="form-error" role="alert">{error}</div>}
          {saved && <div className="save-notice" role="status">Данные пользователя сохранены</div>}
        </form>
      </div>
      {remoteAuth && mfaAuth && isPrivilegedMfaRole(user.role) && (
        <MfaPage auth={mfaAuth} profile={user} />
      )}
    </section>
  );
}
