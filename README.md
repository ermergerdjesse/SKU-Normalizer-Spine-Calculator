# SKU-Normalizer-Spine-Calculator

# SKU Normalizer

A small web tool for cleaning and standardizing messy SKUs.

You paste raw SKUs from a spreadsheet or system export, and the tool:

- Trims whitespace
- Uppercases everything
- Normalizes common color names to canonical values
- Extracts size information (for example `8x10`, `8.25x11`, `10x10`)
- Shows warnings when something cannot be interpreted
- Lets you download a clean CSV of the results

## Features

- Runs entirely in the browser (static site, no backend)
- Paste one SKU per line into a textarea
- Per SKU output:
  - Original SKU
  - Normalized SKU
  - Parsed size
  - Parsed color
  - Warnings
- Download processed SKUs as a CSV
