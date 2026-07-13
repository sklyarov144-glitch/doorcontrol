import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Application error", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fatal-error" role="alert">
        <div>
          <span>ГРОСС Бережливый Монтаж</span>
          <h1>Произошла ошибка</h1>
          <p>Рабочие данные сохранены. Обновите страницу и попробуйте ещё раз.</p>
          <button type="button" onClick={() => window.location.reload()}>Обновить страницу</button>
        </div>
      </main>
    );
  }
}
