#!/usr/bin/env sh
set -eu

docker build -t ultra-merge:local .
exec docker run --rm -p 3000:3000 ultra-merge:local
