# Windows HEIF And HEVC Codecs

- Entry Type: File-format support requirement
- Category: Get started > Technical requirements and installation
- Source: https://helpx.adobe.com/photoshop/desktop/get-started/technical-requirements-installation/download-and-install-heic-or-hevc-codecs.html

**Function Summary**
This page explains the Windows codec dependencies required for opening HEIF and HEIC files in Photoshop. It is a setup prerequisite reference for file compatibility, not an editing feature.

**What This Entry Is For**
- resolving `.heic` import failures on Windows
- understanding why Photoshop cannot read certain HEIF-based files
- installing required Microsoft codec components before import

**What You Need**
- `HEIF Image Extensions`
- `HEVC Video Extensions`

**How To Use This Requirement**
1. Quit Photoshop.
2. Install the Microsoft `HEIF Image Extensions`.
3. Install the Microsoft `HEVC Video Extensions`.
4. Restart Photoshop.
5. Reopen the HEIF or HEIC file.

**Error Conditions This Entry Addresses**
- Photoshop reports that additional non-Adobe software is required.
- Photoshop cannot recognize the `.heic` extension.

**Compatibility Notes**
- Canon HIF or HEIC variants are not supported here in the same way as standard HEIF photo imports.
- For Canon camera workflows, the raw source file is the safer path when supported.

**Expected Result**
- After both Windows extensions are installed, standard HEIF and HEIC files should open correctly in Photoshop.

**Related Entries**
- Previous: Graphics processor (GPU) card usage
- Next: Photoshop language availability
