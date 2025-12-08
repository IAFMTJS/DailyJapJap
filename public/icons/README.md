# PWA Icons

This directory should contain the following icon files for the Progressive Web App:

- `icon-72x72.png` - 72x72 pixels
- `icon-96x96.png` - 96x96 pixels
- `icon-128x128.png` - 128x128 pixels
- `icon-144x144.png` - 144x144 pixels
- `icon-152x152.png` - 152x152 pixels
- `icon-192x192.png` - 192x192 pixels (required)
- `icon-384x384.png` - 384x384 pixels
- `icon-512x512.png` - 512x512 pixels (required)

## Creating Icons

You can create these icons from a single source image (recommended: 512x512 or larger) using:

1. **Online Tools:**
   - https://www.pwabuilder.com/imageGenerator
   - https://realfavicongenerator.net/
   - https://www.favicon-generator.org/

2. **Design Requirements:**
   - Use a simple, recognizable design
   - Include the app name or logo
   - Use bright, contrasting colors
   - Ensure text is readable at small sizes
   - Consider using a Japanese character (あ, 日, etc.) or anime-themed icon

3. **Quick Generation Script:**
   ```bash
   # Using ImageMagick (if installed)
   for size in 72 96 128 144 152 192 384 512; do
     convert source-icon.png -resize ${size}x${size} icon-${size}x${size}.png
   done
   ```

## Temporary Solution

For development, you can create simple placeholder icons or use a favicon generator service.

The app will work without icons, but they're required for:
- App installation prompts
- Home screen icons
- Splash screens
- Better user experience

