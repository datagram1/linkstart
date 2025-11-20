# Extension Icons

## Current Status
The icon.svg file contains the source icon (green circle with play button).

## TODO: Generate PNG Icons
To fully support all browsers and contexts, convert the SVG to PNG at these sizes:
- icon-16.png (16x16)
- icon-32.png (32x32)
- icon-48.png (48x48)
- icon-96.png (96x96)

## Quick Generation Methods

### Method 1: Using ImageMagick
```bash
convert -background none icon.svg -resize 16x16 icon-16.png
convert -background none icon.svg -resize 32x32 icon-32.png
convert -background none icon.svg -resize 48x48 icon-48.png
convert -background none icon.svg -resize 96x96 icon-96.png
```

### Method 2: Using Inkscape
```bash
inkscape icon.svg --export-filename=icon-16.png -w 16 -h 16
inkscape icon.svg --export-filename=icon-32.png -w 32 -h 32
inkscape icon.svg --export-filename=icon-48.png -w 48 -h 48
inkscape icon.svg --export-filename=icon-96.png -w 96 -h 96
```

### Method 3: Online Converters
- https://cloudconvert.com/svg-to-png
- https://svgtopng.com/

## Temporary Workaround
For testing purposes, Firefox may accept the SVG file directly in manifest.json by changing the icon paths to "icons/icon.svg", though this is not recommended for production.
