import type { ReactNode } from "react";
import { GamlCode } from "./gaml-code";

/**
 * Rendu Markdown minimal et sûr pour les réponses du copilote (aucun HTML injecté) :
 * blocs de code, titres, listes, paragraphes, **gras**, `code`.
 */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const fence = /^\s*```\s*([\w-]*)/.exec(line);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push(
        <div key={key++} className="my-2 overflow-hidden rounded-xl border border-line bg-canvas">
          {fence[1] && (
            <div className="border-b border-line px-3 py-1.5 text-xs text-muted">{fence[1].toUpperCase()}</div>
          )}
          <GamlCode code={code.join("\n")} className="max-h-80 px-3 py-2.5" />
        </div>,
      );
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)/.exec(line);
    if (heading) {
      blocks.push(
        <p key={key++} className="mt-3 mb-1 font-semibold text-ink">
          {inline(heading[2])}
        </p>,
      );
      i++;
      continue;
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
        i++;
      }
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag key={key++} className={`my-1.5 space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-muted`}>
          {items.map((item, j) => (
            <li key={j}>{inline(item)}</li>
          ))}
        </ListTag>,
      );
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*```/.test(lines[i]) &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i])
    ) {
      paragraph.push(lines[i++]);
    }
    blocks.push(
      <p key={key++} className="my-1.5">
        {inline(paragraph.join(" "))}
      </p>,
    );
  }
  return <div className="text-[0.92rem] leading-relaxed">{blocks}</div>;
}

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let key = 0;
  let last = 0;
  for (const m of text.matchAll(/`([^`]+)`|\*\*([^*]+)\*\*/g)) {
    const index = m.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    if (m[1] !== undefined) {
      out.push(
        <code key={key++} className="rounded-md bg-sunken px-1.5 py-0.5 font-mono text-[0.85em] text-ink">
          {m[1]}
        </code>,
      );
    } else {
      out.push(
        <strong key={key++} className="font-semibold text-ink">
          {m[2]}
        </strong>,
      );
    }
    last = index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
