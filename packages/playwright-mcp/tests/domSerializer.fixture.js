module.exports = async function serializeDomSnapshot() {
  return {
    dom: {
      tag: "document",
      children: [
        {
          id: "btn-submit",
          tag: "button",
          role: "button",
          text: "Submit",
          onTop: true,
          isFocused: false,
          children: []
        },
        {
          id: "input-name",
          tag: "input",
          role: "textbox",
          text: "Name",
          onTop: false,
          children: []
        },
        {
          id: "select-color",
          tag: "select",
          role: "combobox",
          text: "Choose color",
          onTop: false,
          children: []
        }
      ]
    },
    elements: [
      {
        id: "btn-submit",
        candidates: [
          { kind: "testId", payload: { testId: "submit-btn" } },
          { kind: "text", payload: { text: "Submit" } },
          { kind: "role", payload: { role: "button", name: "Submit", exact: true } }
        ],
        meta: { tag: "button", text: "Submit" }
      },
      {
        id: "input-name",
        candidates: [
          { kind: "testId", payload: { testId: "name-input" } },
          { kind: "css", payload: { value: "#name-input" } },
          { kind: "role", payload: { role: "textbox", name: "Name", exact: true } }
        ],
        meta: { tag: "input", text: "Name" }
      },
      {
        id: "select-color",
        candidates: [
          { kind: "testId", payload: { testId: "color-select" } },
          { kind: "css", payload: { value: "#color-select" } },
          { kind: "role", payload: { role: "combobox", name: "Color", exact: true } }
        ],
        meta: { tag: "select", text: "Choose color" }
      }
    ]
  };
};
