import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import Card from './Card.jsx';
import AddCardButton from './AddCardButton.jsx';

export default function CardGrid({ cards, onReorder, onAdd, onEdit }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(cards, oldIndex, newIndex));
  }

  if (cards.length === 0) {
    return (
      <div>
        <div className="empty-state">
          <h2>No cards yet</h2>
          <p>Add your first motivational card to get started.</p>
        </div>
        <div className="card-grid">
          <AddCardButton onClick={onAdd} />
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
        <div className="card-grid">
          {cards.map((card) => (
            <Card key={card.id} card={card} onEdit={onEdit} />
          ))}
          <AddCardButton onClick={onAdd} />
        </div>
      </SortableContext>
    </DndContext>
  );
}
