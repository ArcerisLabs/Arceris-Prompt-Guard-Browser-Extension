# Arceris Prompt Guard

**Stop sensitive data before it reaches an AI tool.** Arceris Prompt Guard is a free browser extension for Chrome, Edge and Firefox that checks your prompt before it is sent to ChatGPT, Claude, Gemini and other AI chat tools. If it finds personal, health or payment data, it stops the send and lets you mask it, edit it, or send anyway.

Everything runs in your browser. Nothing is sent to any server.

Built by [Arceris](https://arceris.ai/), the AI security platform for teams.

[**Install for Chrome**](https://chromewebstore.google.com/detail/jdpbifnjdnbfaaeobfaigjbgebpgdkmc) · [**Install for Firefox**](https://addons.mozilla.org/firefox/addon/arceris-prompt-guard/) · [arceris.ai](https://arceris.ai/)


## What it does

- **Catches sensitive data before sending.** National ID numbers, phone numbers, emails, IBANs, credit cards, patient and diagnosis details and more.
- **Masks without breaking the format.** The first and last characters stay, the middle is randomized, so the AI still sees a value of the right shape. Masked numbers are generated so that they fail checksum validation and cannot be someone else's real number.
- **Shows the original back to you.** Optionally, when the masked value appears in the AI's reply, the extension displays your original value in its place. The mapping lives only in the tab's memory.
- **Three modes.** Warn, Block, or Monitor only.
- **Live counter.** See how many sensitive items are in your message while you type.

## What's included

| | |
|---|---|
| Detection rules | 87 built-in regex rules: 48 PII, 18 PHI, 21 PCI and financial |
| Validation | Luhn, IBAN mod-97, Turkish national ID and tax number, NHS, NPI, CPF, Aadhaar and other checksums, to cut false positives |
| Supported sites | 32 AI sites, including ChatGPT, Claude, Gemini, Microsoft Copilot, Perplexity, DeepSeek, Grok and Mistral |
| Custom sites | Add your own internal AI tool by domain |
| Rule editor | Edit, disable or delete any rule; add your own; import and export as JSON |
| Playground | Paste sample text and see findings and the masked output |
| Themes | Light and dark |


## Privacy

- All scanning happens locally in the browser.
- The extension makes no network requests: no analytics, no telemetry, no remote code.
- Only your settings, rules and four anonymous counters are stored, in the browser's local extension storage.
- Detected values and prompts are never stored.

## Limits

- Only typed or pasted text is scanned. Uploaded files and images are not.
- Regex cannot reliably find unlabelled names or free-form addresses.
- Send-button detection is heuristic. If a click is not caught on some site, add the button's CSS selector in Settings. Sending with Enter is always caught.
- The interface is currently in Turkish.

## Install from source

**Chrome / Edge** (121+)

1. Clone or download this repository.
2. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
3. Click **Load unpacked** and select the repository folder.

**Firefox** (128+)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select `manifest.json`.

## Writing rules

Rules are JavaScript regular expressions. The `g` flag is added automatically.

- If the pattern has a first capture group, only that part is treated as the sensitive value:
  `MRN\s*[:#]?\s*(\d{6,10})` masks only the digits in `MRN: 123456`.
- Pick a validator (Luhn, IBAN, …) to require a checksum match on top of the regex.
- When matches overlap, the one with higher severity, a validator and greater length wins.

## Project layout

```
manifest.json        Manifest V3, shared by Chrome, Edge and Firefox
src/engine.js        Validators, scanning, masking
src/rules.js         Built-in rule set
src/storage.js       Provider list and settings storage
src/content.js       Intercepts sending, shows the dialog, masks and restores
src/options.*        Settings page
src/popup.*          Toolbar popup
tests/rules.test.js  Rule and validator tests
tools/               Manifest generator
```

```
node tests/rules.test.js      # run rule tests
node tools/build-manifest.js  # regenerate manifest.json after changing the provider list
```

## For teams: the Arceris platform

Prompt Guard protects one browser. The [Arceris platform](https://arceris.ai/) is built for organizations: centrally managed policies, file and image scanning, audit logs and reporting, access management and Shadow AI discovery.


[Contact Arceris](https://arceris.ai/)

## Credits

Fonts: [IBM Plex](https://github.com/IBM/plex) Sans and Mono, SIL Open Font License 1.1 (see `fonts/IBM-Plex-LICENSE.txt`).

## License

Licensed under the [Apache License 2.0](LICENSE). Copyright © 2026 Arceris.
