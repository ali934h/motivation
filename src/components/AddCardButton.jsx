export default function AddCardButton({ onClick }) {
  return (
    <button type="button" className="add-card-tile" onClick={onClick} aria-label="Add new card">
      +
    </button>
  );
}
