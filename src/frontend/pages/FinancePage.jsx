import React, { useCallback, useEffect, useMemo, useState } from "react";
import { dataProvider, dataProviderName } from "../../services/dataProvider";

const money = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);
const emptyForms = {
  contract: { objectId: "", number: "", customerName: "", amount: "", startsOn: today(), endsOn: "", status: "active" },
  budget: { objectId: "", category: "Монтаж дверей", plannedAmount: "", committedAmount: "", actualAmount: "", periodStart: today(), periodEnd: "", comment: "" },
  transaction: { objectId: "", transactionType: "expense", category: "Монтажные работы", amount: "", occurredOn: today(), status: "confirmed", comment: "" },
};

function demoRows(objects) {
  return objects.map((object, index) => {
    const contractAmount = 48_000_000 + index * 9_500_000;
    const budgetPlan = contractAmount * 0.72;
    const readiness = Number(object.readiness ?? 38) / 100;
    const income = contractAmount * Math.min(readiness + 0.08, 1);
    const expenses = budgetPlan * Math.min(readiness + 0.03, 1);
    return { objectId: object.id, name: object.name, contractAmount, budgetPlan, budgetActual: expenses, income, expenses, cashMargin: income - expenses };
  });
}

function FinanceForm({ kind, form, objects, busy, onChange, onSubmit, onCancel }) {
  return <form className="finance-entry-form" onSubmit={onSubmit}>
    <label>Объект<select required value={form.objectId} onChange={(event) => onChange("objectId", event.target.value)}><option value="">Выберите объект</option>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></label>
    {kind === "contract" && <>
      <label>Номер договора<input required value={form.number} onChange={(event) => onChange("number", event.target.value)} /></label>
      <label>Заказчик<input required value={form.customerName} onChange={(event) => onChange("customerName", event.target.value)} /></label>
      <label>Сумма, ₽<input required min="0" type="number" value={form.amount} onChange={(event) => onChange("amount", event.target.value)} /></label>
      <label>Начало<input type="date" value={form.startsOn} onChange={(event) => onChange("startsOn", event.target.value)} /></label>
      <label>Окончание<input type="date" value={form.endsOn} onChange={(event) => onChange("endsOn", event.target.value)} /></label>
    </>}
    {kind === "budget" && <>
      <label>Категория<input required value={form.category} onChange={(event) => onChange("category", event.target.value)} /></label>
      <label>План, ₽<input required min="0" type="number" value={form.plannedAmount} onChange={(event) => onChange("plannedAmount", event.target.value)} /></label>
      <label>Обязательства, ₽<input min="0" type="number" value={form.committedAmount} onChange={(event) => onChange("committedAmount", event.target.value)} /></label>
      <label>Факт, ₽<input min="0" type="number" value={form.actualAmount} onChange={(event) => onChange("actualAmount", event.target.value)} /></label>
      <label>Начало периода<input type="date" value={form.periodStart} onChange={(event) => onChange("periodStart", event.target.value)} /></label>
      <label>Конец периода<input type="date" value={form.periodEnd} onChange={(event) => onChange("periodEnd", event.target.value)} /></label>
    </>}
    {kind === "transaction" && <>
      <label>Тип<select value={form.transactionType} onChange={(event) => onChange("transactionType", event.target.value)}><option value="income">Поступление</option><option value="expense">Расход</option></select></label>
      <label>Категория<input required value={form.category} onChange={(event) => onChange("category", event.target.value)} /></label>
      <label>Сумма, ₽<input required min="0" type="number" value={form.amount} onChange={(event) => onChange("amount", event.target.value)} /></label>
      <label>Дата<input required type="date" value={form.occurredOn} onChange={(event) => onChange("occurredOn", event.target.value)} /></label>
      <label>Статус<select value={form.status} onChange={(event) => onChange("status", event.target.value)}><option value="confirmed">Подтверждено</option><option value="planned">Запланировано</option></select></label>
    </>}
    {kind !== "contract" && <label className="finance-form-wide">Комментарий<input value={form.comment} onChange={(event) => onChange("comment", event.target.value)} /></label>}
    <div className="finance-form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Отмена</button><button className="primary-button" disabled={busy}>{busy ? "Сохраняем..." : "Сохранить"}</button></div>
  </form>;
}

export default function FinancePage({ objects, user, provider = dataProvider, isRemote = dataProviderName === "supabase" }) {
  const canWrite = ["creator", "company_head"].includes(user.role);
  const [rows, setRows] = useState(() => isRemote ? [] : demoRows(objects));
  const [details, setDetails] = useState({ contracts: [], budgets: [], transactions: [] });
  const [loading, setLoading] = useState(isRemote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState("");
  const [forms, setForms] = useState(emptyForms);

  const load = useCallback(async () => {
    setError("");
    if (!isRemote) {
      setRows(demoRows(objects));
      setDetails({ contracts: provider.contracts.getAll(), budgets: provider.budgetItems.getAll(), transactions: provider.financialTransactions.getAll() });
      return;
    }
    setLoading(true);
    try {
      const [summary, contracts, budgets, transactions] = await Promise.all([
        provider.analytics.getFinancialSummary(), provider.contracts.getAll(), provider.budgetItems.getAll(), provider.financialTransactions.getAll(),
      ]);
      setRows(summary);
      setDetails({ contracts, budgets, transactions });
    } catch (loadError) {
      setError(loadError?.message ?? "Не удалось загрузить финансовый контур");
    } finally {
      setLoading(false);
    }
  }, [isRemote, objects, provider]);

  useEffect(() => { load(); }, [load]);
  const objectNames = useMemo(() => new Map(objects.map((object) => [object.id, object.name])), [objects]);
  const totals = useMemo(() => rows.reduce((result, row) => ({
    contractAmount: result.contractAmount + Number(row.contractAmount ?? 0), budgetPlan: result.budgetPlan + Number(row.budgetPlan ?? 0),
    budgetActual: result.budgetActual + Number(row.budgetActual ?? 0), income: result.income + Number(row.income ?? 0),
    expenses: result.expenses + Number(row.expenses ?? 0), cashMargin: result.cashMargin + Number(row.cashMargin ?? 0),
  }), { contractAmount: 0, budgetPlan: 0, budgetActual: 0, income: 0, expenses: 0, cashMargin: 0 }), [rows]);

  if (user.role === "itr") return <section className="empty-plan">Финансовые показатели недоступны для роли ИТР.</section>;

  const changeForm = (field, value) => setForms((current) => ({ ...current, [editor]: { ...current[editor], [field]: value } }));
  const save = async (event) => {
    event.preventDefault();
    const form = forms[editor];
    const object = objects.find((item) => item.id === form.objectId);
    if (!object) return;
    setBusy(true);
    setError("");
    try {
      const base = { companyId: user.companyId ?? object.companyId, objectId: form.objectId };
      if (editor === "contract") await provider.contracts.create({ ...base, ...form, amount: Number(form.amount), endsOn: form.endsOn || null });
      if (editor === "budget") await provider.budgetItems.create({ ...base, ...form, plannedAmount: Number(form.plannedAmount), committedAmount: Number(form.committedAmount || 0), actualAmount: Number(form.actualAmount || 0), periodEnd: form.periodEnd || null });
      if (editor === "transaction") await provider.financialTransactions.create({ ...base, ...form, amount: Number(form.amount) });
      setForms((current) => ({ ...current, [editor]: { ...emptyForms[editor] } }));
      setEditor("");
      await load();
    } catch (saveError) {
      setError(saveError?.message ?? "Не удалось сохранить финансовую запись");
    } finally {
      setBusy(false);
    }
  };

  return <section className="finance-page">
    <div className="panel-title"><div><h2>Финансовый контур</h2><p>Договоры, бюджет и движение денежных средств по доступным объектам.</p></div></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="executive-kpis">
      <div className="executive-kpi"><span>Портфель договоров</span><strong>{money.format(totals.contractAmount)}</strong></div>
      <div className="executive-kpi"><span>Плановый бюджет</span><strong>{money.format(totals.budgetPlan)}</strong></div>
      <div className="executive-kpi success"><span>Поступления</span><strong>{money.format(totals.income)}</strong></div>
      <div className="executive-kpi warning"><span>Расходы</span><strong>{money.format(totals.expenses)}</strong></div>
      <div className={`executive-kpi ${totals.cashMargin >= 0 ? "success" : "danger"}`}><span>Денежная маржа</span><strong>{money.format(totals.cashMargin)}</strong></div>
    </div>
    <div className="brigade-card">
      <div className="panel-title"><div><h3>Экономика объектов</h3><p>{loading ? "Загрузка..." : `${rows.length} объектов в сводке`}</p></div></div>
      <div className="brigade-table-wrap"><table className="executive-table"><thead><tr><th>Объект</th><th>Договор</th><th>Бюджет</th><th>Факт затрат</th><th>Поступления</th><th>Расходы</th><th>Маржа</th><th>Бюджет</th></tr></thead><tbody>{rows.map((row) => {
        const utilization = Number(row.budgetPlan) ? Math.round(Number(row.budgetActual) / Number(row.budgetPlan) * 100) : 0;
        return <tr key={row.objectId}><td><strong>{row.name}</strong></td><td>{money.format(row.contractAmount)}</td><td>{money.format(row.budgetPlan)}</td><td>{money.format(row.budgetActual)}</td><td>{money.format(row.income)}</td><td>{money.format(row.expenses)}</td><td className={Number(row.cashMargin) >= 0 ? "positive-value" : "negative-value"}>{money.format(row.cashMargin)}</td><td>{utilization}%</td></tr>;
      })}</tbody></table></div>
    </div>
    <div className="finance-ledgers">
      <section className="brigade-card"><div className="panel-title"><div><h3>Договоры</h3><p>{details.contracts.length} записей</p></div>{canWrite && <button className="primary-button" onClick={() => setEditor("contract")}>Добавить</button>}</div><div className="finance-list">{details.contracts.map((item) => <article key={item.id}><div><strong>{item.number}</strong><span>{objectNames.get(item.objectId)} · {item.customerName}</span></div><b>{money.format(item.amount)}</b></article>)}{!details.contracts.length && <p>Договоры ещё не заведены.</p>}</div></section>
      <section className="brigade-card"><div className="panel-title"><div><h3>Статьи бюджета</h3><p>{details.budgets.length} записей</p></div>{canWrite && <button className="primary-button" onClick={() => setEditor("budget")}>Добавить</button>}</div><div className="finance-list">{details.budgets.map((item) => <article key={item.id}><div><strong>{item.category}</strong><span>{objectNames.get(item.objectId)} · факт {money.format(item.actualAmount)}</span></div><b>{money.format(item.plannedAmount)}</b></article>)}{!details.budgets.length && <p>Бюджет ещё не сформирован.</p>}</div></section>
      <section className="brigade-card"><div className="panel-title"><div><h3>Операции</h3><p>{details.transactions.length} записей</p></div>{canWrite && <button className="primary-button" onClick={() => setEditor("transaction")}>Добавить</button>}</div><div className="finance-list">{details.transactions.slice(0, 20).map((item) => <article key={item.id}><div><strong>{item.category}</strong><span>{objectNames.get(item.objectId)} · {item.occurredOn}</span></div><b className={item.transactionType === "income" ? "positive-value" : "negative-value"}>{item.transactionType === "income" ? "+" : "−"}{money.format(item.amount)}</b></article>)}{!details.transactions.length && <p>Финансовых операций пока нет.</p>}</div></section>
    </div>
    {editor && <div className="modal-backdrop" role="presentation" onMouseDown={() => !busy && setEditor("")}><div className="modal-card finance-modal" role="dialog" aria-modal="true" aria-label="Новая финансовая запись" onMouseDown={(event) => event.stopPropagation()}><div className="panel-title"><div><h3>{editor === "contract" ? "Новый договор" : editor === "budget" ? "Статья бюджета" : "Финансовая операция"}</h3><p>Запись попадёт в управленческую сводку после сохранения.</p></div></div><FinanceForm kind={editor} form={forms[editor]} objects={objects} busy={busy} onChange={changeForm} onSubmit={save} onCancel={() => setEditor("")} /></div></div>}
  </section>;
}
