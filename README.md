# Compact Light Card
[![GitHub Release](https://img.shields.io/github/v/release/goggybox/compact-light-card?include_prereleases&style=flat-square)](https://github.com/goggybox/compact-light-card/releases)
[![HACS Compatible](https://img.shields.io/badge/HACS-Custom-orange.svg?style=flat-square)](https://github.com/hacs/integration)

A clean, compact, and highly customisable light card for Home Assistant.
<img width="560" height="125" alt="Image" src="https://github.com/user-attachments/assets/1b99d583-9654-448f-9bc4-ebb691ec0522" />

## Features
- Click and drag to increase/decrease the brightness of a dimmable bulb.
- The card takes the same colour as the light, or a default orange colour for bulbs that don't support colour changing. (As seen with the "Salt Lamp" in the image above)
- Click on the light's icon to toggle the light on/off.
- Click on the chevron to open the "More Info" page for the light.

## Customisation
<img width="317" height="63" alt="Image" src="https://github.com/user-attachments/assets/fe06868b-b988-4c91-8f66-38e2ffc2ae0e" />

The image above shows the default configuration for the card. By default, the card will have a subtle glow when the light is on, of the same colour as the bulb (or a default orange). The following customisations can be made:

- `glow: false` disables the glow around the card. The glow takes the colour of the bulb (or a default orange) when the light is on, with no glow appearing when the light is off.
- `icon_border: true` enables a border around the light icon, as can be seen in the "Salt Lamp" and "Mini Orb" cards in the above example.
- `card_border: true` enables a border around the card, as can be seen in the "Mini Orb" card in the above example.

Examples of the customisations:

<img width="560" height="331" alt="Image" src="https://github.com/user-attachments/assets/4fa39949-de05-4c0c-8a88-161507266e21" />

## License
MIT © [goggybox](https://github.com/goggybox)
