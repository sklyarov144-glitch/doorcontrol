import React, { useEffect, useMemo, useState } from "react";
import { dataProvider, dataProviderName } from "../../services/dataProvider";

const money = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });

function demoRows(objects) {
  return objects.map((object, index) => {
    const contractAmount = 48_000_000 + index * 9_500_000;
    const budgetPlan = contractAmount * 0.72;
    const readiness = Number(object.readiness ?? 38) / 100;
    const income = contractAmount * Math.min(readiness + 0.08, 1);
    const expenses = budgetPlan * Math.min(readiness + 0.03, 1);
    return {
      objectId: object.id,
      name: object.name,
      contractAmount,
      budgetPlan,
      budgetActual: expenses,
      income,
      expenses,
      cashMargin: income - expenses,
      projectedMargin: contractAmount - expenses,
    };
  });
}

export default function FinancePage({ objects, user }) {
  const [rows, setRows] = useState(() => demoRows(objects));
  const [loading, setLoading] = useState(dataProviderName === "supabase");
  const [error, setError] = useState("");

  useEffect(() => {
    if (dataProviderName !== "supabase") {
      setRows(demoRows(objects));
      return;
    }
    dataProvider.analytics.getFinancialSummary()
      .then(setRows)
      .catch(() => setError("Не удалось загрузить финансовую сводку"))
      .finally(() => setLoading(false));
  }, [objects]);

  const totals = useMemo(() => rows.reduce((result, row) => ({
    contractAmount: result.contractAmount + Number(row.contractAmount ?? 0),
    budgetPlan: result.budgetPlan + Number(row.budgetPlan ?? 0),
    budgetActual: result.budgetActual + Number(row.budgetActual ?? 0),
    income: result.income + Number(row.income ?? 0),
    expenses: result.expenses + Number(row.expenses ?? 0),
    cashMargin: result.cashMargin + Number(row.cashMargin ?? 0),
  }), { contractAmount: 0, budgetPlan: 0, budgetActual: 0, income: 0, expenses: 0, cashMargin: 0 }), [rows]);

  if (user.role === "itr") return <section className="empty-plan">Финансовые показатели недоступны для роли ИТР.</section>;

  return <section className="finance-page">
    <div className="panel-title"><div><h2>Финансовый контур</h2><p>Договоры, бюджет и маржа по доступным объектам.</p></div>{dataProviderName === "local" && <span className="status-badge tone-orange">Демо-данные</span>}</div>
    {error && <div className="form-error">{error}</div>}
    <div className="executive-kpis">
      <div className="executive-kpi"><span>Портфель договоров</span><strong>{money.format(totals.contractAmount)}</strong></div>
      <div className="executive-kpi"><span>Плановый бюджет</span><strong>{money.format(totals.budgetPlan)}</strong></div>
      <div className="executive-kpi success"><span>Поступления</span><strong>{money.format(totals.income)}</strong></div>
      <div className="executive-kpi warning"><span>Расходы</span><strong>{money.format(totals.expenses)}</strong></div>
      <div className={`executive-kpi ${totals.cashMargin >= 0 ? "success" : "danger"}`}><span>Денежная маржа</span><strong>{money.format(totals.cashMargin)}</strong></div>
    </div>
    <div className="brigade-card">
      <div className="panel-title"><div><h3>Экономика объектов</h3><p>{loading ? "Загрузка..." : `${rows.length} объектов в сводке`}</p></div></div>
      <div className="brigade-table-wrap"><table className="executive-table"><thead><tr><th>Объект</th><th>Договор</th><th>Бюджет</th><th>Факт затрат</th><th>Поступления</th><th>Расходы</th><th>Маржа</th><th>Исполнение бюджета</th></tr></thead><tbody>{rows.map((row) => {
        const utilization = Number(row.budgetPlan) ? Math.round(Number(row.budgetActual) / Number(row.budgetPlan) * 100) : 0;
        return <tr key={row.objectId}><td><strong>{row.name}</strong></td><td>{money.format(row.contractAmount)}</td><td>{money.format(row.budgetPlan)}</td><td>{money.format(row.budgetActual)}</td><td>{money.format(row.income)}</td><td>{money.format(row.expenses)}</td><td className={Number(row.cashMargin) >= 0 ? "positive-value" : "negative-value"}>{money.format(row.cashMargin)}</td><td>{utilization}%</td></tr>;
      })}</tbody></table></div>
    </div>
  </section>;
}

