# `_redirects` File Specification

![reliable](https://img.shields.io/badge/status-reliable-green.svg?style=flat-square)

**Authors**:

- Justin Johnson ([@justincjohnson](https://github.com/justincjohnson))

----

**Abstract**

The Redirects File specification is an extension of the Subdomain Gateway and DNSLink Gateway specifications.

Developers can enable URL redirects or rewrites by adding redirect rules to a file named `_redirects` stored underneath the root CID of their web site.

This can be used, for example, to enable URL rewriting for hosting a single-page application, to redirect invalid URLs to a pretty 404 page, or to avoid  [link rot](https://en.wikipedia.org/wiki/Link_rot) when moving to IPFS-based website hosting.

# Table of Contents

- [File Name and Location](#file-name-and-location)
- [File Format](#file-format)
  - [From](#from)
  - [To](#to)
  - [Status](#status)
  - [Placeholders](#placeholders)
  - [Splat](#splat)
  - [Comments](#comments)
  - [Line Termination](#line-termination)
  - [Max File Size](#max-file-size)
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

## From

The path to redirect from.

## To

The URL or path to redirect to.

## Status

An optional integer specifying the HTTP status code to return from the request.  Supported values are:

- `200` - OK
  - Redirect will be treated as a rewrite, returning OK without changing the URL in the browser.
- `301` - Permanent Redirect (default)
- `302` - Found (commonly used for Temporary Redirect)
- `303` - See Other (replacing PUT and POST with GET)
- `307` - Temporary Redirect (explicitly preserving body and HTTP method of original request)
- `308` - Permanent Redirect (explicitly preserving body and HTTP method of original request)
- `404` - Not Found
  - Useful for redirecting invalid URLs to a pretty 404 page.
- `410` - Gone
- `451` - Unavailable For Legal Reasons

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

### Comments

Any line beginning with `#` will be treated as a comment and ignored at evaluation time.

For example:

```
# Redirect home to index.html
/home /index.html 301
```

is functionally equivalent to

```
/home /index.html 301
```

### Line Termination

Lines MUST be terminated by either `\n` or `\r\n`.

### Max File Size

The file size MUST NOT exceed 64 KiB.

# Evaluation

## Subdomain or DNSLink Gateways

Rules MUST only be evaluated when hosted on a Subdomain or DNSLink Gateway, so that we have [Same-Origin](https://en.wikipedia.org/wiki/Same-origin_policy) isolation.

## Order

Rules MUST be evaluated in order, redirecting or rewriting using the first matching rule.

## No Forced Redirects

All redirect logic MUST only be evaluated if the requested path is not present in the DAG.  This means that any performance impact associated with checking for the existence of a Redirects File or evaluating redirect rules will only be incurred for non-existent paths.

# Error Handling

If the Redirects File exists but there is an error reading or parsing it, the errors MUST be returned to the user with a 500 HTTP status code.

# Security

This functionality will only be evaluated for Subdomain or DNSLink Gateways, to ensure that redirect paths are relative to the root CID hosted at the specified domain name.

Parsing of the `_redirects` file should be done safely to prevent any sort of injection vector or daemon crash.

The [max file size](#max-file-size) helps to prevent an additional [denial of service attack](https://en.wikipedia.org/wiki/Denial-of-service_attack) vector.

# Appendix: notes for implementors

## Test fixtures

Sample files for various test cases can be found in `QmQyqMY5vUBSbSxyitJqthgwZunCQjDVtNd8ggVCxzuPQ4`.
Implementations are free to use it for internal testing.

```
$ ipfs ls QmQyqMY5vUBSbSxyitJqthgwZunCQjDVtNd8ggVCxzuPQ4
QmcBcFnKKqgpCVMxxGsriw9ByTVF6uDdKDMuEBq3m6f1bm - bad-codes/
QmYBhLYDwVFvxos9h8CGU2ibaY66QNgv8hpfewxaQrPiZj - examples/
QmU7ysGXwAtiV7aBarZASJsxKoKyKmd9Xrz2FFamSCbg8S - forced/
QmWHn2TunA1g7gQ7q9rwAoWuot2hMpojZ6cZ9ERsNKm5gE - good-codes/
QmRgpzYQESidTtTojN8zRWjiNs9Cy6o7KHRxh7kDpJm3KH - invalid/
QmYzMrtPyBv7LKiEAGLLRPtvqm3SjQYLWxwWQ2vnpxQwRd - newlines/
QmQTfvjGmvTfxFpUcZNLdTLuKV227KJkGiN6xooHVeVZAS - too-large/
```

For example, the "examples" site can be found in `QmYBhLYDwVFvxos9h8CGU2ibaY66QNgv8hpfewxaQrPiZj`.

```
$ ipfs ls /ipfs/QmYBhLYDwVFvxos9h8CGU2ibaY66QNgv8hpfewxaQrPiZj
Qmd9GD7Bauh6N2ZLfNnYS3b7QVAijbud83b8GE8LPMNBBP 7   404.html
QmSmR9NShZ89VEBrn9SBy7Xxvjw8Qe6XArD5GqtHvbtBM3 7   410.html
QmVQqj9oZig9tH3ENHo4bxV5pNgssUwFCXUjAJAVcZVbJG 7   451.html
QmZU3kboiyi9jV59D8Mw8wzuvsr3HmvskqhYRRhdFA8wRq 317 _redirects
QmaWDLb4gnJcJbT1Df5X3j91ysiwkkyxw6329NLiC1KMDR -   articles/
QmS6ZNKE9s8fsHoEnArsZXnzMWijKddhXXDsAev8LdTT5z 9   index.html
QmNwEgMrExwSsE8DCjZjahYfHUfkSWRhtqSkQUh4Fk3udD 7   one.html
QmVe2GcTbEPZkMbjVoQ9YieVGKCHmuHMcJ2kbSCzuBKh2s -   redirected-splat/
QmUGVnZaofnd5nEDvT2bxcFck7rHyJRbpXkh9znjrJNV92 7   two.html
```

The `_redirects` file is as follows.

```
$ ipfs cat /ipfs/QmYBhLYDwVFvxos9h8CGU2ibaY66QNgv8hpfewxaQrPiZj/_redirects
/redirect-one /one.html
/301-redirect-one /one.html 301
/302-redirect-two /two.html 302
/200-index /index.html 200
/posts/:year/:month/:day/:title /articles/:year/:month/:day/:title 301
/splat/* /redirected-splat/:splat 301
/not-found/* /404.html 404
/gone/* /410.html 410
/unavail/* /451.html 451
/* /index.html 200
```

The non-existent paths that are being requested should be intercepted and redirected to the destination path and the specified HTTP status code returned. The rules are evaluated in the order they appear in the file.

Any request for an existing file should be returned as is, and not intercepted by the last catch all rule.
