import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function Card({ card, onEdit, onDelete }) {
  const [showingImage, setShowingImage] = useState(Boolean(card.imageUrl) && !card.text);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasText = Boolean(card.text);
  const hasImage = Boolean(card.imageUrl);
  const canFlip = hasText && hasImage;

  function handleClick() {
    if (canFlip) {
      setShowingImage((prev) => !prev);
    }
  }

  function stop(e) {
    e.stopPropagation();
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`motivation-card${isDragging ? ' dragging' : ''}`}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <div className="card-actions">
        <button
          type="button"
          className="card-icon-btn"
          aria-label="Edit card"
          onPointerDown={stop}
          onClick={(e) => {
            stop(e);
            onEdit(card);
          }}
        >
          ✎
        </button>
        <button
          type="button"
          className="card-icon-btn"
          aria-label="Delete card"
          onPointerDown={stop}
          onClick={(e) => {
            stop(e);
            onDelete(card.id);
          }}
        >
          ✕
        </button>
      </div>

      {hasImage && (showingImage || !hasText) && (
        <div className="card-face image-face">
          <img src={card.imageUrl} alt="" draggable={false} />
        </div>
      )}

      {hasText && (!showingImage || !hasImage) && (
        <div className="card-face text-face">
          <p className="card-text">{card.text}</p>
        </div>
      )}

      {!hasText && !hasImage && (
        <div className="card-face text-face">
          <p className="card-empty-hint">Empty card</p>
        </div>
      )}

      {canFlip && (
        <div className="card-side-indicator">
          <span className={`dot${!showingImage ? ' active' : ''}`} />
          <span className={`dot${showingImage ? ' active' : ''}`} />
        </div>
      )}
    </div>
  );
}
