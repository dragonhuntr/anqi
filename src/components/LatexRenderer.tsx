import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

interface LatexRendererProps {
  content: string;
}

export function LatexRenderer({ content }: LatexRendererProps) {
  const latexRegex = /\$\$(.*?)\$\$|\$(.*?)\$/g;
  
  if (!content.match(latexRegex)) {
    return <span>{content}</span>;
  }

  const parts = content.split(latexRegex);
  
  return (
    <span className="latex-container">
      {parts.map((part, index) => {
        if (!part) return null;
        
        const isBlockLatex = content.slice(
          content.indexOf(part) - 2, 
          content.indexOf(part)
        ) === '$$';
        
        const isInlineLatex = !isBlockLatex && content.slice(
          content.indexOf(part) - 1, 
          content.indexOf(part)
        ) === '$';

        if (isBlockLatex) {
          return (
            <span key={index} className="block-math-wrapper">
              <BlockMath math={part} />
            </span>
          );
        } else if (isInlineLatex) {
          return <InlineMath key={index} math={part} />;
        }
        
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
} 