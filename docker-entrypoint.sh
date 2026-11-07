#!/bin/sh
# Migrations run before anything is served, every boot. If they fail the
# container exits non-zero rather than serving against a schema that does
# not match the code.
#
# This is an ENTRYPOINT, not part of CMD, so it still runs if the
# orchestrator (Coolify, Compose, a `docker run` override) replaces the
# start command. Whatever that command is arrives here as "$@".
set -e

node /app/scripts/migrate.mjs

exec "$@"
