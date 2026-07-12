import {
  TextShapeUtil,
  type TLTextShape,
  type Editor,
  renderHtmlFromRichTextForMeasurement
} from "tldraw";
import React from "react";

// Line height parser: converts any user string (e.g. "130%", "24px", "1.5") to a numeric multiplier
function parseLineHeight(lh: string | number | undefined, fontSize: number): number {
  if (!lh) return 1.3;
  if (typeof lh === "number") return lh;
  const str = String(lh).trim();
  if (str.endsWith("%")) {
    const val = parseFloat(str) / 100;
    return isNaN(val) ? 1.3 : val;
  }
  if (str.endsWith("px")) {
    const val = parseFloat(str) / fontSize;
    return isNaN(val) ? 1.3 : val;
  }
  const val = parseFloat(str);
  return isNaN(val) ? 1.3 : val;
}

// Letter spacing parser: converts user input to a CSS compatible spacing value
function parseLetterSpacing(ls: string | number | null | undefined): string {
  if (!ls) return "normal";
  if (typeof ls === "number") return `${ls}px`;
  const str = String(ls).trim();
  if (str.endsWith("%")) {
    const val = parseFloat(str) / 100;
    return isNaN(val) ? "normal" : `${val}em`;
  }
  if (str.endsWith("px")) {
    return str;
  }
  const val = parseFloat(str);
  return isNaN(val) ? "normal" : `${val}px`;
}

const DEFAULT_FONTS = ["Inter", "Arial", "Roboto", "Poppins", "Montserrat", "Open Sans"];

function loadGoogleFont(fontName: string) {
  if (typeof window === "undefined") return;
  const id = `google-font-${fontName.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;
  
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:ital,wght@0,100..900;1,100..900&display=swap`;
  document.head.appendChild(link);
}

export class FigmaTextShapeUtil extends TextShapeUtil {
  static override type = "text" as const;

  constructor(editor: Editor) {
    super(editor);
    
    // Safely override shape options on constructor mount
    this.options = {
      ...this.options,
      getCustomDisplayValues: (editor: Editor, shape: TLTextShape) => {
        const meta = shape.meta || {};
        const fontSize = typeof meta.fontSize === "number" ? meta.fontSize : 16;
        const lineHeight = parseLineHeight(meta.lineHeight as string | number, fontSize);
        
        return {
          fontFamily: (meta.fontFamily as string) || "Inter",
          fontSize,
          lineHeight,
          color: (meta.color as string) || "#FFFFFF",
          fontWeight: (meta.fontWeight as string) || "normal",
          fontStyle: (meta.fontStyle as string) || "normal",
        };
      }
    };
  }

  override component(shape: TLTextShape) {
    const element = super.component(shape);
    const meta = shape.meta || {};
    
    // Set default values
    const fontFamily = (meta.fontFamily as string) || "Inter";
    const fontSize = typeof meta.fontSize === 'number' ? meta.fontSize : 16;
    const fontWeight = (meta.fontWeight as string) || "normal";
    const fontStyle = (meta.fontStyle as string) || "normal";
    const textDecoration = (meta.textDecoration as string) || "none";
    const textCase = (meta.textCase as string) || "none";
    const textColor = (meta.color as string) || "#FFFFFF";
    const lineHeight = parseLineHeight(meta.lineHeight as string | number, fontSize);
    
    // Load font dynamically if it's not a default font
    if (!DEFAULT_FONTS.includes(fontFamily)) {
      loadGoogleFont(fontFamily);
    }

    // Background properties
    const bgColor = (meta.backgroundColor as string) || "transparent";
    const bgPaddingX = typeof meta.bgPaddingX === 'number' ? meta.bgPaddingX : 0;
    const bgPaddingY = typeof meta.bgPaddingY === 'number' ? meta.bgPaddingY : 0;
    const bgRadius = typeof meta.bgRadius === 'number' ? meta.bgRadius : 0;
    
    // Spacing
    const letterSpacing = parseLetterSpacing(
      typeof meta.letterSpacing === 'string' || typeof meta.letterSpacing === 'number'
        ? meta.letterSpacing
        : undefined
    );
    const paragraphSpacing = typeof meta.paragraphSpacing === 'number' ? meta.paragraphSpacing : 0;
    const paragraphIndentation = typeof meta.paragraphIndentation === 'number' ? meta.paragraphIndentation : 0;
    const textAlign = (meta.textAlign as string) || shape.props.textAlign || "start";
    const overflow = (meta.overflow as string) || "visible";
    const verticalAlign = (meta.verticalAlign as string) || "middle";
    const direction = (meta.direction as string) || "ltr";
    
    // Stroke
    const strokeColor = (meta.strokeColor as string) || "transparent";
    const strokeWidth = typeof meta.strokeWidth === 'number' ? meta.strokeWidth : 0;
    const strokeEnabled = !!meta.strokeEnabled;
    
    // Shadow
    const shadowEnabled = !!meta.shadowEnabled;
    const shadowX = typeof meta.shadowX === 'number' ? meta.shadowX : 0;
    const shadowY = typeof meta.shadowY === 'number' ? meta.shadowY : 0;
    const shadowBlur = typeof meta.shadowBlur === 'number' ? meta.shadowBlur : 0;
    const shadowColor = (meta.shadowColor as string) || "rgba(0,0,0,0)";
    
    const customVariables: Record<string, string> = {
      "--figma-font-family": fontFamily,
      "--figma-letter-spacing": letterSpacing,
      "--figma-paragraph-spacing": `${paragraphSpacing}px`,
      "--figma-paragraph-indentation": `${paragraphIndentation}px`,
      "--figma-text-align": textAlign,
      "--figma-text-decoration": textDecoration,
      "--figma-text-case": textCase,
      "--figma-font-weight": fontWeight,
      "--figma-font-style": fontStyle,
      "--figma-bg-color": bgColor,
      "--figma-bg-radius": `${bgRadius}px`,
      "--figma-bg-padding-x": `${bgPaddingX}px`,
      "--figma-bg-padding-y": `${bgPaddingY}px`,
      "--figma-overflow": overflow,
      "--figma-direction": direction,
      "--figma-vertical-align": verticalAlign === "middle" ? "center" : verticalAlign === "bottom" ? "flex-end" : "flex-start",
      "--figma-text-stroke": (strokeEnabled && strokeWidth > 0) ? `${strokeWidth}px ${strokeColor}` : "0px transparent",
      "--figma-drop-shadow": (shadowEnabled && (shadowX !== 0 || shadowY !== 0 || shadowBlur !== 0)) ? `drop-shadow(${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor})` : "none",
      "--figma-opacity": typeof meta.opacity === 'number' ? String(meta.opacity) : "1",
    };
    
    return React.cloneElement(element, {
      fontFamily,
      fontSize,
      lineHeight,
      labelColor: textColor,
      textWidth: Math.max(0, shape.props.w - bgPaddingX * 2),
      textHeight: Math.max(0, (shape.props as any).h - bgPaddingY * 2),
      style: {
        ...(element.props.style || {}),
        ...customVariables,
      }
    } as any);
  }

  override getMinDimensions(shape: TLTextShape) {
    const meta = shape.meta || {};
    const bgPaddingX = typeof meta.bgPaddingX === 'number' ? meta.bgPaddingX : 0;
    const bgPaddingY = typeof meta.bgPaddingY === 'number' ? meta.bgPaddingY : 0;
    
    // Read the custom font values
    const fontFamily = (meta.fontFamily as string) || "Inter";
    const fontSize = typeof meta.fontSize === 'number' ? meta.fontSize : 16;
    const fontWeight = (meta.fontWeight as string) || "normal";
    const fontStyle = (meta.fontStyle as string) || "normal";
    const lineHeight = parseLineHeight(meta.lineHeight as string | number, fontSize);
    
    if (!DEFAULT_FONTS.includes(fontFamily)) {
      loadGoogleFont(fontFamily);
    }

    const minWidth = 16;
    let maybeFixedWidth: number | null = null;
    
    // Auto layout resizing modes calculation
    if (meta.resizeMode === "fixed" && typeof meta.fixedWidth === "number" && typeof meta.fixedHeight === "number") {
      return {
        width: meta.fixedWidth + bgPaddingX * 2,
        height: meta.fixedHeight + bgPaddingY * 2,
      };
    }
    
    if (meta.resizeMode === "auto-height" && typeof meta.fixedWidth === "number") {
      maybeFixedWidth = Math.max(minWidth, meta.fixedWidth);
    } else if (shape.props.autoSize === false) {
      maybeFixedWidth = Math.max(minWidth, Math.floor(shape.props.w) - bgPaddingX * 2);
    }
    
    // Use tldraw's html measurement
    const rawHtml = renderHtmlFromRichTextForMeasurement(this.editor, shape.props.richText);
    
    const paragraphSpacing = typeof meta.paragraphSpacing === 'number' ? meta.paragraphSpacing : 0;
    const paragraphIndentation = typeof meta.paragraphIndentation === 'number' ? meta.paragraphIndentation : 0;
    const textAlign = (meta.textAlign as string) || shape.props.textAlign || "start";
    const letterSpacing = parseLetterSpacing(
      typeof meta.letterSpacing === 'string' || typeof meta.letterSpacing === 'number'
        ? meta.letterSpacing
        : undefined
    );

    const html = `<div style="text-align: ${textAlign}; text-indent: ${paragraphIndentation}px; letter-spacing: ${letterSpacing}; --figma-paragraph-spacing: ${paragraphSpacing}px;">${rawHtml}</div>`;

    const result = this.editor.textMeasure.measureHtml(html, {
      lineHeight,
      fontWeight,
      fontStyle,
      padding: "0px",
      fontFamily,
      fontSize,
      maxWidth: maybeFixedWidth,
    });
    
    const width = maybeFixedWidth ?? Math.max(minWidth, result.w + 1);
    const height = Math.max(fontSize, result.h);
    
    return {
      width: width + bgPaddingX * 2,
      height: height + bgPaddingY * 2,
    };
  }
}
