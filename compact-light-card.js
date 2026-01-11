/*
 * Compact Light Card
 *
 * A clean, compact, and highly customisable light card for Home Assistant.
 *
 * Original Author: goggybox
 * Modified by: lewisburgess
 * License: MIT
 */


console.log("compact-light-card.js v0.6.36 loaded!");
window.left_offset = 66;

class CompactLightCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.isDragging = false;
    this.startX = 0;
    this.startWidth = 0;
    this.supportsBrightness = true;
    this.supportsColorTemp = false;
    this.supportsRgb = false;
    this.supportsSpeed = false;
    this.isFan = false;
    this.pendingUpdate = null;
    this._hass = null;
    this._listenersInitialized = false;
    this._iconListenerInitialized = false;
    this._arrowListenerInitialized = false;
    this._modeButtonsInitialized = false;
    this._secondaryIconListenerInitialized = false;
    this._currentMode = "brightness"; // brightness, color_temp, rgb
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --height: 64px;
          --icon-width: var(--height);
          --icon-border-radius: 15px;
          --icon-font-size: 36px;
          --font-size: 18px;

          --off-background-colour: var(--secondary-background-color);
          --off-text-colour: var(--secondary-text-color);

          --icon-border-colour: var(--card-background-color);
          --card-border-colour: var(--card-background-color);
        }

        .card-container {
          width: 100%;
          height: var(--height);
          background: rgba(0,0,0,0.0);
          border-radius: var(--icon-border-radius);
          margin: 0;
          overflow: hidden;
          box-sizing: border-box;
        }

        .card {
          height: var(--height);
          background: rgba(0,0,0,0.1);
          backdrop-filter: blur(0px);
          display: flex;
          align-items: center;
          position: relative;
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
          overflow: hidden;
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
          position: relative;
        }

        .color-marker {
          position: absolute;
          top: 0;
          width: 4px;
          height: 100%;
          background: white;
          border-radius: 2px;
          box-shadow: 0 0 4px rgba(0,0,0,0.5);
          pointer-events: none;
          display: none;
          z-index: 1;
        }

        .color-marker.visible {
          display: block;
        }

        .brightness-bar {
          height: 100%;
          background: var(--light-primary-colour);
          border-radius: 12px 0 0 12px;
          box-shadow: rgba(0, 0, 0, 0.1) 0px 5px 15px;
          transition: width 0.6s ease, border-radius 0.2s ease;
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
          font-size: var(--font-size);
          color: var(--primary-text-color);
        }

        .right-info {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 100%;
          padding: 0 8px 0 12px;
        }

        .right-info.value-bar {
          border-radius: 0 12px 12px 0;
          border-left: 2px solid rgba(255, 255, 255, 0.3);
          background: var(--light-primary-colour, var(--secondary-background-color));
          transition: background 0.3s ease;
        }

        .percentage {
          font-size: 14px;
          color: var(--primary-text-color);
          min-width: 42px;
          text-align: right;
        }

        .arrow {
          --mdc-icon-size: 28px;
          color: var(--primary-text-color);
          pointer-events: auto;
        }

        .mode-buttons {
          display: flex;
          align-items: center;
          gap: 4px;
          pointer-events: auto;
        }

        .mode-btn {
          --mdc-icon-size: 20px;
          padding: 4px;
          border-radius: 50%;
          cursor: pointer;
          opacity: 0.5;
          transition: opacity 0.2s ease, background 0.2s ease;
        }

        .mode-btn:hover {
          opacity: 0.8;
        }

        .mode-btn.active {
          opacity: 1;
          background: rgba(255, 255, 255, 0.2);
        }

        .mode-btn.hidden {
          display: none;
        }

        .secondary-icon {
          --mdc-icon-size: 22px;
          padding: 4px;
          border-radius: 50%;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s ease, background 0.2s ease;
          pointer-events: auto;
        }

        .secondary-icon:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.2);
        }

        .secondary-icon.on {
          opacity: 1;
        }

        .secondary-icon.hidden {
          display: none;
        }

        .color-marker {
          position: absolute;
          top: 0;
          width: 4px;
          height: 100%;
          background: white;
          border-radius: 2px;
          box-shadow: 0 0 4px rgba(0,0,0,0.5);
          pointer-events: none;
          display: none;
          z-index: 1;
        }

        .color-marker.visible {
          display: block;
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
              <div class="color-marker"></div>
            </div>
          </div>
          <div class="overlay">
            <ha-icon id="main-icon" icon="mdi:close" class="haicon"></ha-icon>
            <div class="name">Loading...</div>
            <div class="right-info">
              <span class="percentage">—</span>
              <ha-icon class="secondary-icon hidden" id="secondary-icon" icon="mdi:lightbulb" title="Secondary"></ha-icon>
              <div class="mode-buttons">
                <ha-icon class="mode-btn active" id="mode-brightness" icon="mdi:brightness-6" title="Brightness"></ha-icon>
                <ha-icon class="mode-btn hidden" id="mode-colortemp" icon="mdi:thermometer" title="Color Temperature"></ha-icon>
                <ha-icon class="mode-btn hidden" id="mode-rgb" icon="mdi:palette" title="Color"></ha-icon>
              </div>
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

    // Detect if entity is a fan
    const entityDomain = config.entity.split(".")[0];
    this.isFan = entityDomain === "fan";

    // Set appropriate default icon based on entity type
    const defaultIcon = this.isFan ? "mdi:fan" : "mdi:lightbulb";

    this.config = {
      ...config,
      icon: config.icon || defaultIcon,
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
      opacity: config.opacity !== undefined ? Math.max(config.opacity, 0) : 1,
      opacity_on: config.opacity_on !== undefined ? Math.max(config.opacity_on, 0) : null,
      opacity_off: config.opacity_off !== undefined ? Math.max(config.opacity_off, 0) : null,
      icon_opacity: config.icon_opacity !== undefined ? Math.max(config.icon_opacity, 0) : null,
      icon_opacity_on: config.icon_opacity_on !== undefined ? Math.max(config.icon_opacity_on, 0) : null,
      icon_opacity_off: config.icon_opacity_off !== undefined ? Math.max(config.icon_opacity_off, 0) : null,
      blur: config.blur !== undefined ? Math.min(config.blur, 10) : 0,
      smart_font_colour: config.smart_font_colour !== false,
      icon_tap_to_brightness: !!config.icon_tap_to_brightness,
      turn_on_brightness: config.turn_on_brightness !== undefined ? Math.max(1, Math.min(100, config.turn_on_brightness)) : 100,
      height: config.height !== undefined ? Math.max(30, Math.min(150, config.height)) : 64,
      font_size: config.font_size !== undefined ? Math.max(8, Math.min(36, config.font_size)) : 18,
      icon_background_colour: config.icon_background_colour || null,
      show_color_temp_button: config.show_color_temp_button !== false, // default true if supported
      show_rgb_button: config.show_rgb_button !== false, // default true if supported
      show_value_bar: config.show_value_bar === true, // default false - solid background behind buttons
      secondary_entity: config.secondary_entity || null, // e.g., light entity for a fan, or fan entity for a light
      show_secondary_icon: config.show_secondary_icon !== false, // show secondary entity icon (default true if secondary_entity set)
      slider_mode: config.slider_mode || "absolute", // "absolute" (jumps to touch) or "relative" (slides from current)
      slider_turns_on: config.slider_turns_on !== false, // whether touching slider turns on the light (default true)
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
        icon: null,
        colorTemp: null,
        colorTempPercent: null,
        rgbColor: null,
        hue: null
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
        icon: "mdi:alert",
        colorTemp: null,
        colorTempPercent: null,
        rgbColor: null,
        hue: null
      };
    }

    const state = stateObj.state;
    const entityDomain = entity.split(".")[0];
    const tempName = this.config.name || stateObj.attributes.friendly_name || entity.replace(/^(light|fan)\./, "");
    const friendlyName = tempName.length > 30 ? tempName.slice(0, 30) + "..." : tempName;

    // Handle fan entities
    if (this.isFan) {
      // Fan speed support (supported_features & 1 = SET_SPEED)
      this.supportsSpeed = (stateObj.attributes.supported_features & 1) || (stateObj.attributes.percentage !== undefined);
      this.supportsBrightness = false; // Fans don't have brightness
      this.supportsColorTemp = false;
      this.supportsRgb = false;
    } else {
      // Light brightness support
      this.supportsBrightness = (stateObj.attributes.supported_features & 1) || (stateObj.attributes.brightness !== undefined);
      this.supportsSpeed = false;

      // detect color capabilities for lights
      const colorModes = stateObj.attributes.supported_color_modes || [];
      this.supportsColorTemp = colorModes.includes("color_temp");
      this.supportsRgb = colorModes.some(mode => ["rgb", "rgbw", "rgbww", "hs", "xy"].includes(mode));
    }

    // get color temp range (lights only)
    this.minMireds = stateObj.attributes.min_mireds || 153;
    this.maxMireds = stateObj.attributes.max_mireds || 500;

    // determine brightness/speed and display text
    let brightnessPercent = 0;
    let displayText = "Off";
    if (state == "on") {
      if (this.isFan) {
        // Fan uses percentage attribute
        const percentage = stateObj.attributes.percentage || 0;
        brightnessPercent = percentage;
        if (this.supportsSpeed && percentage > 0) {
          displayText = `${percentage}`;
        } else {
          displayText = "On";
          brightnessPercent = 100;
        }
      } else {
        // Light uses brightness attribute
        const brightness = stateObj.attributes.brightness || 255;
        brightnessPercent = Math.round((brightness / 255) * 100);
        if (this.supportsBrightness) {
          displayText = `${brightnessPercent}`;
        } else {
          displayText = "On";
          brightnessPercent = 100;
        }
      }
    } else if (state == "unavailable") {
      displayText = "Unavailable";
    }

    // get color temperature
    let colorTemp = null;
    let colorTempPercent = null;
    if (stateObj.attributes.color_temp) {
      colorTemp = stateObj.attributes.color_temp;
      // Convert mireds to percentage (inverted: warm = low mireds = high %)
      colorTempPercent = Math.round(((this.maxMireds - colorTemp) / (this.maxMireds - this.minMireds)) * 100);
      colorTempPercent = Math.max(0, Math.min(100, colorTempPercent));
    }

    // get RGB color and hue
    let rgbColor = stateObj.attributes.rgb_color || null;
    let hue = null;
    if (stateObj.attributes.hs_color) {
      hue = Math.round(stateObj.attributes.hs_color[0]); // 0-360
    } else if (rgbColor) {
      // Convert RGB to hue
      hue = this._rgbToHue(rgbColor[0], rgbColor[1], rgbColor[2]);
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
      icon,
      colorTemp,
      colorTempPercent,
      rgbColor,
      hue
    };

  }

  _rgbToHue(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return Math.round(h * 360);
  }

  _hueToRgb(h) {
    // Convert hue (0-360) to RGB with full saturation and lightness
    const s = 1, l = 0.5;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  _colorTempToRgb(mireds) {
    // Convert mireds to Kelvin, then to approximate RGB
    const kelvin = 1000000 / mireds;
    let r, g, b;

    // Algorithm based on Tanner Helland's work
    const temp = kelvin / 100;

    if (temp <= 66) {
      r = 255;
      g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
    } else {
      r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
      g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
    }

    if (temp >= 66) {
      b = 255;
    } else if (temp <= 19) {
      b = 0;
    } else {
      b = Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
    }

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

  // get the usable width of the brightness bar area (minus the icon underlap)
  getUsableWidth = () => {
    const buffer = 4;
    const contentEl = this.shadowRoot.querySelector(".content");
    const contentStyle = getComputedStyle(contentEl);
    const paddingRight = parseFloat(contentStyle.paddingRight);
    let contentWidth = contentEl.clientWidth - buffer - paddingRight - window.left_offset;

    // Only subtract right-info width when show_value_bar is enabled
    if (this.config && this.config.show_value_bar) {
      const rightInfoEl = this.shadowRoot.querySelector(".right-info");
      const rightInfoWidth = rightInfoEl ? rightInfoEl.offsetWidth : 0;
      contentWidth -= rightInfoWidth;
    }
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
        this._hass.callService(this.isFan ? "fan" : "light", "toggle", {
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
    if (!stateObj) return; // Entity not found, skip update
    const state = stateObj.state;

    // apply height and font size
    this.style.setProperty("--height", `${this.config.height}px`);
    this.style.setProperty("--font-size", `${this.config.font_size}px`);

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

        const domain = this.isFan ? "fan" : "light";

        // toggle device
        if (stateObj.state == "on") {
          this._hass.callService(domain, "turn_off", { entity_id: entityId });
        } else {
          // turn on - use configured brightness/speed if icon_tap_to_brightness is enabled
          if (this.config.icon_tap_to_brightness) {
            if (this.isFan) {
              this._hass.callService("fan", "turn_on", {
                entity_id: entityId,
                percentage: this.config.turn_on_brightness
              });
            } else {
              this._hass.callService("light", "turn_on", {
                entity_id: entityId,
                brightness_pct: this.config.turn_on_brightness
              });
            }
          } else {
            this._hass.callService(domain, "turn_on", { entity_id: entityId });
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

    // setup mode buttons - show/hide based on capabilities and config
    const modeBrightnessBtn = this.shadowRoot.querySelector("#mode-brightness");
    const modeColorTempBtn = this.shadowRoot.querySelector("#mode-colortemp");
    const modeRgbBtn = this.shadowRoot.querySelector("#mode-rgb");

    // Show/hide mode buttons based on capabilities and config
    if (this.supportsColorTemp && this.config.show_color_temp_button) {
      modeColorTempBtn.classList.remove("hidden");
    } else {
      modeColorTempBtn.classList.add("hidden");
    }
    if (this.supportsRgb && this.config.show_rgb_button) {
      modeRgbBtn.classList.remove("hidden");
    } else {
      modeRgbBtn.classList.add("hidden");
    }

    // Hide brightness button if it's the only one (no point showing just one button)
    const hasMultipleModes = (this.supportsColorTemp && this.config.show_color_temp_button) ||
                              (this.supportsRgb && this.config.show_rgb_button);
    if (!hasMultipleModes) {
      modeBrightnessBtn.classList.add("hidden");
    } else {
      modeBrightnessBtn.classList.remove("hidden");
    }

    // Apply value-bar class based on config
    const rightInfoEl = this.shadowRoot.querySelector(".right-info");
    if (this.config.show_value_bar) {
      rightInfoEl.classList.add("value-bar");
    } else {
      rightInfoEl.classList.remove("value-bar");
    }

    // Handle secondary entity icon
    const secondaryIconEl = this.shadowRoot.querySelector("#secondary-icon");
    if (secondaryIconEl) {
      if (this.config.secondary_entity && this.config.show_secondary_icon) {
        const secondaryStateObj = hass.states[this.config.secondary_entity];
        const secondaryDomain = this.config.secondary_entity.split(".")[0];

        // Show the icon
        secondaryIconEl.classList.remove("hidden");

        // Set appropriate icon based on secondary entity type
        const secondaryIcon = secondaryDomain === "fan" ? "mdi:fan" : "mdi:lightbulb";
        secondaryIconEl.setAttribute("icon", secondaryIcon);
        secondaryIconEl.setAttribute("title", secondaryStateObj?.attributes?.friendly_name || this.config.secondary_entity);

        // Update on/off state
        if (secondaryStateObj && secondaryStateObj.state === "on") {
          secondaryIconEl.classList.add("on");
        } else {
          secondaryIconEl.classList.remove("on");
        }

        // Register click handler - only once
        if (!this._secondaryIconListenerInitialized) {
          secondaryIconEl.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const secEntityId = this.config.secondary_entity;
            const secStateObj = this._hass.states[secEntityId];
            if (!secStateObj) return;

            const secDomain = secEntityId.split(".")[0];

            // Toggle secondary entity
            if (secStateObj.state === "on") {
              this._hass.callService(secDomain, "turn_off", { entity_id: secEntityId });
            } else {
              this._hass.callService(secDomain, "turn_on", { entity_id: secEntityId });
            }
          });
          this._secondaryIconListenerInitialized = true;
        }
      } else {
        // Hide secondary icon if not configured
        secondaryIconEl.classList.add("hidden");
      }
    }

    // Register mode button click handlers - only once
    if (!this._modeButtonsInitialized) {
      const setActiveMode = (mode) => {
        this._currentMode = mode;
        modeBrightnessBtn.classList.toggle("active", mode === "brightness");
        modeColorTempBtn.classList.toggle("active", mode === "color_temp");
        modeRgbBtn.classList.toggle("active", mode === "rgb");

        // Update bar and marker based on mode
        const barEl = this.shadowRoot.querySelector(".brightness-bar");
        const markerEl = this.shadowRoot.querySelector(".color-marker");
        const brightnessEl = this.shadowRoot.querySelector(".brightness");

        if (mode === "color_temp") {
          // Show full gradient background, hide bar fill, show marker
          brightnessEl.style.background = "linear-gradient(to right, #ff8c00, #ffd700, #fffaf0, #e0ffff, #87ceeb)";
          barEl.style.display = "none";
          markerEl.classList.add("visible");
        } else if (mode === "rgb") {
          // Show full rainbow gradient, hide bar fill, show marker
          brightnessEl.style.background = "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)";
          barEl.style.display = "none";
          markerEl.classList.add("visible");
        } else {
          // Brightness mode: restore normal bar behavior
          brightnessEl.style.background = "";
          barEl.style.display = "";
          barEl.style.background = "var(--light-primary-colour)";
          markerEl.classList.remove("visible");
        }

        // Update display for current mode
        this._updateModeDisplay();
      };

      modeBrightnessBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        setActiveMode("brightness");
      });
      modeColorTempBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        setActiveMode("color_temp");
      });
      modeRgbBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        setActiveMode("rgb");
      });

      this._modeButtonsInitialized = true;
    }

    // Update mode display when state changes
    this._updateModeDisplay = () => {
      const { brightnessPercent, colorTempPercent, colorTemp, hue, primaryColour } = this._getCardState();
      const percentageEl = this.shadowRoot.querySelector(".percentage");
      const markerEl = this.shadowRoot.querySelector(".color-marker");
      const rightInfoEl = this.shadowRoot.querySelector(".right-info");
      const stateObj = this._hass.states[this.config.entity];

      if (!stateObj || stateObj.state !== "on") return;

      let displayValue;
      let rightInfoBg = primaryColour;
      const usableWidth = this.getUsableWidth();

      switch (this._currentMode) {
        case "color_temp":
          if (colorTemp !== null) {
            // Convert mireds to Kelvin
            const kelvin = Math.round(1000000 / colorTemp);
            displayValue = `${kelvin}K`;
            // Position marker based on color temp percentage
            const tempPercent = colorTempPercent / 100;
            const markerPosTemp = window.left_offset + tempPercent * usableWidth;
            if (!this.isDragging) markerEl.style.left = `${markerPosTemp}px`;
            // Set right-info background to color temp color
            rightInfoBg = this._colorTempToRgb(colorTemp);
          } else {
            displayValue = "—";
          }
          break;
        case "rgb":
          if (hue !== null) {
            displayValue = `${hue}°`;
            // Position marker based on hue
            const huePercent = hue / 360;
            const markerPosRgb = window.left_offset + huePercent * usableWidth;
            if (!this.isDragging) markerEl.style.left = `${markerPosRgb}px`;
            // Set right-info background to hue color
            const [r, g, b] = this._hueToRgb(hue);
            rightInfoBg = `rgb(${r}, ${g}, ${b})`;
          } else {
            displayValue = "—";
          }
          break;
        default: // brightness
          displayValue = `${brightnessPercent}%`;
          // Use light's primary colour for brightness mode
          rightInfoBg = primaryColour;
      }

      // Update right-info background (only when show_value_bar is enabled)
      if (rightInfoEl && !this.isDragging && this.config.show_value_bar) {
        rightInfoEl.style.background = rightInfoBg;
      }

      if (!this.isDragging && percentageEl) {
        percentageEl.textContent = displayValue;
      }
    };

    // Call _updateModeDisplay on every state update to show correct value
    this._updateModeDisplay();

    // convert mouse/touch X to value based on current mode
    // Returns 0-100 for brightness/color_temp, 0-360 for hue
    const getValueFromX = (clientX) => {
      const rect = brightnessEl.getBoundingClientRect();
      let x = clientX - (rect.left + window.left_offset);
      const usableWidth = this.getUsableWidth();
      x = Math.max(0, Math.min(x, usableWidth));
      const percent = x / usableWidth;

      switch (this._currentMode) {
        case "color_temp":
          return Math.round(percent * 100); // 0-100%
        case "rgb":
          return Math.round(percent * 360); // 0-360 hue
        default: // brightness
          return Math.round(1 + percent * 99); // 1-100%
      }
    };

    // Legacy alias for brightness mode
    const getBrightnessFromX = getValueFromX;

    // update the bar/marker and display text (without applying to light)
    const updateBarPreview = (value) => {
      if (this.pendingUpdate) {
        cancelAnimationFrame(this.pendingUpdate);
      }

      this.pendingUpdate = requestAnimationFrame(() => {
        const usableWidth = this.getUsableWidth();
        const markerEl = this.shadowRoot.querySelector(".color-marker");
        const rightInfoEl = this.shadowRoot.querySelector(".right-info");
        let percent, displayText, rightInfoBg;

        switch (this._currentMode) {
          case "color_temp":
            percent = value / 100;
            // Convert percentage to mireds for color calculation
            const mireds = this.minMireds + ((100 - value) / 100) * (this.maxMireds - this.minMireds);
            const kelvin = Math.round(1000000 / mireds);
            displayText = `${kelvin}K`;
            rightInfoBg = this._colorTempToRgb(mireds);
            // Position the marker
            const markerPosTemp = window.left_offset + percent * usableWidth;
            markerEl.style.left = `${markerPosTemp}px`;
            break;
          case "rgb":
            percent = value / 360;
            displayText = `${Math.round(value)}°`;
            // Convert hue to RGB for background
            const [r, g, b] = this._hueToRgb(value);
            rightInfoBg = `rgb(${r}, ${g}, ${b})`;
            // Position the marker
            const markerPosRgb = window.left_offset + percent * usableWidth;
            markerEl.style.left = `${markerPosRgb}px`;
            break;
          default: // brightness
            percent = (value - 1) / 99;
            displayText = `${Math.round(value)}%`;
            // Use bar width for brightness
            const effectiveWidth = percent * usableWidth;
            const totalWidth = Math.min(effectiveWidth + window.left_offset, usableWidth + window.left_offset - 1);
            barEl.style.width = `${totalWidth}px`;
            // Keep current light color for brightness mode
            rightInfoBg = null; // Don't change during brightness drag
        }

        // Update right-info background during drag (only when show_value_bar is enabled)
        if (rightInfoEl && rightInfoBg && this.config.show_value_bar) {
          rightInfoEl.style.background = rightInfoBg;
        }

        if (percentageEl) percentageEl.textContent = displayText;
        this.pendingUpdate = null;
      });
    };

    // apply value to the light based on current mode
    let updateTimeout;
    const applyValue = (hass, entityId, value) => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        const v = parseFloat(value);
        if (isNaN(v)) return;

        switch (this._currentMode) {
          case "color_temp":
            // Convert percentage to mireds (inverted: 100% = warm/high mireds)
            const mireds = Math.round(this.minMireds + ((100 - v) / 100) * (this.maxMireds - this.minMireds));
            hass.callService("light", "turn_on", {
              entity_id: entityId,
              color_temp: mireds
            });
            break;
          case "rgb":
            // Convert hue to hs_color
            hass.callService("light", "turn_on", {
              entity_id: entityId,
              hs_color: [v, 100] // hue, saturation at 100%
            });
            break;
          default: // brightness/speed
            if (this.isFan) {
              // Fan uses percentage via fan.set_percentage
              hass.callService("fan", "set_percentage", {
                entity_id: entityId,
                percentage: Math.max(0, Math.min(100, Math.round(v)))
              });
            } else {
              // Light uses brightness
              const brightness255 = Math.round((v / 100) * 255);
              hass.callService("light", "turn_on", {
                entity_id: entityId,
                brightness: Math.max(0, Math.min(255, brightness255))
              });
            }
        }
      }, 125);
    };

    // Legacy alias
    const applyBrightness = applyValue;

    // Track current value for dragging
    let currentValue = brightnessPercent;

    // shared drag start logic
    const onDragStart = (clientX) => {
      // For on/off only devices (no brightness, speed, color temp, or RGB), toggle on click
      if (!this.supportsBrightness && !this.supportsSpeed && !this.supportsColorTemp && !this.supportsRgb) {
        hass.callService(this.isFan ? "fan" : "light", "toggle", {
          entity_id: this.config.entity
        });
        return;
      }

      // For brightness mode, check if brightness or speed is supported
      if (this._currentMode === "brightness" && !this.supportsBrightness && !this.supportsSpeed) {
        return;
      }
      // For color_temp mode, check if color temp is supported
      if (this._currentMode === "color_temp" && !this.supportsColorTemp) {
        return;
      }
      // For rgb mode, check if RGB is supported
      if (this._currentMode === "rgb" && !this.supportsRgb) {
        return;
      }

      this.isDragging = true;

      // start dragging
      this.startX = clientX;

      // In "relative" mode, start from current value; in "absolute" mode, jump to touch position
      if (this.config.slider_mode === "relative") {
        // Use current brightness/value as starting point
        this.startWidth = currentValue;
        // Don't update bar preview on touch - only on move
      } else {
        // Absolute mode: jump to touch position
        this.startWidth = getValueFromX(clientX);
        const value = this.startWidth;
        updateBarPreview(value);
        currentValue = value;
      }

      // Turn on device if it's off (only if slider_turns_on is enabled)
      if (state !== "on" && this.config.slider_turns_on) {
        const value = this.config.slider_mode === "relative" ? currentValue : this.startWidth;
        if (this._currentMode === "brightness") {
          if (this.isFan) {
            // Fan uses percentage
            hass.callService("fan", "turn_on", {
              entity_id: this.config.entity,
              percentage: Math.max(1, value)
            });
          } else {
            // Light uses brightness
            const brightness255 = Math.round((value / 100) * 255);
            hass.callService("light", "turn_on", {
              entity_id: this.config.entity,
              brightness: Math.max(1, brightness255)
            });
          }
        } else if (this._currentMode === "color_temp") {
          const mireds = Math.round(this.minMireds + ((100 - value) / 100) * (this.maxMireds - this.minMireds));
          hass.callService("light", "turn_on", {
            entity_id: this.config.entity,
            color_temp: mireds
          });
        } else if (this._currentMode === "rgb") {
          hass.callService("light", "turn_on", {
            entity_id: this.config.entity,
            hs_color: [value, 100]
          });
        }
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
      const usableWidth = this.getUsableWidth();
      const deltaPercent = (dx / usableWidth);

      let newValue;
      switch (this._currentMode) {
        case "color_temp":
          newValue = Math.round(Math.max(0, Math.min(100, this.startWidth + deltaPercent * 100)));
          break;
        case "rgb":
          // Wrap hue around 0-360
          newValue = Math.round((this.startWidth + deltaPercent * 360 + 360) % 360);
          break;
        default: // brightness
          newValue = Math.round(Math.max(1, Math.min(100, this.startWidth + deltaPercent * 100)));
      }

      updateBarPreview(newValue);
      currentValue = newValue;
    };

    // shared drag end logic
    const onDragEnd = () => {
      this.isDragging = false;
      document.body.style.userSelect = "";
      clearTimeout(updateTimeout);
      applyValue(hass, entity, currentValue);

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
    // update displayed percentage - only set if off/unavailable, otherwise _updateModeDisplay handles it
    if (!this.isDragging && percentageEl) {
      if (percentageText === "Off" || percentageText === "On" || percentageText === "Unavailable") {
        percentageEl.textContent = percentageText;
      }
      // When on, the value is set by _updateModeDisplay() based on current mode
    }
    // update icon
    if (haIconEl && icon) {
      haIconEl.setAttribute("icon", icon);
    }
    // update bar width (only in brightness mode)
    // - the provided barWidth is a % from 0-100%, where 1% starts immediately right of the icon
    if (!this.isDragging && barEl && this._currentMode === "brightness") {
      if (barWidth !== 0) {
        const usableWidth = this.getUsableWidth();
        // Map 1-100% to 0-usableWidth for the bar portion beyond the icon
        const clampedWidth = Math.max(1, barWidth);
        const effectiveWidth = ((clampedWidth - 1) / 99) * usableWidth;
        const totalWidth = Math.min(effectiveWidth + window.left_offset, usableWidth + window.left_offset - 1);
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

    // determine icon background colour (custom or automatic)
    const customIconBg = this.config.icon_background_colour;

    if (this.config.smart_font_colour) {
      if (percentageText === "Off" || percentageText === "Unavailable") {
        const offBgColour = getComputedStyle(this).getPropertyValue('--off-background-colour').trim();
        const iconBgColour = customIconBg || offBgColour;
        const optimalTextColour = getTextColour(iconBgColour);
        iconEl.style.background = customIconBg || "var(--off-background-colour)";
        iconEl.style.color = optimalTextColour;
        haicon.style.color = optimalTextColour;
        if (this._currentMode === "brightness") {
          brightnessEl.style.background = "var(--off-background-colour)";
        }

        nameEl.style.color = getTextColour(offBgColour);
        percentageEl.style.color = getTextColour(offBgColour);
        root.querySelector(".arrow").style.color = getTextColour(offBgColour);
      } else {
        const lightPrimaryColour = primaryColour;
        const optimalPrimaryTextColour = getTextColour(lightPrimaryColour);
        const iconBgForText = customIconBg || lightPrimaryColour;
        iconEl.style.background = customIconBg || "var(--light-secondary-colour)";
        iconEl.style.color = customIconBg ? getTextColour(customIconBg) : "var(--light-primary-colour)";
        haicon.style.color = customIconBg ? getTextColour(customIconBg) : "var(--light-primary-colour)";
        if (this._currentMode === "brightness") {
          brightnessEl.style.background = "var(--light-secondary-colour)";
        }

        nameEl.style.color = optimalPrimaryTextColour;
        percentageEl.style.color = optimalPrimaryTextColour;
        root.querySelector(".arrow").style.color = optimalPrimaryTextColour;
      }
    }
    else {
      if (percentageText === "Off" || percentageText === "Unavailable") {
        iconEl.style.background = customIconBg || "var(--off-background-colour)";
        iconEl.style.color = "var(--off-text-colour)";
        haicon.style.color = "var(--off-text-colour)";
        if (this._currentMode === "brightness") {
          brightnessEl.style.background = "var(--off-background-colour)";
        }

        nameEl.style.color = "var(--off-text-colour)";
        percentageEl.style.color = "var(--off-text-colour)";
        root.querySelector(".arrow").style.color = "var(--off-text-colour)";
      } else {
        iconEl.style.background = customIconBg || "var(--light-secondary-colour)";
        iconEl.style.color = "var(--light-primary-colour)";
        haicon.style.color = "var(--light-primary-colour)";
        if (this._currentMode === "brightness") {
          brightnessEl.style.background = "var(--light-secondary-colour)";
        }

        nameEl.style.color = "var(--primary-text-color)";
        percentageEl.style.color = "var(--primary-text-color)";
        root.querySelector(".arrow").style.color = "var(--primary-text-color)";
      }
    }

    // Update right-info background based on state (only when show_value_bar is enabled)
    const rightInfoEl = root.querySelector(".right-info");
    if (rightInfoEl && this.config.show_value_bar) {
      if (percentageText === "Off" || percentageText === "Unavailable") {
        rightInfoEl.style.background = "var(--off-background-colour)";
      } else {
        // When on, use primary color (mode display will override if needed)
        rightInfoEl.style.background = primaryColour || "var(--light-primary-colour)";
      }
    }

    // apply opacity based on state (on/off) with separate icon and card control
    const isOff = percentageText === "Off" || percentageText === "Unavailable";

    // determine card opacity
    let cardOpacity = this.config.opacity;
    if (isOff && this.config.opacity_off !== null) {
      cardOpacity = this.config.opacity_off;
    } else if (!isOff && this.config.opacity_on !== null) {
      cardOpacity = this.config.opacity_on;
    }

    // determine icon opacity
    let iconOpacity = this.config.icon_opacity !== null ? this.config.icon_opacity : Math.max(Math.min(this.config.opacity * 1.5, 1), 0.3);
    if (isOff && this.config.icon_opacity_off !== null) {
      iconOpacity = this.config.icon_opacity_off;
    } else if (!isOff && this.config.icon_opacity_on !== null) {
      iconOpacity = this.config.icon_opacity_on;
    }

    root.querySelector(".content").style.opacity = cardOpacity;
    root.querySelector(".icon").style.opacity = iconOpacity;
    // Right-info follows same opacity as content when show_value_bar is enabled
    if (this.config.show_value_bar) {
      const rightInfo = root.querySelector(".right-info");
      if (rightInfo) rightInfo.style.opacity = cardOpacity;
    }

    const shadowOpacity = 0.2 + (1 - cardOpacity) * 0.4;
    if (root.querySelector(".icon.no-border")) {
      root.querySelector(".icon.no-border").style.boxShadow = `rgba(0, 0, 0, ${shadowOpacity}) 0px 5px 15px`;
    }
    root.querySelector(".card").style.backdropFilter = `blur(${this.config.blur}px)`;
  }

  static getConfigElement() {
    return document.createElement("compact-light-card-editor");
  }
}

// Visual Editor for the card
class CompactLightCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  set hass(hass) {
    this._hass = hass;
    // Update all entity pickers
    const entityPickers = this.shadowRoot?.querySelectorAll("ha-entity-picker");
    if (entityPickers) entityPickers.forEach(picker => picker.hass = hass);
    const iconPicker = this.shadowRoot?.querySelector("ha-icon-picker");
    if (iconPicker) iconPicker.hass = hass;
  }

  setConfig(config) {
    this._config = { ...config };
    this.render();
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
  }

  _rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
      const hex = parseInt(x).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  }

  render() {
    if (!this.shadowRoot) return;

    // Helper to get colour value for color input (needs to be hex)
    // Returns grey (#808080) when not set
    const getColorValue = (value) => {
      if (!value) return "#808080";
      if (value.startsWith("#")) return value;
      if (value.startsWith("rgb")) {
        const match = value.match(/(\d+),\s*(\d+),\s*(\d+)/);
        if (match) return this._rgbToHex(match[1], match[2], match[3]);
      }
      return "#808080";
    };

    // Helper to check if colour is set
    const isColorSet = (value) => !!value;

    this.shadowRoot.innerHTML = `
      <style>
        .editor {
          padding: 16px;
        }
        .section {
          margin-bottom: 24px;
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
          padding-bottom: 16px;
        }
        .section:last-child {
          border-bottom: none;
        }
        .section-title {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 12px;
          color: var(--primary-text-color);
        }
        .row {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          gap: 12px;
        }
        .row label {
          min-width: 140px;
          font-size: 14px;
          color: var(--primary-text-color);
        }
        .row .input-container {
          flex: 1;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .row input[type="text"],
        .row input[type="number"] {
          flex: 1;
          padding: 8px;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 4px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          font-size: 14px;
        }
        .color-picker-wrapper {
          position: relative;
          width: 40px;
          height: 36px;
          flex-shrink: 0;
        }
        .color-picker-wrapper.not-set::after {
          content: "✕";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #d32f2f;
          font-size: 18px;
          font-weight: bold;
          pointer-events: none;
          text-shadow: 0 0 2px white;
        }
        .row input[type="color"] {
          width: 40px;
          height: 36px;
          padding: 2px;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 4px;
          cursor: pointer;
        }
        .row input[type="checkbox"] {
          width: 20px;
          height: 20px;
        }
        .row select {
          flex: 1;
          padding: 8px;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 4px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          font-size: 14px;
        }
        ha-entity-picker, ha-icon-picker {
          flex: 1;
        }
        .opacity-control {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .opacity-control input[type="range"] {
          flex: 1;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          background: linear-gradient(to right, transparent, var(--primary-color, #03a9f4));
          border-radius: 3px;
          cursor: pointer;
        }
        .opacity-control input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: var(--primary-color, #03a9f4);
          border-radius: 50%;
          cursor: pointer;
        }
        .opacity-control input[type="number"] {
          width: 55px;
          flex: none;
          padding: 6px;
          text-align: center;
          font-size: 13px;
        }
        .opacity-preview {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          background: linear-gradient(135deg, var(--primary-color, #03a9f4) 50%, var(--secondary-background-color, #e0e0e0) 50%);
          border: 1px solid var(--divider-color, #ccc);
          flex-shrink: 0;
        }
        .subsection {
          margin-left: 16px;
          padding-left: 16px;
          border-left: 2px solid var(--divider-color, #e0e0e0);
          margin-top: 8px;
        }
        .subsection-title {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-bottom: 8px;
        }
      </style>
      <div class="editor">
        <div class="section">
          <div class="section-title">Basic Settings</div>
          <div class="row">
            <label>Entity *</label>
            <ha-entity-picker
              id="entity"
              .hass=${this._hass}
              .value=${this._config.entity || ""}
              .includeDomains=${["light", "fan"]}
              allow-custom-entity
            ></ha-entity-picker>
          </div>
          <div class="row">
            <label>Name</label>
            <input type="text" id="name" value="${this._config.name || ""}" placeholder="Optional display name">
          </div>
          <div class="row">
            <label>Icon</label>
            <ha-icon-picker
              id="icon"
              .hass=${this._hass}
              .value=${this._config.icon || "mdi:lightbulb"}
            ></ha-icon-picker>
          </div>
          <div class="row">
            <label>Secondary Entity</label>
            <ha-entity-picker
              id="secondary_entity"
              .hass=${this._hass}
              .value=${this._config.secondary_entity || ""}
              .includeDomains=${["light", "fan"]}
              allow-custom-entity
            ></ha-entity-picker>
          </div>
          <div class="row">
            <label>Show Secondary Icon</label>
            <input type="checkbox" id="show_secondary_icon" ${this._config.show_secondary_icon !== false ? "checked" : ""}>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Appearance</div>
          <div class="row">
            <label>Height (px)</label>
            <input type="number" id="height" value="${this._config.height || 64}" min="30" max="150">
          </div>
          <div class="row">
            <label>Font Size (px)</label>
            <input type="number" id="font_size" value="${this._config.font_size || 18}" min="8" max="36">
          </div>
          <div class="row">
            <label>Primary Colour</label>
            <div class="input-container">
              <div class="color-picker-wrapper ${isColorSet(this._config.primary_colour) ? '' : 'not-set'}">
                <input type="color" id="primary_colour_picker" value="${getColorValue(this._config.primary_colour)}">
              </div>
              <input type="text" id="primary_colour" value="${this._config.primary_colour || ""}" placeholder="Auto">
            </div>
          </div>
          <div class="row">
            <label>Secondary Colour</label>
            <div class="input-container">
              <div class="color-picker-wrapper ${isColorSet(this._config.secondary_colour) ? '' : 'not-set'}">
                <input type="color" id="secondary_colour_picker" value="${getColorValue(this._config.secondary_colour)}">
              </div>
              <input type="text" id="secondary_colour" value="${this._config.secondary_colour || ""}" placeholder="Auto">
            </div>
          </div>
          <div class="row">
            <label>Glow Effect</label>
            <input type="checkbox" id="glow" ${this._config.glow !== false ? "checked" : ""}>
          </div>
          <div class="row">
            <label>Smart Font Colour</label>
            <input type="checkbox" id="smart_font_colour" ${this._config.smart_font_colour !== false ? "checked" : ""}>
          </div>
          <div class="row">
            <label>Show Value Bar</label>
            <input type="checkbox" id="show_value_bar" ${this._config.show_value_bar ? "checked" : ""}>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Off State Colours</div>
          <div class="row">
            <label>Background Colour</label>
            <div class="input-container">
              <div class="color-picker-wrapper ${isColorSet(this._config.off_colours?.background) ? '' : 'not-set'}">
                <input type="color" id="off_background_picker" value="${getColorValue(this._config.off_colours?.background)}">
              </div>
              <input type="text" id="off_background" value="${this._config.off_colours?.background || ""}" placeholder="Auto">
            </div>
          </div>
          <div class="row">
            <label>Text Colour</label>
            <div class="input-container">
              <div class="color-picker-wrapper ${isColorSet(this._config.off_colours?.text) ? '' : 'not-set'}">
                <input type="color" id="off_text_picker" value="${getColorValue(this._config.off_colours?.text)}">
              </div>
              <input type="text" id="off_text" value="${this._config.off_colours?.text || ""}" placeholder="Auto">
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Icon & Card Borders</div>
          <div class="row">
            <label>Icon Background Colour</label>
            <div class="input-container">
              <div class="color-picker-wrapper ${isColorSet(this._config.icon_background_colour) ? '' : 'not-set'}">
                <input type="color" id="icon_background_colour_picker" value="${getColorValue(this._config.icon_background_colour)}">
              </div>
              <input type="text" id="icon_background_colour" value="${this._config.icon_background_colour || ""}" placeholder="Auto">
            </div>
          </div>
          <div class="row">
            <label>Icon Border</label>
            <input type="checkbox" id="icon_border" ${this._config.icon_border ? "checked" : ""}>
          </div>
          <div class="row">
            <label>Icon Border Colour</label>
            <div class="input-container">
              <div class="color-picker-wrapper ${isColorSet(this._config.icon_border_colour) ? '' : 'not-set'}">
                <input type="color" id="icon_border_colour_picker" value="${getColorValue(this._config.icon_border_colour)}">
              </div>
              <input type="text" id="icon_border_colour" value="${this._config.icon_border_colour || ""}" placeholder="Auto">
            </div>
          </div>
          <div class="row">
            <label>Card Border</label>
            <input type="checkbox" id="card_border" ${this._config.card_border ? "checked" : ""}>
          </div>
          <div class="row">
            <label>Card Border Colour</label>
            <div class="input-container">
              <div class="color-picker-wrapper ${isColorSet(this._config.card_border_colour) ? '' : 'not-set'}">
                <input type="color" id="card_border_colour_picker" value="${getColorValue(this._config.card_border_colour)}">
              </div>
              <input type="text" id="card_border_colour" value="${this._config.card_border_colour || ""}" placeholder="Auto">
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Opacity & Blur</div>
          <div class="row opacity-row">
            <label>Default Opacity</label>
            <div class="opacity-control">
              <input type="range" id="opacity_slider" value="${this._config.opacity !== undefined ? this._config.opacity : 1}" min="0" max="1" step="0.05">
              <input type="number" id="opacity" value="${this._config.opacity !== undefined ? this._config.opacity : 1}" min="0" max="1" step="0.05">
              <div class="opacity-preview" id="opacity_preview" style="opacity: ${this._config.opacity !== undefined ? this._config.opacity : 1}"></div>
            </div>
          </div>
          <div class="row opacity-row">
            <label>Opacity When On</label>
            <div class="opacity-control">
              <input type="range" id="opacity_on_slider" value="${this._config.opacity_on || 1}" min="0" max="1" step="0.05">
              <input type="number" id="opacity_on" value="${this._config.opacity_on || ""}" min="0" max="1" step="0.05" placeholder="—">
              <div class="opacity-preview" id="opacity_on_preview" style="opacity: ${this._config.opacity_on || 1}"></div>
            </div>
          </div>
          <div class="row opacity-row">
            <label>Opacity When Off</label>
            <div class="opacity-control">
              <input type="range" id="opacity_off_slider" value="${this._config.opacity_off || 1}" min="0" max="1" step="0.05">
              <input type="number" id="opacity_off" value="${this._config.opacity_off || ""}" min="0" max="1" step="0.05" placeholder="—">
              <div class="opacity-preview" id="opacity_off_preview" style="opacity: ${this._config.opacity_off || 1}"></div>
            </div>
          </div>
          <div class="row opacity-row">
            <label>Icon Opacity</label>
            <div class="opacity-control">
              <input type="range" id="icon_opacity_slider" value="${this._config.icon_opacity || 1}" min="0" max="1" step="0.05">
              <input type="number" id="icon_opacity" value="${this._config.icon_opacity || ""}" min="0" max="1" step="0.05" placeholder="—">
              <div class="opacity-preview" id="icon_opacity_preview" style="opacity: ${this._config.icon_opacity || 1}"></div>
            </div>
          </div>
          <div class="row opacity-row">
            <label>Icon Opacity When On</label>
            <div class="opacity-control">
              <input type="range" id="icon_opacity_on_slider" value="${this._config.icon_opacity_on || 1}" min="0" max="1" step="0.05">
              <input type="number" id="icon_opacity_on" value="${this._config.icon_opacity_on || ""}" min="0" max="1" step="0.05" placeholder="—">
              <div class="opacity-preview" id="icon_opacity_on_preview" style="opacity: ${this._config.icon_opacity_on || 1}"></div>
            </div>
          </div>
          <div class="row opacity-row">
            <label>Icon Opacity When Off</label>
            <div class="opacity-control">
              <input type="range" id="icon_opacity_off_slider" value="${this._config.icon_opacity_off || 1}" min="0" max="1" step="0.05">
              <input type="number" id="icon_opacity_off" value="${this._config.icon_opacity_off || ""}" min="0" max="1" step="0.05" placeholder="—">
              <div class="opacity-preview" id="icon_opacity_off_preview" style="opacity: ${this._config.icon_opacity_off || 1}"></div>
            </div>
          </div>
          <div class="row">
            <label>Blur</label>
            <input type="number" id="blur" value="${this._config.blur || 0}" min="0" max="10" step="1">
          </div>
        </div>

        <div class="section">
          <div class="section-title">Icon Tap Behaviour</div>
          <div class="row">
            <label>Tap icon for specific brightness</label>
            <input type="checkbox" id="icon_tap_to_brightness" ${this._config.icon_tap_to_brightness ? "checked" : ""}>
          </div>
          <div class="row">
            <label>Turn On Brightness (%)</label>
            <input type="number" id="turn_on_brightness" value="${this._config.turn_on_brightness || 100}" min="1" max="100">
          </div>
        </div>

        <div class="section">
          <div class="section-title">Slider Behaviour</div>
          <div class="row">
            <label>Slider Mode</label>
            <select id="slider_mode">
              <option value="absolute" ${(!this._config.slider_mode || this._config.slider_mode === "absolute") ? "selected" : ""}>Absolute (jump to touch)</option>
              <option value="relative" ${this._config.slider_mode === "relative" ? "selected" : ""}>Relative (slide from current)</option>
            </select>
          </div>
          <div class="row">
            <label>Slider turns on light</label>
            <input type="checkbox" id="slider_turns_on" ${this._config.slider_turns_on !== false ? "checked" : ""}>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Color Mode Controls</div>
          <div class="row">
            <label>Show Color Temp Button</label>
            <input type="checkbox" id="show_color_temp_button" ${this._config.show_color_temp_button !== false ? "checked" : ""}>
          </div>
          <div class="row">
            <label>Show RGB/Color Button</label>
            <input type="checkbox" id="show_rgb_button" ${this._config.show_rgb_button !== false ? "checked" : ""}>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Chevron Actions</div>
          <div class="row">
            <label>Tap Action</label>
            <select id="chevron_action">
              <option value="more-info" ${(!this._config.chevron_action || this._config.chevron_action?.action === "more-info") ? "selected" : ""}>More Info</option>
              <option value="toggle" ${this._config.chevron_action?.action === "toggle" ? "selected" : ""}>Toggle</option>
              <option value="none" ${this._config.chevron_action?.action === "none" ? "selected" : ""}>None</option>
            </select>
          </div>
          <div class="row">
            <label>Hold Action</label>
            <select id="chevron_hold_action">
              <option value="" ${!this._config.chevron_hold_action ? "selected" : ""}>None</option>
              <option value="more-info" ${this._config.chevron_hold_action?.action === "more-info" ? "selected" : ""}>More Info</option>
              <option value="toggle" ${this._config.chevron_hold_action?.action === "toggle" ? "selected" : ""}>Toggle</option>
            </select>
          </div>
          <div class="row">
            <label>Double Tap Action</label>
            <select id="chevron_double_tap_action">
              <option value="" ${!this._config.chevron_double_tap_action ? "selected" : ""}>None</option>
              <option value="more-info" ${this._config.chevron_double_tap_action?.action === "more-info" ? "selected" : ""}>More Info</option>
              <option value="toggle" ${this._config.chevron_double_tap_action?.action === "toggle" ? "selected" : ""}>Toggle</option>
            </select>
          </div>
        </div>
      </div>
    `;

    // Setup HA pickers after render (delay to allow custom elements to upgrade)
    requestAnimationFrame(() => {
      this._setupHaPickers();
    });

    // Add event listeners
    this._setupEventListeners();
  }

  _setupHaPickers() {
    // Setup all entity pickers
    const entityPickers = this.shadowRoot.querySelectorAll("ha-entity-picker");
    entityPickers.forEach(picker => {
      picker.hass = this._hass;
      picker.includeDomains = ["light", "fan"];
      picker.allowCustomEntity = true;

      if (picker.id === "entity") {
        picker.value = this._config.entity || "";
        picker.addEventListener("value-changed", (e) => {
          this._config.entity = e.detail.value;
          this._fireConfigChanged();
        });
      } else if (picker.id === "secondary_entity") {
        picker.value = this._config.secondary_entity || "";
        picker.addEventListener("value-changed", (e) => {
          if (e.detail.value) {
            this._config.secondary_entity = e.detail.value;
          } else {
            delete this._config.secondary_entity;
          }
          this._fireConfigChanged();
        });
      }
    });

    // Icon picker - set value property directly after render
    const iconPicker = this.shadowRoot.querySelector("ha-icon-picker");
    if (iconPicker) {
      iconPicker.hass = this._hass;
      iconPicker.value = this._config.icon || "mdi:lightbulb";
      iconPicker.addEventListener("value-changed", (e) => {
        if (e.detail.value) {
          this._config.icon = e.detail.value;
        } else {
          delete this._config.icon;
        }
        this._fireConfigChanged();
      });
    }
  }

  _setupEventListeners() {
    // Color picker and text input pairs
    const colorPairs = [
      ["primary_colour_picker", "primary_colour"],
      ["secondary_colour_picker", "secondary_colour"],
      ["off_background_picker", "off_background"],
      ["off_text_picker", "off_text"],
      ["icon_background_colour_picker", "icon_background_colour"],
      ["icon_border_colour_picker", "icon_border_colour"],
      ["card_border_colour_picker", "card_border_colour"],
    ];

    const colorTextIds = colorPairs.map(([_, textId]) => textId);

    colorPairs.forEach(([pickerId, textId]) => {
      const picker = this.shadowRoot.getElementById(pickerId);
      const text = this.shadowRoot.getElementById(textId);
      const wrapper = picker?.parentElement;

      if (picker && text) {
        // Color picker changes -> update text and save
        picker.addEventListener("input", (e) => {
          text.value = e.target.value;
          // Update wrapper to remove not-set indicator
          if (wrapper) wrapper.classList.remove("not-set");
        });
        picker.addEventListener("change", (e) => {
          text.value = e.target.value;
          if (wrapper) wrapper.classList.remove("not-set");
          this._handleColorChange(textId, e.target.value);
        });

        // Text input changes -> update picker visually on input, save on change
        text.addEventListener("input", (e) => {
          const val = e.target.value;
          // Update picker if it's a valid hex color
          if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            picker.value = val;
            if (wrapper) wrapper.classList.remove("not-set");
          } else if (val === "") {
            picker.value = "#808080";
            if (wrapper) wrapper.classList.add("not-set");
          }
          // Don't fire config change here - wait for blur/enter
        });
        text.addEventListener("change", (e) => {
          const val = e.target.value;
          if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            picker.value = val;
            if (wrapper) wrapper.classList.remove("not-set");
          } else if (val === "") {
            picker.value = "#808080";
            if (wrapper) wrapper.classList.add("not-set");
          }
          this._handleColorChange(textId, val || undefined);
        });
      }
    });

    // Opacity slider sync with number inputs and preview
    const opacityFields = ["opacity", "opacity_on", "opacity_off", "icon_opacity", "icon_opacity_on", "icon_opacity_off"];
    opacityFields.forEach((fieldId) => {
      const slider = this.shadowRoot.getElementById(`${fieldId}_slider`);
      const numberInput = this.shadowRoot.getElementById(fieldId);
      const preview = this.shadowRoot.getElementById(`${fieldId}_preview`);

      if (slider && numberInput) {
        // Slider changes -> update number input and preview
        slider.addEventListener("input", (e) => {
          const val = parseFloat(e.target.value);
          numberInput.value = val;
          if (preview) preview.style.opacity = val;
        });
        slider.addEventListener("change", (e) => {
          const val = parseFloat(e.target.value);
          numberInput.value = val;
          if (preview) preview.style.opacity = val;
          this._handleOpacityChange(fieldId, val);
        });

        // Number input changes -> update slider and preview visually, save on change only
        numberInput.addEventListener("input", (e) => {
          const val = e.target.value === "" ? null : parseFloat(e.target.value);
          if (val !== null && !isNaN(val)) {
            slider.value = val;
            if (preview) preview.style.opacity = val;
          }
          // Don't fire config change here - wait for blur/enter
        });
        numberInput.addEventListener("change", (e) => {
          const val = e.target.value === "" ? null : parseFloat(e.target.value);
          if (val !== null && !isNaN(val)) {
            slider.value = val;
            if (preview) preview.style.opacity = val;
          }
          this._handleOpacityChange(fieldId, val);
        });
      }
    });

    // Standard inputs - only fire on change (blur/enter), NOT on input
    this.shadowRoot.querySelectorAll("input:not([type='color']):not([type='range']), select").forEach((input) => {
      // Skip inputs handled above
      if (opacityFields.includes(input.id) || colorTextIds.includes(input.id)) return;

      // Only fire on change event (blur or enter), not on every keystroke
      input.addEventListener("change", (e) => this._valueChanged(e));
    });
  }

  _handleOpacityChange(fieldId, value) {
    if (value === null || value === undefined) {
      delete this._config[fieldId];
    } else {
      this._config[fieldId] = value;
    }
    this._fireConfigChanged();
  }

  _handleColorChange(id, value) {
    if (id === "off_background" || id === "off_text") {
      const field = id === "off_background" ? "background" : "text";
      if (!this._config.off_colours) {
        this._config.off_colours = {};
      }
      if (value) {
        this._config.off_colours[field] = value;
      } else {
        delete this._config.off_colours[field];
        if (Object.keys(this._config.off_colours).length === 0) {
          delete this._config.off_colours;
        }
      }
    } else {
      if (value) {
        this._config[id] = value;
      } else {
        delete this._config[id];
      }
    }
    this._fireConfigChanged();
  }

  _valueChanged(ev) {
    if (!this._config) return;

    const target = ev.target;
    const id = target.id;
    let value;

    if (target.type === "checkbox") {
      value = target.checked;
    } else if (target.type === "number") {
      value = target.value === "" ? undefined : parseFloat(target.value);
    } else if (target.tagName === "SELECT") {
      value = target.value || undefined;
    } else {
      value = target.value || undefined;
    }

    // Handle special cases
    // These are booleans with default true - only store in config when false
    if (id === "glow" || id === "smart_font_colour" || id === "slider_turns_on" || id === "show_secondary_icon") {
      if (value === true) {
        delete this._config[id];
      } else {
        this._config[id] = value;
      }
    } else if (id === "off_background" || id === "off_text") {
      this._handleColorChange(id, value);
      return;
    } else if (id === "chevron_action" || id === "chevron_hold_action" || id === "chevron_double_tap_action") {
      if (value && value !== "") {
        this._config[id] = { action: value };
      } else {
        delete this._config[id];
      }
    } else if (value === undefined || value === "") {
      delete this._config[id];
    } else {
      this._config[id] = value;
    }

    this._fireConfigChanged();
  }

  _fireConfigChanged() {
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

// register card and editor
customElements.define("compact-light-card-editor", CompactLightCardEditor);
customElements.define('compact-light-card', CompactLightCard);

// make it appear in visual card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "compact-light-card",
  name: "Compact Light Card",
  description: "A more compact light card.",
});