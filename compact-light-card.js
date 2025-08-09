console.log("compact-light-card.js loaded!");
window.left_offset = 11;

class CompactLightCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.isDragging = false;
    this.startX = 0;
    this.startWidth = 0;
    this.ignoreNextStateUpdate = false; // prevents jitter when stopping dragging
    this.supportsBrightness = true;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --height: 64px;
          --icon-width: var(--height);
          --icon-border-radius: 15px;
          --icon-font-size: 36px;

          --off-primary-colour: var(--disabled-color);
          --off-secondary-colour: var(--secondary-background-color);
          --off-text-colour: var(--secondary-text-color);
        }

        .card-container {
          width: 100%;
          max-width: 500px;
          height: var(--height);
          background: var(--card-background-color);
          border-radius: var(--icon-border-radius);
          margin: 0 auto;
          margin-top: 30px;
          overflow: hidden;
        }

        .card {
          height: var(--height);
          display: flex;
          align-items: center;
        }

        .icon-wrapper {
          position: relative;
          width: var(--icon-width);
          height: var(--height);
          flex-shrink: 0;
        }

        .icon {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          background: var(--off-primary-colour);
          border: 3px solid var(--card-background-color);
          color: var(--off-text-colour);
          border-radius: var(--icon-border-radius);
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }

        .icon.no-border {
          border: none;
          box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 15px;
        }

        .icon ha-icon {
          --mdc-icon-size: 32px;
        }

        .content {
          height: var(--height);
          width: 100%;
          z-index: 1;
          box-sizing: border-box;
          padding: 3px 3px 3px 5px;
          margin-left: -5px;
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }

        .content.no-border {
          padding: 0px 0px 0px 5px;
        }

        .brightness {
          margin-left: -11px;
          border-top-right-radius: 12px;
          border-bottom-right-radius: 12px;
          width: calc(100% + 11px);
          height: 100%;
          background: red;
          transition: background 0.6s ease;
        }

        .brightness-bar {
          height: 100%;
          background: var(--light-primary-colour);
          border-top-right-radius: 12px;
          border-bottom-right-radius: 12px;
          transition: width 0.6s ease;
        }

        .overlay {
          height: 100%;
          width: 100%;
          position: absolute;
          top: 0;
          left: 5px;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .name {
          padding-left: 30px;
          font-weight: bold;
          font-size: 18px;
        }

        .right-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .percentage {
          font-size: 14px;
        }

        .arrow {
          padding-right: 15px;
          --mdc-icon-size: 28px;
          padding-top: 10px;
          padding-bottom: 10px;
          pointer-events:
        }

      </style>

      <div class="card-container">
        <div class="card">
          <div class="icon-wrapper">
            <div class="icon">
              <ha-icon id="main-icon" icon="mdi:close"></ha-icon>
            </div>
          </div>
          <div class="content">
            <div class="brightness">
              <div class="brightness-bar"></div>
              <div class="overlay">
                <div class="name">Loading...</div>
                <div class="right-info">
                  <span class="percentage">—</span>
                  <ha-icon class="arrow" icon="mdi:chevron-right"></ha-icon>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Compact Light Card: Please provide an 'entity' in the config.")
    }

    this.config = {
      ...config,
      icon: config.icon || "mdi:lightbulb",
      glow: config.glow !== false,
      icon_border: config.icon_border === true,
      card_border: config.card_border === true,
    };

  }

  set hass(hass) {
    if (!this.shadowRoot) return;

    // ensure entity exists and is connected
    const entity = this.config.entity;
    const stateObj = hass.states[entity];
    if (!stateObj) {
      this._updateDisplay("Entity not found", "-", 0, "#9e9e9e", "#e0e0e0");
      return;
    }

    const state = stateObj.state;
    const friendlyName = stateObj.attributes.friendly_name || entity.replace("light.", "");
    this.supportsBrightness = (stateObj.attributes.supported_features & 1) || (stateObj.attributes.brightness !== undefined);;

    // determine initial state values
    // brightness
    let brightnessPercent = 0;
    let displayText = "Off";
    if (state == "on") {
      const brightness = stateObj.attributes.brightness || 255;
      brightnessPercent = Math.round((brightness / 255) * 100);
      if (this.supportsBrightness) { displayText = `${brightnessPercent}` }
      else {
        displayText = "On";
        brightnessPercent = 100;
      }
    }
    // colour
    let primaryColour = "#ff890e";
    let secondaryColour = "#eec59a";
    if (state == "on" && stateObj.attributes.rgb_color) {
      const [r, g, b] = stateObj.attributes.rgb_color;
      primaryColour = `rgb(${r}, ${g}, ${b})`;
      const gradientColour = `rgba(${r}, ${g}, ${b}, 0.15)`;
      secondaryColour = `linear-gradient(${gradientColour}, ${gradientColour}), var(--secondary-background-color)`;
    }
    // icon
    const icon = this.config.icon;
    // UPDATE CARD
    this._updateDisplay(friendlyName, displayText, brightnessPercent, primaryColour, secondaryColour, icon);


    // ---------------------------------------------
    // INTERACTIONS
    // ---------------------------------------------
    const brightnessEl = this.shadowRoot.querySelector(".brightness");
    const barEl = this.shadowRoot.querySelector(".brightness-bar");
    const percentageEl = this.shadowRoot.querySelector(".percentage");
    const contentEl = this.shadowRoot.querySelector(".content");
    let currentBrightness = brightnessPercent;

    // register icon click
    const iconEl = this.shadowRoot.querySelector(".icon");
    iconEl?.replaceWith(iconEl.cloneNode(true)); // remove existing listener
    const newIconEl = this.shadowRoot.querySelector(".icon");

    newIconEl.addEventListener("click", (ev) => {
      ev.stopPropagation();

      const entityId = this.config.entity;
      const stateObj = hass.states[entityId];
      if (!stateObj) return;

      // toggle light
      if (stateObj.state == "on") {
        hass.callService("light", "turn_off", { entity_id: entityId });
      } else {
        hass.callService("light", "turn_on", { entity_id: entityId });
      }
    });

    // register arrow click
    const arrowEl = this.shadowRoot.querySelector(".arrow");
    if (arrowEl) {
      const newArrowEl = arrowEl.cloneNode(true);
      arrowEl.replaceWith(newArrowEl)

      // stop other elements from registering this event
      newArrowEl.addEventListener("mousedown", (ev) => {
        ev.stopPropagation();
      });
      newArrowEl.addEventListener("touchstart", (ev) => {
        ev.stopPropagation();
      });

      newArrowEl.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const entityId = this.config.entity;

        const moreInfoEvent = new CustomEvent("hass-more-info", {
          bubbles: true,
          composed: true,
          detail: { entityId },
        });

        // Dispatch from the card element itself (not shadow DOM node)
        this.dispatchEvent(moreInfoEvent);

        console.log("Opened more info page");
      });

    }

    // get the usable width of the brightness bar area (minus the icon underlap)
    const getUsableWidth = () => {
      const buffer = 4;
      const contentStyle = getComputedStyle(contentEl);
      const paddingRight = parseFloat(contentStyle.paddingRight);
      const contentWidth = contentEl.clientWidth - buffer - paddingRight;
      return contentWidth;
    };

    // convert mouse/touch X to brightness %
    const getBrightnessFromX = (clientX) => {
      const rect = brightnessEl.getBoundingClientRect();
      let x = clientX - (rect.left + window.left_offset);
      const effectiveWidth = rect.width - window.left_offset;
      x = Math.max(0, Math.min(x, effectiveWidth));
      return Math.round((x / effectiveWidth) * 100);
    };

    // update the width of the brightness bar (without applying the brightness to the light)
    const updateBarPreview = (brightness) => {
      const roundedBrightness = Math.round(brightness);
      if (brightness !== 0) {
        const usableWidth = getUsableWidth();
        const effectiveWidth = (brightness / 100) * usableWidth;
        const totalWidth = Math.min(effectiveWidth + window.left_offset, usableWidth + window.left_offset - 1);
        barEl.style.width = `${totalWidth}px`;
        if (percentageEl) percentageEl.textContent = `${roundedBrightness}%`;
      } else {
        barEl.style.width = `0px`;
        if (percentageEl) percentageEl.textContent = "Off";
      }
    };

    // apply actual brightness to the light (real-time)
    let updateTimeout;
    const applyBrightness = (hass, entityId, brightness) => {
      // timeout prevents too many rapid updates
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        const b = parseFloat(brightness);
        if (isNaN(b)) return;
        const brightness255 = Math.round((b / 100) * 255);
        const clampedBrightness = Math.max(0, Math.min(255, brightness255));
        hass.callService("light", "turn_on", {
          entity_id: entityId,
          brightness: clampedBrightness
        });
      }, 50);
    };

    // shared drag start logic
    const onDragStart = (clientX) => {
      if (state !== "on" || !this.supportsBrightness) {
        return;
      }
      this.isDragging = true;

      // start dragging
      this.startX = clientX;
      this.startWidth = getBrightnessFromX(clientX);

      // set brightness and bar to be at mouse X.
      const brightness = this.startWidth;
      updateBarPreview(brightness);
      applyBrightness(hass, entity, brightness);
      currentBrightness = brightness;

      document.body.style.userSelect = "none";
    };

    // shared drag move logic
    const onDragMove = (clientX) => {
      const dx = clientX - this.startX;
      const rect = contentEl.getBoundingClientRect();
      const deltaPercent = (dx / rect.width) * 100;
      const newBrightness = Math.max(0, Math.min(100, this.startWidth + deltaPercent));
      updateBarPreview(newBrightness);
      applyBrightness(hass, entity, newBrightness);
      currentBrightness = newBrightness;
    };

    // shared drag end logic
    const onDragEnd = () => {
      this.isDragging = false;
      document.body.style.userSelect = "";
      clearTimeout(updateTimeout);
      applyBrightness(hass, entity, currentBrightness);

      // prevent jitter
      this.ignoreNextStateUpdate = true;
      setTimeout(() => {
        this.ignoreNextStateUpdate = false;
      }, 500);
    };

    // mouse held down
    brightnessEl.addEventListener("mousedown", (e) => {
      e.preventDefault();
      onDragStart(e.clientX);
    });

    // mouse move
    document.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
      onDragMove(e.clientX);
    });

    // mouse up
    document.addEventListener("mouseup", () => {
      if (!this.isDragging) return;
      onDragEnd();
    });

    // touch start
    brightnessEl.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      onDragStart(touch.clientX);
    });

    // touch move
    document.addEventListener("touchmove", (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      onDragMove(touch.clientX);
    }, { passive: false });

    // touch end
    document.addEventListener("touchend", (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
      const touch = e.changedTouches[0];
      onDragEnd();
    });

  }

  static getStubConfig() {
    return { entity: "light.bedroom", icon: "mdi:lightbulb" };
  }

  _updateDisplay(name, percentageText, barWidth, primaryColour, secondaryColour, icon) {
    const root = this.shadowRoot;

    if (!root) return;

    // references
    const nameEl = root.querySelector(".name");
    const percentageEl = root.querySelector(".percentage");
    const barEl = root.querySelector(".brightness-bar");
    const iconEl = root.querySelector(".icon");
    const brightnessEl = root.querySelector(".brightness");
    const haIconEl = root.querySelector("#main-icon");
    const contentEl = root.querySelector(".content");

    // update name
    if (nameEl) nameEl.textContent = name;
    // update displayed percentage
    if (!this.isDragging && !this.ignoreNextStateUpdate && percentageEl) {
      if (percentageText === "Off" || percentageText === "On") {
        percentageEl.textContent = percentageText;
      } else {
        percentageEl.textContent = percentageText + "%";
      }
    }
    // update icon
    if (haIconEl && icon) {
      haIconEl.setAttribute("icon", icon);
    }
    // update bar width
    // - the provided barWidth is just a % from 0-100%, must + 14px.
    if (!this.isDragging && !this.ignoreNextStateUpdate && barEl) {
      if (barWidth !== 0) {
        const buffer = 4;
        const contentStyle = getComputedStyle(contentEl);
        const paddingRight = parseFloat(contentStyle.paddingRight);
        const contentWidth = contentEl.clientWidth - buffer - paddingRight - 1;
        const effectiveWidth = (barWidth / 100) * contentWidth;
        const totalWidth = effectiveWidth + window.left_offset;
        console.log("name: " + name)
        console.log("paddingRight: " + paddingRight);
        console.log("contentEl.clientWidth: " + contentEl.clientWidth);
        console.log("barWidth: " + barWidth);
        console.log("totalWidth: " + totalWidth);
        console.log("---------------------------")
        barEl.style.width = `${totalWidth}px`;
      } else {
        barEl.style.width = `0px`;
      }
    }
    // update colours
    if (percentageText !== "Off") {
      if (primaryColour) root.host.style.setProperty("--light-primary-colour", primaryColour);
      if (secondaryColour) root.host.style.setProperty("--light-secondary-colour", secondaryColour);
    }
    // add or remove border from icon
    if (!this.config.icon_border) {
      iconEl.classList.add("no-border");
    } else {
      iconEl.classList.remove("no-border");
    }
    // add or remove border from card
    // to do this, remove the padding front .content, and from .icon-background
    if (!this.config.card_border) {
      contentEl.classList.add("no-border");
    } else {
      contentEl.classList.remove("no-border");
    }
    // add glow effect if enabled and light is on
    const cardContainer = root.querySelector(".card-container");
    if (this.config.glow && percentageText !== "Off" && primaryColour) {
      // Extract RGB values from primaryColour string
      const rgbMatch = primaryColour.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const [r, g, b] = [rgbMatch[1], rgbMatch[2], rgbMatch[3]];
        const glowColor = `rgba(${r}, ${g}, ${b}, 0.3)`; // 30% opacity
        cardContainer.style.boxShadow = `0 0 24px 8px ${glowColor}`;
      } else {
        // Fallback if match fails
        cardContainer.style.boxShadow = `0 0 24px 8px ${primaryColour}40`.replace("rgb", "rgba").replace(")", ", 0.3)");
      }
    } else {
      cardContainer.style.boxShadow = "none";
    }
    // icon colours
    if (percentageText === "Off") {
      iconEl.style.background = "var(--off-primary-colour)";
      iconEl.style.color = "var(--off-text-colour)";
      brightnessEl.style.background = "var(--off-primary-colour)";
    } else {
      iconEl.style.background = "var(--light-secondary-colour)";
      iconEl.style.color = "var(--light-primary-colour)";
      brightnessEl.style.background = "var(--light-secondary-colour)";
    }

    // check to see if the card can fill more space.
    // this fixes the bug where, when exiting dashboard edit view, the card doesn't fill the space completely.
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        if (!this.isDragging && !this.ignoreNextStateUpdate) {
          this._updateDisplay(
            name,
            percentageText,
            barWidth,
            primaryColour,
            secondaryColour,
            icon
          );
        }
      });
      this._resizeObserver.observe(this.shadowRoot.querySelector(".card-container"));
    }
  }

}

// register card
customElements.define('compact-light-card', CompactLightCard);

// make it appear in visual card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "compact-light-card",
  name: "Compact Light Card",
  description: "A more compact light card.",
});