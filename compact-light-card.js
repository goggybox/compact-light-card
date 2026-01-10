/*
 * Compact Light Card
 *
 * A clean, compact, and highly customisable light card for Home Assistant.
 *
 * Author: goggybox
 * License: MIT
 */


console.log("compact-light-card.js v0.6.12 loaded!");
window.left_offset = 66;

class CompactLightCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.isDragging = false;
    this.startX = 0;
    this.startWidth = 0;
    this.supportsBrightness = true;
    this.pendingUpdate = null;
    this._hass = null;
    this._listenersInitialized = false;
    this._iconListenerInitialized = false;
    this._arrowListenerInitialized = false;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --height: 64px;
          --icon-width: var(--height);
          --icon-border-radius: 15px;
          --icon-font-size: 36px;

          --off-background-colour: var(--secondary-background-color);
          --off-text-colour: var(--secondary-text-color);

          --icon-border-colour: var(--card-background-color);
          --card-border-colour: var(--card-background-color);
        }

        .card-container {
          max-width: 500px;
          height: var(--height);
          background: rgba(0,0,0,0.0);
          border-radius: var(--icon-border-radius);
          margin: 0 auto;
          margin-right: 5px;
          margin-left: 5px;
          overflow: hidden;
        }

        .card {
          height: var(--height);
          background: rgba(0,0,0,0.1);
          backdrop-filter: blur(0px);
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
          border: 3px solid var(--icon-border-colour);
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

        .content {
          height: var(--height);
          width: 100%;
          z-index: 1;
          box-sizing: border-box;
          padding: 3px 6px 3px 8px;
          overflow: false;
          background: var(--icon-border-colour);
          margin-left: -69px;
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }

        .content.no-border {
          padding: 0px 0px 0px 5px;
        }

        .brightness {
          border-radius: 12px;
          width: 100%;
          height: 100%;
          transition: background 0.6s ease;
        }

        .brightness-bar {
          height: 100%;
          background: var(--light-primary-colour);
          border-radius: 12px;
          box-shadow: rgba(0, 0, 0, 0.1) 0px 5px 15px;
          transition: width 0.6s ease;
        }

        .overlay {
          height: 100%;
          width: 100%;
          position: absolute;
          top: 0;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: center;
          pointer-events: none;
        }

        .name {
          padding-left: 79px;
          font-weight: bold;
          font-size: 18px;
          color: var(--primary-text-color);
        }

        .right-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .percentage {
          font-size: 14px;
          color: var(--primary-text-color);
        }

        .arrow {
          padding-right: 10px;
          --mdc-icon-size: 28px;
          padding-top: 20px;
          padding-bottom: 20px;
          color: var(--primary-text-color);
          pointer-events: auto;
        }

        .haicon {
          position: absolute;
          left: 0;
          top: 0;
          width: var(--icon-width);
          height: var(--height);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--off-text-colour);
          --mdc-icon-size: 32px;
          filter: drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.15));
          pointer-events: none;
        }

      </style>

      <div class="card-container">
        <div class="card">
          <div class="icon-wrapper">
            <div class="icon">
            </div>
          </div>
          <div class="content">
            <div class="brightness">
              <div class="brightness-bar"></div>
            </div>
          </div>
          <div class="overlay">
            <ha-icon id="main-icon" icon="mdi:close" class="haicon"></ha-icon>
            <div class="name">Loading...</div>
            <div class="right-info">
              <span class="percentage">—</span>
              <ha-icon class="arrow" icon="mdi:chevron-right"></ha-icon>
            </div>
          </div>
        </div>
      </div>
    `
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  _getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  _getContrastRatio(colour1, colour2) {
    const lum1 = this._getLuminance(colour1.r, colour1.g, colour1.b);
    const lum2 = this._getLuminance(colour2.r, colour2.g, colour2.b);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  // convert any colour to RGB values
  _parseColour(colour) {
    // css var -> rgb
    if (colour.startsWith('var(--')) {
      // Get computed value of the CSS variable
      const computedStyle = getComputedStyle(this);
      const varName = colour.match(/var\((--[^)]+)\)/)[1];
      colour = computedStyle.getPropertyValue(varName).trim() || '#000000';
    }

    // hex -> rgb
    if (colour.startsWith('#')) {
      return this._hexToRgb(colour);
    }

    // rgb and rgba
    const rgbMatch = colour.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3])
      };
    }

    // fallback
    return { r: 0, g: 0, b: 0 };
  }

  // determine whether text colour should be white or black based on contrast with background
  _getTextColourForBackground(backgroundColour) {
    const bgRgb = this._parseColour(backgroundColour);
    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 0, g: 0, b: 0 };

    const contrastWithWhite = this._getContrastRatio(bgRgb, white);
    const contrastWithBlack = this._getContrastRatio(bgRgb, black);

    if (contrastWithWhite >= 1.3) {
      return 'white';
    } else if (contrastWithBlack >= 2.5) {
      return 'black';
    } else {
      // Fallback: choose whichever has higher contrast
      return contrastWithWhite > contrastWithBlack ? 'white' : 'black';
    }
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Compact Light Card: Please provide an 'entity' in the config.")
    }

    this.config = {
      ...config,
      icon: config.icon || "mdi:lightbulb",
      name: config.name,
      glow: config.glow !== false,
      icon_border: config.icon_border === true,
      card_border: config.card_border === true,
      off_colours: config.off_colours || null,
      icon_border_colour: config.icon_border_colour,
      card_border_colour: config.card_border_colour,
      primary_colour: config.primary_colour,
      secondary_colour: config.secondary_colour,
      chevron_action: config.chevron_action || { action: "hass-more-info" },
      chevron_hold_action: config.chevron_hold_action,
      chevron_double_tap_action: config.chevron_double_tap_action,
      opacity: config.opacity !== undefined ? Math.max(config.opacity, 0.2) : 1,
      blur: config.blur !== undefined ? Math.min(config.blur, 10) : 0,
      smart_font_colour: config.smart_font_colour !== false,
      icon_tap_to_brightness: !!config.icon_tap_to_brightness,
      turn_on_brightness: config.turn_on_brightness !== undefined ? Math.max(1, Math.min(100, config.turn_on_brightness)) : 100,
    };

    // validate off_colours structure
    if (config.off_colours) {
      if (typeof config.off_colours !== "object" || (config.off_colours.light === undefined && config.off_colours.background === undefined)) {
        throw new Error("Compact Light Card: Invalid off_colours format.");
      }
    }

  }

  _getOffColours() {
    const offColours = this.config.off_colours;
    if (!offColours) return null;

    let bg, text;

    // theme specific
    if (offColours.light && offColours.dark) {
      const isDarkTheme = this._hass.themes.darkMode ?? false;
      const theme = isDarkTheme ? offColours.dark : offColours.light;
      bg = theme.background;
      text = theme.text;
    } else if (offColours.background && offColours.text) {
      bg = offColours.background;
      text = offColours.text;
    } else {
      throw new Error("Compact Light Card: Invalid off_colours format.");
    }

    return { background: bg, text };
  }


  connectedCallback() {
    // create ResizeObserver once when the card is attached to DOM
    // fixes bug of duplicate ResizeObservers
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        if (!this.isDragging) {
          // runs when card's container has changed, will refresh
          // card to better fit the container.
          this._refreshCard();
        }
      });

      if (this.shadowRoot.querySelector(".card-container")) {
        this._resizeObserver.observe(this.shadowRoot.querySelector(".card-container"));
      }
    }
  }

  disconnectedCallback() {
    // clean up
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  _refreshCard() {
    // updates card to better fit the container when the container changes.
    // uses fresh state data, fixing stale data being displayed bug.
    if (!this._hass || !this.config.entity) return;

    const { name, displayText, brightnessPercent, primaryColour, secondaryColour, icon } = this._getCardState();

    this._updateDisplay(name, displayText, brightnessPercent, primaryColour, secondaryColour, icon);
  }

  _getCardState() {
    // get the card's current state variables
    if (!this._hass || !this.config.entity) {
      return {
        name: null,
        displayText: null,
        brightnessPercent: null,
        primaryColour: null,
        secondaryColour: null,
        icon: null
      };
    }

    const entity = this.config.entity;
    const stateObj = this._hass.states[entity];

    // ensure entity exists and is connected
    if (!stateObj) {
      return {
        name: "Entity not found",
        displayText: "-",
        brightnessPercent: 0,
        primaryColour: "#9e9e9e",
        secondaryColour: "#e0e0e0",
        icon: "mdi:alert"
      };
    }

    const state = stateObj.state;
    const tempName = this.config.name || stateObj.attributes.friendly_name || entity.replace("light.", "");
    const friendlyName = tempName.length > 30 ? tempName.slice(0, 30) + "..." : tempName;
    this.supportsBrightness = (stateObj.attributes.supported_features & 1) || (stateObj.attributes.brightness !== undefined);;

    // determine brightness and display text
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
    } else if (state == "unavailable") {
      displayText = "Unavailable";
    }

    // determine colour
    let primaryColour = "#ff890e";
    let secondaryColour = "#eec59a";

    // use user's configured colours if provided
    if (this.config.primary_colour) {
      primaryColour = this.config.primary_colour;
    } else if (stateObj.attributes.rgb_color) {
      const [r, g, b] = stateObj.attributes.rgb_color;
      primaryColour = `rgb(${r}, ${g}, ${b})`;
    }
    if (this.config.secondary_colour) {
      secondaryColour = this.config.secondary_colour;
    } else if (stateObj.attributes.rgb_color) {
      const [r, g, b] = stateObj.attributes.rgb_color;
      const gradientColour = `rgba(${r}, ${g}, ${b}, 0.30)`;
      secondaryColour = `linear-gradient(${gradientColour}, ${gradientColour}), var(--secondary-background-color)`;
    }

    // determine icon
    const icon = this.config.icon;

    return {
      name: friendlyName,
      displayText,
      brightnessPercent,
      primaryColour,
      secondaryColour,
      icon
    };

  }

  // get the usable width of the brightness bar area (minus the icon underlap)
  getUsableWidth = () => {
    const buffer = 4;
    const contentEl = this.shadowRoot.querySelector(".content");
    const contentStyle = getComputedStyle(contentEl);
    const paddingRight = parseFloat(contentStyle.paddingRight);
    const contentWidth = contentEl.clientWidth - buffer - paddingRight - window.left_offset;
    return contentWidth;
  };

  _performAction(actionObj) {
    if (!actionObj || !actionObj.action || !this._hass || !this.config.entity) {
      return;
    }

    const action = actionObj.action;
    const entityId = this.config.entity;
    const moreInfoEvent = new CustomEvent("hass-more-info", {
      bubbles: true,
      composed: true,
      detail: { entityId },
    });

    switch (action) {
      case "hass-more-info":
        this.dispatchEvent(moreInfoEvent);
        break;

      case "more-info":
        this.dispatchEvent(moreInfoEvent);
        break;

      case "toggle":
        this._hass.callService("light", "toggle", {
          entity_id: entityId
        });
        break;

      case "navigate":
        if (actionObj.navigation_path) {
          history.pushState(null, "", actionObj.navigation_path);
          window.dispatchEvent(new Event("location-changed"));
        }
        break;

      case "url":
        if (actionObj.url_path || actionObj.url) {
          const url = actionObj.url_path || actionObj.url;
          window.open(url, "_blank");
        }
        break;

      case "call-service":
        if (actionObj.service) {
          const [domain, service] = actionObj.service.split(".", 2);
          const serviceData = { ...actionObj.service_data };
          if (!serviceData.entity_id) {
            serviceData.entity_id = entityId;
          }
          this._hass.callService(domain, service, serviceData);
        }
        break;

      case "perform-action":
        if (actionObj.perform_action) {
          // allow format:
          /*
            action: perform-action
            target:
              entity_id: light.side_lamp
            perform_action: light.turn_on
            data:
              brightness_pct: 50
              rgb_color:
                - 237
                - 51
                - 59
           */
          const [domain, service] = actionObj.perform_action.split(".", 2);
          const serviceData = { ...actionObj.data };
          if (actionObj.target) {
            serviceData.entity_id = actionObj.target.entity_id;
          } else if (!serviceData.entity_id) {
            serviceData.entity_id = entityId;
          }
          this._hass.callService(domain, service, serviceData);
        }
        break;

      case "none":
        break;

      default:
        console.warn("Compact-Light-Card: Unsupported action: ", action);

    }
  }

  set hass(hass) {
    if (!this.shadowRoot) return;
    this._hass = hass;
    const entity = this.config.entity;
    const stateObj = hass.states[entity];
    const state = stateObj.state;

    // get and apply off colours if configured
    const offColours = this._getOffColours();
    if (offColours) {
      this.style.setProperty("--off-background-colour", offColours.background);
      this.style.setProperty("--off-text-colour", offColours.text);
    } else {
      // reset variables to defaults as in CSS styling.
      this.style.removeProperty("--off-background-colour");
      this.style.removeProperty("--off-text-colour");
    }

    // apply icon border colour
    if (this.config.icon_border_colour && this.config.icon_border === true) {
      this.style.setProperty("--icon-border-colour", this.config.icon_border_colour);
    } else {
      // reset to default
      this.style.setProperty("--icon-border-colour", "var(--card-background-color)");
    }

    // apply card border colour
    if (this.config.card_border_colour && this.config.card_border === true) {
      this.style.setProperty("--card-border-colour", this.config.card_border_colour);
    } else {
      // reset to default
      this.style.setProperty("--card-border-colour", "--var(--card-background-color");
    }

    const { name, displayText, brightnessPercent, primaryColour, secondaryColour, icon } = this._getCardState();

    // UPDATE CARD
    this._updateDisplay(name, displayText, brightnessPercent, primaryColour, secondaryColour, icon);


    // ---------------------------------------------
    // INTERACTIONS
    // ---------------------------------------------
    const brightnessEl = this.shadowRoot.querySelector(".brightness");
    const barEl = this.shadowRoot.querySelector(".brightness-bar");
    const percentageEl = this.shadowRoot.querySelector(".percentage");
    const contentEl = this.shadowRoot.querySelector(".content");
    let currentBrightness = brightnessPercent;

    // register icon click - only once
    if (!this._iconListenerInitialized) {
      const iconEl = this.shadowRoot.querySelector(".icon");
      iconEl.addEventListener("click", (ev) => {
        ev.stopPropagation();

        const entityId = this.config.entity;
        const stateObj = this._hass.states[entityId];
        if (!stateObj) return;

        // toggle light
        if (stateObj.state == "on") {
          this._hass.callService("light", "turn_off", { entity_id: entityId });
        } else {
          // turn on - use configured brightness if icon_tap_to_brightness is enabled
          console.log("compact-light-card: icon_tap_to_brightness =", this.config.icon_tap_to_brightness, "turn_on_brightness =", this.config.turn_on_brightness);
          if (this.config.icon_tap_to_brightness) {
            console.log("compact-light-card: Turning on with brightness_pct:", this.config.turn_on_brightness);
            this._hass.callService("light", "turn_on", {
              entity_id: entityId,
              brightness_pct: this.config.turn_on_brightness
            });
          } else {
            console.log("compact-light-card: Turning on without brightness (feature disabled)");
            this._hass.callService("light", "turn_on", { entity_id: entityId });
          }
        }
      });
      this._iconListenerInitialized = true;
    }

    // register arrow interactions (click, double-tap, hold) - only once
    if (!this._arrowListenerInitialized) {
      const arrowEl = this.shadowRoot.querySelector(".arrow");
      if (arrowEl) {
        let tapCount = 0;
        let tapTimer = null;
        let holdTimer = null;
        let holdTriggered = false;
        const HOLD_THRESHOLD = 500; // in ms
        const DOUBLE_TAP_THRESHOLD = 300; // in ms

        const handleSingleTap = () => {
          if (tapCount === 1) {
            this._performAction(this.config.chevron_action);
          }
          tapCount = 0;
        };

        const startHold = () => {
          holdTriggered = false;
          holdTimer = setTimeout(() => {
            holdTimer = null;
            holdTriggered = true;
            tapCount = 0;
            this._performAction(this.config.chevron_hold_action);
          }, HOLD_THRESHOLD);
        };

        const cancelHold = () => {
          if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
          }
        };

        const handleTap = () => {
          cancelHold();
          tapCount++;
          if (tapCount === 1) {
            tapTimer = setTimeout(handleSingleTap, DOUBLE_TAP_THRESHOLD);
          } else if (tapCount === 2) {
            clearTimeout(tapTimer);
            tapTimer = null;
            tapCount = 0;
            this._performAction(this.config.chevron_double_tap_action);
          }
        };

        // single touch handlers for both mouse and touch
        const handlePointerDown = (ev) => {
          ev.stopPropagation();
          if (ev.type === "touchstart") {
            ev.preventDefault();
          }
          startHold();
        };
        const handlePointerUp = (ev) => {
          ev.stopPropagation();
          if (holdTriggered) return;
          if (holdTimer) {
            cancelHold();
            handleTap();
          }
        };
        const handlePointerCancel = () => {
          cancelHold();
          tapCount = 0;
          if (tapTimer) {
            clearTimeout(tapTimer);
            tapTimer = null;
          }
        };

        // mouse handler
        arrowEl.addEventListener("mousedown", handlePointerDown);
        arrowEl.addEventListener("mouseup", handlePointerUp);
        arrowEl.addEventListener("mouseleave", handlePointerCancel);

        // touch handler
        arrowEl.addEventListener("touchstart", handlePointerDown, { passive: false });
        arrowEl.addEventListener("touchend", handlePointerUp);
        arrowEl.addEventListener("touchcancel", handlePointerCancel);
      }
      this._arrowListenerInitialized = true;
    }

    // convert mouse/touch X to brightness %
    // 1% starts immediately to the right of the icon
    const getBrightnessFromX = (clientX) => {
      const rect = brightnessEl.getBoundingClientRect();
      let x = clientX - (rect.left + window.left_offset);
      const usableWidth = this.getUsableWidth();
      x = Math.max(0, Math.min(x, usableWidth));
      // Map 0 to usableWidth → 1% to 100%
      const brightness = Math.round(1 + (x / usableWidth) * 99);
      return Math.max(1, Math.min(100, brightness));
    };

    // update the width of the brightness bar (without applying the brightness to the light)
    // brightness range is 1-100%, where 1% starts immediately right of the icon
    const updateBarPreview = (brightness) => {
      const roundedBrightness = Math.max(1, Math.round(brightness));

      if (this.pendingUpdate) {
        cancelAnimationFrame(this.pendingUpdate);
      }

      this.pendingUpdate = requestAnimationFrame(() => {
        const usableWidth = this.getUsableWidth();
        // Map 1-100% to 0-usableWidth for the bar portion beyond the icon
        const effectiveWidth = ((roundedBrightness - 1) / 99) * usableWidth;
        const totalWidth = Math.min(effectiveWidth + window.left_offset, usableWidth + window.left_offset - 1);
        barEl.style.width = `${totalWidth}px`;
        if (percentageEl) percentageEl.textContent = `${roundedBrightness}%`;
        this.pendingUpdate = null;
      });
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
      }, 125);
    };

    // shared drag start logic
    const onDragStart = (clientX) => {
      if (!this.supportsBrightness) {
        return;
      }
      this.isDragging = true;

      // start dragging
      this.startX = clientX;
      this.startWidth = getBrightnessFromX(clientX);

      // set brightness and bar to be at mouse X.
      const brightness = this.startWidth;
      updateBarPreview(brightness);
      currentBrightness = brightness;

      if (state !== "on") {
        const brightness255 = Math.round((brightness / 100) * 255);
        hass.callService("light", "turn_on", {
          entity_id: this.config.entity,
          brightness: Math.max(1, brightness255)
        });
      }

      document.body.style.userSelect = "none";
    };

    // shared drag move logic
    const onDragMove = (clientX) => {
      // remove transition for better drag response
      if (barEl.style.transition !== "none") {
        barEl.style.transition = "none";
      }

      const dx = clientX - this.startX;
      const rect = contentEl.getBoundingClientRect();
      const usableWidth = this.getUsableWidth();
      const deltaPercent = (dx / usableWidth) * 100;
      const newBrightness = Math.round(Math.max(1, Math.min(100, this.startWidth + deltaPercent)));
      updateBarPreview(newBrightness);
      currentBrightness = newBrightness;
    };

    // shared drag end logic
    const onDragEnd = () => {
      this.isDragging = false;
      document.body.style.userSelect = "";
      clearTimeout(updateTimeout);
      applyBrightness(hass, entity, currentBrightness);

      // re-enable transition for smooth state updates
      if (barEl.style.transition === "none") {
        barEl.style.transition = "width 0.6s ease";
      }
    };

    // Only add event listeners once to prevent lag from duplicate listeners
    if (!this._listenersInitialized) {
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

      this._listenersInitialized = true;
    }

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
    if (!this.isDragging && percentageEl) {
      if (percentageText === "Off" || percentageText === "On" || percentageText === "Unavailable") {
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
    // - the provided barWidth is a % from 0-100%, where 1% starts immediately right of the icon
    if (!this.isDragging && barEl) {
      if (barWidth !== 0) {
        const buffer = 4;
        const contentStyle = getComputedStyle(contentEl);
        const paddingRight = parseFloat(contentStyle.paddingRight);
        const contentWidth = contentEl.clientWidth - buffer - paddingRight - window.left_offset;
        // Map 1-100% to 0-contentWidth for the bar portion beyond the icon
        const clampedWidth = Math.max(1, barWidth);
        const effectiveWidth = ((clampedWidth - 1) / 99) * contentWidth;
        const totalWidth = Math.min(effectiveWidth + window.left_offset, contentWidth + window.left_offset - 1);
        barEl.style.width = `${totalWidth}px`;
      } else {
        barEl.style.width = `0px`;
      }
    }
    // update colours
    if (percentageText !== "Off" && percentageText !== "Unavailable") {
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
    if (this.config.glow && percentageText !== "Off" && percentageText !== "Unavailable" && primaryColour) {
      // Extract RGB values from primaryColour string
      const rgbMatch = primaryColour.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const [r, g, b] = [rgbMatch[1], rgbMatch[2], rgbMatch[3]];
        const glowColor = `rgba(${r}, ${g}, ${b}, ${Math.min(this.config.opacity * 0.6, 0.3)})`;
        cardContainer.style.boxShadow = `0 0 24px 8px ${glowColor}`;
      } else {
        // Fallback if match fails
        cardContainer.style.boxShadow = `0 0 24px 8px ${primaryColour}40`.replace("rgb", "rgba").replace(")", ", 0.3)");
      }
    } else {
      cardContainer.style.boxShadow = "none";
    }

    // calculate optimal text colour based on background
    const getTextColour = (backgroundColor) => {
      const textColour = this._getTextColourForBackground(backgroundColor);
      return textColour === 'white' ? '#ffffff' : '#7a7a7aff';
    }

    // apply colours with contrast consideration
    const haicon = root.querySelector(".haicon");
    if (this.config.smart_font_colour) {
      if (percentageText === "Off" || percentageText === "Unavailable") {
        const offBgColour = getComputedStyle(this).getPropertyValue('--off-background-colour').trim();
        const optimalTextColour = getTextColour(offBgColour);
        iconEl.style.background = "var(--off-background-colour)";
        iconEl.style.color = optimalTextColour;
        haicon.style.color = optimalTextColour;
        brightnessEl.style.background = "var(--off-background-colour)";

        nameEl.style.color = optimalTextColour;
        percentageEl.style.color = optimalTextColour;
        root.querySelector(".arrow").style.color = optimalTextColour;
      } else {
        const lightPrimaryColour = primaryColour;
        const optimalPrimaryTextColour = getTextColour(lightPrimaryColour);
        iconEl.style.background = "var(--light-secondary-colour)";
        iconEl.style.color = "var(--light-primary-colour)";
        haicon.style.color = "var(--light-primary-colour)";
        brightnessEl.style.background = "var(--light-secondary-colour)";

        nameEl.style.color = optimalPrimaryTextColour;
        percentageEl.style.color = optimalPrimaryTextColour;
        root.querySelector(".arrow").style.color = optimalPrimaryTextColour;
      }
    }
    else {
      if (percentageText === "Off" || percentageText === "Unavailable") {
        iconEl.style.background = "var(--off-background-colour)";
        iconEl.style.color = "var(--off-text-colour)";
        haicon.style.color = "var(--off-text-colour)";
        brightnessEl.style.background = "var(--off-background-colour)";

        nameEl.style.color = "var(--off-text-colour)";
        percentageEl.style.color = "var(--off-text-colour)";
        root.querySelector(".arrow").style.color = "var(--off-text-colour)";
      } else {
        iconEl.style.background = "var(--light-secondary-colour)";
        iconEl.style.color = "var(--light-primary-colour)";
        haicon.style.color = "var(--light-primary-colour)";
        brightnessEl.style.background = "var(--light-secondary-colour)";

        nameEl.style.color = "var(--primary-text-color)";
        percentageEl.style.color = "var(--primary-text-color)";
        root.querySelector(".arrow").style.color = "var(--primary-text-color)";
      }
    }

    // apply opacity
    root.querySelector(".content").style.opacity = this.config.opacity;
    root.querySelector(".icon").style.opacity = Math.max(Math.min(this.config.opacity * 1.5, 1), 0.3);
    const shadowOpacity = 0.2 + (1 - this.config.opacity) * 0.4;
    if (root.querySelector(".icon.no-border")) {
      root.querySelector(".icon.no-border").style.boxShadow = `rgba(0, 0, 0, ${shadowOpacity}) 0px 5px 15px`;
    }
    root.querySelector(".card").style.backdropFilter = `blur(${this.config.blur}px)`;
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