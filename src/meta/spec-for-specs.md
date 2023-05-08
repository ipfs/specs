---
title: Spec for Specs
description: >
  Specifies the format and system used to create and maintain specifications for
  the interplanetary stack.
date: 2023-03-14
maturity: stable
editors:
  - name: Robin Berjon
    email: robin@berjon.com
    url: https://berjon.com/
    github: darobin
    twitter: robinberjon
    mastodon: "@robin@mastodon.social"
    affiliation:
        name: Protocol Labs
        url: https://protocol.ai/
xref:
  - dom
  - test-methodology
tags: ['meta']
order: 1
---

This document specifies the format and system used to create and maintain specifications for
the interplanetary stack.

## Structure

Interplanetary specs are designed to be easy to write and maintain while still providing support for
document production features expected from Internet standards. A :dfn[spec] is a Markdown document enriched
with a small number of additional directives (a deliberate goal being to avoid the proliferation of
ad hoc syntax) and a specialised processor that knows how to resolve and extract metadata that is
useful to support rich interlinking in a standards suite.

The name of the Markdown file matters, because it will be used as the :ref[spec]'s :ref[shortname].
The :dfn[shortname] of a :ref[spec] is the key identifier that is used to refer to it when citing that
:ref[spec] or importing its definitions. The :ref[shortname] for this :ref[spec] is `spec-for-specs`
which means that you can cite it using `:cite[spec-for-specs]` which comes out as :cite[spec-for-specs]
(a :ref[spec] citing itself is not all that useful, really, but you can *also* do it from other
:ref[specs], which is kind of the point). The :ref[shortname] SHOULD be unique inside interplanetary
:ref[specs], and ideally in the entirety of the relevant standards universe, though that can at times
prove challenging.

### Frontmatter

A :ref[spec] MUST being with :ref[frontmatter]. :dfn[Frontmatter] is a preamble to the document placed
right at the start, delimited with `---` and containing YAML data (:cite[YAML]). The :ref[frontmatter]
for this :ref[spec] looks like this:

```yaml
---
date: 1977-03-15
editors:
    - name: Robin Berjon
      email: robin@berjon.com
      url: https://berjon.com/
      github: darobin
      twitter: robinberjon
      mastodon: "@robin@mastodon.social"
      affiliation:
          name: Protocol Labs
          url: https://protocol.ai/
maturity: stable
xref:
  - dom
  - test-methodology
---
```

The :ref[frontmatter] MUST contain an `editors` field, which is an array of objects describing people
who are responsible for editing this given :ref[spec]. The `editors` field MUST contain at least one
person. The fields that describe a person are `name`, `email`, `url`, `github`, `twitter`, `mastodon`,
and `affiliation` which is in turn an object with fields `name` and `url`. Each person as well as the
affiliation MUST have a `name`; every other field is OPTIONAL.

The `xref` field exemplified above is described in the [references](#refs) section.

The `maturity` field indicates the document's stability. This list is subject to revision, but the
maturity levels currently supported are:
- ![draft](https://img.shields.io/badge/status-draft-yellow.svg?style=flat-square)
- ![WIP](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)
- ![reliable](https://img.shields.io/badge/status-reliable-green.svg?style=flat-square)
- ![stable](https://img.shields.io/badge/status-stable-brightgreen.svg?style=flat-square)
- ![permanent](https://img.shields.io/badge/status-permanent-blue.svg?style=flat-square)
- ![deprecated](https://img.shields.io/badge/status-deprecated-red.svg?style=flat-square)

The `date` field is a `YYYY-MM-DD` specification of the last dated change to the spec.

### Title & Sections

A :ref[spec] MUST have a title, which is to say an `h1` heading (`# Some Title` in Markdown). It also
SHOULD have only one such title (every other heading should be `h2` or more) and have the title right
after the :ref[frontmatter]. The behaviour of multiple titles or titles positioned at random places in
the :ref[spec] is undefined and has been shown to disappoint kittens under experimental conditions.

Sections in a :ref[spec] are nested by using various heading depths. Note that nesting levels are
enforced automatically. If for instance you have an `h5` following an `h2`, it will be promoted to an
`h3` (recursively if it had nested `h6`s of its own).

All of the content between the `h1` spec title and the first subheading of the document is considered
to be the abstract for the document and will be incorporated into the header material.

Sections automatically get an identifier based on their heading. This is convenient, but it can cause
broken links when the section heading changes. If you wish to specify your own ID for a section you can
do so by appending `{#your-id}` to the heading, like so:

```md
### My Cool Section {#cool}
```

## Testable Assertions

Specifications SHOULD make use of :cite[RFC2119] keywords such as MUST or MUST NOT in order to express
conformance expectations as :ref[testable assertion]s.

All you need to do to avail yourself of these keywords is to type them in all caps, no markup required.
Additionally, if you use one the processor will automatically add a reference to :cite[RFC2119]. The
available RFC2119 keywords are:

* MUST
* MUST NOT
* SHOULD
* SHOULD NOT
* SHALL
* SHALL NOT
* MAY
* REQUIRED
* NOT REQUIRED
* RECOMMENDED
* NOT RECOMMENDED
* OPTIONAL

It is probably a bad idea to use the SHALL variants, and generally it is best to stick to MUST, SHOULD, MAY,
and their negations. In an ideal world, a :ref[spec] would stick to only using MUST and MUST NOT because
optionality in standards is harmful. In practice, however, some flexibilty can prove necessary.

:::note

I highly recommend reading [*A Method for Writing Testable Conformance Requirements*](https://www.w3.org/TR/test-methodology/)
(:cite[test-methodology]). Hidden behind that fanciful, almost enticingly romantic title is a treasure trove
of advice in writing good specification language. The core tenet of that document is simple: a good :ref[spec]
is a testable one, because tests are the empirical ground truth of interoperability. And in order to make a
:ref[spec] testable, it needs to be built from :ref[testable assertion]s and there is an art to writing those
effectively, which includes the judicious application of RFC2119 keywords.

:::

## Special Blocks

A number of additional structural constructs are available to capture common blocks that are
useful in specs: issues, warnings, notes, and examples.

An issue looks like this:

:::issue

This is a big, big problem.

:::

And the code for it is:

```md
:::issue

This is a big, big problem.

:::
```

A warning looks like this:

:::warning

Be careful!!!

Thar be dragons!

:::

And the code for it is:

```md
:::warning

Be careful!!!

Thar be dragons!

:::
```

A note looks like this:

:::note

Really, you want to pay attention to these things, because they kind of tend to matter, you know.

:::

And the code for it is:

```md
:::note

Really, you want to pay attention to these things, because they kind of tend to matter,
you know.

:::
```

An example looks like this:

:::example

And then it's just `document.getElementById('foo')`.

:::

And the code for it is:

```md
:::example

And then it's just `document.getElementById('foo')`.

:::
```

When including code, the best option is to specify the code's language as part of the code fence. This enables Prism to
kick in and to carry out syntax highlighting.

## Definitions

A :dfn[definition]{also="dfn,def"} is a key concept in a specification that can be referenced from other parts of the
spec or in other specs. The definition is created with a `:dfn[defined term]` directive. Some definitions can benefit
from having synonyms, and these can be specified as a comma-separated list with an `also` attribute as in
`:dfn[defined term]{also="term, def"}`.

Plurals are handled for you (for English-language specs), so that you can reference :ref[definitions] without trouble.

## References {#refs}

### Definitions

There are two primary types of references: to :ref[definitions] and to full documents that get added to the spec's
bibliographic references section.

Once a :ref[definition] has been created, it can be referenced with `:ref[definition]`. This includes the synonyms it
was givem, for instance :ref[def].

It's also possible to reference definitions from other specs by importing those other specs by referencing their :ref[shortnames]
in the `xref` section of the YAML :ref[frontmatter]:

```yaml
xref:
  - dom
  - spec-for-specs
```

Definitions are automatically extracted from each interplanetary :ref[spec] and stored in the same repository, under
`refs/dfn`. You can grep in there to find what you need to import if you are unsure which :ref[spec] defines a given
term. For :ref[specs] from the broader standards universe, you can use the [xref tool](https://respec.org/xref/) that
is part of [ReSpec](https://respec.org/) to look them up. Definition from any spec in the
[xref tool](https://respec.org/xref/) can be imported and used in an interplanetary :ref[spec]. This typically covers
definitions from the W3C, IETF, WHATWG, ECMA TC39, the Khronos Group, Unicode, and an assortment of others.

Once that's done, you can reference, say, the DOM concept of :ref[element] with just `:ref[element]` as if it were
defined locally.

### Bibliographic

Citing specs or more generally documents like :cite[html], :cite[rfc8890], :cite[privacy-principles], or :cite[spec-for-specs]
is accomplished using the shortname in a
`:cite[shortname]` block, as in `:cite[html], :cite[rfc8890], :cite[privacy-principles], or :cite[spec-for-specs]`. The idea
is to use this mechanism to easily provide context when you are referring to notions defined in another document but not
specifically a :ref[definition] in particular.

Simply by citing a given document it will be added to the bibliographic reference section that is automatically generated
at the end of your :ref[spec]. You can use any :ref[shortname] listed in [Specref](https://www.specref.org/) (there are
over 50k docs there) as well as any :ref[shortname] from the interplanetary space.
