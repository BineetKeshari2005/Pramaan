from src.url import parse_url


def action(conf):
    """Run the configured action."""
    scheme, rest = parse_url(conf.target)
    return conf.dumper.singleString(rest)


def start(conf):
    return action(conf)
