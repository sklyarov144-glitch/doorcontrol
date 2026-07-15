import React, { useState } from "react";
import loginDoorHero from "../assets/login-door-hero.jpg";
import BrandMark from "../components/BrandMark";
import { roleLabels } from "../domain/roles";

export default function LoginPage({ users, onLogin, onResetPassword, isDemo = true }) {
  const [email, setEmail] = useState(isDemo ? users[0]?.email ?? "" : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand-zone">
          <BrandMark variant="login" />
          <h1>ГРОСС Бережливый Монтаж</h1>
          <p>Цифровое управление монтажом</p>
          <div className="login-hero-preview" aria-hidden="true">
            <img src={loginDoorHero} alt="" />
          </div>
        </div>
        <form className="login-form" onSubmit={async (event) => {
          event.preventDefault();
          setSubmitting(true);
          const result = await onLogin(email, password);
          setSubmitting(false);
          if (result.ok) {
            setError("");
            return;
          }
          setError(result.message);
        }}>
          <label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.ru" /></label>
          {isDemo && <label>Демо-пользователь<select value={email} onChange={(event) => setEmail(event.target.value)}>{users.map((user) => <option key={user.id} value={user.email}>{user.name} — {roleLabels[user.role]}</option>)}</select></label>}
          <label>Пароль<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Введите пароль" /></label>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" disabled={submitting}>{submitting ? "Входим..." : "Войти"}</button>
          {onResetPassword && <button className="login-recovery-button" type="button" disabled={submitting || !email.trim()} onClick={async () => {
            setSubmitting(true);
            setError("");
            setResetSent(false);
            try {
              await onResetPassword(email.trim());
              setResetSent(true);
            } catch {
              setError("Не удалось отправить письмо. Проверьте email и повторите попытку.");
            } finally {
              setSubmitting(false);
            }
          }}>Восстановить пароль</button>}
          {resetSent && <div className="save-notice">Если аккаунт существует, ссылка для восстановления отправлена на email.</div>}
        </form>
      </section>
    </main>
  );
}

export function PasswordRecoveryPage({ onSave }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  return <main className="login-page"><section className="password-recovery-card"><BrandMark variant="login" /><span>Безопасность аккаунта</span><h1>Задайте новый пароль</h1><p>Не менее 10 символов: заглавная и строчная латинские буквы и цифра.</p><form onSubmit={async (event) => {
    event.preventDefault();
    setError("");
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/.test(password)) return setError("Пароль не соответствует требованиям безопасности.");
    if (password !== confirmation) return setError("Пароли не совпадают.");
    setSaving(true);
    try {
      await onSave(password);
    } catch {
      setError("Ссылка устарела или недействительна. Запросите восстановление повторно.");
      setSaving(false);
    }
  }}><label>Новый пароль<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><label>Повторите пароль<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>{error && <div className="form-error">{error}</div>}<button className="primary-button" disabled={saving}>{saving ? "Сохраняем..." : "Сохранить пароль"}</button></form></section></main>;
}
