import React, { useEffect, useState } from "react";
import BrandMark from "../components/BrandMark";
import { resolveMfaStep } from "../domain/mfa";

function readableError(error) {
  const message = String(error?.message ?? "").toLowerCase();
  if (message.includes("invalid") || message.includes("code") || message.includes("expired")) {
    return "Код неверен или устарел. Введите новый код из приложения.";
  }
  return "Не удалось подтвердить двухфакторную защиту. Повторите попытку.";
}

export default function MfaPage({ auth, profile, gate = false, onVerified, onCancel }) {
  const [status, setStatus] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const loadStatus = async () => {
    setError("");
    const next = await auth.getMfaStatus();
    setStatus(next);
    return next;
  };

  useEffect(() => {
    let active = true;
    auth.getMfaStatus()
      .then((next) => { if (active) setStatus(next); })
      .catch((nextError) => { if (active) setError(readableError(nextError)); });
    return () => { active = false; };
  }, [auth]);

  const step = enrollment ? "enroll-verify" : resolveMfaStep(status ?? {});

  const beginEnrollment = async () => {
    setBusy(true);
    setError("");
    try {
      setEnrollment(await auth.startMfaEnrollment("ГРОСС Бережливый Монтаж"));
      setCode("");
    } catch (nextError) {
      setError(readableError(nextError));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    const factorId = enrollment?.factorId ?? status?.verifiedFactorId;
    if (!factorId || !/^\d{6}$/.test(code.trim())) {
      setError("Введите шестизначный код из приложения-аутентификатора.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await auth.verifyMfa(factorId, code.trim());
      const next = await loadStatus();
      setEnrollment(null);
      setCode("");
      setNotice("Двухфакторная защита подтверждена");
      if (next.currentLevel === "aal2") onVerified?.(next);
    } catch (nextError) {
      setError(readableError(nextError));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!status?.verifiedFactorId) return;
    setBusy(true);
    setError("");
    try {
      await auth.disableMfa(status.verifiedFactorId);
      await loadStatus();
      setNotice("Двухфакторная защита отключена");
    } catch (nextError) {
      setError(readableError(nextError));
    } finally {
      setBusy(false);
    }
  };

  const content = (
    <section className={`mfa-card ${gate ? "mfa-gate-card" : ""}`}>
      {gate && <BrandMark variant="login" />}
      <span className="mfa-eyebrow">Безопасность аккаунта</span>
      <h1>{step === "verified" ? "Двухфакторная защита включена" : "Подтвердите вход"}</h1>
      <p>{step === "enroll" || step === "enroll-verify"
        ? `Для роли «${profile?.position || "руководитель"}» подключите приложение-аутентификатор.`
        : "Введите одноразовый код из приложения-аутентификатора."}</p>

      {!status && !error && <div className="mfa-loading">Проверяем настройки...</div>}

      {step === "enroll" && status && (
        <button className="primary-button" type="button" disabled={busy} onClick={beginEnrollment}>
          {busy ? "Подготавливаем..." : "Подключить приложение"}
        </button>
      )}

      {step === "enroll-verify" && enrollment && (
        <div className="mfa-enrollment">
          <img src={enrollment.qrCode} alt="QR-код для приложения-аутентификатора" />
          <div><span>Ключ для ручного ввода</span><code>{enrollment.secret}</code></div>
        </div>
      )}

      {["enroll-verify", "challenge"].includes(step) && (
        <form className="mfa-code-form" onSubmit={verify}>
          <label>Одноразовый код<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" autoFocus /></label>
          <button className="primary-button" disabled={busy}>{busy ? "Проверяем..." : "Подтвердить"}</button>
        </form>
      )}

      {step === "verified" && status && !gate && (
        <div className="mfa-enabled-row"><strong>Активна</strong><button className="secondary-button" type="button" disabled={busy} onClick={disable}>Отключить MFA</button></div>
      )}
      {error && <div className="form-error" role="alert">{error}</div>}
      {notice && <div className="save-notice" role="status">{notice}</div>}
      {gate && <button className="mfa-cancel" type="button" onClick={onCancel}>Выйти из аккаунта</button>}
    </section>
  );

  return gate ? <main className="mfa-gate">{content}</main> : content;
}
