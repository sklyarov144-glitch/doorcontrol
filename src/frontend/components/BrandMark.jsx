import React from "react";

export default function BrandMark({ variant = "default" }) {
  return (
    <div className={`brand-lockup ${variant === "login" ? "login-brand" : ""}`}>
      <img className="company-mark" src="/assets/gross-logo.png" alt="" aria-hidden="true" />
      <div>
        <div className="company-name">ГРОСС</div>
        <div className="product-name">Бережливый Монтаж</div>
      </div>
    </div>
  );
}
