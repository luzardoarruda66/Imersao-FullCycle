import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Os tamanhos de texto do design system (`text-body`, `text-small`...) não são da escala padrão do Tailwind; sem avisar o
// merge, `text-body` seria tratado como cor e apagaria `text-on-primary`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "heading", "title", "body", "small", "caption", "micro"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
