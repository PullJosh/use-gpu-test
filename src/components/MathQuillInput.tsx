import * as React from "react";

import $ from "jquery";
window.jQuery = $;

import "../../public/mathquill/mathquill.css";
import "../../public/mathquill/mathquill.min.js";

declare global {
  interface Window {
    jQuery: typeof $;
  }
  const MathQuill: any;
}

const MQ = MathQuill.getInterface(2);

export interface MathQuillInputProps {
  latex?: string;
  onChange?: (mathfield: any) => void;
  style?: React.CSSProperties;
}

export function MathQuillInput({
  latex,
  onChange,
  style,
}: MathQuillInputProps) {
  const wrapperElement = React.useRef<HTMLSpanElement | null>(null);
  const mathField = React.useRef<any | null>(null);

  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  React.useEffect(() => {
    if (!wrapperElement.current) return;

    const config = {
      restrictMismatchedBrackets: true,
      autoCommands: "pi theta sqrt sum pm",
      autoSubscriptNumerals: true,
      sumStartsWithNEquals: true,
      handlers: {
        edit: (mathField: any) => {
          onChangeRef.current?.(mathField);
        },
      },
    };

    mathField.current = MQ.MathField(wrapperElement.current, config);
    mathField.current.latex(latex || "");
    mathField.current.style = style ?? undefined;
  }, [wrapperElement]);

  React.useEffect(() => {
    if (mathField.current && mathField.current.latex() !== latex) {
      mathField.current.latex(latex);
    }
  }, [latex]);

  return <span style={style} ref={wrapperElement} />;
}
