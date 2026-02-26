import React, { useState, useRef, useEffect } from "react";
import Konva from "konva";

// ─── Constants ────────────────────────────────────────────────────────────────
const SIDEBAR_W = 170;
const STAGE_H = 680;
const EL_W = 220;
const EL_H = 48;
const EL_GAP = 8;
const CONT_W = 260;
const CONT_HDR_H = 32;
const CONT_PAD = 12;
const CHILD_W = CONT_W - CONT_PAD * 2;
const POPUP_W = 260;

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

// Default props for each element type
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
const contHeight = (n) =>
  n === 0
    ? CONT_HDR_H + CONT_PAD * 2 + 24
    : CONT_HDR_H + CONT_PAD + n * (EL_H + EL_GAP) + CONT_PAD;
const childRelY = (idx) => CONT_HDR_H + CONT_PAD + idx * (EL_H + EL_GAP);
const dragToIdx = (relY, count) =>
  Math.max(
    0,
    Math.min(
      count - 1,
      Math.floor(
        (relY - CONT_HDR_H - CONT_PAD + (EL_H + EL_GAP) / 2) / (EL_H + EL_GAP),
      ),
    ),
  );
const ptInCont = (c, px, py) => {
  const h = contHeight(c.children.length);
  return px >= c.x && px <= c.x + CONT_W && py >= c.y && py <= c.y + h;
};
const hitCont = (conts, px, py) => {
  for (let i = conts.length - 1; i >= 0; i--)
    if (ptInCont(conts[i], px, py)) return conts[i];
  return null;
};

// ─── What text to show on card (second line) ──────────────────────────────────
const cardSubText = (el) => {
  if (el.type === "Button") return el.props?.buttonText || "Submit";
  if (el.type === "Label") return el.props?.text || "Label Text";
  if (el.type === "Dropdown")
    return (el.props?.options || []).slice(0, 2).join(", ");
  if (el.type === "Text Input")
    return el.props?.placeholder ? `"${el.props.placeholder}"` : el.type;
  return el.type;
};

// ─── Popup UI (HTML overlay, positioned near clicked element) ─────────────────
function Popup({ el, pos, stageRect, onUpdate, onClose }) {
  const p = el.props;

  // Keep popup on screen
  const left = Math.min(
    stageRect.left + pos.x + EL_W + 8,
    window.innerWidth - POPUP_W - 12,
  );
  const top = Math.max(stageRect.top + pos.y, 8);

  const inp = (style = {}) => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "5px 8px",
    border: "1px solid #d1d5db",
    borderRadius: 5,
    fontSize: 12,
    fontFamily: "inherit",
    outline: "none",
    ...style,
  });

  const label = (txt) => (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "#6b7280",
        marginBottom: 3,
        marginTop: 10,
      }}
    >
      {txt}
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
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>
          {ICONS[el.type]} &nbsp;{el.type}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            color: "#9ca3af",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ height: 1, background: "#f1f5f9", margin: "8px 0" }} />

      {/* Field Label (all types) */}
      {label("Field Label")}
      <input
        style={inp()}
        value={p.fieldLabel || ""}
        onChange={(e) => onUpdate({ fieldLabel: e.target.value })}
        placeholder="e.g. First Name"
      />

      {/* Text Input specific */}
      {el.type === "Text Input" && (
        <>
          {label("Placeholder")}
          <input
            style={inp()}
            value={p.placeholder || ""}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            placeholder="e.g. Enter your name..."
          />
          {label("Default Value")}
          <input
            style={inp()}
            value={p.defaultValue || ""}
            onChange={(e) => onUpdate({ defaultValue: e.target.value })}
            placeholder="Pre-filled value"
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
              Required field
            </label>
          </div>
        </>
      )}

      {/* Dropdown specific */}
      {el.type === "Dropdown" && (
        <>
          {label("Options (one per line)")}
          <textarea
            style={{
              ...inp(),
              height: 80,
              resize: "vertical",
              fontFamily: "monospace",
            }}
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
              Required field
            </label>
          </div>
        </>
      )}

      {/* Label specific */}
      {el.type === "Label" && (
        <>
          {label("Display Text")}
          <input
            style={inp()}
            value={p.text || ""}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="Label content..."
          />
        </>
      )}

      {/* Button specific */}
      {el.type === "Button" && (
        <>
          {label("Button Text")}
          <input
            style={inp()}
            value={p.buttonText || ""}
            onChange={(e) => onUpdate({ buttonText: e.target.value })}
            placeholder="e.g. Submit"
          />
        </>
      )}

      {/* Required badge preview */}
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
          ⚠ This field is marked as required
        </div>
      )}
    </div>
  );
}

// ─── Build Konva card texts ───────────────────────────────────────────────────
function setCardTexts(grp, el) {
  const sub = grp.findOne(".sub");
  if (sub) sub.text(cardSubText(el));
  const mainLbl = grp.findOne(".mainlbl");
  if (mainLbl) mainLbl.text(el.props?.fieldLabel || el.label);
  const reqDot = grp.findOne(".req");
  if (reqDot) reqDot.visible(!!el.props?.required);
  grp.getLayer()?.batchDraw();
}

// ─── Build a free element Konva node ─────────────────────────────────────────
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

  // Required dot
  const req = new Konva.Circle({
    x: EL_W - 10,
    y: 10,
    radius: 4,
    fill: C.red,
    name: "req",
    visible: !!el.props?.required,
  });
  grp.add(req);

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

// ─── Build a child Konva node (inside container) ──────────────────────────────
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

  const req = new Konva.Circle({
    x: CHILD_W - 8,
    y: 10,
    radius: 4,
    fill: C.red,
    name: "req",
    visible: !!child.props?.required,
  });
  grp.add(req);

  // ↑ ↓ del buttons
  const up = new Konva.Group({
    x: CHILD_W - 46,
    y: 10,
    opacity: 0,
    name: "up",
  });
  up.add(
    new Konva.Rect({ width: 18, height: 16, fill: C.arrowBg, cornerRadius: 3 }),
  );
  up.add(
    new Konva.Text({ x: 3, y: 1, text: "↑", fontSize: 12, fill: C.accent }),
  );
  up.on("click tap", (e) => {
    e.cancelBubble = true;
    cbs.onMoveUp(child.id);
  });
  up.on(
    "mouseenter",
    () => (grp.getStage().container().style.cursor = "pointer"),
  );
  up.on("mouseleave", () => (grp.getStage().container().style.cursor = "grab"));
  grp.add(up);

  const dn = new Konva.Group({
    x: CHILD_W - 26,
    y: 10,
    opacity: 0,
    name: "dn",
  });
  dn.add(
    new Konva.Rect({ width: 18, height: 16, fill: C.arrowBg, cornerRadius: 3 }),
  );
  dn.add(
    new Konva.Text({ x: 3, y: 1, text: "↓", fontSize: 12, fill: C.accent }),
  );
  dn.on("click tap", (e) => {
    e.cancelBubble = true;
    cbs.onMoveDown(child.id);
  });
  dn.on(
    "mouseenter",
    () => (grp.getStage().container().style.cursor = "pointer"),
  );
  dn.on("mouseleave", () => (grp.getStage().container().style.cursor = "grab"));
  grp.add(dn);

  const del = new Konva.Group({
    x: CHILD_W - 46,
    y: 28,
    opacity: 0,
    name: "del",
  });
  del.add(
    new Konva.Rect({ width: 38, height: 14, fill: C.redBg, cornerRadius: 3 }),
  );
  del.add(
    new Konva.Text({ x: 6, y: 2, text: "✕ remove", fontSize: 8, fill: C.red }),
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

  const showBtns = (v) =>
    [up, dn, del].forEach((b) => b.to({ opacity: v, duration: 0.12 }));

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
    if (!n.includes("up") && !n.includes("dn") && !n.includes("del"))
      cbs.onClick(child.id, grp.getAbsolutePosition());
  });

  let originIdx = idx;
  grp.dragBoundFunc((pos) => {
    const pAbs = grp.getParent().getAbsolutePosition();
    const latest = cbs.getContChildren();
    const minY = pAbs.y + childRelY(0);
    const maxY = pAbs.y + childRelY(latest.length - 1);
    return { x: pAbs.x + CONT_PAD, y: Math.max(minY, Math.min(maxY, pos.y)) };
  });

  grp.on("dragstart", () => {
    originIdx = cbs.getCurrentIdx(child.id);
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
    bg.setAttrs({ stroke: C.elStroke, shadowBlur: 0, shadowOpacity: 0 });
    grp.getStage().container().style.cursor = "default";
    const pAbs = grp.getParent().getAbsolutePosition();
    const relY = grp.getAbsolutePosition().y - pAbs.y;
    const newIdx = dragToIdx(relY, cbs.getContChildren().length);
    cbs.onDragReorder(originIdx, newIdx);
  });

  return grp;
}

// ─── Build container Konva node ───────────────────────────────────────────────
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
      text: "📦  Container",
      fontSize: 12,
      fontStyle: "bold",
      fill: C.contTitle,
      name: "title",
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
  grp.on("dragstart", () => grp.moveToBottom());
  grp.on("dragend", () => cbs.onDragEnd(cont.id, grp.x(), grp.y()));

  return grp;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function KonvaFormBuilderNew() {
  const wrapRef = useRef(null);
  const konvaMap = useRef({});
  const contsRef = useRef([]);
  const freeRef = useRef([]);

  const [freeEls, setFreeEls] = useState([]);
  const [conts, setConts] = useState([]);

  // Popup state: { id, pos: {x,y} } — id matches el.id or child.id
  const [popup, setPopup] = useState(null);
  const isDragging = useRef(false);

  useEffect(() => {
    contsRef.current = conts;
  }, [conts]);
  useEffect(() => {
    freeRef.current = freeEls;
  }, [freeEls]);

  // ── Get element by id (free or child) ────────────────────────────────────
  const getElementById = (id) => {
    const free = freeRef.current.find((e) => e.id === id);
    if (free) return { el: free, isFree: true, containerId: null };
    for (const c of contsRef.current) {
      const child = c.children.find((ch) => ch.id === id);
      if (child) return { el: child, isFree: false, containerId: c.id };
    }
    return null;
  };

  // ── Update element props ─────────────────────────────────────────────────
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

    // Immediately update Konva card texts
    const nodeKey = found.isFree ? "el_" + id : "child_" + id;
    const node = konvaMap.current[nodeKey];
    if (node) {
      const updated = {
        ...found.el,
        props: { ...found.el.props, ...newProps },
      };
      setCardTexts(node, updated);
    }
  };

  // ── Open popup (only if not dragging) ────────────────────────────────────
  const openPopup = (id, absPos) => {
    if (isDragging.current) return;
    setPopup({ id, pos: absPos });
  };

  // ── Init Konva ────────────────────────────────────────────────────────────
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

    // Click on empty stage closes popup
    stage.on("click tap", (e) => {
      if (e.target === stage) setPopup(null);
    });

    return () => stage.destroy();
  }, []);

  // ── Sync state → Konva ───────────────────────────────────────────────────
  useEffect(() => {
    const layer = wrapRef.current?._layer;
    if (!layer) return;
    const alive = new Set();

    // Containers
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
      } else {
        const node = konvaMap.current[key];
        if (!node.isDragging()) node.position({ x: cont.x, y: cont.y });
        node
          .findOne(".bg")
          .setAttrs({ height: contHeight(cont.children.length) });
        node.findOne(".hint").visible(cont.children.length === 0);
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
                  const k = [...c.children];
                  const i = k.findIndex((x) => x.id === cid);
                  if (i <= 0) return c;
                  [k[i - 1], k[i]] = [k[i], k[i - 1]];
                  return { ...c, children: k };
                }),
              ),
            onMoveDown: (cid) =>
              setConts((p) =>
                p.map((c) => {
                  if (c.id !== cont.id) return c;
                  const k = [...c.children];
                  const i = k.findIndex((x) => x.id === cid);
                  if (i < 0 || i >= k.length - 1) return c;
                  [k[i], k[i + 1]] = [k[i + 1], k[i]];
                  return { ...c, children: k };
                }),
              ),
            onDragReorder: (from, to) => {
              if (from === to) return;
              setConts((p) =>
                p.map((c) => {
                  if (c.id !== cont.id) return c;
                  const k = [...c.children];
                  const [m] = k.splice(from, 1);
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

    // Free elements
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
              const n = konvaMap.current["el_" + el.id];
              if (n) {
                n.destroy();
                delete konvaMap.current["el_" + el.id];
              }
              setFreeEls((p) => p.filter((e) => e.id !== el.id));
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

    // Remove stale
    Object.keys(konvaMap.current).forEach((key) => {
      if (!alive.has(key)) {
        konvaMap.current[key].destroy();
        delete konvaMap.current[key];
      }
    });

    layer.batchDraw();
  }, [freeEls, conts]);

  // After drag ends reset flag
  useEffect(() => {
    const onUp = () => {
      setTimeout(() => {
        isDragging.current = false;
      }, 50);
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  // ── Drop from sidebar ─────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("componentType");
    if (!raw) return;
    const { type, label } = JSON.parse(raw);
    const rect = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPopup(null);

    if (type === "container") {
      setConts((p) => [
        ...p,
        { id: uid(), x: x - CONT_W / 2, y: y - CONT_HDR_H / 2, children: [] },
      ]);
    } else {
      const newEl = { id: uid(), type, label, props: defaultProps(type) };
      const hit = hitCont(contsRef.current, x, y);
      if (hit) {
        setConts((p) =>
          p.map((c) =>
            c.id !== hit.id ? c : { ...c, children: [...c.children, newEl] },
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

  // ── Current popup element ─────────────────────────────────────────────────
  const popupEl = popup ? getElementById(popup.id)?.el : null;

  const SIDEBAR_ITEMS = [
    { type: "Text Input", label: "Text Input" },
    { type: "Dropdown", label: "Dropdown" },
    { type: "Label", label: "Label" },
    { type: "Button", label: "Button" },
    { type: "container", label: "Container" },
  ];

  const stageRect = wrapRef.current?.getBoundingClientRect() ?? {
    left: 0,
    top: 0,
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "system-ui, sans-serif",
        background: "#e2e8f0",
      }}
    >
      {/* Sidebar */}
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
            <span>{item.type === "container" ? "📦" : ICONS[item.label]}</span>
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
          • Click element to edit props
          <br />• Hover → ✕ to delete
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: "relative" }}>
        <div
          ref={wrapRef}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{ width: "100%", height: STAGE_H, background: C.stageBg }}
        />

        {/* Popup */}
        {popup && popupEl && (
          <Popup
            el={popupEl}
            pos={popup.pos}
            stageRect={stageRect}
            onUpdate={(newProps) => updateProps(popup.id, newProps)}
            onClose={() => setPopup(null)}
          />
        )}
      </div>
    </div>
  );
}
