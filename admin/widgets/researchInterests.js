// Registering a custom widget in Decap CMS using vanilla JS
CMS.registerWidget(
    "researchInterests", // widget name used in config.yml
    createControl(),     // control (editor UI)
    createPreview()      // preview
  );
  
  // Control widget (the editable input)
  function createControl() {
    return class {
      constructor({ value, onChange }) {
        this.value = value || [];
        this.onChange = onChange;
        this.container = document.createElement("div");
        this.input = document.createElement("input");
  
        this.input.type = "text";
        this.input.placeholder = "Type tags and press comma";
        this.input.style.width = "100%";
        this.input.value = this.value.join(", ");
  
        // Update on input
        this.input.addEventListener("input", () => {
          const tags = this.input.value
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
          this.onChange(tags);
        });
  
        // Load suggestions (optional)
        const suggestionBox = document.createElement("datalist");
        suggestionBox.id = "interest-suggestions";
        this.input.setAttribute("list", "interest-suggestions");
  
        fetch("/data/global-tags.json")
          .then((res) => res.json())
          .then((data) => {
            (data.research_interests || []).forEach((tag) => {
              const opt = document.createElement("option");
              opt.value = tag;
              suggestionBox.appendChild(opt);
            });
          });
  
        this.container.appendChild(this.input);
        this.container.appendChild(suggestionBox);
      }
  
      render() {
        return this.container;
      }
  
      getValue() {
        return this.value;
      }
  
      focus() {
        this.input.focus();
      }
    };
  }
  
  // Preview widget (read-only display in CMS preview panel)
  function createPreview() {
    return class {
      constructor({ value }) {
        this.value = value || [];
        this.container = document.createElement("div");
      }
  
      render() {
        this.container.innerHTML = "";
  
        this.value.forEach((tag) => {
          const span = document.createElement("span");
          span.textContent = tag;
          span.style.margin = "2px";
          span.style.padding = "2px 6px";
          span.style.border = "1px solid #ccc";
          span.style.borderRadius = "4px";
          span.style.display = "inline-block";
          this.container.appendChild(span);
        });
  
        return this.container;
      }
    };
  }
  