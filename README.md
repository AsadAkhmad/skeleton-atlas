# Skeleton Atlas

An interactive 3D adult human skeleton in the browser: all 206 bones, each named, selectable, and described.

- Rotate freely, zoom, pan; jump to Front, Side, Back and Top views
- Click a bone (or pick it from the searchable list) to see its Latin name, side, typical adult size, function, key features, articulations and muscle attachments
- Focus dimming, an Explode slider, name labels, and toggles for cartilage and teeth
- Cartilage everywhere it belongs: costal cartilage, intervertebral discs, pubic symphysis, knee menisci, nose and jaw-joint cartilage, plus thin articular cartilage on every joint surface (it follows its bones when you explode the skeleton)

- **Body systems** (left panel): organs, respiratory, cardiovascular, urinary and nervous. Each is built the first time you switch it on (well under a second), so the page stays fast. Click any organ to see what it does; cycle the skeleton between Solid, Ghost and Off with the Bones button. Muscular, skin and reproductive are planned.

Open `index.html` in a browser (fonts load from Google Fonts), or deploy the folder as a static site.

## Notes on accuracy

Every bone is generated procedurally from signed distance fields (no scanned data), so shapes are stylized, not scan-accurate. Sizes are typical adult-male averages.

## Develop

```bash
npm install
npm run build   # bundles src/ with esbuild into dist/ and writes index.html
```

Built with [Three.js](https://threejs.org) and esbuild.

## License

MIT
