# trusted-merge AGENTS.md

## Specification

 * trusted-merge is a web application to merge PDF files
 * the core technology is `pdfunite doc1.pdf doc2.pdf ... docN.pdf combined.pdf`
 * the user can upload up to 42 pdf files through a web frontend with drag and drop control
 * there is an option to include a blank page inbetween 
 * after merging, allow downloading the pdf
 * build a docker image for easy self-hosting

## Testing

 * create and use tests extensively
 * include the tests and their reuirements in the docker image, so they can be run in a reproducible enviroment
 * after changing things or adding features, run all the tests without asking, repeat until successful

## Special Instructions

 * prefix all commits with "AI commit:"
 * git has no remote, no pushing
 * just build images locally, no pushing to registries
 * check online for the latest versions before building stuff, don't use node 20 when 24 is already out.
 * always run the docker container with host port 3000 exposed to container port 3000 (e.g. `-p 3000:3000`)
 * always build the docker image after finishing changes
