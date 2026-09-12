function sanitizeSlug(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'role';
}
console.log(sanitizeSlug('Photographer\uFEFF\uFEFF'));
console.log(sanitizeSlug('Photographer\uFEFF\uFEFF\uFEFF\uFEFF'));
