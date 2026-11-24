# Demo video tooling

Produces the ~60s product demo (`docs/demo.mp4`, also the file linked from
the hackathon submission form, field 12).

- `record.js` — Playwright walkthrough of the live GitHub Pages site
  (Home → Mint → connect prompt → My Badges → Board → Home), 1280x720.
  Needs the local proxy running first (see below).
- `local-proxy.js` — tiny unauthenticated forward proxy on localhost:8888.
  Chrome on this VM cannot use the egress proxy directly (it ignores proxy
  credentials in `--proxy-server`, and Playwright's proxy auth fails the
  CONNECT tunnel); this proxy adds the `Proxy-Authorization` header itself
  from the live env. Start it before recording:
  `node local-proxy.js &` — it reads the egress token fresh at startup
  (the token rotates within minutes, so start it right before recording).
- `demo.mp4` — final cut (60s, 720p): raw recording trimmed of the 5s
  blank startup, sped up 1.5x, 2s fade-out. Built with:
  `ffmpeg -ss 5 -i raw/<file>.webm -vf "setpts=PTS/1.5,fade=t=out:st=57:d=2" -an -c:v libx264 -pix_fmt yuv420p -crf 23 demo.mp4`

`raw/`, `frames/` and `node_modules/` are build outputs, gitignored.
