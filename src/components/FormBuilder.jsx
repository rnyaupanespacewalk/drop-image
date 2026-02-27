import { useState, useRef, useEffect } from "react";
import Konva from "konva";

// ─── Constants ────────────────────────────────────────────────────────────────
const SIDEBAR_W = 170;
const STAGE_H = 620;
const EL_W = 220;
const EL_H = 48;
const CONT_MIN_W = 280;
const CONT_MIN_H = 120;
const CONT_HDR_H = 32;
const CHILD_W = 220;
const POPUP_W = 260;
const RESIZE_HIT = 12; // px area for resize handle

const C = {
  elFill: "#ffffff",
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
};

const ICONS = { "Text Input": "⌨", Dropdown: "▾", Label: "T", Button: "◻" };

const defaultProps = (type) => {
  switch (type) {
    case "Text Input":
      return {
        fieldLabel: "Text Input",
        placeholder: "",
        defaultValue: "",
        required: false,
      };
    case "Dropdown":
      return {
        fieldLabel: "Dropdown",
        options: ["Option 1", "Option 2", "Option 3"],
        required: false,
      };
    case "Label":
      return { fieldLabel: "Label", text: "Label Text" };
    case "Button":
      return { fieldLabel: "Button", buttonText: "Submit" };
    default:
      return { fieldLabel: type };
  }
};

let _uid = 1;
const uid = () => _uid++;

// ─── Layout helpers ───────────────────────────────────────────────────────────
const ptInCont = (c, px, py) =>
  px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h;

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
  grp.getLayer()?.batchDraw();
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
          {ICONS[el.type]}&nbsp; {el.type}
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

// ─── FormField ────────────────────────────────────────────────────────────────
function FormField({ el, values, errors, setValue }) {
  const p = el.props || {};
  const err = errors[el.id];
  const inputBase = (hasErr) => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 12px",
    border: `1.5px solid ${hasErr ? "#ef4444" : "#d1d5db"}`,
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
        {p.text || "Label Text"}
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
          style={inputBase(err)}
          placeholder={p.placeholder || ""}
          defaultValue={p.defaultValue || ""}
          onChange={(e) => setValue(el.id, e.target.value)}
          onFocus={(e) => (e.target.style.borderColor = C.accent)}
          onBlur={(e) => (e.target.style.borderColor = err ? C.red : "#d1d5db")}
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
          style={inputBase(err)}
          value={values[el.id] || ""}
          onChange={(e) => setValue(el.id, e.target.value)}
          onFocus={(e) => (e.target.style.borderColor = C.accent)}
          onBlur={(e) => (e.target.style.borderColor = err ? C.red : "#d1d5db")}
        >
          <option value="">Select…</option>
          {(p.options || []).filter(Boolean).map((opt, i) => (
            <option key={i} value={opt}>
              {opt}
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

// ─── AccordionSection ─────────────────────────────────────────────────────────
function AccordionSection({
  title,
  index,
  children,
  hasErrors,
  defaultOpen = true,
}) {
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
          cursor: "pointer",
          fontFamily: "inherit",
          borderBottom: open ? "1px solid #e2e8f0" : "none",
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
              Required fields missing
            </span>
          )}
        </div>
        <span
          style={{
            color: "#94a3b8",
            fontSize: 16,
            display: "inline-block",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "16px 16px",
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
  const [result, setResult] = useState(null);

  const setValue = (id, val) => {
    setValues((v) => ({ ...v, [id]: val }));
    setErrors((e) => ({ ...e, [id]: false }));
  };

  // Sort children by y then x for natural reading order
  const sortedChildren = (children) =>
    [...children].sort((a, b) => (a.cy !== b.cy ? a.cy - b.cy : a.cx - b.cx));

  const allFields = [
    ...freeElements,
    ...containers.flatMap((c) => sortedChildren(c.children)),
  ];

  const handleSubmit = () => {
    const newErrors = {};
    allFields.forEach((el) => {
      if (el.props?.required && !values[el.id]) newErrors[el.id] = true;
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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

  const submitBtn = (
    <button
      onClick={handleSubmit}
      style={{
        padding: "11px 20px",
        background: `linear-gradient(135deg, ${C.accent}, #818cf8)`,
        color: "#fff",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 14,
        boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
      }}
    >
      Submit Form
    </button>
  );

  return (
   
          <><div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#1e293b" }}>
        Preview Mode
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
        Interacting as an end user
      </div>
    </div><button
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
      </button><div style={{ padding: "20px 24px 24px" }}>
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
                Form submitted successfully!
              </span>
            </div>
            <div
              style={{
                background: "#1e293b",
                borderRadius: 8,
                padding: "16px",
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
                Form Data (JSON)
              </span>
              {JSON.stringify(result, null, 2)}
            </div>
            <button
              onClick={() => {
                setResult(null);
                setValues({});
                setErrors({});
              } }
              style={{
                marginTop: 16,
                width: "100%",
                padding: "10px",
                background: C.accent,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              ↺ Reset &amp; Fill Again
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {freeElements.length > 0 && (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {freeElements.map((el) => {
                  if (el.type === "Button")
                    return (
                      <button
                        key={el.id}
                        onClick={handleSubmit}
                        style={{
                          padding: "11px 20px",
                          background: `linear-gradient(135deg, ${C.accent}, #818cf8)`,
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {el.props?.buttonText || "Submit"}
                      </button>
                    );
                  return (
                    <FormField
                      key={el.id}
                      el={el}
                      values={values}
                      errors={errors}
                      setValue={setValue} />
                  );
                })}
              </div>
            )}
            {containers.map((cont, idx) => {
              const sorted = sortedChildren(cont.children);
              const contErrors = sorted.some((ch) => errors[ch.id]);
              return (
                <AccordionSection
                  key={cont.id}
                  title={`Container ${idx + 1}`}
                  index={idx}
                  hasErrors={contErrors}
                  defaultOpen={idx === 0}
                >
                  {sorted.map((child) => {
                    if (child.type === "Button")
                      return (
                        <button
                          key={child.id}
                          onClick={handleSubmit}
                          style={{
                            padding: "11px 20px",
                            background: `linear-gradient(135deg, ${C.accent}, #818cf8)`,
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          {child.props?.buttonText || "Submit"}
                        </button>
                      );
                    return (
                      <FormField
                        key={child.id}
                        el={child}
                        values={values}
                        errors={errors}
                        setValue={setValue} />
                    );
                  })}
                </AccordionSection>
              );
            })}
            {!allFields.some((e) => e.type === "Button") && (
              <div style={{ marginTop: 4 }}>{submitBtn}</div>
            )}
          </div>
        )}
      </div></>
     
}

// ─── Konva builders ───────────────────────────────────────────────────────────

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

  grp.on("mouseenter", () => {
    bg.stroke(C.accent);
    del.to({ opacity: 1, duration: 0.12 });
    grp.getStage().container().style.cursor = "grab";
    grp.getLayer().batchDraw();
  });
  grp.on("mouseleave", () => {
    bg.stroke(C.elStroke);
    del.to({ opacity: 0, duration: 0.12 });
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
    cbs.onDragEnd(el, grp.x(), grp.y());
  });
  grp.on("click tap", (e) => {
    if (!e.target.name().includes("del"))
      cbs.onClick(el.id, grp.getAbsolutePosition());
  });
  return grp;
}

// Child element — freely placed inside container, can be dragged anywhere inside
function buildChild(child, cbs) {
  const grp = new Konva.Group({
    x: child.cx,
    y: child.cy,
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
    shadowColor: "rgba(0,0,0,0.05)",
    shadowBlur: 4,
    shadowOffsetY: 1,
    shadowOpacity: 1,
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

  const del = new Konva.Group({
    x: CHILD_W - 22,
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

  grp.on("mouseenter", () => {
    bg.stroke(C.accent);
    del.to({ opacity: 1, duration: 0.12 });
    grp.getStage().container().style.cursor = "grab";
    grp.getLayer().batchDraw();
  });
  grp.on("mouseleave", () => {
    bg.stroke(C.elStroke);
    del.to({ opacity: 0, duration: 0.12 });
    grp.getStage().container().style.cursor = "default";
    grp.getLayer().batchDraw();
  });

  // Clamp drag within parent container
  grp.dragBoundFunc((pos) => {
    const cont = cbs.getCont();
    const pAbs = grp.getParent().getAbsolutePosition();
    const minX = pAbs.x + 4;
    const minY = pAbs.y + CONT_HDR_H + 4;
    const maxX = pAbs.x + cont.w - CHILD_W - 4;
    const maxY = pAbs.y + cont.h - EL_H - 4;
    return {
      x: Math.max(minX, Math.min(maxX, pos.x)),
      y: Math.max(minY, Math.min(maxY, pos.y)),
    };
  });

  grp.on("dragstart", () => {
    bg.setAttrs({
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
    bg.setAttrs({
      stroke: C.elStroke,
      shadowBlur: 4,
      shadowOpacity: 0.05,
      shadowColor: "rgba(0,0,0,0.05)",
    });
    grp.getStage().container().style.cursor = "default";
    const pAbs = grp.getParent().getAbsolutePosition();
    cbs.onDragEnd(child.id, grp.x(), grp.y());
  });
  grp.on("click tap", (e) => {
    if (!e.target.name().includes("del"))
      cbs.onClick(child.id, grp.getAbsolutePosition());
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
    width: cont.w,
    height: cont.h,
    fill: C.contFill,
    stroke: C.contStroke,
    strokeWidth: 1.5,
    dash: [6, 4],
    cornerRadius: 8,
    name: "bg",
    shadowColor: "rgba(0,0,0,0.06)",
    shadowBlur: 8,
    shadowOffsetY: 2,
    shadowOpacity: 1,
  });
  grp.add(bg);

  grp.add(
    new Konva.Text({
      x: 14,
      y: 9,
      text: "📦  Container",
      fontSize: 12,
      fontStyle: "bold",
      fill: C.contTitle,
    }),
  );

  grp.add(
    new Konva.Text({
      name: "hint",
      text: "Drop elements here — drag freely inside",
      fontSize: 11,
      fill: C.hint,
      visible: cont.children.length === 0,
      // positioned dynamically via sync
      x: 0,
      y: 0,
    }),
  );

  // Resize handle (bottom-right corner)
  const resizeHandle = new Konva.Group({
    x: cont.w - RESIZE_HIT,
    y: cont.h - RESIZE_HIT,
    name: "resize",
  });
  resizeHandle.add(
    new Konva.Rect({
      width: RESIZE_HIT,
      height: RESIZE_HIT,
      fill: "transparent",
    }),
  );
  // Visual grip dots
  for (let r = 0; r < 3; r++) {
    for (let c2 = 0; c2 < 3; c2++) {
      if (r + c2 < 2) continue; // only bottom-right triangle
      resizeHandle.add(
        new Konva.Circle({
          x: 3 + c2 * 4,
          y: 3 + r * 4,
          radius: 1.5,
          fill: C.contStroke,
        }),
      );
    }
  }
  grp.add(resizeHandle);

  // Delete button
  const del = new Konva.Group({
    x: cont.w - 22,
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

  grp.on("mouseenter", () => {
    bg.stroke(C.accent);
    del.to({ opacity: 1, duration: 0.12 });
    grp.getStage().container().style.cursor = "move";
    grp.getLayer().batchDraw();
  });
  grp.on("mouseleave", () => {
    bg.stroke(C.contStroke);
    del.to({ opacity: 0, duration: 0.12 });
    grp.getStage().container().style.cursor = "default";
    grp.getLayer().batchDraw();
  });

  // Make container go behind children
  grp.on("dragstart", () => {
    grp.moveToBottom();
    grp.getStage().container().style.cursor = "grabbing";
  });
  grp.on("dragend", () => {
    cbs.onDragEnd(cont.id, grp.x(), grp.y());
    grp.getStage().container().style.cursor = "default";
  });

  return grp;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function FormBuilderFreeCanvas() {
  const wrapRef = useRef(null);
  const konvaMap = useRef({});
  const contsRef = useRef([]);
  const freeRef = useRef([]);
  const isDragging = useRef(false);
  // Resize state
  const resizeState = useRef(null); // { contId, startX, startY, startW, startH }

  const [freeEls, setFreeEls] = useState([]);
  const [conts, setConts] = useState([]);
  const [popup, setPopup] = useState(null);
  const [mode, setMode] = useState("edit");

  useEffect(() => {
    contsRef.current = conts;
  }, [conts]);
  useEffect(() => {
    freeRef.current = freeEls;
  }, [freeEls]);

  const totalElements =
    freeEls.length + conts.flatMap((c) => c.children).length;

  const getElementById = (id) => {
    const free = freeRef.current.find((e) => e.id === id);
    if (free) return { el: free, isFree: true, containerId: null };
    for (const c of contsRef.current) {
      const ch = c.children.find((ch) => ch.id === id);
      if (ch) return { el: ch, isFree: false, containerId: c.id };
    }
    return null;
  };

  const updateProps = (id, newProps) => {
    const found = getElementById(id);
    if (!found) return;
    if (found.isFree) {
      setFreeEls((p) =>
        p.map((e) =>
          e.id !== id ? e : { ...e, props: { ...e.props, ...newProps } },
        ),
      );
    } else {
      setConts((p) =>
        p.map((c) =>
          c.id !== found.containerId
            ? c
            : {
                ...c,
                children: c.children.map((ch) =>
                  ch.id !== id
                    ? ch
                    : { ...ch, props: { ...ch.props, ...newProps } },
                ),
              },
        ),
      );
    }
    const node = konvaMap.current[(found.isFree ? "el_" : "child_") + id];
    if (node)
      setCardTexts(node, {
        ...found.el,
        props: { ...found.el.props, ...newProps },
      });
  };

  const openPopup = (id, pos) => {
    if (!isDragging.current) setPopup({ id, pos });
  };

  // ── Init Konva ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!wrapRef.current) return;
    const stage = new Konva.Stage({
      container: wrapRef.current,
      width: wrapRef.current.offsetWidth,
      height: STAGE_H,
    });
    const layer = new Konva.Layer();
    stage.add(layer);
    wrapRef.current._stage = stage;
    wrapRef.current._layer = layer;

    // Resize handle interaction via stage mousemove/up
    stage.on("mousemove", (e) => {
      if (!resizeState.current) return;
      const { contId, startX, startY, startW, startH } = resizeState.current;
      const pos = stage.getPointerPosition();
      const dx = pos.x - startX;
      const dy = pos.y - startY;
      const newW = Math.max(CONT_MIN_W, startW + dx);
      const newH = Math.max(CONT_MIN_H, startH + dy);
      setConts((p) =>
        p.map((c) => (c.id === contId ? { ...c, w: newW, h: newH } : c)),
      );
    });

    stage.on("mouseup touchend", () => {
      resizeState.current = null;
      wrapRef.current._stage.container().style.cursor = "default";
    });
    stage.on("click tap", (e) => {
      if (e.target === stage) setPopup(null);
    });

    return () => stage.destroy();
  }, []);

  // ── Sync state → Konva ─────────────────────────────────────────────────────
  useEffect(() => {
    const layer = wrapRef.current?._layer;
    if (!layer) return;
    const stage = wrapRef.current._stage;
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
        });
        layer.add(node);
        node.moveToBottom();
        konvaMap.current[key] = node;

        // Attach resize mousedown on the resize handle
        const rh = node.findOne(".resize");
        rh.on("mousedown touchstart", (e) => {
          e.cancelBubble = true;
          node.draggable(false); // disable container drag while resizing
          const pos = stage.getPointerPosition();
          const c = contsRef.current.find((c) => c.id === cont.id);
          resizeState.current = {
            contId: cont.id,
            startX: pos.x,
            startY: pos.y,
            startW: c.w,
            startH: c.h,
          };
          stage.container().style.cursor = "se-resize";
        });
        rh.on("mouseenter", () => {
          stage.container().style.cursor = "se-resize";
        });
        rh.on("mouseleave", () => {
          if (!resizeState.current) stage.container().style.cursor = "default";
        });

        stage.on("mouseup touchend", () => {
          node.draggable(true);
        });
      }

      // Sync position and size
      const node = konvaMap.current[key];
      if (!node.isDragging()) node.position({ x: cont.x, y: cont.y });

      const bg = node.findOne(".bg");
      bg.setAttrs({ width: cont.w, height: cont.h });

      // Update delete button and resize handle positions
      const del = node.findOne(".del");
      if (del) del.position({ x: cont.w - 22, y: 8 });

      const rh = node.findOne(".resize");
      if (rh) rh.position({ x: cont.w - RESIZE_HIT, y: cont.h - RESIZE_HIT });

      // Hint text centered
      const hint = node.findOne(".hint");
      if (hint) {
        hint.visible(cont.children.length === 0);
        hint.position({ x: cont.w / 2 - 100, y: cont.h / 2 - 6 });
      }

      // Sync children
      cont.children.forEach((child) => {
        const cKey = "child_" + child.id;
        alive.add(cKey);

        if (!konvaMap.current[cKey]) {
          const cNode = buildChild(child, {
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
            onDragStart: () => {
              isDragging.current = true;
              setPopup(null);
            },
            onDragEnd: (cid, nx, ny) => {
              isDragging.current = false;
              setConts((p) =>
                p.map((c) =>
                  c.id !== cont.id
                    ? c
                    : {
                        ...c,
                        children: c.children.map((ch) =>
                          ch.id !== cid ? ch : { ...ch, cx: nx, cy: ny },
                        ),
                      },
                ),
              );
            },
            getCont: () =>
              contsRef.current.find((c) => c.id === cont.id) || cont,
          });
          node.add(cNode);
          konvaMap.current[cKey] = cNode;
        } else {
          const cNode = konvaMap.current[cKey];
          if (!cNode.isDragging()) {
            cNode.position({ x: child.cx, y: child.cy });
            setCardTexts(cNode, child);
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
              setFreeEls((p) => p.filter((e) => e.id !== el.id));
              // Place at relative position within container
              const cx = Math.max(4, Math.min(hit.w - CHILD_W - 4, nx - hit.x));
              const cy = Math.max(
                CONT_HDR_H + 4,
                Math.min(hit.h - EL_H - 4, ny - hit.y),
              );
              setConts((p) =>
                p.map((c) =>
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
                            cx,
                            cy,
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

    // Destroy dead nodes
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
    const x = e.clientX - rect.left,
      y = e.clientY - rect.top;
    setPopup(null);

    if (type === "container") {
      const w = 320,
        h = 200;
      setConts((p) => [
        ...p,
        { id: uid(), x: x - w / 2, y: y - CONT_HDR_H / 2, w, h, children: [] },
      ]);
    } else {
      const newEl = { id: uid(), type, label, props: defaultProps(type) };
      const hit = hitCont(contsRef.current, x, y);
      if (hit) {
        const cx = Math.max(
          4,
          Math.min(hit.w - CHILD_W - 4, x - hit.x - CHILD_W / 2),
        );
        const cy = Math.max(
          CONT_HDR_H + 4,
          Math.min(hit.h - EL_H - 4, y - hit.y - EL_H / 2),
        );
        setConts((p) =>
          p.map((c) =>
            c.id !== hit.id
              ? c
              : { ...c, children: [...c.children, { ...newEl, cx, cy }] },
          ),
        );
      } else {
        setFreeEls((p) => [
          ...p,
          { ...newEl, x: x - EL_W / 2, y: y - EL_H / 2 },
        ]);
      }
    }
  };

  const popupEl = popup ? getElementById(popup.id)?.el : null;
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
      {/* Top bar */}
      <div
        style={{
          height: 52,
          background: "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            color: "#e2e8f0",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: 0.3,
          }}
        >
          Form Builder
        </div>
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
              }}
              style={{
                padding: "5px 18px",
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
        <div style={{ color: "#475569", fontSize: 11 }}>
          {totalElements} element(s)
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
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
              • Drag freely inside container
              <br />
              • Resize container (↘ corner)
              <br />
              • Click → edit properties
              <br />• Hover → ✕ to delete
            </div>
          </div>
        )}

        {/* Canvas */}
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
              onUpdate={(newProps) => updateProps(popup.id, newProps)}
              onClose={() => setPopup(null)}
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
    </div>
  );
}
