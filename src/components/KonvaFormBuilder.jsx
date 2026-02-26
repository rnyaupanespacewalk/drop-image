import React, { useState, useRef, useEffect, useCallback } from "react";
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

const COLORS = {
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

const ICONS = {
  "Text Input": "⌨",
  Dropdown: "▾",
  Label: "T",
  Button: "◻",
};

let _uid = 1;
const uid = () => _uid++;

// ─── Layout helpers ───────────────────────────────────────────────────────────
const contHeight = (n) =>
  n === 0
    ? CONT_HDR_H + CONT_PAD * 2 + 24
    : CONT_HDR_H + CONT_PAD + n * (EL_H + EL_GAP) + CONT_PAD;

const childRelY = (idx) => CONT_HDR_H + CONT_PAD + idx * (EL_H + EL_GAP);

const dragToIdx = (relY, count) => {
  const raw =
    (relY - CONT_HDR_H - CONT_PAD + (EL_H + EL_GAP) / 2) / (EL_H + EL_GAP);
  return Math.max(0, Math.min(count - 1, Math.floor(raw)));
};

const ptInCont = (c, px, py) => {
  const h = contHeight(c.children.length);
  return px >= c.x && px <= c.x + CONT_W && py >= c.y && py <= c.y + h;
};

const hitCont = (conts, px, py) => {
  for (let i = conts.length - 1; i >= 0; i--)
    if (ptInCont(conts[i], px, py)) return conts[i];
  return null;
};

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
    fill: COLORS.elFill,
    stroke: COLORS.elStroke,
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
      text: ICONS[el.label] || "□",
      fontSize: 15,
      fill: COLORS.accent,
    }),
  );
  grp.add(
    new Konva.Text({
      x: 34,
      y: 9,
      text: el.label,
      fontSize: 13,
      fontStyle: "bold",
      fill: COLORS.elText,
    }),
  );
  grp.add(
    new Konva.Text({
      x: 34,
      y: 27,
      text: el.type,
      fontSize: 9,
      fill: COLORS.elSub,
    }),
  );

  // Delete btn
  const del = new Konva.Group({ x: EL_W - 22, y: 8, opacity: 0, name: "del" });
  del.add(new Konva.Circle({ radius: 9, fill: COLORS.redBg }));
  del.add(
    new Konva.Text({ x: -4, y: -5, text: "✕", fontSize: 10, fill: COLORS.red }),
  );
  del.on("click tap", () => cbs.onDelete(el.id));
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
    bg.stroke(COLORS.accent);
    del.to({ opacity: 1, duration: 0.12 });
    grp.getStage().container().style.cursor = "grab";
    grp.getLayer().batchDraw();
  });
  grp.on("mouseleave", () => {
    bg.stroke(COLORS.elStroke);
    del.to({ opacity: 0, duration: 0.12 });
    grp.getStage().container().style.cursor = "default";
    grp.getLayer().batchDraw();
  });
  grp.on("dragstart", () => {
    grp.moveToTop();
    grp.getStage().container().style.cursor = "grabbing";
  });
  grp.on("dragend", () => {
    grp.getStage().container().style.cursor = "default";
    cbs.onDragEnd(el, grp.x(), grp.y());
  });

  return grp;
}

function buildChild(child, idx, contRef, cbs) {
  // contRef is a plain object { id, children } — will be read via closure from contsRef
  const grp = new Konva.Group({
    x: CONT_PAD,
    y: childRelY(idx),
    draggable: true,
    id: "child_" + child.id,
  });

  const bg = new Konva.Rect({
    width: CHILD_W,
    height: EL_H,
    fill: COLORS.elFill,
    stroke: COLORS.elStroke,
    strokeWidth: 1,
    cornerRadius: 5,
  });
  grp.add(bg);
  grp.add(
    new Konva.Text({
      x: 10,
      y: 15,
      text: ICONS[child.label] || "□",
      fontSize: 13,
      fill: COLORS.accent,
    }),
  );
  grp.add(
    new Konva.Text({
      x: 28,
      y: 9,
      text: child.label,
      fontSize: 12,
      fontStyle: "bold",
      fill: COLORS.elText,
    }),
  );
  grp.add(
    new Konva.Text({
      x: 28,
      y: 26,
      text: child.type,
      fontSize: 9,
      fill: COLORS.elSub,
    }),
  );

  // ↑ button
  const up = new Konva.Group({
    x: CHILD_W - 46,
    y: 10,
    opacity: 0,
    name: "up",
  });
  up.add(
    new Konva.Rect({
      width: 18,
      height: 16,
      fill: COLORS.arrowBg,
      cornerRadius: 3,
    }),
  );
  up.add(
    new Konva.Text({
      x: 3,
      y: 1,
      text: "↑",
      fontSize: 12,
      fill: COLORS.accent,
    }),
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

  // ↓ button
  const dn = new Konva.Group({
    x: CHILD_W - 26,
    y: 10,
    opacity: 0,
    name: "dn",
  });
  dn.add(
    new Konva.Rect({
      width: 18,
      height: 16,
      fill: COLORS.arrowBg,
      cornerRadius: 3,
    }),
  );
  dn.add(
    new Konva.Text({
      x: 3,
      y: 1,
      text: "↓",
      fontSize: 12,
      fill: COLORS.accent,
    }),
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

  // ✕ delete
  const del = new Konva.Group({
    x: CHILD_W - 46,
    y: 28,
    opacity: 0,
    name: "del",
  });
  del.add(
    new Konva.Rect({
      width: 38,
      height: 14,
      fill: COLORS.redBg,
      cornerRadius: 3,
    }),
  );
  del.add(
    new Konva.Text({
      x: 6,
      y: 2,
      text: "✕ remove",
      fontSize: 8,
      fill: COLORS.red,
    }),
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

  const showBtns = (v) => {
    [up, dn, del].forEach((b) => b.to({ opacity: v, duration: 0.12 }));
  };

  grp.on("mouseenter", () => {
    bg.stroke(COLORS.accent);
    showBtns(1);
    grp.getStage().container().style.cursor = "grab";
    grp.getLayer().batchDraw();
  });
  grp.on("mouseleave", () => {
    bg.stroke(COLORS.elStroke);
    showBtns(0);
    grp.getStage().container().style.cursor = "default";
    grp.getLayer().batchDraw();
  });

  let originIdx = idx;

  grp.dragBoundFunc((pos) => {
    const pGrp = grp.getParent();
    const pAbs = pGrp.getAbsolutePosition();
    const latest = cbs.getContChildren();
    const minY = pAbs.y + childRelY(0);
    const maxY = pAbs.y + childRelY(latest.length - 1);
    return { x: pAbs.x + CONT_PAD, y: Math.max(minY, Math.min(maxY, pos.y)) };
  });

  grp.on("dragstart", () => {
    originIdx = cbs.getCurrentIdx(child.id);
    bg.setAttrs({
      stroke: COLORS.accent,
      shadowColor: COLORS.accent,
      shadowBlur: 8,
      shadowOpacity: 0.3,
    });
    grp.getStage().container().style.cursor = "grabbing";
    grp.moveToTop();
  });
  grp.on("dragend", () => {
    bg.setAttrs({ stroke: COLORS.elStroke, shadowBlur: 0, shadowOpacity: 0 });
    grp.getStage().container().style.cursor = "default";
    const pAbs = grp.getParent().getAbsolutePosition();
    const absY = grp.getAbsolutePosition().y;
    const relY = absY - pAbs.y;
    const latest = cbs.getContChildren();
    const newIdx = dragToIdx(relY, latest.length);
    cbs.onDragReorder(originIdx, newIdx);
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
    fill: COLORS.contFill,
    stroke: COLORS.contStroke,
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
      fill: COLORS.contTitle,
      name: "title",
    }),
  );

  const hint = new Konva.Text({
    x: CONT_W / 2 - 55,
    y: CONT_HDR_H + 18,
    text: "Drop elements here",
    fontSize: 11,
    fill: COLORS.hint,
    visible: cont.children.length === 0,
    name: "hint",
  });
  grp.add(hint);

  const del = new Konva.Group({
    x: CONT_W - 22,
    y: 8,
    opacity: 0,
    name: "del",
  });
  del.add(new Konva.Circle({ radius: 9, fill: COLORS.redBg }));
  del.add(
    new Konva.Text({ x: -4, y: -5, text: "✕", fontSize: 10, fill: COLORS.red }),
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
    bg.stroke(COLORS.accent);
    del.to({ opacity: 1, duration: 0.12 });
    grp.getStage().container().style.cursor = "move";
    grp.getLayer().batchDraw();
  });
  grp.on("mouseleave", () => {
    bg.stroke(COLORS.contStroke);
    del.to({ opacity: 0, duration: 0.12 });
    grp.getStage().container().style.cursor = "default";
    grp.getLayer().batchDraw();
  });
  grp.on("dragstart", () => grp.moveToBottom());
  grp.on("dragend", () => cbs.onDragEnd(cont.id, grp.x(), grp.y()));

  return grp;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const wrapRef = useRef(null);
  const konvaMap = useRef({});
  const contsRef = useRef([]);

  const [freeEls, setFreeEls] = useState([]);
  const [conts, setConts] = useState([]);
  const [stageW, setStageW] = useState(800);

  useEffect(() => {
    contsRef.current = conts;
  }, [conts]);

  // ── Init Konva ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!wrapRef.current) return;
    const w = wrapRef.current.offsetWidth;
    setStageW(w);
    const stage = new Konva.Stage({
      container: wrapRef.current,
      width: w,
      height: STAGE_H,
    });
    const layer = new Konva.Layer();
    stage.add(layer);
    wrapRef.current._stage = stage;
    wrapRef.current._layer = layer;
    return () => stage.destroy();
  }, []);

  // ── Sync state → Konva ────────────────────────────────────────────────────
  useEffect(() => {
    if (!wrapRef.current?._layer) return;
    const layer = wrapRef.current._layer;
    const alive = new Set();

    // Containers (rendered first / behind)
    conts.forEach((cont) => {
      const key = "cont_" + cont.id;
      alive.add(key);

      if (!konvaMap.current[key]) {
        const node = buildContainer(cont, {
          onDragEnd: (id, nx, ny) =>
            setConts((p) =>
              p.map((c) => (c.id === id ? { ...c, x: nx, y: ny } : c)),
            ),
          onDelete: (id) => setConts((p) => p.filter((c) => c.id !== id)),
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

      // Children
      cont.children.forEach((child, idx) => {
        const cKey = "child_" + child.id;
        alive.add(cKey);

        if (!konvaMap.current[cKey]) {
          const node = buildChild(child, idx, cont, {
            onDelete: (cid) =>
              setConts((p) =>
                p.map((c) =>
                  c.id !== cont.id
                    ? c
                    : {
                        ...c,
                        children: c.children.filter((ch) => ch.id !== cid),
                      },
                ),
              ),
            onMoveUp: (cid) =>
              setConts((p) =>
                p.map((c) => {
                  if (c.id !== cont.id) return c;
                  const kids = [...c.children];
                  const i = kids.findIndex((k) => k.id === cid);
                  if (i <= 0) return c;
                  [kids[i - 1], kids[i]] = [kids[i], kids[i - 1]];
                  return { ...c, children: kids };
                }),
              ),
            onMoveDown: (cid) =>
              setConts((p) =>
                p.map((c) => {
                  if (c.id !== cont.id) return c;
                  const kids = [...c.children];
                  const i = kids.findIndex((k) => k.id === cid);
                  if (i < 0 || i >= kids.length - 1) return c;
                  [kids[i], kids[i + 1]] = [kids[i + 1], kids[i]];
                  return { ...c, children: kids };
                }),
              ),
            onDragReorder: (fromIdx, toIdx) => {
              if (fromIdx === toIdx) return;
              setConts((p) =>
                p.map((c) => {
                  if (c.id !== cont.id) return c;
                  const kids = [...c.children];
                  const [moved] = kids.splice(fromIdx, 1);
                  kids.splice(toIdx, 0, moved);
                  return { ...c, children: kids };
                }),
              );
            },
            getContChildren: () =>
              contsRef.current.find((c) => c.id === cont.id)?.children ?? [],
            getCurrentIdx: (cid) => {
              const latest = contsRef.current.find((c) => c.id === cont.id);
              return latest
                ? latest.children.findIndex((k) => k.id === cid)
                : idx;
            },
          });
          contNode.add(node);
          konvaMap.current[cKey] = node;
        } else {
          const node = konvaMap.current[cKey];
          if (!node.isDragging())
            node.position({ x: CONT_PAD, y: childRelY(idx) });
        }
      });
    });

    // Free elements (rendered on top)
    freeEls.forEach((el) => {
      const key = "el_" + el.id;
      alive.add(key);

      if (!konvaMap.current[key]) {
        const node = buildFreeEl(el, {
          onDelete: (id) => setFreeEls((p) => p.filter((e) => e.id !== id)),
          onDragEnd: (el, nx, ny) => {
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
                          { id: el.id, type: el.type, label: el.label },
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
        if (!node.isDragging()) node.position({ x: el.x, y: el.y });
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

  // ── Drop from sidebar ──────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("componentType");
    if (!raw) return;
    const { type, label } = JSON.parse(raw);
    const rect = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (type === "container") {
      setConts((p) => [
        ...p,
        { id: uid(), x: x - CONT_W / 2, y: y - CONT_HDR_H / 2, children: [] },
      ]);
    } else {
      const hit = hitCont(contsRef.current, x, y);
      if (hit) {
        setConts((p) =>
          p.map((c) =>
            c.id !== hit.id
              ? c
              : { ...c, children: [...c.children, { id: uid(), type, label }] },
          ),
        );
      } else {
        setFreeEls((p) => [
          ...p,
          { id: uid(), type, label, x: x - EL_W / 2, y: y - EL_H / 2 },
        ]);
      }
    }
  };

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
          • Drag free el onto container
          <br />
          • ↑↓ or drag to reorder inside
          <br />• Hover → ✕ to delete
        </div>
      </div>

      {/* Konva canvas */}
      <div
        ref={wrapRef}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          flex: 1,
          height: STAGE_H,
          background: COLORS.stageBg,
          cursor: "default",
        }}
      />
    </div>
  );
}
