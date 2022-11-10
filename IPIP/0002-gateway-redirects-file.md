# IPIP 0002: _redirects File Support on Web Gateways

- Start Date: 2022-06-15
- Related Issues:
  - [ipfs/specs/issues/257](https://github.com/ipfs/specs/issues/257)
  - [ipfs/kubo/pull/8890](https://github.com/ipfs/kubo/pull/8890)
  - [ipfs-docs/pull/1275](https://github.com/ipfs/ipfs-docs/pull/1275)

## Summary

Provide support for URL redirects and rewrites for web sites hosted on Subdomain or DNSLink Gateways, thus enabling support for [single-page applications (SPAs)](https://en.wikipedia.org/wiki/Single-page_application), and avoiding  [link rot](https://en.wikipedia.org/wiki/Link_rot) when moving to IPFS-backed hosting.

## Motivation

Web sites often need to redirect from one URL to another, for example, to change the appearance of a URL, to change where content is located without breaking existing links (see [Cool URIs don't change](https://www.w3.org/Provider/Style/URI), [link rot](https://en.wikipedia.org/wiki/Link_rot)), to redirect invalid URLs to a pretty 404 page, or to enable URL rewriting.
URL rewriting in particular is a critical feature for hosting SPAs, allowing routing logic to be handled by front end code. SPA support is the primary impetus for this RFC.

Currently the only way to handle URL redirects or rewrites is with additional software such as NGINX sitting in front of the Gateway. This software introduces operational complexity and decreases the uniformity of experience when navigating to content hosted on a Gateway, thus decreasing the value proposition of hosting web sites in IPFS.

This IPIP proposes the introduction of redirect support for content hosted on Subdomain or DNSLink Gateways, configured via a `_redirects` file residing underneath the root CID of the web site.

## Detailed design

Allow developers to configure redirect support by adding redirect rules to a file named `_redirects` stored underneath the root CID of their web site.
The format for this file is similar to those of [Netlify](https://docs.netlify.com/routing/redirects/#syntax-for-the-redirects-file) and [Cloudflare Pages](https://developers.cloudflare.com/pages/platform/redirects) but only supporting a subset of their functionality.

The format for the file is `from to [status]`.

- `from` - specifies the path to intercept (can include placeholders and a trailing splat)
- `to` - specifies the path or URL to redirect to (can include placeholders or splat matched in `from`)
- `status` - optional [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status) (301 if not specified)

Rules in the file are evaluated top to bottom.

For performance reasons this proposal does not include forced redirect support (i.e. redirect rules that are evaluated even if the `from` path exists). In other word, redirect logic will be evaluated if and only if the requested path does not exist.  If the requested path exists, we won't even check for the existence of the `_redirects` file.

If a `_redirects` file exists but is unable to be processed, perhaps not even parsing correctly, errors will be returned to the user viewing the site via the Gateway.

The detailed specification is added in [`http-gateways/REDIRECTS_FILE.md`](../http-gateways/REDIRECTS_FILE.md).

### Test fixtures

`QmQyqMY5vUBSbSxyitJqthgwZunCQjDVtNd8ggVCxzuPQ4`

See spec for testing details.

## Design rationale

Popular services today such as [Netlify](https://docs.netlify.com/routing/redirects/#syntax-for-the-redirects-file) and [Cloudflare Pages](https://developers.cloudflare.com/pages/platform/redirects) allow developers to configure redirect support
using a `_redirects` file hosted at the top level of the web site. While we do not intend to provide all of the same functionality, it seems desirable to use a similar approach to provide a meaningful subset of the functionality offered by these services.

- The format is simple and low on syntax
- Many developers are already familiar with this file name and format
- Using a text file for configuration enables developers to make changes without using other IPFS tools
- The configuration can be easily versioned in both version control systems and IPFS by virtue of the resulting change to the root CID for the content

### User benefit

Provides general URL redirect and rewrite support, which enables three important features:
1. Developers will be able to host single-page applications in IPFS.
2. Same configuration file used for setting up pretty 404 pages.
3. The cost of switching hosting of an existing website to IPFS is lowered by making it possible to keep all legacy URLs working.

### Compatibility

If by some chance developers are already hosting sites that contain a `_redirects` file that does something else, they may need to update the contents of the file to match the new functionality. Errors returned to the user due to parsing errors will guide them regarding the required updates.

### Alternatives

- There was some discussion early on about a [manifest file](https://github.com/ipfs/specs/issues/257) that could be used to configure redirect support in addition to many other things. While the idea of a manifest file has merit, manifest files are much larger in scope and it became challenging to reach agreement on functionality to include.
There is already a large need for redirect support for SPAs, and this proposal allows us to provide that critical functionality without being hampered by further design discussion around manifest files.
In addition, similar to how Netlify allows redirect support to be configured in either a `_redirects` file or a more general [configuration file](https://docs.netlify.com/configure-builds/file-based-configuration/#redirects), there is nothing precluding IPFS from allowing developers to configure redirect support in an app manifest later on.
- There was some discussion with the [n0](https://github.com/n0-computer/) team about potential ways to improve the performance of retrieving metadata such as redirect rules, possibly including it as metadata with the root CID such that it would be included with the request for the CID to begin with.
I believe the performance concerns are alleviated by not providing forced redirect support, and looking for `_redirects` only if the DAG is missing a requested path.  Never the less, if a more generic metadata facility were to be introduced in the future, it may make sense to reconsider how redirect rules are specified.

### Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
