// Cloudinary Console → Settings → Upload → Upload presets (create an unsigned preset)
const CLOUD_NAME    = 'dllsgbds1';
const UPLOAD_PRESET = 'gzzxr3nd';

export async function uploadMedia(file, resourceType = 'auto') {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: fd }
  );
  if (!res.ok) throw new Error(`Cloudinary upload failed (${res.status})`);
  return (await res.json()).secure_url;
}
