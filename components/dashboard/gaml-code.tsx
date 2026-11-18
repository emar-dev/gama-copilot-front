import { Fragment, type ReactNode } from "react";

const KEYWORDS = new Set(
  "model global species grid experiment reflex action aspect init create ask do if else loop return parameter output display chart data skills parent type var when number with from to over while switch match default import using inspect monitor layout event user_command".split(
    " ",
  ),
);
const TYPES = new Set(
  "int float bool string point list map geometry rgb agent pair matrix date file graph path container image unknown topology".split(" "),
);
const LITERALS = new Set(["true", "false", "nil", "self", "myself", "each", "world", "cycle", "time"]);

const TOKEN_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#[A-Za-z_]\w*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g;

/** Colore une ligne de GAML : mots-clés, types, littéraux, chaînes, unités/couleurs (#…), commentaires. */
export function highlightGaml(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of code.matchAll(TOKEN_RE)) {
    const index = m.index ?? 0;
    if (index > last) out.push(code.slice(last, index));
    const [text, comment, str, unit, num, word] = m;
    let cls: string | null = null;
    if (comment) cls = "text-muted italic";
    else if (str) cls = "text-[color:var(--series-3)]";
    else if (unit) cls = "text-[color:var(--series-2)]";
    else if (num) cls = "text-[color:var(--series-4)]";
    else if (word && KEYWORDS.has(word)) cls = "font-semibold text-accent";
    else if (word && TYPES.has(word)) cls = "text-[color:var(--series-4)]";
    else if (word && LITERALS.has(word)) cls = "text-[color:var(--series-2)]";
    out.push(
      cls ? (
        <span key={key++} className={cls}>
          {text}
        </span>
      ) : (
        text
      ),
    );
    last = index + text.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

/** Bloc de code GAML avec numéros de ligne. */
export function GamlCode({ code, className = "" }: { code: string; className?: string }) {
  const lines = code.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
  return (
    <pre className={`overflow-auto font-mono text-[0.78rem] leading-[1.7] text-ink ${className}`}>
      <code className="grid grid-cols-[auto_1fr]">
        {lines.map((line, i) => (
          <Fragment key={i}>
            <span className="select-none pr-4 text-right text-placeholder tabular-nums" aria-hidden="true">
              {i + 1}
            </span>
            <span className="whitespace-pre">{highlightGaml(line) }{"\n"}</span>
          </Fragment>
        ))}
      </code>
    </pre>
  );
}
