const _photos = Object.create(null);

export function getDietPhotos() {
  return _photos;
}

export function getDietPhoto(kind) {
  return _photos[kind] || null;
}

export function setDietPhoto(kind, value) {
  if (!kind) return null;
  if (value) _photos[kind] = value;
  else delete _photos[kind];
  return getDietPhoto(kind);
}

export function removeDietPhoto(kind) {
  const previous = getDietPhoto(kind);
  delete _photos[kind];
  return previous;
}

export function replaceDietPhotos(next = {}) {
  for (const key of Object.keys(_photos)) delete _photos[key];
  if (next && typeof next === 'object') Object.assign(_photos, next);
  return _photos;
}
