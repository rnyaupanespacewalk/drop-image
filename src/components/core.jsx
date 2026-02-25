import React from "react";

// Container Component
const ContainerElement = ({
  container,
  onDelete,
  onUpdate,
  onDropElement,
  elements,
  onDeleteElement,
  onReorderElement,
}) => {
  const [position, setPosition] = React.useState({
    x: container.x,
    y: container.y,
  });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStart = React.useRef({ x: 0, y: 0 });
  const containerRef = React.useRef();

  const handleMouseDown = (e) => {
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "SELECT" ||
      e.target.tagName === "BUTTON" ||
      e.target.classList.contains("no-drag") ||
      e.target.closest(".drop-zone-inner") ||
      e.target.closest(".element-card")
    ) {
      return;
    }
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.current.x;
      const newY = e.clientY - dragStart.current.y;
      setPosition({ x: newX, y: newY });
      if (onUpdate) {
        onUpdate(container.id, { x: newX, y: newY });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const childElements = elements.filter(
    (el) => el.containerId === container.id,
  );

  const handleDragStart = (e, elementId) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("elementId", elementId.toString());
    e.dataTransfer.setData("isReorder", "true");
  };

  // eslint-disable-next-line no-unused-vars
  const handleDragOver = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();

    const isReorder = e.dataTransfer.getData("isReorder");
    const elementId = e.dataTransfer.getData("elementId");

    if (isReorder === "true" && elementId) {
      // Reordering existing element
      onReorderElement(parseInt(elementId), container.id, targetIndex);
    } else {
      // New element from palette
      onDropElement(e, container.id);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        zIndex: isDragging ? 1000 : 1,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className="rounded p-3 border border-info"
        style={{
          background: "#16213E",
          minWidth: "400px",
          minHeight: "200px",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        ref={containerRef}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span
            className="badge text-uppercase fw-bold"
            style={{
              background: "#4ECDC4",
              color: "#1A1A2E",
              fontSize: "0.8rem",
            }}
          >
            Container
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(container.id);
            }}
            className="btn btn-sm no-drag"
            style={{
              color: "#FF6B6B",
              background: "transparent",
              border: "none",
              fontSize: "1.2rem",
            }}
          >
            ✕
          </button>
        </div>

        <div
          className="drop-zone-inner rounded border border-2 border-dashed p-3 no-drag"
          style={{
            minHeight: "150px",
            background: "rgba(15, 52, 96, 0.3)",
            borderColor: "#2A3F5F !important",
            position: "relative",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.style.borderColor = "#4ECDC4";
            e.currentTarget.style.background = "rgba(78, 205, 196, 0.1)";
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.borderColor = "#2A3F5F";
            e.currentTarget.style.background = "rgba(15, 52, 96, 0.3)";
          }}
          onDrop={(e) => {
            e.currentTarget.style.borderColor = "#2A3F5F";
            e.currentTarget.style.background = "rgba(15, 52, 96, 0.3)";
            handleDrop(e, childElements.length);
          }}
        >
          {childElements.length === 0 && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "#A0A0A0",
                fontSize: "0.9rem",
                pointerEvents: "none",
                opacity: 0.5,
              }}
            >
              Drop elements here
            </div>
          )}

          {childElements.map((element, idx) => (
            <div
              key={element.id}
              className="mb-3"
              draggable="true"
              onDragStart={(e) => handleDragStart(e, element.id)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
            >
              <div
                className="element-card rounded p-3 border border-secondary"
                style={{
                  background: "#0F3460",
                  cursor: "move",
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span
                    className="badge text-uppercase"
                    style={{
                      color: "#ffffff",
                      fontSize: "0.65rem",
                    }}
                  >
                    {element.type === "input" && "Text Input"}
                    {element.type === "dropdown" && "Dropdown"}
                    {element.type === "label" && "Label"}
                    {element.type === "button" && "Button"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteElement(element.id);
                    }}
                    className="btn btn-sm no-drag"
                    style={{
                      color: "#FF6B6B",
                      background: "transparent",
                      border: "none",
                      fontSize: "1.2rem",
                      padding: "0",
                      lineHeight: "1",
                    }}
                  >
                    ✕
                  </button>
                </div>
                {element.type === "input" && (
                  <input
                    type="text"
                    placeholder="Enter text here..."
                    className="form-control  bg-dark text-light border-secondary no-drag"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                )}
                {element.type === "dropdown" && (
                  <select
                    className="form-select mt-3 bg-dark text-light border-secondary no-drag"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <option>Select an option...</option>
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </select>
                )}
                {element.type === "label" && (
                  <div
                    className="fw-bold mt-3"
                    style={{ color: "#FFE66D", fontSize: "1.1rem" }}
                  >
                    Label Text
                  </div>
                )}
                {element.type === "button" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      alert("Button clicked!");
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="btn btn-primary mt-3 px-4 fw-bold text-uppercase no-drag"
                    style={{
                      background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
                      border: "none",
                    }}
                  >
                    Button
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// HTML Form Element Component (for standalone elements)
const HTMLFormElement = ({ element, onDelete, onUpdate }) => {
  const [position, setPosition] = React.useState({
    x: element.x,
    y: element.y,
  });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStart = React.useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "SELECT" ||
      e.target.tagName === "BUTTON" ||
      e.target.classList.contains("no-drag")
    ) {
      return;
    }
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.current.x;
      const newY = e.clientY - dragStart.current.y;
      setPosition({ x: newX, y: newY });
      if (onUpdate) {
        onUpdate(element.id, { x: newX, y: newY });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const renderElement = () => {
    switch (element.type) {
      case "input":
        return (
          <input
            type="text"
            placeholder="Enter text here..."
            className="form-control bg-dark text-light border-secondary"
          />
        );

      case "dropdown":
        return (
          <select className="form-select bg-dark text-light border-secondary">
            <option>Select an option...</option>
            <option>Option 1</option>
            <option>Option 2</option>
            <option>Option 3</option>
          </select>
        );

      case "label":
        return (
          <div
            className="fw-bold"
            style={{ color: "#FFE66D", fontSize: "1.1rem" }}
          >
            🏷️ Label Text
          </div>
        );

      case "button":
        return (
          <button
            onClick={() => alert("Button clicked!")}
            className="btn btn-primary fw-bold text-uppercase"
            style={{
              background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
              border: "none",
            }}
          >
            🔘 Submit
          </button>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        zIndex: isDragging ? 1000 : 1,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className="rounded p-3 border border-secondary"
        style={{
          background: "#0F3460",
          minWidth: "300px",
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span
            className="badge text-uppercase"
            style={{
              color: "#ffffff",
              fontSize: "0.65rem",
            }}
          >
            {element.type === "input" && "Text Input"}
            {element.type === "dropdown" && "Dropdown"}
            {element.type === "label" && "Label"}
            {element.type === "button" && "Button"}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(element.id);
            }}
            className="btn btn-sm no-drag"
            style={{
              color: "#FF6B6B",
              background: "transparent",
              border: "none",
              fontSize: "1.2rem",
            }}
          >
            ✕
          </button>
        </div>
        {renderElement()}
      </div>
    </div>
  );
};

const Core = () => {
  const dragType = React.useRef();
  const canvasRef = React.useRef();
  const [elements, setElements] = React.useState([]);
  const [containers, setContainers] = React.useState([]);
  const [elementIdCounter, setElementIdCounter] = React.useState(0);

  const components = [
    { type: "input", label: "Text Inpussst", icon: "📝" },
    { type: "dropdown", label: "Dropdown", icon: "📋" },
    { type: "label", label: "Label", icon: "🏷️" },
    { type: "button", label: "Button", icon: "🔘" },
    { type: "container", label: "Container", icon: "📦" },
  ];

  const clearCanvas = () => {
    if (window.confirm("Are you sure you want to clear all elements?")) {
      setElements([]);
      setContainers([]);
    }
  };

  const deleteElement = (id) => {
    setElements(elements.filter((el) => el.id !== id));
  };

  const deleteContainer = (id) => {
    if (window.confirm("Delete container and all its elements?")) {
      setContainers(containers.filter((c) => c.id !== id));
      setElements(elements.filter((el) => el.containerId !== id));
    }
  };

  const updatePosition = (id, position) => {
    setElements(
      elements.map((el) => (el.id === id ? { ...el, ...position } : el)),
    );
  };

  const updateContainerPosition = (id, position) => {
    setContainers(
      containers.map((c) => (c.id === id ? { ...c, ...position } : c)),
    );
  };

  const reorderElement = (elementId, containerId, targetIndex) => {
    const containerElements = elements.filter(
      (el) => el.containerId === containerId,
    );
    const draggedElement = containerElements.find((el) => el.id === elementId);

    if (!draggedElement) return;

    const currentIndex = containerElements.indexOf(draggedElement);
    if (currentIndex === targetIndex) return;

    // Create new order
    const reordered = [...containerElements];
    reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, draggedElement);

    // Update all elements with new order
    const otherElements = elements.filter(
      (el) => el.containerId !== containerId,
    );
    setElements([...otherElements, ...reordered]);
  };

  const handleDropOnCanvas = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragType.current === "container") {
      setContainers([
        ...containers,
        {
          id: elementIdCounter,
          type: "container",
          x: x - 200,
          y: y - 100,
        },
      ]);
    } else {
      setElements([
        ...elements,
        {
          id: elementIdCounter,
          type: dragType.current,
          x: x - 150,
          y: y - 40,
          containerId: null,
        },
      ]);
    }
    setElementIdCounter(elementIdCounter + 1);
  };

  const handleDropOnContainer = (e, containerId) => {
    if (dragType.current && dragType.current !== "container") {
      setElements([
        ...elements,
        {
          id: elementIdCounter,
          type: dragType.current,
          containerId: containerId,
        },
      ]);
      setElementIdCounter(elementIdCounter + 1);
    }
  };

  const exportForm = () => {
    let html = '<div class="container">\n';

    containers.forEach((container) => {
      html += '  <div class="row mb-4 p-3 border border-info rounded">\n';
      html += '    <div class="col-12">\n';

      const containerElements = elements.filter(
        (el) => el.containerId === container.id,
      );
      containerElements.forEach((el) => {
        html += '      <div class="mb-3">\n';
        switch (el.type) {
          case "input":
            html +=
              '        <input type="text" class="form-control" placeholder="Enter text here..." />\n';
            break;
          case "dropdown":
            html += '        <select class="form-select">\n';
            html += "          <option>Select an option...</option>\n";
            html += "          <option>Option 1</option>\n";
            html += "        </select>\n";
            break;
          case "label":
            html +=
              '        <label class="form-label fw-bold">Label Text</label>\n';
            break;
          case "button":
            html += '        <button class="btn btn-primary">Submit</button>\n';
            break;
        }
        html += "      </div>\n";
      });

      html += "    </div>\n";
      html += "  </div>\n";
    });

    elements
      .filter((el) => !el.containerId)
      .forEach((el) => {
        html += '  <div class="mb-3">\n';
        switch (el.type) {
          case "input":
            html +=
              '    <input type="text" class="form-control" placeholder="Enter text here..." />\n';
            break;
          case "dropdown":
            html += '    <select class="form-select">\n';
            html += "      <option>Select an option...</option>\n";
            html += "    </select>\n";
            break;
          case "label":
            html +=
              '    <label class="form-label fw-bold">Label Text</label>\n';
            break;
          case "button":
            html += '    <button class="btn btn-primary">Submit</button>\n';
            break;
        }
        html += "  </div>\n";
      });

    html += "</div>";

    navigator.clipboard.writeText(html).then(() => {
      alert("Bootstrap 5 HTML copied to clipboard! 🎉");
    });
  };

  return (
    <>
      <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
        rel="stylesheet"
      />
      <div
        style={{
          background: "linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)",
          minHeight: "100vh",
          color: "#EAEAEA",
        }}
      >
        {/* Header */}
        <div
          className="p-4"
          style={{
            background: "rgba(26, 26, 46, 0.8)",
            borderBottom: "2px solid #2A3F5F",
          }}
        >
          <h1
            className="display-4 fw-bold m-0"
            style={{
              background: "linear-gradient(135deg, #FF6B6B, #4ECDC4, #FFE66D)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Form Builder Studio
          </h1>
          <p className="text-muted mt-2">
            Drag & drop components and containers to design your perfect form
          </p>
        </div>

        {/* Main Container */}
        <div className="container-fluid p-4">
          <div className="row g-4">
            {/* Left Panel - Components */}
            <div className="col-md-3">
              <div
                className="rounded p-4 border border-secondary"
                style={{
                  background: "#16213E",
                  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
                  position: "sticky",
                  top: "20px",
                }}
              >
                <h2
                  className="h5 mb-4 text-uppercase fw-bold"
                  style={{ color: "#FFE66D", letterSpacing: "2px" }}
                >
                  Components
                </h2>

                {components.map((component) => (
                  <div
                    key={component.type}
                    draggable="true"
                    onDragStart={(e) => {
                      dragType.current = component.type;
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="rounded p-3 mb-3 border border-transparent"
                    style={{
                      background: "#0F3460",
                      cursor: "grab",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateX(8px)";
                      e.currentTarget.style.borderColor = "#FF6B6B";
                      e.currentTarget.style.boxShadow =
                        "0 8px 25px rgba(255, 107, 107, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateX(0)";
                      e.currentTarget.style.borderColor = "transparent";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <span style={{ fontSize: "1.5rem", marginRight: "0.8rem" }}>
                      {component.icon}
                    </span>
                    <span className="fw-semibold">{component.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panel - Canvas */}
            <div className="col-md-9">
              <div
                className="rounded p-4 border border-secondary"
                style={{
                  background: "#16213E",
                  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary">
                  <h2
                    className="h5 m-0 text-uppercase fw-bold"
                    style={{ color: "#4ECDC4", letterSpacing: "2px" }}
                  >
                    Canvas
                  </h2>
                  <div className="d-flex gap-2">
                    <button
                      onClick={clearCanvas}
                      className="btn btn-outline-secondary text-uppercase fw-bold"
                      style={{ fontSize: "0.8rem", letterSpacing: "1px" }}
                    >
                      Clear All
                    </button>
                    <button
                      onClick={exportForm}
                      className="btn text-uppercase fw-bold"
                      style={{
                        background: "linear-gradient(135deg, #4ECDC4, #FFE66D)",
                        color: "#1A1A2E",
                        fontSize: "0.8rem",
                        letterSpacing: "1px",
                        border: "none",
                      }}
                    >
                      Export HTML
                    </button>
                  </div>
                </div>

                <div
                  ref={canvasRef}
                  className="rounded border border-2 border-dashed p-4"
                  style={{
                    borderColor: "#2A3F5F !important",
                    background: "rgba(15, 52, 96, 0.5)",
                    minHeight: "600px",
                    position: "relative",
                  }}
                  onDrop={handleDropOnCanvas}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = "#4ECDC4";
                    e.currentTarget.style.background =
                      "rgba(78, 205, 196, 0.1)";
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = "#2A3F5F";
                    e.currentTarget.style.background = "rgba(15, 52, 96, 0.5)";
                  }}
                >
                  {elements.length === 0 && containers.length === 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        color: "#A0A0A0",
                        fontSize: "1.2rem",
                        textAlign: "center",
                        pointerEvents: "none",
                        opacity: 0.5,
                      }}
                    >
                      Drag components or containers here to build your form
                    </div>
                  )}

                  {/* Render Containers */}
                  {containers.map((container) => (
                    <ContainerElement
                      key={container.id}
                      container={container}
                      onDelete={deleteContainer}
                      onUpdate={updateContainerPosition}
                      onDropElement={handleDropOnContainer}
                      elements={elements}
                      onDeleteElement={deleteElement}
                      onReorderElement={reorderElement}
                    />
                  ))}

                  {/* Render standalone elements (not in containers) */}
                  {elements
                    .filter((el) => !el.containerId)
                    .map((element) => (
                      <HTMLFormElement
                        key={element.id}
                        element={element}
                        onDelete={deleteElement}
                        onUpdate={updatePosition}
                      />
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Core;
