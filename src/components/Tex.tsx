import katex from 'katex';
import { useMemo } from 'react';

/** Renderiza una fórmula LaTeX con KaTeX. */
export function Tex({ children, block = false }: { children: string; block?: boolean }) {
  const html = useMemo(() => katex.renderToString(children, { displayMode: block, throwOnError: false }), [children, block]);
  return block ? (
    <div className="overflow-x-auto py-1" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}
