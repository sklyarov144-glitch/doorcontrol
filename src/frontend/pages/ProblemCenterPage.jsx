import React from "react";
import { getProblemStats, getProblems } from "../storage";

function canSeeProblemObject(problem, user) {
  if (["creator", "company_head"].includes(user.role)) return true;
  if (user.role === "construction_director") return true;
  if (user.role === "itr") {
    return !problem.responsible
      || problem.responsible === "Не назначен"
      || problem.responsible === user.id
      || problem.responsible === user.name;
  }
  return false;
}

export default function ProblemCenterPage({ objects, user, users, onOpen, onCreateTask }) {
  const userNames = new Map(users.map((item) => [item.id, item.name]));
  const problems = getProblems(objects)
    .filter((problem) => canSeeProblemObject(problem, user))
    .map((problem) => ({
      ...problem,
      responsible: userNames.get(problem.responsible) ?? problem.responsible,
    }));
  const stats = getProblemStats(problems);
  const summary = [
    ["Всего проблем", stats.total, "critical"],
    ["Просрочено", stats.overdue, "critical"],
    ["Замечания ТН", stats.tnIssues, "critical"],
    ["Без акта ОХ", stats.noCustodyAct, "warning"],
    ["Проёмы под риск", stats.riskyOpenings, "warning"],
  ];
  const typeCards = [
    "Просроченные двери",
    "Смонтировано без акта ОХ",
    "Замечания ТН",
    "Проёмы под риск",
    "Нет ответственного",
    "Нет документов",
    "Зависшие статусы",
  ];

  return (
    <section className="problem-center">
      <div className="problem-hero">
        <div>
          <span>Контроль рисков</span>
          <h2>Центр проблем</h2>
          <p>Система подсвечивает зоны, где монтаж дверей может зависнуть: статусы, акты, замечания, документы и ответственные.</p>
        </div>
      </div>
      <div className="problem-summary">
        {summary.map(([label, value, tone]) => (
          <div className={`problem-summary-card ${tone}`} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="problem-type-grid">
        {typeCards.map((type) => {
          const count = problems.filter((problem) => problem.type === type).length;
          return <div className="problem-type-card" key={type}><span>{type}</span><strong>{count}</strong></div>;
        })}
      </div>
      <div className="problem-table-card">
        <table className="problem-table">
          <thead>
            <tr>
              <th>Тип проблемы</th>
              <th>Объект</th>
              <th>Корпус</th>
              <th>Этаж</th>
              <th>Дверь / проём</th>
              <th>Ответственный</th>
              <th>Дней</th>
              <th>Приоритет</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((problem) => (
              <tr key={problem.id}>
                <td><strong>{problem.type}</strong></td>
                <td>{problem.object}</td>
                <td>{problem.building}</td>
                <td>{problem.floor}</td>
                <td>{problem.door}</td>
                <td>{problem.responsible || "Не назначен"}</td>
                <td>{problem.days}</td>
                <td><span className={`priority-badge priority-${problem.priority}`}>{problem.priority}</span></td>
                <td>
                  <div className="task-actions">
                    <button className="secondary-button slim" onClick={() => onOpen(problem)}>Открыть</button>
                    {["creator", "company_head", "construction_director"].includes(user.role) && (
                      <button
                        className="primary-button slim"
                        onClick={() => onCreateTask({
                          title: problem.action,
                          description: `${problem.type}: ${problem.object} / ${problem.building} / ${problem.door}`,
                          type: problem.type === "Смонтировано без акта ОХ" ? "Добавить акт АОХ" : problem.type === "Замечания ТН" ? "Проверить замечание ТН" : "Другое",
                          priority: problem.priority,
                          objectId: problem.objectId,
                          buildingId: problem.buildingId,
                          floorId: problem.floorId,
                          doorId: problem.doorId,
                        })}
                      >
                        Задача
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {problems.length === 0 && <div className="empty-plan">Проблем по доступным объектам нет.</div>}
      </div>
    </section>
  );
}
