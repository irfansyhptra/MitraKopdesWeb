'use client';

import { useEffect, useId, useState } from 'react';
import { ImagePlus } from '@shared/design/icons';

interface Props {
  label: string;
  hint: string;
  currentUrl?: string | null;
  shape: 'avatar' | 'banner';
  disabled?: boolean;
  onChange: (file: File | null) => void;
}

export function ImagePickerField({
  label,
  hint,
  currentUrl,
  shape,
  disabled,
  onChange,
}: Props) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPreview(currentUrl ?? null), [currentUrl]);
  useEffect(() => () => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
  }, [preview]);

  function choose(file: File | undefined) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      onChange(null);
      setError('Ukuran gambar melebihi 4 MB.');
      return;
    }
    setError(null);
    const next = URL.createObjectURL(file);
    setPreview((old) => {
      if (old?.startsWith('blob:')) URL.revokeObjectURL(old);
      return next;
    });
    onChange(file);
  }

  return (
    <div className={`media-picker media-picker--${shape}`}>
      <div className="media-picker__preview" aria-hidden="true">
        {preview ? <img src={preview} alt="" /> : <ImagePlus size={shape === 'avatar' ? 24 : 28} />}
      </div>
      <div className="media-picker__copy">
        <strong>{label}</strong>
        <span>{hint}</span>
        <label className="media-picker__button" htmlFor={id}>Pilih Gambar</label>
        <input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={(event) => choose(event.target.files?.[0])} />
        {error && <span className="media-picker__error" role="alert">{error}</span>}
      </div>
    </div>
  );
}
