import React from 'react';
export default class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="startup">
        <span className="logo">◈</span>
        <h1>No se pudo mostrar Dulcería</h1>
        <p>
          Tus registros no se han borrado. Recarga la aplicación. Si el problema continúa, conserva
          tus datos del navegador para poder recuperarlos.
        </p>
        <button className="primary" onClick={() => location.reload()}>
          Volver a abrir
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
