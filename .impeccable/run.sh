#!/bin/sh
# Runs the project-local Impeccable engine with its home/cache inside .impeccable/home (nothing in the user profile).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
H="$ROOT/.impeccable/home"
HOME="$H" USERPROFILE="$(cygpath -w "$H")" IMPECCABLE_HOME="$H" IMPECCABLE_CACHE_ROOT="$H/cache" DO_NOT_TRACK=1 \
  exec "$ROOT/.claude/skills/impeccable/scripts/impeccable.cmd" "$@"
