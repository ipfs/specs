# Redirects File Specification

![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

**Authors**:

- Justin Johnson ([@justincjohnson](https://github.com/justincjohnson))

----

**Abstract**

The Redirects File specification is an extension of the Subdomain Gateway and DNSLink Gateway specifications.

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
  - [Subdomain or DNSLink Gateways](#subdomain-or-dnslink-gateways)
  - [Order](#order)
  - [No Forced Redirects](#no-forced-redirects)
- [Error Handling](#error-handling)
- [Security](#security)
- [Appendix: notes for implementors](#appendix-notes-for-implementors)
  - [Test fixtures](#test-fixtures)

# File Name and Location

The Redirects File MUST be named `_redirects` and stored underneath the root CID of the web site.

# File Format

The Redirects File MUST be a text file containing one or more lines with the following format (brackets indication optionality).

```
from to [status]
```

Any line beginning with `#` will be treated as a comment and ignored.

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
- `410` - Gone
- `451` - Unavailable For Legal Reasons  
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

Splat logic MUST only apply to a single trailing asterisk, as this is a greedy match, consuming the remainder of the path.

# Evaluation

## Subdomain or DNSLink Gateways

Rules MUST only be evaluated when hosted on a Subdomain or DNSLink Gateway, so that we have [Same-Origin](https://en.wikipedia.org/wiki/Same-origin_policy) isolation.

## Order

Rules MUST be evaluated in order, redirecting or rewriting using the first matching rule.

## No Forced Redirects

All redirect logic MUST only be evaluated if the requested path does not resolve.  This means that any performance impact associated with checking for the existence of a Redirects File or evaluating redirect rules will only be incurred for non-existent paths.

# Error Handling

If the Redirects File exists but there is an error reading or parsing it, the errors MUST be returned to the user with a 500 HTTP status code.

# Security

This functionality will only be evaluated for Subdomain or DNSLink Gateways, to ensure that redirect paths are relative to the root CID hosted at the specified domain name.

Parsing of the `_redirects` file should be done safely to prevent any sort of injection vector or daemon crash.

# Appendix: notes for implementors

## Test fixtures

A sample site can be found in QmaiAcL7pFedPJXxNJNDVDTUR78We7yBhdLzg151ZMzLCv.  This CID is associated with a CAR file used for test cases in the initial implementation of this feature in go-ipfs.

```
$ ipfs ls /ipfs/QmaiAcL7pFedPJXxNJNDVDTUR78We7yBhdLzg151ZMzLCv/
Qmd9GD7Bauh6N2ZLfNnYS3b7QVAijbud83b8GE8LPMNBBP 7   404.html
QmdhCvSuBvrgXuWqAvierrtLs4dez1AJmrfRRQm41od1Rb 275 _redirects
QmaWDLb4gnJcJbT1Df5X3j91ysiwkkyxw6329NLiC1KMDR -   articles/
QmS6ZNKE9s8fsHoEnArsZXnzMWijKddhXXDsAev8LdTT5z 9   index.html
QmNwEgMrExwSsE8DCjZjahYfHUfkSWRhtqSkQUh4Fk3udD 7   one.html
QmVe2GcTbEPZkMbjVoQ9YieVGKCHmuHMcJ2kbSCzuBKh2s -   redirected-splat/
QmUGVnZaofnd5nEDvT2bxcFck7rHyJRbpXkh9znjrJNV92 7   two.html
```

The `_redirects` file is as follows.

```
$ ipfs cat /ipfs/QmaiAcL7pFedPJXxNJNDVDTUR78We7yBhdLzg151ZMzLCv/_redirects
/redirect-one /one.html
/301-redirect-one /one.html 301
/302-redirect-two /two.html 302
/200-index /index.html 200
/posts/:year/:month/:day/:title /articles/:year/:month/:day/:title 301
/splat/:splat /redirected-splat/:splat 301
/not-found/* /404.html 404
/* /index.html 200
```

The non-existent paths that are being requested should be intercepted and redirected to the destination path and the specified HTTP status code returned. The rules are evaluated in the order they appear in the file.

Any request for an existing file should be returned as is, and not intercepted by the last catch all rule.