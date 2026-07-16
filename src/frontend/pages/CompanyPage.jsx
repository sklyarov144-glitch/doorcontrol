import React, { useEffect, useMemo, useState } from "react";
import { dataProvider } from "../../services/dataProvider";
import { roleLabels } from "../domain/roles";

const fallbackCompany = (user) => ({ id: user.companyId || "demo-company", name: "ГРОСС", status: "active" });

export default function CompanyPage({ objects = [], users = [], user, onOpenObjects, provider = dataProvider }) {
  const [company, setCompany] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.resolve(provider.companies.getAll())
      .then((rows) => {
        if (!active) return;
        const current = (rows ?? []).find((item) => !user.companyId || item.id === user.companyId) ?? (rows ?? [])[0] ?? fallbackCompany(user);
        setCompany(current);
        setDraftName(current.name);
      })
      .catch((loadError) => {
        console.error("Unable to load company", loadError);
        if (active) setError("Не удалось загрузить данные компании.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [provider, user]);

  const stats = useMemo(() => {
    const activeUsers = users.filter((account) => (account.status ?? "active") === "active");
    return {
      objects: objects.length,
      buildings: objects.reduce((sum, object) => sum + (object.buildings?.length ?? 0), 0),
      users: activeUsers.length,
      itr: activeUsers.filter((account) => account.role === "itr").length,
    };
  }, [objects, users]);

  const roleCounts = useMemo(() => Object.keys(roleLabels).map((role) => ({
    role,
    count: users.filter((account) => account.role === role && (account.status ?? "active") === "active").length,
  })), [users]);

  const saveCompany = async (event) => {
    event.preventDefault();
    const name = draftName.trim();
    if (!name || !company) return;
    setSaving(true);
    setError("");
    try {
      const stored = await Promise.resolve(company.id === "demo-company"
        ? provider.companies.create({ name, status: "active" })
        : provider.companies.update(company.id, { name }));
      setCompany(stored ?? { ...company, name });
      setEditing(false);
    } catch (saveError) {
      setError(saveError?.message ?? "Не удалось сохранить компанию.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <section className="empty-state">Загружаем компанию...</section>;

  return <section className="company-page">
    <div className="tasks-hero company-hero">
      <div><span>Контур компании</span><h2>{company?.name ?? "Компания"}</h2><p>Единый tenant для объектов, сотрудников, финансов и операционных данных.</p></div>
      <div className="company-hero-actions">
        <button className="secondary-button" type="button" onClick={() => { setDraftName(company?.name ?? ""); setEditing(true); }}>Изменить название</button>
        <button className="primary-button" type="button" onClick={onOpenObjects}>Открыть объекты</button>
      </div>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}

    <div className="executive-kpis company-kpis">
      <div className="executive-kpi"><span>Объектов</span><strong>{stats.objects}</strong></div>
      <div className="executive-kpi"><span>Корпусов</span><strong>{stats.buildings}</strong></div>
      <div className="executive-kpi success"><span>Активных пользователей</span><strong>{stats.users}</strong></div>
      <div className="executive-kpi"><span>Инженеров ИТР</span><strong>{stats.itr}</strong></div>
    </div>

    <div className="company-content-grid">
      <section className="brigade-card">
        <div className="panel-title"><div><h3>Команда по ролям</h3><p>Активные аккаунты текущей компании</p></div></div>
        <div className="company-role-list">{roleCounts.map((item) => <div key={item.role}><span>{roleLabels[item.role]}</span><strong>{item.count}</strong></div>)}</div>
      </section>
      <section className="brigade-card">
        <div className="panel-title"><div><h3>Портфель объектов</h3><p>Объекты, доступные текущему владельцу</p></div></div>
        <div className="company-object-list">{objects.map((object) => <div key={object.id}><div><strong>{object.name}</strong><span>{object.address || object.district || "Адрес не указан"}</span></div><b>{object.status || "В работе"}</b></div>)}{!objects.length && <p>Объекты ещё не созданы.</p>}</div>
      </section>
    </div>

    {editing && <div className="modal-backdrop" role="presentation" onMouseDown={() => !saving && setEditing(false)}>
      <form className="modal-card company-edit-modal" onSubmit={saveCompany} onMouseDown={(event) => event.stopPropagation()}>
        <div className="panel-title"><div><h3>Название компании</h3><p>Изменение попадёт в защищённый справочник tenant.</p></div></div>
        <label>Название<input autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} required /></label>
        <div className="form-actions"><button className="secondary-button" type="button" onClick={() => setEditing(false)}>Отмена</button><button className="primary-button" disabled={saving}>{saving ? "Сохраняем..." : "Сохранить"}</button></div>
      </form>
    </div>}
  </section>;
}

