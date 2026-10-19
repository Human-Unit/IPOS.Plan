# DOCX export — IPOS content plan

The **Export → Скачать .docx** action builds a Word OpenXML document entirely
inside the browser, without a backend or additional packages.

## Source-inspired layout

The template is based on the user-provided `Content-Plan 13.10.2026.docx`:
A4 portrait, prominent university/sector heading, large pale-blue watermark,
dense editorial briefs, bold "Вид контента" and "Описание", blue underlined
reference links, bulleted requirements, prominent red deadlines, contact notes,
responsible people and a slim right-hand image column.

The document intentionally uses **editable Word elements** (runs, paragraphs,
tables, hyperlinks and embedded PNG/JPEG images), not a flattened screenshot.

The public `student-council-emblem.svg` is used as the header symbol and pale
watermark. The original circular university seal from the reference is **not**
stored in the website repository and is therefore not currently embedded.
For a pixel-faithful match, add the approved circular seal as a distributable
asset and update the header conversion.

## Typography

Individual block font family/size/weight information is preserved when
possible. DOCX stores font names, not external font files. Recipients must have
Montserrat, NT Somin or other custom fonts installed in Word for exact
rendering. Otherwise Word substitutes an available font.

## Images

Only public PNG/JPEG image URLs retrievable by browser `fetch` with CORS are
embedded. Images from Instagram and other providers which block CORS are
preserved as clickable links. The Export dialog informs the user when that
happens; Word export is still generated.

## Limitations

- Word and LibreOffice may paginate text slightly differently.
- A4 size, spacing, and visual hierarchy approximate the original document;
  this is not a byte-for-byte clone.
- Lists are rendered as editable bulleted paragraphs.
- No backend processing, cloud uploads, authentication, or additional storage.
- The exporter stores Office Open XML parts in an uncompressed (STORE) ZIP; this
  is standards-compliant but creates larger files than compressed packages.
- Browser preview/print and DOCX Word layout are independent rendering
  engines, so they cannot be expected to be pixel-identical.

## Validation

Unit tests cover content types, OOXML structure, A4 section properties, image
relationships, external hyperlinks, escaped XML and UTF-8 ZIP entries. Manual
QA should compare a downloaded multi-task plan in MS Word and LibreOffice with
the original two-page Word reference, including the watermark position and
pagination. Adjust the template after comparison if exact fidelity is desired.
