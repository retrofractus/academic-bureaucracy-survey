# Academic Bureaucracy Survey — website

Two static pages for GitHub Pages, plus a Google Apps Script collector that writes responses into a Google Sheet.

```
index.html          landing page
survey.html         the instrument
assets/style.css
assets/survey.js    ← set ENDPOINT here
apps-script.gs      ← paste into your Sheet's Apps Script editor
```

## 1. Put it on GitHub Pages

1. Create a repository and commit these files at the root.
2. Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. The site appears at `https://<user>.github.io/<repo>/` within a minute or two.

GitHub Pages serves static files only, so it cannot store form submissions itself. That is what step 2 is for.

## 2. Wire up the collector

1. Create a new Google Sheet to hold responses.
2. Extensions → Apps Script. Delete the placeholder and paste in `apps-script.gs`.
3. Replace `SALT` with a long random string. **Do not change it afterwards** — the salt is what makes duplicate detection work across your whole dataset.
4. Deploy → New deployment → Web app. Execute as **Me**, access **Anyone**. Authorise it.
5. Copy the `/exec` URL and paste it into `ENDPOINT` at the top of `assets/survey.js`.
6. Commit and submit a test response. A `responses` tab appears in the Sheet with headers.

Redeploying after any edit to the script requires **Deploy → Manage deployments → Edit → New version**, or the old code keeps running.

### Alternative collectors

If you would rather not run Apps Script, `assets/survey.js` posts plain JSON and works unchanged against Formspree, Basin, or a Cloudflare Worker — just swap the `ENDPOINT` URL. Avoid the widespread trick of POSTing to a Google Form's `formResponse` endpoint with `mode: "no-cors"`: it cannot report failures, so responses vanish silently.

## 3. Email handling

Each row stores the raw email and a salted SHA-256 hash of it. Verify institutional affiliation from the raw addresses, then run the `purgeRawEmails` function from the Apps Script editor. The hash survives, so you can still catch one person submitting five times, and you can link a respondent across future waves — but you are no longer holding anyone's address.

## 4. Placeholders to fill before launch

- `[LAUNCH DATE]` in `index.html`
- `[WHOEVER BUILDS THE WEBSITE]` in the Acknowledgements section
- `[YOUR EMAIL]` in the footer `mailto:` link

## Notes on the instrument

The survey implements the revisions discussed: a 24-month recall window, the split vendor-documents question (vendor-supplied and self-supplied), a hiring-latency question, broad academic division instead of free-text department, and separate "don't know" and "never" options so that administrative absorption is distinguishable from low burden. The administrator-email-count question was removed; if you want it back, copy any `.q` block in `survey.html` and add its name to the `NUMERIC` array in `assets/survey.js` and to `HEADERS` in `apps-script.gs`.
