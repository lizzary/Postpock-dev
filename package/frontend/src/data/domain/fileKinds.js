// File extensions grouped the way people think about them, for pickers that would otherwise list dozens of types.
export const FILE_KINDS = ['image', 'video', 'audio', 'project', 'document', 'archive', 'other'];
const BY_EXT = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'heic', 'avif'],
  video: ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'],
  audio: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'],
  project: ['psd', 'clip', 'sai', 'sai2', 'kra', 'procreate', 'blend', 'ai', 'mdp'],
  document: ['pdf', 'txt', 'epub', 'doc', 'docx', 'md', 'rtf'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz'],
};
const KIND = new Map(Object.entries(BY_EXT).flatMap(([k, exts]) => exts.map((e) => [e, k])));
export const kindOfExt = (ext) => KIND.get(String(ext).toLowerCase()) ?? 'other';
