# RFC 0000: Gateway Redirects

- Start Date: (format: 2022-06-15)
- Related Issues:
  - https://github.com/ipfs/specs/issues/257
  - https://github.com/ipfs/go-ipfs/pull/8890

# Summary

Provide support for URL redirects and rewrites for web sites hosted on Subdomain Gateways, thus enabling support for single-page applications (SPAs).

# Motivation

Web sites often need to redirect from one URL to another, for example, to change the appearance of a URL, to change where content is located without changing the URL, to redirect invalid URLs to a pretty 404 page, or to enable URL rewriting.  URL rewriting in particular is a critical feature for hosting SPAs, allowing routing logic to be handled by front end code.  SPA support is the primary impetus for this RFC.

Currently the only way to handle URL redirects or rewrites is with additional software such as NGINX sitting in front of the Gateway.  This software introduces operational complexity and decreases the uniformity of experience when navigating to content hosted on a Gateway, thus decreasing the value proposition of hosting web sites in IPFS.

This RFC proposes the introduction of redirect support for content hosted on Subdomain Gateways, configured via a `_redirects` file residing underneath the root CID of the web site.

# Detailed design

Allow developers to configure redirect support by adding redirect rules to a file named `_redirects` stored underneath the root CID of their web site.  The format for this file is similar to those of [Netlify](https://docs.netlify.com/routing/redirects/#syntax-for-the-redirects-file) and [Cloudflare Pages](https://developers.cloudflare.com/pages/platform/redirects) but only supporting a subset of their functionality.

The format for the file is `from to [status]`.

- `from` - specifies the URL to intercept (can include globs and placeholders)
- `to` - specifies the URL to redirect to (can include placeholders)
- `status` - optional status code (301 if not specified)

Rules in the file are evaluated top to bottom.

For performance reasons this proposal does not include forced redirect support (i.e. redirect rules that are evaluated even if the `from` path exists).  This means that no redirect logic will be executed unless the requested path doesn't exist.

If a `_redirects` file has invalid logic, perhaps not even parsing correctly, we may want to show the errors to the user viewing the site via the Subdomain Gateway.

## Test fixtures

A sample site be found in QmaiAcL7pFedPJXxNJNDVDTUR78We7yBhdLzg151ZMzLCv.

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

The non-existent paths that are being requested should be intercepted and redirected to the destination URL and the specified HTTP status code returned.  The rules are evaluated in the order they appear in the file.

## Design rationale

Popular services today such as [Netlify](https://docs.netlify.com/routing/redirects/#syntax-for-the-redirects-file) and [Cloudflare Pages](https://developers.cloudflare.com/pages/platform/redirects) allow developers to configure redirect support
using a `_redirects` file hosted at the top level of the web site.  While we do not intend to provide all of the same functionality, it seems desirable to use a similar approach to provide a meaningful subset of the functionality offered by these services.

- The format is simple and low on syntax
- Many developers are already familiar with this file name and format
- Using a text file for configuration enables developers to make changes without using other IPFS tools
- The configuration can be easily versioned in both version control systems and IPFS by virtue of the resulting change to the root CID for the content

### User benefit

Provides general URL redirect and redirect support.
The primary benefit is that developers will be able to host single-page applications in IPFS.
Pretty 404 pages will likely be the next most common use of this feature.

### Compatibility

If by some chance developers are already hosting sites that contain a `_redirects` file that does something else, they may need to update the contents of the file to match the new functionality.

### Security

This functionality will only be evaluated for Subdomain Gateways, to ensure that absolute URLs redirected to are relative to the root CID hosted at a specific subdomain.

Parsing of the `_redirects` file should be done safely to prevent any sort of injection vector.

### Alternatives

- There was some discussion early on about a [manifest file](https://github.com/ipfs/specs/issues/257) that could be used to configure redirect support in addition to many other things.  While the idea of a manifest file has merit, manifest files are much larger in scope and it became challenging to reach agreement on functionality to include.  There is already a large need for redirect support for SPAs, and this proposal allows us to provide that critical functionality without being hampered by further design discussion around manifest files.  In addition, similar to how Netlify allows redirect support to be configured in a `_redirects` file as well as an [app manifest](https://docs.netlify.com/configure-builds/file-based-configuration/#redirects), there is nothing precluding IPFS from allowing developers to configure redirect support in an app manifest later on.
- There was some discussion with the [n0](https://github.com/n0-computer/) team about potential ways to improve the performance of retrieving metadata such as redirect specifications, possibly including it as metadata with the root CID such that it would be included with the request for the CID to begin with.  I believe the performance concerns are mostly alleviated by not providing forced redirect support though.

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).