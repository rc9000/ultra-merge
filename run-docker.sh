#!/usr/bin/env sh
set -eu

IMAGE_TAG="ultra-merge:local"
CONTAINER_NAME="ultra-merge-dev"

docker build -t "${IMAGE_TAG}" .

cleanup() {
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}

trap cleanup INT TERM EXIT

TTY_FLAGS=""
if [ -t 0 ]; then
  TTY_FLAGS="-it"
fi

docker run ${TTY_FLAGS} --rm --name "${CONTAINER_NAME}" -p 3000:3000 "${IMAGE_TAG}"
