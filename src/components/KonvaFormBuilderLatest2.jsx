import React, { useState, useRef, useEffect, useCallback } from "react";
import Konva from "konva";

// ─── Constants ────────────────────────────────────────────────────────────────
const SIDEBAR_W = 170;
const STAGE_H = 620;
const EL_W = 220;
const EL_H = 48;
const EL_GAP = 8;
const CONT_W = 260;
const CONT_HDR_H = 32;
const CONT_PAD = 12;
const CHILD_W = CONT_W - CONT_PAD * 2;
const POPUP_W = 264;
const GRID = 20; // grid snap size
const MAX_UNDO = 60;
const LS_KEY = "formbuilder_v1";

const C = {
  elFill: "#fff",
  elStroke: "#c8d0dc",
  elText: "#334155",
  elSub: "#94a3b8",
  contFill: "#f8fafc",
  contStroke: "#94a3b8",
  contTitle: "#64748b",
  accent: "#6366f1",
  red: "#ef4444",
  redBg: "#fee2e2",
  arrowBg: "#ede9fe",
  stageBg: "#f1f5f9",
  hint: "#cbd5e1",
  grid: "#e2e8f0",
};

const ICONS = { "Text Input": "⌨", Dropdown: "▾", Label: "T", Button: "◻" };

const defaultProps = (type) =>
  ({
    "Text Input": {
      fieldLabel: "Text Input",
      placeholder: "",
      defaultValue: "",
      required: false,
    },
    Dropdown: {
      fieldLabel: "Dropdown",
      options: ["Option 1", "Option 2", "Option 3"],
      required: false,
    },
    Label: { fieldLabel: "Label", text: "Label Text" },
    Button: { fieldLabel: "Button", buttonText: "Submit" },
  })[type] || { fieldLabel: type };

let _uid = 100;
const uid = () => ++_uid;

// ─── Layout helpers ───────────────────────────────────────────────────────────
const snap = (v) => Math.round(v / GRID) * GRID;
const contHeight = (n) =>
  n === 0
    ? CONT_HDR_H + CONT_PAD * 2 + 24
    : CONT_HDR_H + CONT_PAD + n * (EL_H + EL_GAP) + CONT_PAD;
const childRelY = (i) => CONT_HDR_H + CONT_PAD + i * (EL_H + EL_GAP);
const dragToIdx = (relY, n) =>
  Math.max(
    0,
    Math.min(
      n - 1,
      Math.floor(
        (relY - CONT_HDR_H - CONT_PAD + (EL_H + EL_GAP) / 2) / (EL_H + EL_GAP),
      ),
    ),
  );
const ptInCont = (c, px, py) => {
  const h = contHeight(c.children.length);
  return px >= c.x && px <= c.x + CONT_W && py >= c.y && py <= c.y + h;
};
const hitCont = (cs, px, py) => {
  for (let i = cs.length - 1; i >= 0; i--)
    if (ptInCont(cs[i], px, py)) return cs[i];
  return null;
};
const cardSubText = (el) => {
  if (el.type === "Button") return el.props?.buttonText || "Submit";
  if (el.type === "Label") return el.props?.text || "Label Text";
  if (el.type === "Dropdown")
    return (el.props?.options || []).slice(0, 2).join(", ");
  if (el.type === "Text Input")
    return el.props?.placeholder ? `"${el.props.placeholder}"` : "Text Input";
  return el.type;
};

function setCardTexts(grp, el) {
  grp.findOne(".mainlbl")?.text(el.props?.fieldLabel || el.label);
  grp.findOne(".sub")?.text(cardSubText(el));
  grp.findOne(".req")?.visible(!!el.props?.required);
  grp.findOne(".contname")?.text(el.name || "Container");
  grp.getLayer()?.batchDraw();
}

// ─── useUndoRedo ──────────────────────────────────────────────────────────────
function useUndoRedo(initial) {
  const [idx, setIdx] = useState(0);
  const stack = useRef([initial]);

  const state = stack.current[idx];
  const canUndo = idx > 0;
  const canRedo = idx < stack.current.length - 1;

  const push = useCallback(
    (next) => {
      const trimmed = stack.current.slice(0, idx + 1);
      if (trimmed.length >= MAX_UNDO) trimmed.shift();
      stack.current = [...trimmed, next];
      setIdx(stack.current.length - 1);
    },
    [idx],
  );

  const undo = useCallback(() => {
    if (canUndo) setIdx((i) => i - 1);
  }, [canUndo]);
  const redo = useCallback(() => {
    if (canRedo) setIdx((i) => i + 1);
  }, [canRedo]);

  return { state, push, undo, redo, canUndo, canRedo };
}

// ─── Popup ────────────────────────────────────────────────────────────────────
function Popup({ el, pos, stageRect, onUpdate, onClose }) {
  const p = el.props || {};
  const left = Math.min(
    stageRect.left + pos.x + EL_W + 8,
    window.innerWidth - POPUP_W - 12,
  );
  const top = Math.max(stageRect.top + pos.y, 8);
  const inp = (sx = {}) => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "5px 8px",
    border: "1px solid #d1d5db",
    borderRadius: 5,
    fontSize: 12,
    fontFamily: "inherit",
    outline: "none",
    ...sx,
  });
  const lbl = (t) => (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "#6b7280",
        marginBottom: 3,
        marginTop: 10,
      }}
    >
      {t}
    </div>
  );

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left,
        top,
        width: POPUP_W,
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
        padding: "14px 16px 16px",
        zIndex: 1000,
        fontSize: 13,
        fontFamily: "system-ui,sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>
          {ICONS[el.type] || "📦"}&nbsp; {el.type}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            color: "#9ca3af",
          }}
        >
          ×
        </button>
      </div>
      <div style={{ height: 1, background: "#f1f5f9", margin: "8px 0" }} />

      {lbl("Field Label")}
      <input
        style={inp()}
        value={p.fieldLabel || ""}
        onChange={(e) => onUpdate({ fieldLabel: e.target.value })}
        placeholder="e.g. First Name"
      />

      {el.type === "Text Input" && (
        <>
          {lbl("Placeholder")}
          <input
            style={inp()}
            value={p.placeholder || ""}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
          />
          {lbl("Default Value")}
          <input
            style={inp()}
            value={p.defaultValue || ""}
            onChange={(e) => onUpdate({ defaultValue: e.target.value })}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
            }}
          >
            <input
              type="checkbox"
              id={`req_${el.id}`}
              checked={!!p.required}
              onChange={(e) => onUpdate({ required: e.target.checked })}
            />
            <label
              htmlFor={`req_${el.id}`}
              style={{ fontSize: 12, color: "#374151", cursor: "pointer" }}
            >
              Required
            </label>
          </div>
        </>
      )}
      {el.type === "Dropdown" && (
        <>
          {lbl("Options (one per line)")}
          <textarea
            style={inp({
              height: 80,
              resize: "vertical",
              fontFamily: "monospace",
            })}
            value={(p.options || []).join("\n")}
            onChange={(e) => onUpdate({ options: e.target.value.split("\n") })}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
            }}
          >
            <input
              type="checkbox"
              id={`req_${el.id}`}
              checked={!!p.required}
              onChange={(e) => onUpdate({ required: e.target.checked })}
            />
            <label
              htmlFor={`req_${el.id}`}
              style={{ fontSize: 12, color: "#374151", cursor: "pointer" }}
            >
              Required
            </label>
          </div>
        </>
      )}
      {el.type === "Label" && (
        <>
          {lbl("Display Text")}
          <input
            style={inp()}
            value={p.text || ""}
            onChange={(e) => onUpdate({ text: e.target.value })}
          />
        </>
      )}
      {el.type === "Button" && (
        <>
          {lbl("Button Text")}
          <input
            style={inp()}
            value={p.buttonText || ""}
            onChange={(e) => onUpdate({ buttonText: e.target.value })}
          />
        </>
      )}

      {(el.type === "Text Input" || el.type === "Dropdown") && p.required && (
        <div
          style={{
            marginTop: 10,
            background: "#fef3c7",
            border: "1px solid #fcd34d",
            borderRadius: 4,
            padding: "3px 8px",
            fontSize: 11,
            color: "#92400e",
          }}
        >
          ⚠ Required field
        </div>
      )}
    </div>
  );
}

// ─── Container rename popup ───────────────────────────────────────────────────
function RenamePopup({ cont, pos, stageRect, onChange, onClose }) {
  const [val, setVal] = useState(cont.name || "Container");
  const left = Math.min(
    stageRect.left + pos.x + CONT_W + 8,
    window.innerWidth - POPUP_W - 12,
  );
  const top = Math.max(stageRect.top + pos.y, 8);
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left,
        top,
        width: 220,
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
        padding: "14px 16px",
        zIndex: 1000,
        fontFamily: "system-ui,sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#1e293b",
          marginBottom: 8,
        }}
      >
        Rename Container
      </div>
      <input
        autoFocus
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "6px 8px",
          border: "1px solid #6366f1",
          borderRadius: 5,
          fontSize: 13,
          outline: "none",
        }}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onChange(val);
            onClose();
          }
          if (e.key === "Escape") onClose();
        }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={() => {
            onChange(val);
            onClose();
          }}
          style={{
            flex: 1,
            padding: "5px",
            background: C.accent,
            color: "#fff",
            border: "none",
            borderRadius: 5,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Save
        </button>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: "5px",
            background: "#f1f5f9",
            color: "#64748b",
            border: "none",
            borderRadius: 5,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Export modal ─────────────────────────────────────────────────────────────
function ExportModal({ freeEls, conts, onClose }) {
  const [tab, setTab] = useState("html");
  const [copied, setCopied] = useState(false);

  const allEls = [...freeEls, ...conts.flatMap((c) => c.children)];

  const genHTML = () => {
    const fieldHTML = (el, indent = "  ") => {
      const p = el.props || {};
      if (el.type === "Text Input")
        return `${indent}<div class="field">\n${indent}  <label>${p.fieldLabel || "Field"}${p.required ? ' <span class="req">*</span>' : ""}</label>\n${indent}  <input type="text" placeholder="${p.placeholder || ""}" value="${p.defaultValue || ""}"${p.required ? " required" : ""} />\n${indent}</div>`;
      if (el.type === "Dropdown")
        return `${indent}<div class="field">\n${indent}  <label>${p.fieldLabel || "Field"}${p.required ? ' <span class="req">*</span>' : ""}</label>\n${indent}  <select${p.required ? " required" : ""}>\n${(
          p.options || []
        )
          .filter(Boolean)
          .map((o) => `${indent}    <option>${o}</option>`)
          .join("\n")}\n${indent}  </select>\n${indent}</div>`;
      if (el.type === "Label")
        return `${indent}<p class="label-text">${p.text || "Label"}</p>`;
      if (el.type === "Button")
        return `${indent}<button type="submit">${p.buttonText || "Submit"}</button>`;
      return "";
    };
    let out = `<form class="generated-form">\n`;
    freeEls.forEach((el) => {
      out += fieldHTML(el) + "\n";
    });
    conts.forEach((c) => {
      out += `\n  <fieldset>\n    <legend>${c.name || "Container"}</legend>\n`;
      c.children.forEach((el) => {
        out += fieldHTML(el, "    ") + "\n";
      });
      out += `  </fieldset>\n`;
    });
    if (!allEls.some((e) => e.type === "Button"))
      out += `  <button type="submit">Submit</button>\n`;
    out += `</form>`;
    return out;
  };

  const genJSON = () => {
    const schema = {
      fields: freeEls.map((el) => ({ id: el.id, type: el.type, ...el.props })),
      sections: conts.map((c) => ({
        id: c.id,
        name: c.name || "Container",
        fields: c.children.map((el) => ({
          id: el.id,
          type: el.type,
          ...el.props,
        })),
      })),
    };
    return JSON.stringify(schema, null, 2);
  };

  const content = tab === "html" ? genHTML() : genJSON();

  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#1e293b",
          borderRadius: 14,
          width: 600,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "system-ui,sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid #334155",
          }}
        >
          <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15 }}>
            Export Form
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ display: "flex", gap: 4, padding: "12px 20px 0" }}>
          {["html", "json"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "5px 16px",
                borderRadius: "6px 6px 0 0",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                background: tab === t ? "#0f172a" : "transparent",
                color: tab === t ? "#6366f1" : "#64748b",
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <pre
          style={{
            flex: 1,
            overflowY: "auto",
            margin: 0,
            padding: "16px 20px",
            background: "#0f172a",
            color: "#94a3b8",
            fontSize: 12,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {content}
        </pre>
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #334155",
            display: "flex",
            gap: 8,
          }}
        >
          <button
            onClick={copy}
            style={{
              flex: 1,
              padding: "9px",
              background: copied ? "#22c55e" : C.accent,
              color: "#fff",
              border: "none",
              borderRadius: 7,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              transition: "background 0.2s",
            }}
          >
            {copied ? "✓ Copied!" : "Copy to Clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FormField (preview) ──────────────────────────────────────────────────────
function FormField({ el, values, errors, touched, setValue, setTouched }) {
  const p = el.props || {};
  const err = errors[el.id] && touched[el.id];
  const inp = (hasErr) => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 12px",
    border: `1.5px solid ${hasErr ? C.red : "#d1d5db"}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    background: hasErr ? "#fef2f2" : "#fff",
    transition: "border-color 0.15s",
  });

  if (el.type === "Label")
    return (
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#334155",
          borderLeft: "3px solid " + C.accent,
          paddingLeft: 10,
        }}
      >
        {p.text || "Label"}
      </div>
    );
  if (el.type === "Text Input")
    return (
      <div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#475569",
            display: "block",
            marginBottom: 5,
          }}
        >
          {p.fieldLabel || "Text Input"}
          {p.required && <span style={{ color: C.red, marginLeft: 3 }}>*</span>}
        </label>
        <input
          style={inp(err)}
          placeholder={p.placeholder || ""}
          defaultValue={p.defaultValue || ""}
          onChange={(e) => setValue(el.id, e.target.value)}
          onBlur={() => setTouched(el.id)}
          onFocus={(e) => (e.target.style.borderColor = C.accent)}
        />
        {err && (
          <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>
            This field is required
          </div>
        )}
      </div>
    );
  if (el.type === "Dropdown")
    return (
      <div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#475569",
            display: "block",
            marginBottom: 5,
          }}
        >
          {p.fieldLabel || "Dropdown"}
          {p.required && <span style={{ color: C.red, marginLeft: 3 }}>*</span>}
        </label>
        <select
          style={inp(err)}
          value={values[el.id] || ""}
          onChange={(e) => setValue(el.id, e.target.value)}
          onBlur={() => setTouched(el.id)}
          onFocus={(e) => (e.target.style.borderColor = C.accent)}
        >
          <option value="">Select…</option>
          {(p.options || []).filter(Boolean).map((o, i) => (
            <option key={i} value={o}>
              {o}
            </option>
          ))}
        </select>
        {err && (
          <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>
            This field is required
          </div>
        )}
      </div>
    );
  return null;
}

// ─── Accordion (preview) ──────────────────────────────────────────────────────
function Accordion({ title, index, hasErrors, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 4,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: open ? "#f8faff" : "#f8fafc",
          border: "none",
          borderBottom: open ? "1px solid #e2e8f0" : "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: C.accent,
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {index + 1}
          </div>
          <span style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>
            {title}
          </span>
          {hasErrors && (
            <span
              style={{
                fontSize: 10,
                color: C.red,
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: 4,
                padding: "1px 6px",
              }}
            >
              Fields missing
            </span>
          )}
        </div>
        <span
          style={{
            color: "#94a3b8",
            fontSize: 16,
            display: "inline-block",
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.2s",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            background: "#fff",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ─── PreviewForm ──────────────────────────────────────────────────────────────
function PreviewForm({ freeElements, containers, onClose }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [step, setStep] = useState(0); // 0 = free fields, 1..n = containers
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const allFields = [...freeElements, ...containers.flatMap((c) => c.children)];
  const totalSteps = (freeElements.length > 0 ? 1 : 0) + containers.length;
  const hasSteps = totalSteps > 1;

  const setValue = (id, val) => setValues((v) => ({ ...v, [id]: val }));
  const setTouchedF = (id) => setTouched((t) => ({ ...t, [id]: true }));

  // validate current step's fields
  const currentFields = hasSteps
    ? step === 0
      ? freeElements
      : containers[step - (freeElements.length > 0 ? 1 : 0)]?.children || []
    : allFields;

  const validateAll = () => {
    const e = {};
    allFields.forEach((el) => {
      if (el.props?.required && !values[el.id]) e[el.id] = true;
    });
    return e;
  };

  const handleNext = () => {
    const stepFields = currentFields.filter(
      (f) => f.props?.required && !values[f.id],
    );
    if (stepFields.length) {
      const t = {};
      stepFields.forEach((f) => (t[f.id] = true));
      setTouched((p) => ({ ...p, ...t }));
      setErrors((p) => ({
        ...p,
        ...Object.fromEntries(stepFields.map((f) => [f.id, true])),
      }));
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = () => {
    const e = validateAll();
    if (Object.keys(e).length) {
      setErrors(e);
      const t = {};
      Object.keys(e).forEach((id) => (t[id] = true));
      setTouched(t);
      return;
    }
    const json = {};
    allFields.forEach((el) => {
      if (el.type === "Button" || el.type === "Label") return;
      json[el.props?.fieldLabel || el.type] =
        values[el.id] ?? el.props?.defaultValue ?? "";
    });
    setResult(json);
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitBtn = (label = "Submit Form") => (
    <button
      onClick={handleSubmit}
      style={{
        padding: "11px 20px",
        background: `linear-gradient(135deg,${C.accent},#818cf8)`,
        color: "#fff",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 14,
        boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#f8fafc",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
          width: 520,
          maxHeight: "85vh",
          overflowY: "auto",
          fontFamily: "system-ui,sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px 16px",
            background: "#fff",
            borderRadius: "16px 16px 0 0",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1e293b" }}>
              Preview Mode
            </div>
            {hasSteps && !result && (
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                Step {step + 1} of {totalSteps}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 18,
              color: "#64748b",
            }}
          >
            ×
          </button>
        </div>

        {/* Progress bar */}
        {hasSteps && !result && (
          <div style={{ height: 3, background: "#e2e8f0" }}>
            <div
              style={{
                height: "100%",
                width: `${((step + 1) / totalSteps) * 100}%`,
                background: C.accent,
                transition: "width 0.3s",
              }}
            />
          </div>
        )}

        <div style={{ padding: "20px 24px 24px" }}>
          {result ? (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                  padding: "12px 16px",
                  background: "#d1fae5",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 20 }}>✓</span>
                <span
                  style={{ fontWeight: 600, color: "#065f46", fontSize: 14 }}
                >
                  Form submitted!
                </span>
              </div>
              <div
                style={{
                  background: "#1e293b",
                  borderRadius: 8,
                  padding: 16,
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: "#94a3b8",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.7,
                }}
              >
                <span
                  style={{
                    color: "#64748b",
                    fontSize: 10,
                    display: "block",
                    marginBottom: 8,
                    fontFamily: "system-ui",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Form Data
                </span>
                {JSON.stringify(result, null, 2)}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  onClick={copyJSON}
                  style={{
                    flex: 1,
                    padding: "9px",
                    background: copied ? "#22c55e" : C.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    transition: "background 0.2s",
                  }}
                >
                  {copied ? "✓ Copied!" : "Copy JSON"}
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setValues({});
                    setErrors({});
                    setTouched({});
                    setStep(0);
                  }}
                  style={{
                    flex: 1,
                    padding: "9px",
                    background: "#f1f5f9",
                    color: "#334155",
                    border: "none",
                    borderRadius: 7,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  ↺ Reset
                </button>
              </div>
            </div>
          ) : !hasSteps ? (
            // Single-page layout
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {freeElements.map((el) => {
                const p = el.props || {};
                if (el.type === "Button")
                  return (
                    <button
                      key={el.id}
                      onClick={handleSubmit}
                      style={{
                        padding: "11px 20px",
                        background: `linear-gradient(135deg,${C.accent},#818cf8)`,
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {p.buttonText || "Submit"}
                    </button>
                  );
                return (
                  <FormField
                    key={el.id}
                    el={el}
                    values={values}
                    errors={errors}
                    touched={touched}
                    setValue={setValue}
                    setTouched={setTouchedF}
                  />
                );
              })}
              {containers.map((c, i) => (
                <Accordion
                  key={c.id}
                  title={c.name || `Container ${i + 1}`}
                  index={i}
                  hasErrors={c.children.some(
                    (ch) => errors[ch.id] && touched[ch.id],
                  )}
                  defaultOpen={i === 0}
                >
                  {c.children.map((child) => {
                    const p = child.props || {};
                    if (child.type === "Button")
                      return (
                        <button
                          key={child.id}
                          onClick={handleSubmit}
                          style={{
                            padding: "11px 20px",
                            background: `linear-gradient(135deg,${C.accent},#818cf8)`,
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          {p.buttonText || "Submit"}
                        </button>
                      );
                    return (
                      <FormField
                        key={child.id}
                        el={child}
                        values={values}
                        errors={errors}
                        touched={touched}
                        setValue={setValue}
                        setTouched={setTouchedF}
                      />
                    );
                  })}
                </Accordion>
              ))}
              {!allFields.some((e) => e.type === "Button") && submitBtn()}
            </div>
          ) : (
            // Step-by-step layout
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#64748b",
                  marginBottom: 4,
                }}
              >
                {step === 0 && freeElements.length > 0
                  ? "General Fields"
                  : containers[step - (freeElements.length > 0 ? 1 : 0)]
                      ?.name || `Container ${step}`}
              </div>
              {currentFields.map((el) => {
                const p = el.props || {};
                if (el.type === "Button") return null;
                return (
                  <FormField
                    key={el.id}
                    el={el}
                    values={values}
                    errors={errors}
                    touched={touched}
                    setValue={setValue}
                    setTouched={setTouchedF}
                  />
                );
              })}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    style={{
                      flex: 1,
                      padding: "9px",
                      background: "#f1f5f9",
                      color: "#334155",
                      border: "none",
                      borderRadius: 7,
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    ← Back
                  </button>
                )}
                {step < totalSteps - 1 ? (
                  <button
                    onClick={handleNext}
                    style={{
                      flex: 1,
                      padding: "9px",
                      background: C.accent,
                      color: "#fff",
                      border: "none",
                      borderRadius: 7,
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    Next →
                  </button>
                ) : (
                  submitBtn("Submit →")
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Konva node builders ──────────────────────────────────────────────────────
function buildFreeEl(el, cbs) {
  const grp = new Konva.Group({
    x: el.x,
    y: el.y,
    draggable: true,
    id: "el_" + el.id,
  });
  const bg = new Konva.Rect({
    width: EL_W,
    height: EL_H,
    fill: C.elFill,
    stroke: C.elStroke,
    strokeWidth: 1.5,
    cornerRadius: 6,
    shadowColor: "rgba(0,0,0,0.07)",
    shadowBlur: 5,
    shadowOffsetY: 2,
    shadowOpacity: 1,
  });
  grp.add(bg);
  grp.add(
    new Konva.Text({
      x: 12,
      y: 15,
      text: ICONS[el.type] || "□",
      fontSize: 15,
      fill: C.accent,
    }),
  );
  grp.add(
    new Konva.Text({
      x: 34,
      y: 8,
      name: "mainlbl",
      text: el.props?.fieldLabel || el.label,
      fontSize: 12,
      fontStyle: "bold",
      fill: C.elText,
    }),
  );
  grp.add(
    new Konva.Text({
      x: 34,
      y: 27,
      name: "sub",
      text: cardSubText(el),
      fontSize: 9,
      fill: C.elSub,
    }),
  );
  grp.add(
    new Konva.Circle({
      x: EL_W - 10,
      y: 10,
      radius: 4,
      fill: C.red,
      name: "req",
      visible: !!el.props?.required,
    }),
  );

  // Delete btn
  const del = new Konva.Group({
    x: EL_W - 22,
    y: EL_H - 20,
    opacity: 0,
    name: "del",
  });
  del.add(new Konva.Circle({ radius: 9, fill: C.redBg }));
  del.add(
    new Konva.Text({ x: -4, y: -5, text: "✕", fontSize: 10, fill: C.red }),
  );
  del.on("click tap", (e) => {
    e.cancelBubble = true;
    cbs.onDelete(el.id);
  });
  del.on(
    "mouseenter",
    () => (grp.getStage().container().style.cursor = "pointer"),
  );
  del.on(
    "mouseleave",
    () => (grp.getStage().container().style.cursor = "grab"),
  );
  grp.add(del);

  // Duplicate btn
  const dup = new Konva.Group({
    x: EL_W - 42,
    y: EL_H - 20,
    opacity: 0,
    name: "dup",
  });
  dup.add(new Konva.Circle({ radius: 9, fill: "#ede9fe" }));
  dup.add(
    new Konva.Text({ x: -4, y: -5, text: "⧉", fontSize: 10, fill: C.accent }),
  );
  dup.on("click tap", (e) => {
    e.cancelBubble = true;
    cbs.onDuplicate(el.id);
  });
  dup.on(
    "mouseenter",
    () => (grp.getStage().container().style.cursor = "pointer"),
  );
  dup.on(
    "mouseleave",
    () => (grp.getStage().container().style.cursor = "grab"),
  );
  grp.add(dup);

  grp.on("mouseenter", () => {
    bg.stroke(C.accent);
    del.to({ opacity: 1, duration: 0.12 });
    dup.to({ opacity: 1, duration: 0.12 });
    grp.getStage().container().style.cursor = "grab";
    grp.getLayer().batchDraw();
  });
  grp.on("mouseleave", () => {
    bg.stroke(C.elStroke);
    del.to({ opacity: 0, duration: 0.12 });
    dup.to({ opacity: 0, duration: 0.12 });
    grp.getStage().container().style.cursor = "default";
    grp.getLayer().batchDraw();
  });
  grp.on("dragstart", () => {
    grp.moveToTop();
    grp.getStage().container().style.cursor = "grabbing";
    cbs.onDragStart();
  });
  grp.on("dragend", () => {
    grp.getStage().container().style.cursor = "default";
    cbs.onDragEnd(el, snap(grp.x()), snap(grp.y()));
  });
  grp.on("click tap", (e) => {
    if (!e.target.name().match(/del|dup/))
      cbs.onClick(el.id, grp.getAbsolutePosition());
  });
  return grp;
}

function buildChild(child, idx, cont, cbs) {
  const grp = new Konva.Group({
    x: CONT_PAD,
    y: childRelY(idx),
    draggable: true,
    id: "child_" + child.id,
  });
  const bg = new Konva.Rect({
    width: CHILD_W,
    height: EL_H,
    fill: C.elFill,
    stroke: C.elStroke,
    strokeWidth: 1,
    cornerRadius: 5,
  });
  grp.add(bg);
  grp.add(
    new Konva.Text({
      x: 10,
      y: 15,
      text: ICONS[child.type] || "□",
      fontSize: 13,
      fill: C.accent,
    }),
  );
  grp.add(
    new Konva.Text({
      x: 28,
      y: 8,
      name: "mainlbl",
      text: child.props?.fieldLabel || child.label,
      fontSize: 12,
      fontStyle: "bold",
      fill: C.elText,
    }),
  );
  grp.add(
    new Konva.Text({
      x: 28,
      y: 26,
      name: "sub",
      text: cardSubText(child),
      fontSize: 9,
      fill: C.elSub,
    }),
  );
  grp.add(
    new Konva.Circle({
      x: CHILD_W - 8,
      y: 10,
      radius: 4,
      fill: C.red,
      name: "req",
      visible: !!child.props?.required,
    }),
  );

  const mkBtn = (x, y, txt, bg, cb) => {
    const g = new Konva.Group({ x, y, opacity: 0 });
    g.add(new Konva.Rect({ width: 18, height: 16, fill: bg, cornerRadius: 3 }));
    g.add(
      new Konva.Text({ x: 3, y: 1, text: txt, fontSize: 12, fill: C.accent }),
    );
    g.on("click tap", (e) => {
      e.cancelBubble = true;
      cb();
    });
    g.on(
      "mouseenter",
      () => (grp.getStage().container().style.cursor = "pointer"),
    );
    g.on(
      "mouseleave",
      () => (grp.getStage().container().style.cursor = "grab"),
    );
    return g;
  };
  const up = mkBtn(CHILD_W - 46, 10, "↑", C.arrowBg, () =>
    cbs.onMoveUp(child.id),
  );
  grp.add(up);
  const dn = mkBtn(CHILD_W - 26, 10, "↓", C.arrowBg, () =>
    cbs.onMoveDown(child.id),
  );
  grp.add(dn);

  // eject (drag out) button
  const eject = new Konva.Group({ x: CHILD_W - 46, y: 28, opacity: 0 });
  eject.add(
    new Konva.Rect({ width: 18, height: 14, fill: "#e0f2fe", cornerRadius: 3 }),
  );
  eject.add(
    new Konva.Text({ x: 3, y: 1, text: "↗", fontSize: 11, fill: "#0284c7" }),
  );
  eject.on("click tap", (e) => {
    e.cancelBubble = true;
    cbs.onEject(child.id);
  });
  eject.on(
    "mouseenter",
    () => (grp.getStage().container().style.cursor = "pointer"),
  );
  eject.on(
    "mouseleave",
    () => (grp.getStage().container().style.cursor = "grab"),
  );
  grp.add(eject);

  const del = new Konva.Group({ x: CHILD_W - 26, y: 28, opacity: 0 });
  del.add(
    new Konva.Rect({ width: 18, height: 14, fill: C.redBg, cornerRadius: 3 }),
  );
  del.add(new Konva.Text({ x: 3, y: 1, text: "✕", fontSize: 10, fill: C.red }));
  del.on("click tap", (e) => {
    e.cancelBubble = true;
    cbs.onDelete(child.id);
  });
  del.on(
    "mouseenter",
    () => (grp.getStage().container().style.cursor = "pointer"),
  );
  del.on(
    "mouseleave",
    () => (grp.getStage().container().style.cursor = "grab"),
  );
  grp.add(del);

  const showBtns = (v) =>
    [up, dn, eject, del].forEach((b) => b.to({ opacity: v, duration: 0.12 }));
  grp.on("mouseenter", () => {
    bg.stroke(C.accent);
    showBtns(1);
    grp.getStage().container().style.cursor = "grab";
    grp.getLayer().batchDraw();
  });
  grp.on("mouseleave", () => {
    bg.stroke(C.elStroke);
    showBtns(0);
    grp.getStage().container().style.cursor = "default";
    grp.getLayer().batchDraw();
  });
  grp.on("click tap", (e) => {
    const n = e.target.name();
    if (!n) cbs.onClick(child.id, grp.getAbsolutePosition());
  });

  let originIdx = idx;
  grp.dragBoundFunc((pos) => {
    const pAbs = grp.getParent().getAbsolutePosition();
    const kids = cbs.getContChildren();
    return {
      x: pAbs.x + CONT_PAD,
      y: Math.max(
        pAbs.y + childRelY(0),
        Math.min(pAbs.y + childRelY(kids.length - 1), pos.y),
      ),
    };
  });
  grp.on("dragstart", () => {
    originIdx = cbs.getCurrentIdx(child.id);
    bg?.setAttrs({
      stroke: C.accent,
      shadowColor: C.accent,
      shadowBlur: 8,
      shadowOpacity: 0.3,
    });
    grp.getStage().container().style.cursor = "grabbing";
    grp.moveToTop();
    cbs.onDragStart();
  });
  grp.on("dragend", () => {
    bg?.setAttrs({ stroke: C.elStroke, shadowBlur: 0, shadowOpacity: 0 });
    grp.getStage().container().style.cursor = "default";
    const pAbs = grp.getParent().getAbsolutePosition();
    const relY = grp.getAbsolutePosition().y - pAbs.y;
    cbs.onDragReorder(originIdx, dragToIdx(relY, cbs.getContChildren().length));
  });
  return grp;
}

function buildContainer(cont, cbs) {
  const grp = new Konva.Group({
    x: cont.x,
    y: cont.y,
    draggable: true,
    id: "cont_" + cont.id,
  });
  const bg = new Konva.Rect({
    width: CONT_W,
    height: contHeight(cont.children.length),
    fill: C.contFill,
    stroke: C.contStroke,
    strokeWidth: 1.5,
    dash: [6, 4],
    cornerRadius: 8,
    name: "bg",
  });
  grp.add(bg);
  grp.add(
    new Konva.Text({
      x: 14,
      y: 9,
      name: "contname",
      text: cont.name || "Container",
      fontSize: 12,
      fontStyle: "bold",
      fill: C.contTitle,
    }),
  );
  grp.add(
    new Konva.Text({
      x: CONT_W / 2 - 55,
      y: CONT_HDR_H + 18,
      text: "Drop elements here",
      fontSize: 11,
      fill: C.hint,
      visible: cont.children.length === 0,
      name: "hint",
    }),
  );

  const del = new Konva.Group({
    x: CONT_W - 22,
    y: 8,
    opacity: 0,
    name: "del",
  });
  del.add(new Konva.Circle({ radius: 9, fill: C.redBg }));
  del.add(
    new Konva.Text({ x: -4, y: -5, text: "✕", fontSize: 10, fill: C.red }),
  );
  del.on("click tap", (e) => {
    e.cancelBubble = true;
    cbs.onDelete(cont.id);
  });
  del.on(
    "mouseenter",
    () => (grp.getStage().container().style.cursor = "pointer"),
  );
  del.on(
    "mouseleave",
    () => (grp.getStage().container().style.cursor = "move"),
  );
  grp.add(del);

  // Rename button
  const ren = new Konva.Group({
    x: CONT_W - 42,
    y: 8,
    opacity: 0,
    name: "ren",
  });
  ren.add(new Konva.Circle({ radius: 9, fill: "#ede9fe" }));
  ren.add(
    new Konva.Text({ x: -4, y: -5, text: "✎", fontSize: 10, fill: C.accent }),
  );
  ren.on("click tap", (e) => {
    e.cancelBubble = true;
    cbs.onRename(cont.id, grp.getAbsolutePosition());
  });
  ren.on(
    "mouseenter",
    () => (grp.getStage().container().style.cursor = "pointer"),
  );
  ren.on(
    "mouseleave",
    () => (grp.getStage().container().style.cursor = "move"),
  );
  grp.add(ren);

  grp.on("mouseenter", () => {
    bg.stroke(C.accent);
    del.to({ opacity: 1, duration: 0.12 });
    ren.to({ opacity: 1, duration: 0.12 });
    grp.getStage().container().style.cursor = "move";
    grp.getLayer().batchDraw();
  });
  grp.on("mouseleave", () => {
    bg.stroke(C.contStroke);
    del.to({ opacity: 0, duration: 0.12 });
    ren.to({ opacity: 0, duration: 0.12 });
    grp.getStage().container().style.cursor = "default";
    grp.getLayer().batchDraw();
  });
  grp.on("dragstart", () => grp.moveToBottom());
  grp.on("dragend", () => cbs.onDragEnd(cont.id, snap(grp.x()), snap(grp.y())));
  return grp;
}

// ─── Grid layer ───────────────────────────────────────────────────────────────
function drawGrid(layer, w, h) {
  layer.destroyChildren();
  for (let x = 0; x <= w; x += GRID)
    layer.add(
      new Konva.Line({
        points: [x, 0, x, h],
        stroke: C.grid,
        strokeWidth: 0.5,
      }),
    );
  for (let y = 0; y <= h; y += GRID)
    layer.add(
      new Konva.Line({
        points: [0, y, w, y],
        stroke: C.grid,
        strokeWidth: 0.5,
      }),
    );
  layer.batchDraw();
}

// ─── App ──────────────────────────────────────────────────────────────────────
const INITIAL = { freeEls: [], conts: [] };

export default function KeplerBuilderLatest2() {
  const wrapRef = useRef(null);
  const konvaMap = useRef({});
  const contsRef = useRef([]);
  const freeRef = useRef([]);
  const isDragging = useRef(false);
  const stageObj = useRef(null);
  const gridLayer = useRef(null);

  const { state, push, undo, redo, canUndo, canRedo } = useUndoRedo(
    (() => {
      try {
        const s = localStorage.getItem(LS_KEY);
        return s ? JSON.parse(s) : INITIAL;
      } catch {
        return INITIAL;
      }
    })(),
  );

  const { freeEls, conts } = state;
  const setFreeEls = (fn) =>
    push({
      ...state,
      freeEls: typeof fn === "function" ? fn(state.freeEls) : fn,
    });
  const setConts = (fn) =>
    push({ ...state, conts: typeof fn === "function" ? fn(state.conts) : fn });
  const setBoth = (fe, cs) => push({ freeEls: fe, conts: cs });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const [popup, setPopup] = useState(null);
  const [renamePopup, setRenamePopup] = useState(null);
  const [mode, setMode] = useState("edit");
  const [showExport, setShowExport] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef(null);

  useEffect(() => {
    contsRef.current = conts;
  }, [conts]);
  useEffect(() => {
    freeRef.current = freeEls;
  }, [freeEls]);

  const totalElements =
    freeEls.length + conts.flatMap((c) => c.children).length;

  // ── Undo/redo keyboard ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // ── getElementById ─────────────────────────────────────────────────────────
  const getElementById = (id) => {
    const free = freeRef.current.find((e) => e.id === id);
    if (free) return { el: free, isFree: true, containerId: null };
    for (const c of contsRef.current) {
      const ch = c.children.find((ch) => ch.id === id);
      if (ch) return { el: ch, isFree: false, containerId: c.id };
    }
    return null;
  };

  // ── updateProps ────────────────────────────────────────────────────────────
  const updateProps = (id, newProps) => {
    const found = getElementById(id);
    if (!found) return;
    const updated = { ...found.el, props: { ...found.el.props, ...newProps } };
    if (found.isFree)
      setFreeEls((p) => p.map((e) => (e.id !== id ? e : updated)));
    else
      setConts((p) =>
        p.map((c) =>
          c.id !== found.containerId
            ? c
            : {
                ...c,
                children: c.children.map((ch) => (ch.id !== id ? ch : updated)),
              },
        ),
      );
    const node = konvaMap.current[(found.isFree ? "el_" : "child_") + id];
    if (node) setCardTexts(node, updated);
  };

  const openPopup = (id, pos) => {
    if (!isDragging.current) setPopup({ id, pos });
  };

  // ── Init Konva ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!wrapRef.current) return;
    const w = wrapRef.current.offsetWidth;
    const stage = new Konva.Stage({
      container: wrapRef.current,
      width: w,
      height: STAGE_H,
    });
    stageObj.current = stage;

    // Grid layer (bottom)
    const gl = new Konva.Layer();
    stage.add(gl);
    gridLayer.current = gl;
    drawGrid(gl, w, STAGE_H);

    // Main layer
    const layer = new Konva.Layer();
    stage.add(layer);
    wrapRef.current._layer = layer;

    stage.on("click tap", (e) => {
      if (e.target === stage) {
        setPopup(null);
        setRenamePopup(null);
      }
    });

    // Zoom (wheel)
    stage.on("wheel", (e) => {
      e.evt.preventDefault();
      const scaleBy = 1.05;
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };
      const newScale =
        e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clamped = Math.max(0.3, Math.min(3, newScale));
      stage.scale({ x: clamped, y: clamped });
      stage.position({
        x: pointer.x - mousePointTo.x * clamped,
        y: pointer.y - mousePointTo.y * clamped,
      });
      setZoom(clamped);
      stage.batchDraw();
    });

    // Pan (middle mouse or alt+drag)
    stage.on("mousedown", (e) => {
      if (e.evt.button === 1 || e.evt.altKey) {
        isPanning.current = true;
        panStart.current = {
          x: e.evt.clientX - stage.x(),
          y: e.evt.clientY - stage.y(),
        };
        stage.container().style.cursor = "grabbing";
      }
    });
    stage.on("mousemove", (e) => {
      if (!isPanning.current) return;
      stage.position({
        x: e.evt.clientX - panStart.current.x,
        y: e.evt.clientY - panStart.current.y,
      });
      stage.batchDraw();
    });
    stage.on("mouseup", () => {
      if (isPanning.current) {
        isPanning.current = false;
        stage.container().style.cursor = "default";
      }
    });

    return () => stage.destroy();
  }, []);

  // Grid visibility
  useEffect(() => {
    gridLayer.current?.visible(showGrid);
    gridLayer.current?.getStage()?.batchDraw();
  }, [showGrid]);

  // ── Sync state → Konva ─────────────────────────────────────────────────────
  useEffect(() => {
    const layer = wrapRef.current?._layer;
    if (!layer) return;
    const alive = new Set();

    conts.forEach((cont) => {
      const key = "cont_" + cont.id;
      alive.add(key);
      if (!konvaMap.current[key]) {
        const node = buildContainer(cont, {
          onDragEnd: (id, nx, ny) =>
            setConts((p) =>
              p.map((c) => (c.id === id ? { ...c, x: nx, y: ny } : c)),
            ),
          onDelete: (id) => {
            setConts((p) => p.filter((c) => c.id !== id));
            setPopup(null);
          },
          onRename: (id, pos) => {
            setRenamePopup({ id, pos });
          },
        });
        layer.add(node);
        node.moveToBottom();
        konvaMap.current[key] = node;
      } else {
        const node = konvaMap.current[key];
        if (!node.isDragging()) node.position({ x: cont.x, y: cont.y });
        node
          .findOne(".bg")
          ?.setAttrs({ height: contHeight(cont.children.length) });
        node.findOne(".hint")?.visible(cont.children.length === 0);
        node.findOne(".contname")?.text(cont.name || "Container");
      }
      const contNode = konvaMap.current[key];

      cont.children.forEach((child, idx) => {
        const cKey = "child_" + child.id;
        alive.add(cKey);
        if (!konvaMap.current[cKey]) {
          const node = buildChild(child, idx, cont, {
            onClick: (id, pos) => openPopup(id, pos),
            onDelete: (cid) => {
              setConts((p) =>
                p.map((c) =>
                  c.id !== cont.id
                    ? c
                    : {
                        ...c,
                        children: c.children.filter((ch) => ch.id !== cid),
                      },
                ),
              );
              setPopup(null);
            },
            onMoveUp: (cid) =>
              setConts((p) =>
                p.map((c) => {
                  if (c.id !== cont.id) return c;
                  const k = [...c.children],
                    i = k.findIndex((x) => x.id === cid);
                  if (i <= 0) return c;
                  [k[i - 1], k[i]] = [k[i], k[i - 1]];
                  return { ...c, children: k };
                }),
              ),
            onMoveDown: (cid) =>
              setConts((p) =>
                p.map((c) => {
                  if (c.id !== cont.id) return c;
                  const k = [...c.children],
                    i = k.findIndex((x) => x.id === cid);
                  if (i < 0 || i >= k.length - 1) return c;
                  [k[i], k[i + 1]] = [k[i + 1], k[i]];
                  return { ...c, children: k };
                }),
              ),
            onEject: (cid) => {
              const child = contsRef.current
                .find((c) => c.id === cont.id)
                ?.children.find((ch) => ch.id === cid);
              if (!child) return;
              const contNode = konvaMap.current["cont_" + cont.id];
              const cPos = contNode?.getAbsolutePosition() ?? {
                x: cont.x,
                y: cont.y,
              };
              const newX = snap(cPos.x + CONT_W + 20);
              const newY = snap(cPos.y);
              konvaMap.current["child_" + cid]?.destroy();
              delete konvaMap.current["child_" + cid];
              setBoth(
                [...freeRef.current, { ...child, x: newX, y: newY }],
                contsRef.current.map((c) =>
                  c.id !== cont.id
                    ? c
                    : {
                        ...c,
                        children: c.children.filter((ch) => ch.id !== cid),
                      },
                ),
              );
            },
            onDragReorder: (from, to) => {
              if (from === to) return;
              setConts((p) =>
                p.map((c) => {
                  if (c.id !== cont.id) return c;
                  const k = [...c.children],
                    [m] = k.splice(from, 1);
                  k.splice(to, 0, m);
                  return { ...c, children: k };
                }),
              );
            },
            onDragStart: () => {
              isDragging.current = true;
              setPopup(null);
            },
            getContChildren: () =>
              contsRef.current.find((c) => c.id === cont.id)?.children ?? [],
            getCurrentIdx: (cid) => {
              const l = contsRef.current.find((c) => c.id === cont.id);
              return l ? l.children.findIndex((k) => k.id === cid) : idx;
            },
          });
          contNode.add(node);
          konvaMap.current[cKey] = node;
        } else {
          const node = konvaMap.current[cKey];
          if (!node.isDragging()) {
            node.position({ x: CONT_PAD, y: childRelY(idx) });
            setCardTexts(node, child);
          }
        }
      });
    });

    freeEls.forEach((el) => {
      const key = "el_" + el.id;
      alive.add(key);
      if (!konvaMap.current[key]) {
        const node = buildFreeEl(el, {
          onClick: (id, pos) => openPopup(id, pos),
          onDelete: (id) => {
            setFreeEls((p) => p.filter((e) => e.id !== id));
            setPopup(null);
          },
          onDuplicate: (id) => {
            const orig = freeRef.current.find((e) => e.id === id);
            if (!orig) return;
            setFreeEls((p) => [
              ...p,
              {
                ...orig,
                id: uid(),
                x: snap(orig.x + GRID * 2),
                y: snap(orig.y + GRID * 2),
              },
            ]);
          },
          onDragStart: () => {
            isDragging.current = true;
            setPopup(null);
          },
          onDragEnd: (el, nx, ny) => {
            isDragging.current = false;
            const hit = hitCont(contsRef.current, nx + EL_W / 2, ny + EL_H / 2);
            if (hit) {
              konvaMap.current["el_" + el.id]?.destroy();
              delete konvaMap.current["el_" + el.id];
              setBoth(
                freeRef.current.filter((e) => e.id !== el.id),
                contsRef.current.map((c) =>
                  c.id !== hit.id
                    ? c
                    : {
                        ...c,
                        children: [
                          ...c.children,
                          {
                            id: el.id,
                            type: el.type,
                            label: el.label,
                            props: el.props,
                          },
                        ],
                      },
                ),
              );
            } else {
              setFreeEls((p) =>
                p.map((e) => (e.id === el.id ? { ...e, x: nx, y: ny } : e)),
              );
            }
          },
        });
        layer.add(node);
        konvaMap.current[key] = node;
      } else {
        const node = konvaMap.current[key];
        if (!node.isDragging()) {
          node.position({ x: el.x, y: el.y });
          setCardTexts(node, el);
        }
      }
    });

    Object.keys(konvaMap.current).forEach((key) => {
      if (!alive.has(key)) {
        konvaMap.current[key].destroy();
        delete konvaMap.current[key];
      }
    });
    layer.batchDraw();
  }, [freeEls, conts]);

  useEffect(() => {
    const up = () =>
      setTimeout(() => {
        isDragging.current = false;
      }, 50);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  // ── Drop from sidebar ──────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("componentType");
    if (!raw) return;
    const { type, label } = JSON.parse(raw);
    const rect = wrapRef.current.getBoundingClientRect();
    const stage = stageObj.current;
    const scale = stage?.scaleX() ?? 1;
    const sx = stage?.x() ?? 0,
      sy = stage?.y() ?? 0;
    const cx = (e.clientX - rect.left - sx) / scale;
    const cy = (e.clientY - rect.top - sy) / scale;
    const x = snap(cx),
      y = snap(cy);
    setPopup(null);
    if (type === "container") {
      setConts((p) => [
        ...p,
        {
          id: uid(),
          x: x - CONT_W / 2,
          y: y - CONT_HDR_H / 2,
          children: [],
          name: "Container",
        },
      ]);
    } else {
      const newEl = { id: uid(), type, label, props: defaultProps(type) };
      const hit = hitCont(contsRef.current, cx, cy);
      if (hit)
        setConts((p) =>
          p.map((c) =>
            c.id !== hit.id ? c : { ...c, children: [...c.children, newEl] },
          ),
        );
      else
        setFreeEls((p) => [
          ...p,
          { ...newEl, x: x - EL_W / 2, y: y - EL_H / 2 },
        ]);
    }
  };

  const resetZoom = () => {
    const s = stageObj.current;
    if (!s) return;
    s.scale({ x: 1, y: 1 });
    s.position({ x: 0, y: 0 });
    s.batchDraw();
    setZoom(1);
  };
  const clearAll = () => {
    if (window.confirm("Clear everything?")) push(INITIAL);
  };

  const popupEl = popup ? getElementById(popup.id)?.el : null;
  const renCont = renamePopup
    ? conts.find((c) => c.id === renamePopup.id)
    : null;
  const stageRect = wrapRef.current?.getBoundingClientRect() ?? {
    left: 0,
    top: 0,
  };
  const isPreview = mode === "preview";

  const SIDEBAR_ITEMS = [
    { type: "Text Input", label: "Text Input" },
    { type: "Dropdown", label: "Dropdown" },
    { type: "Label", label: "Label" },
    { type: "Button", label: "Button" },
    { type: "container", label: "Container" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        fontFamily: "system-ui,sans-serif",
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          height: 52,
          background: "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          flexShrink: 0,
          gap: 12,
        }}
      >
        <div
          style={{
            color: "#e2e8f0",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: 0.3,
            flexShrink: 0,
          }}
        >
          Form Builder
        </div>

        {/* Undo/Redo */}
        <div style={{ display: "flex", gap: 4 }}>
          {[
            ["↩", "Undo (Ctrl+Z)", undo, canUndo],
            ["↪", "Redo (Ctrl+Y)", redo, canRedo],
          ].map(([icon, title, fn, enabled]) => (
            <button
              key={title}
              title={title}
              onClick={fn}
              disabled={!enabled}
              style={{
                width: 30,
                height: 30,
                border: "none",
                borderRadius: 6,
                background: enabled ? "#334155" : "#1e293b",
                color: enabled ? "#e2e8f0" : "#475569",
                cursor: enabled ? "pointer" : "default",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.1s",
              }}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Mode toggle */}
        <div
          style={{
            display: "flex",
            background: "#0f172a",
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}
        >
          {["edit", "preview"].map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setPopup(null);
                setRenamePopup(null);
              }}
              style={{
                padding: "5px 16px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                background: mode === m ? "#6366f1" : "transparent",
                color: mode === m ? "#fff" : "#64748b",
                transition: "all 0.15s",
              }}
            >
              {m === "edit" ? "✏ Edit" : "▶ Preview"}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Zoom */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "#0f172a",
              borderRadius: 7,
              padding: "3px 8px",
            }}
          >
            <button
              onClick={() => {
                const s = stageObj.current;
                if (!s) return;
                const nz = Math.max(0.3, zoom - 0.1);
                s.scale({ x: nz, y: nz });
                s.batchDraw();
                setZoom(nz);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
                padding: "0 2px",
              }}
            >
              −
            </button>
            <span
              style={{
                color: "#94a3b8",
                fontSize: 11,
                minWidth: 36,
                textAlign: "center",
              }}
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => {
                const s = stageObj.current;
                if (!s) return;
                const nz = Math.min(3, zoom + 0.1);
                s.scale({ x: nz, y: nz });
                s.batchDraw();
                setZoom(nz);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
                padding: "0 2px",
              }}
            >
              +
            </button>
            <button
              onClick={resetZoom}
              style={{
                background: "none",
                border: "none",
                color: "#475569",
                cursor: "pointer",
                fontSize: 10,
                padding: "0 2px",
              }}
              title="Reset zoom"
            >
              ⊙
            </button>
          </div>

          <button
            onClick={() => setShowGrid((g) => !g)}
            title="Toggle grid"
            style={{
              width: 30,
              height: 30,
              border: "none",
              borderRadius: 6,
              background: showGrid ? "#334155" : "#1e293b",
              color: showGrid ? "#6366f1" : "#475569",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ⊞
          </button>
          <button
            onClick={() => setShowExport(true)}
            style={{
              padding: "5px 12px",
              border: "none",
              borderRadius: 6,
              background: "#334155",
              color: "#e2e8f0",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Export
          </button>
          <button
            onClick={clearAll}
            style={{
              padding: "5px 12px",
              border: "none",
              borderRadius: 6,
              background: "transparent",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Clear
          </button>
          <span style={{ color: "#475569", fontSize: 11 }}>
            {totalElements} el
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Sidebar ── */}
        {!isPreview && (
          <div
            style={{
              width: SIDEBAR_W,
              background: "#1e293b",
              padding: "16px 12px",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Components
            </div>
            {SIDEBAR_ITEMS.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData(
                    "componentType",
                    JSON.stringify({ type: item.type, label: item.label }),
                  )
                }
                style={{
                  padding: "9px 12px",
                  background: item.type === "container" ? "#172554" : "#334155",
                  border:
                    item.type === "container"
                      ? "1px dashed #3b5bdb"
                      : "1px solid #475569",
                  borderRadius: 6,
                  cursor: "grab",
                  fontSize: 13,
                  color: "#e2e8f0",
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>
                  {item.type === "container" ? "📦" : ICONS[item.label]}
                </span>
                {item.label}
              </div>
            ))}
            <div
              style={{
                marginTop: "auto",
                color: "#475569",
                fontSize: 10,
                lineHeight: 2,
              }}
            >
              • Drag to canvas
              <br />
              • Drop on container to group
              <br />
              • ↑↓ or drag to reorder
              <br />
              • ↗ to eject from container
              <br />
              • ⧉ to duplicate
              <br />
              • Click → edit properties
              <br />
              • Hover → ✕ to delete
              <br />
              • Ctrl+Z / Ctrl+Y undo/redo
              <br />• Scroll to zoom, Alt+drag to pan
            </div>
          </div>
        )}

        {/* ── Canvas ── */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <div
            ref={wrapRef}
            onDrop={!isPreview ? handleDrop : undefined}
            onDragOver={!isPreview ? (e) => e.preventDefault() : undefined}
            style={{
              width: "100%",
              height: STAGE_H,
              background: C.stageBg,
              opacity: isPreview ? 0.35 : 1,
              transition: "opacity 0.2s",
              pointerEvents: isPreview ? "none" : "auto",
            }}
          />

          {!isPreview && popup && popupEl && (
            <Popup
              el={popupEl}
              pos={popup.pos}
              stageRect={stageRect}
              onUpdate={(p) => updateProps(popup.id, p)}
              onClose={() => setPopup(null)}
            />
          )}
          {!isPreview && renamePopup && renCont && (
            <RenamePopup
              cont={renCont}
              pos={renamePopup.pos}
              stageRect={stageRect}
              onChange={(name) =>
                setConts((p) =>
                  p.map((c) => (c.id !== renCont.id ? c : { ...c, name })),
                )
              }
              onClose={() => setRenamePopup(null)}
            />
          )}
          {isPreview && totalElements === 0 && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                color: "#94a3b8",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              No elements yet — switch to Edit mode to add some.
            </div>
          )}
        </div>
      </div>

      {isPreview && totalElements > 0 && (
        <PreviewForm
          freeElements={freeEls}
          containers={conts}
          onClose={() => setMode("edit")}
        />
      )}
      {showExport && (
        <ExportModal
          freeEls={freeEls}
          conts={conts}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
