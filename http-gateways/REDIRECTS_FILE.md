# Redirects File Specification

![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

**Authors**:

- Justin Johnson ([@justincjohnson](https://github.com/justincjohnson))

----

**Abstract**

The Redirect File specification is an extension of the Subdomain Gateway specification.

Developers can enable URL redirects or rewrites by adding redirect rules to a file named `_redirects` stored underneath the root CID of their web site.

This can be used, for example, to enable URL rewriting for hosting a single-page application, or to redirect invalid URLs to a pretty 404 page.

# Table of Contents

- [File Name and Location](#file-name-and-location)
- [File Format](#file-format)
  - [From](#from)
  - [To](#to)
  - [Status](#status)
  - [Placeholders](#placeholders)
  - [Splat](#splat)
- [Evaluation](#evaluation)
  - [Subdomain Gateways](#subdomain-gateways)
  - [Order](#order)
  - [No Forced Redirects](#no-forced-redirects)
- [Error Handling](#error-handling)

# File Name and Location

The Redirects File MUST be named `_redirects` and stored underneath the root CID of the web site.

# File Format

The Redirects File MUST be a text file containing one or more lines with the following format (brackets indication optionality).

```
from to [status]
```

## From

The path to redirect from.

## To

The URL or path to redirect to.

## Status

An optional integer specifying the HTTP status code to return from the request.  Supported values are:

- `301` - Permanent Redirect (default)
- `302` - Temporary Redirect
- `404` - Not Found
  - Useful for redirecting invalid URLs to a pretty 404 page.
- `200` - OK
  - Redirect will be treated as a rewrite, returning OK without changing the URL in the browser.

## Placeholders

Placeholders are named variables that can be used to match path segments in the `from` path and inject them into the `to` path.

For example:

```
/posts/:month/:day/:year/:slug  /articles/:year/:month/:day/:slug
```

This rule will redirect a URL like `/posts/06/15/2022/hello-world` to `/articles/2022/06/15/hello-world`.

### Splat

If a `from` path ends with an asterisk (i.e. `*`), the remainder of the `from` path is slurped up into the special `:splat` placeholder, which can then be injected into the `to` path.

For example:

```
/posts/* /articles/:splat
```

This rule will redirect a URL like `/posts/2022/06/15/hello-world` to `/articles/2022/06/15/hello-world`.

# Evaluation

## Subdomain Gateways

Rules MUST only be evaluated when hosted from a Subdomain Gateway, so that we have Same-Origin isolation.

## Order

Rules MUST be evaluated in order, redirecting or rewriting using the first matching rule.

## No Forced Redirects

Rules MUST only be evaluated if the requested URL or path does not resolve.  This ensures that any performance impact of evaluating redirect rules only occurs for non-existent paths.

# Error Handling

If there is an error reading or parsing the Redirects File, the errors should be swallowed and not returned to the user.  This simplifies some edge cases in the code base.

TODO: ensure this is really what we want and clarify