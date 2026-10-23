# Midnight Celestial Wedding Invitation

A responsive, cinematic ring-ceremony invitation for **Nilesh & Akansha**, built with semantic HTML, CSS, and vanilla JavaScript. It uses a midnight navy / indigo palette, champagne details, an animated constellation, a live countdown, venue directions, calendar export, WhatsApp sharing, and a device-local guestbook.

## Project files

```text
midnight-celestial-invitation/
├── index.html
├── styles.css
├── script.js
├── config.json
├── README.md
└── assets/
    ├── music.mp3                 # Empty placeholder — replace with licensed audio
    └── MUSIC-LICENSE-NOTE.txt
```

## Preview locally

Because the site loads `config.json` using `fetch()`, use a local HTTP server instead of opening `index.html` as a `file://` URL.

### Python

From this folder, run:

```bash
python -m http.server 8000
```

Open <http://localhost:8000>.

### Node.js alternative

```bash
npx serve .
```

Open the local URL printed by the server.

If the browser cannot load `config.json`, the page falls back to built-in defaults and logs a short informational message to the console.

## Customize the invitation

Edit `config.json`. The following are configurable without editing the HTML:

- Couple names.
- Family invitation line and optional family-name fields.
- Event title, countdown timestamp, local start/end times, timezone, timeline labels/titles/descriptions, copy, and displayed date/time.
- Venue name, address, city, and Maps search query.
- Optional RSVP contact; it appears only when `rsvp.enabled` is `true` and a contact phone is supplied.
- Optional RSVP contact placeholders.
- Canonical invitation URL for sharing.
- Music path.

**Date/time:** `dateTimeLocal`, `startTimeLocal`, and `endTimeLocal` should use ISO 8601 timestamps with the correct UTC offset. The supplied event is set to **11 November 2026, 12:15 PM India Standard Time (UTC+05:30)**. The countdown switches to an in-progress or post-event message once that moment passes. The Google Calendar link and downloadable `.ics` file use the configured start and end timestamps.

**Venue:** Check the venue details and Google Maps result before publishing. The Maps button opens a search for the configured venue; it does not claim that a specific map pin has been independently verified.

**Sharing:** Set `sharing.invitationUrl` to the final public `https://...` URL after deploying. When blank, WhatsApp sharing uses the current page URL. On supported browsers and secure origins, the button may first open the device's native share sheet.

**Family / RSVP fields:** The configuration includes editable family and RSVP details, but contact information was not supplied and is therefore blank. No invented phone number or RSVP contact is displayed.

## Music setup

`assets/music.mp3` is deliberately an empty placeholder. Replace it with an MP3 file you have permission to use, keeping the same filename, or update `audio.source` in `config.json` to another relative audio path. Recommended sound: gentle instrumental piano with subtle sitar or ambient strings, without vocals, around 60–85 BPM. Do not use a copyrighted recording without the necessary rights. Playback starts only when a visitor presses the music control. If the file is absent or invalid, the website stays usable and shows a message rather than breaking.

## Guestbook storage

Blessings are saved in the visitor's browser with `localStorage`, up to 50 entries on that device. They are **not uploaded to a server and are not shared with other visitors**. Browser privacy settings, private browsing, clearing site data, or changing device/browser can remove or hide them. User text is rendered with `textContent` and is never inserted as HTML. A multi-visitor shared guestbook would require a backend or third-party storage service; this project does not pretend to provide one.

## Deploy to GitHub Pages

1. Create a GitHub repository, for example `midnight-celestial-invitation`.
2. Upload **all** files and the `assets/` folder while preserving the directory structure.
3. Commit the files to the branch you want to publish (commonly `main`).
4. Open **Settings → Pages** in the repository.
5. Under **Build and deployment**, select **Deploy from a branch**, choose `main` and `/ (root)`, then save.
6. Wait for GitHub Pages to publish the site. Open the URL it provides; a project site generally uses `https://USERNAME.github.io/REPOSITORY/`.
7. Copy the final public URL into `config.json` as `sharing.invitationUrl`, commit the change, and allow Pages to redeploy.
8. Test the page on mobile and desktop, including directions, sharing, calendar export, and music after replacing the placeholder.

All local asset and configuration references are relative, so the project works from a GitHub Pages project-site subpath without root-relative asset paths.

## Feature notes

- No framework or runtime dependency is required.
- Google Fonts are optional; local serif, sans-serif, and cursive fallbacks remain in the CSS.
- Google Maps, Google Calendar, WhatsApp, and Google Fonts need an internet connection.
- `prefers-reduced-motion` reduces motion and disables the starfield animation and shooting stars.
- The countdown is calculated from the configured timestamp and the visitor's clock; the event is anchored to India Standard Time in the supplied config.
- No real venue photography or third-party images are used. The celestial and map illustrations are original CSS/SVG artwork.
