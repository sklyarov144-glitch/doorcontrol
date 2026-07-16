import React, { useMemo } from "react";
import { canCreate, canEdit, canManageUsers, canView, roles } from "../domain/permissions";
import { roleLabels } from "../domain/roles";

const roleDescriptions = {
  creator: "Системный владелец: контроль платформы, tenant компании и ролей.",
  company_head: "Управление компанией, объектами, финансами и командой.",
  construction_director: "Операционное управление назначенными объектами и ИТР.",
  itr: "Работа на назначенных объектах: корпуса, этажи, двери и документы.",
};

const capabilities = [
  { id: "dashboard", label: "Управленческий дашборд", allowed: (user) => canView(user, "company_dashboard") },
  { id: "objects", label: "Просмотр доступных объектов", allowed: (user) => canView(user, "objects") },
  { id: "create-object", label: "Создание объектов", allowed: (user) => canCreate(user, "object") },
  { id: "structure", label: "Корпуса и этажи", allowed: (user) => canCreate(user, "building") && canEdit(user, "floor") },
  { id: "doors", label: "Рабочие статусы дверей", allowed: (user) => canEdit(user, "door") },
  { id: "tasks", label: "Задачи и уведомления", allowed: (user) => canView(user, "tasks") },
  { id: "documents", label: "Документы и акты ОХ", allowed: (user) => canEdit(user, "document") },
  { id: "finance", label: "Финансовые показатели", allowed: (user) => canView(user, "finance") },
  { id: "users", label: "Управление пользователями", allowed: (user) => canManageUsers(user) },
  { id: "audit", label: "Журнал действий", allowed: (user) => canView(user, "audit") },
  { id: "roles", label: "Матрица ролей", allowed: (user) => canView(user, "roles") },
];

function AccessState({ allowed }) {
  return <span className={`role-access-state ${allowed ? "allowed" : "denied"}`}>{allowed ? "Доступ" : "Нет"}</span>;
}

function accountCountLabel(count) {
  const lastTwo = count % 100;
  const last = count % 10;
  const noun = lastTwo >= 11 && lastTwo <= 14 ? "аккаунтов" : last === 1 ? "аккаунт" : last >= 2 && last <= 4 ? "аккаунта" : "аккаунтов";
  return `${count} ${noun}`;
}

export default function RolesPage({ users = [], onOpenUsers }) {
  const roleStats = useMemo(() => roles.map((role) => {
    const accounts = users.filter((user) => user.role === role);
    return {
      role,
      total: accounts.length,
      active: accounts.filter((user) => (user.status ?? "active") === "active").length,
    };
  }), [users]);

  return <section className="roles-page">
    <div className="tasks-hero roles-hero">
      <div>
        <span>Контроль полномочий</span>
        <h2>Роли и доступы</h2>
        <p>Фактическая матрица интерфейсных прав. Сервер дополнительно проверяет доступ к данным через PostgreSQL RLS.</p>
      </div>
      <button className="primary-button" type="button" onClick={onOpenUsers}>Назначить роль</button>
    </div>

    <div className="roles-summary">
      {roleStats.map(({ role, total, active }) => <article key={role}>
        <div className="role-card-heading"><span>{roleLabels[role]}</span><strong>{active}</strong></div>
        <p>{roleDescriptions[role]}</p>
        <small>{total === active ? accountCountLabel(total) : `${active} активных из ${accountCountLabel(total)}`}</small>
      </article>)}
    </div>

    <section className="role-matrix-card">
      <div className="panel-title">
        <div><h3>Матрица полномочий</h3><p>Права не редактируются в браузере и совпадают с системной моделью ролей.</p></div>
        <span className="role-security-note">RLS защищает данные</span>
      </div>
      <div className="role-matrix-wrap">
        <table className="role-matrix-table">
          <thead><tr><th>Возможность</th>{roles.map((role) => <th key={role}>{roleLabels[role]}</th>)}</tr></thead>
          <tbody>{capabilities.map((capability) => <tr key={capability.id}>
            <td>{capability.label}</td>
            {roles.map((role) => <td key={role}><AccessState allowed={capability.allowed({ role })} /></td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </section>;
}
