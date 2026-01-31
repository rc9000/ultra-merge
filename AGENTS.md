# trusted-merge AGENTS.md

## Specification

 * trusted-merge is a web application to merge PDF files
 * the core technology is `pdfunite doc1.pdf doc2.pdf ... docN.pdf combined.pdf`
 * the user can upload up to 42 pdf files through a web frontend with drag and drop control
 * there is an option to include a blank page inbetween 
 * after merging, allow downloading the pdf
 * build a docker image for easy self-hosting

## Special Instructions

 * create and use tests
 * prefix all commits with "AI commit:"
 * git has no remote, no pushing
 * just build images locally, no pushing to registries
