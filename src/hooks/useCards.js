import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';

export function useCards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listCards();
      setCards(data.cards);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addCard = useCallback(async (card) => {
    const { card: created } = await api.createCard(card);
    setCards((prev) => [...prev, created]);
  }, []);

  const editCard = useCallback(async (id, card) => {
    const { card: updated } = await api.updateCard(id, card);
    setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  const removeCard = useCallback(async (id) => {
    await api.deleteCard(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const reorder = useCallback(async (newCards) => {
    setCards(newCards);
    await api.reorderCards(newCards.map((c) => c.id));
  }, []);

  return { cards, loading, error, addCard, editCard, removeCard, reorder, reload: load };
}
