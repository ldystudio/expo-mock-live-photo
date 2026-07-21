# Demo media

`cover.jpg` and `live-photo.mp4` are derived from the Expo `create-expo-module` template's `icon.png`, which is retained in this directory. The Expo template is MIT licensed. These derivatives were generated in this repository with FFmpeg:

```bash
ffmpeg -y -i example/assets/icon.png -q:v 2 example/assets/cover.jpg
ffmpeg -y -loop 1 -i example/assets/icon.png \
  -vf "zoompan=z='if(eq(on,0),1,min(zoom+0.0007,1.06))':x='iw/2-(iw/zoom/2)+(on/89)*8':y='ih/2-(ih/zoom/2)-(on/89)*8':d=90:s=1024x1024:fps=30,format=yuv420p" \
  -t 3 -an -c:v libx264 -preset slow -crf 22 -movflags +faststart \
  example/assets/live-photo.mp4
```
