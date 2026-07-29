import { useState } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { useCards } from './hooks/useCards.js';
import SetupPasswordForm from './components/SetupPasswordForm.jsx';
import LoginForm from './components/LoginForm.jsx';
import CardGrid from './components/CardGrid.jsx';
import CardModal from './components/CardModal.jsx';

const PANEL_PATH = import.meta.env.VITE_PANEL_PATH;

export default function App() {
  const path = window.location.pathname.replace(/^\/+/, '');

  if (path !== PANEL_PATH) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1 className="auth-title">Not found</h1>
          <p className="auth-subtitle">This page does not exist.</p>
        </div>
      </div>
    );
  }

  return <Panel />;
}

function Panel() {
  const auth = useAuth();
  const cardsState = useCards();
  const [modalCard, setModalCard] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  if (auth.loading) {
    return <div className="loading-state">Loading…</div>;
  }

  if (!auth.passwordSet) {
    return <SetupPasswordForm onSetup={auth.setup} />;
  }

  if (!auth.authenticated) {
    return <LoginForm onLogin={auth.login} />;
  }

  function openAddModal() {
    setModalCard(null);
    setModalOpen(true);
  }

  function openEditModal(card) {
    setModalCard(card);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setModalCard(null);
  }

  async function handleSave(data) {
    if (modalCard) {
      await cardsState.editCard(modalCard.id, data);
    } else {
      await cardsState.addCard(data);
    }
    closeModal();
  }

  async function handleDeleteFromModal(id) {
    await cardsState.removeCard(id);
    closeModal();
  }

  async function handleDeleteFromCard(id) {
    await cardsState.removeCard(id);
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand">
          motivation<span className="brand-mark">.</span>
        </div>
        <button className="logout-btn" onClick={auth.logout}>
          Log out
        </button>
      </header>

      <main className="main-content">
        {cardsState.loading ? (
          <div className="loading-state">Loading cards…</div>
        ) : (
          <CardGrid
            cards={cardsState.cards}
            onReorder={cardsState.reorder}
            onAdd={openAddModal}
            onEdit={openEditModal}
            onDelete={handleDeleteFromCard}
          />
        )}
      </main>

      {modalOpen && (
        <CardModal
          card={modalCard}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={handleDeleteFromModal}
        />
      )}
    </div>
  );
}
