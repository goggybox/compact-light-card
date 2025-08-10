# Compact Light Card
[![GitHub Release](https://img.shields.io/github/v/release/goggybox/compact-light-card?include_prereleases&style=flat-square)](https://github.com/goggybox/compact-light-card/releases)
[![HACS Compatible](https://img.shields.io/badge/HACS-Custom-orange.svg?style=flat-square)](https://github.com/hacs/integration)

A clean, compact, and highly customisable light card for Home Assistant.
<img width="560" height="125" alt="Image" src="img/img1.png" />

## Features
- Click and drag to increase/decrease the brightness of a dimmable bulb.
- The card takes the same colour as the light, or a default orange colour for bulbs that don't support colour changing. (As seen with the "Salt Lamp" in the image above)
- Click on the light's icon to toggle the light on/off.
- Click on the chevron to open the "More Info" page for the light.

## Customisation
<img width="317" height="63" alt="Image" src="img/img2.png" />

The image above shows the default configuration for the card. By default, the card will have a subtle glow when the light is on, of the same colour as the bulb (or a default orange). The following customisations can be made:

- `glow: false` disables the glow around the card. The glow takes the colour of the bulb (or a default orange) when the light is on, with no glow appearing when the light is off.
- `icon_border: true` enables a border around the light icon, as can be seen in the "Salt Lamp" and "Mini Orb" cards in the above example.
- `card_border: true` enables a border around the card, as can be seen in the "Mini Orb" card in the above example.

Examples of the customisations:

<img width="560" height="331" alt="Image" src="img/img3.png" />

## Installation (using HACS)
- Open HACS in Home Assistant.
- Select the menu icon in the top-right corner.
- Select "Custom Repositories".
- In the popup, enter the following:
  - Repository: `https://github.com/goggybox/compact-light-card/`
  - Type: `Dashboard`
- Click "Add".
- Now search HACS for "Custom Light Card".
- Click "Download", and then click "Reload" when prompted.

The card should now be downloaded and ready to use on your dashboards.

## License
MIT © [goggybox](https://github.com/goggybox)
