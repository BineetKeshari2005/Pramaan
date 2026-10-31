"""URL helpers for the demo project."""

import re

SCHEME = re.compile(r"^[a-z]+://")


def parse_url(value):
    """Split a URL into scheme and rest."""
    if not value:
        raise ValueError("empty url")
    match = SCHEME.match(value)
    return match.group(0), value[match.end():]


class UrlCache:
    def lookup(self, key):
        return self._store.get(key)
