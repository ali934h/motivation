import { useState } from 'react';
import { uploadImageToCloudinary } from '../utils/cloudinary.js';

export default function CardModal({ card, onClose, onSave, onDelete }) {
  const isEditing = Boolean(card);
  const [text, setText] = useState(card?.text || '');
  const [imageUrl, setImageUrl] = useState(card?.imageUrl || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setImageUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!text.trim() && !imageUrl) {
      setError('Add at least some text or an image.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({ text: text.trim(), imageUrl });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setSubmitting(true);
    try {
      await onDelete(card.id);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{isEditing ? 'Edit card' : 'New card'}</h2>
        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="card-text">
            Text side (optional)
          </label>
          <textarea
            id="card-text"
            className="textarea-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write something motivating…"
          />

          <label className="field-label">Image side (optional)</label>
          <div className="image-drop">
            {imageUrl && <img src={imageUrl} alt="Selected upload preview" />}
            <span>{uploading ? 'Uploading…' : imageUrl ? 'Change image' : 'Click to upload an image'}</span>
            <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={submitting || uploading}>
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>

          {isEditing && (
            <div className="modal-actions" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="danger-btn"
                style={{ width: '100%' }}
                onClick={handleDelete}
                disabled={submitting}
              >
                Delete card
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
