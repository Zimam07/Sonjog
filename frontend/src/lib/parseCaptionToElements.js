import React from 'react';

// parse caption and return React elements with links for mentions and hashtags
export default function parseCaptionToElements(caption) {
  if (!caption) return null;
  const parts = [];
  const regex = /(@[\w.\-]+|#[\w]+)/g;
  let lastIndex = 0;
  let m;
  while ((m = regex.exec(caption)) !== null) {
    const idx = m.index;
    if (idx > lastIndex) {
      parts.push(caption.slice(lastIndex, idx));
    }
    const token = m[0];
    if (token.startsWith('@')) {
      const username = token.slice(1);
      parts.push(
        <a key={`${idx}-u`} href={`#/profile/${username}`} className="text-blue-400 hover:underline">{token}</a>
      );
    } else if (token.startsWith('#')) {
      const tag = token.slice(1);
      parts.push(
        <a key={`${idx}-h`} href={`#/hashtag/${tag}`} className="text-yellow-400 hover:underline">{token}</a>
      );
    }
    lastIndex = idx + token.length;
  }
  if (lastIndex < caption.length) parts.push(caption.slice(lastIndex));
  return parts.map((p, i) => (typeof p === 'string' ? <span key={i}>{p}</span> : p));
}
