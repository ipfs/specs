(Unresolved) Address Scheme for IPFS
=================

# Backround for the Discussions about an Address Scheme for IPFS and `ipfs:` URIs

The discussions around `ipfs:` vs. `fs:` vs. `dweb:` is a confusing one that's been going on since @jbenet published the [IPFS whitepaper](https://ipfs.io/ipfs/QmR7GSQM93Cx5eAg6a6yRzNde1FQv7uL6X1o4k7zrJa3LX/ipfs.draft3.pdf).

There are a few goals tugging against each other: 
1. The Noble Goal: Unify the filesystem-database-web rift
2. The Pragmatic Goal: Do the obvious, easy thing.
3. The Design Goal: Create Addresses that People will Love Using

Regardless of which goals resonate with you, there are a number of important factors that have to be handled by any schema.  A number of those factors are collected & discussed in these issues: 
https://github.com/ipfs/in-web-browsers/issues?q=is%3Aissue+label%3Aspecs

## The Noble Goal: Unify the filesystem-database-web rift

In short, @jbenet wants to fix a mistake that happened 25-30 years ago and sees this current decision as an inflection point where we either A) use this "decentralization" moment to fix the problem or B) let all these decentralized protocols worsen the problem by going along with the existing momentum. In @gozala's words, "While I think that’s a very noble goal, I think it would be hard to sell for a very pragmatic crowd".

### Unify the filesystem-database-web rift

In conversations documented [here](https://github.com/ipfs/in-web-browsers/issues/4), @jbenet and @gozala cover this topic relatively concisely.

@jbenet explained his rationale:

> The major reason has to do with unifying FSes, Databases, and the Web with a singular way of addressing all data. It's about undoing the harm that URLs brought unto computing systems by fragmenting the ecosystem. To this day the rift between both worlds prevents simple tooling from working with both, and has much to do with the nasty complexity of working with networked data all the modern target platforms. Sorry, this may sound vague, but it's very specific: addressing of data broke when URLs and URIs were defined as a space OUTSIDE unix/posix paths, instead of INSIDE unix/posix paths (unlike say plan9's 9p transparent addressing). This made sense at the time, but it created a division that to this day force "the web" and "the OS" to be very distinct platforms. Things can be much better. Mobile platforms, for one, have done away with the abstractions in the user facing parts, hiding away the rift from users, and only forcing developers to deal with it (clearly a better UX), but problems still exist, and many apps are hard to write because of it. we'd like to improve things, particularly since "a whole new world" of things is joining the internet (blockchains, ipfs, other decentralized web things). It would be nice if there's a nice compatible way to bridge with the web's expectations (dweb://...) but work towards fixing things more broadly.

also 

> we'd like to improve things, particularly since "a whole new world" of things is joining the internet (blockchains, ipfs, other decentralized web things). It would be nice if there's a nice compatible way to bridge with the web's expectations (dweb://...) but work towards fixing things more broadly.

also 

> A minor reason is not having to force people to swallow N shemes (ipfs:// ipns:// ipld:// and counting), and instead use one that muxes.

### ... but don't let it prevent pragmatism.

@gozala encouraged pragmatism:
> While I think that’s a very noble goal, I think it would be hard to sell for a very pragmatic crowd like browser vendors. I frequently see standardization process taking specs into least ambitious and most pragmatic direction, I often disagree, but I think often times that’s only way to make progress. Maybe some version of this goal could be articulated in [less] perfectionistic manner and in a more pragmatic one ?

@jbenet agreed to that pragmatism:
> **These goals are secondary in time to getting browser adoption. Meaning that we CAN do things like recommend ipfs:// ipns:// ipld://** IF browser vendors think that it's unlikely to get adoption this way now. We can work on unifying the fs-db-web rift later. **We're not dogmatic, we're pragmatic.** But we want to make sure we push in the right places and try to make as much as we can better.

### Designing the `dweb:` Schema

A draft spec for the `dweb:` schema is under way at https://github.com/ipfs/in-web-browsers/issues/28

## The Pragmatic Goal: Do the obvious, easy thing.

The short-term fix that people reach for is to create an `ipfs:` schema, as proposed in https://github.com/ipfs/specs/pull/139. That approach seems simple at first, but it's got problems.

### Why it's not good enough

#### Reason 1: We want IPFS, IPNS and IPLD to be handled by a single schema
Creating an `ipfs:` schema would not be enough because `ipfs:` only refers to mutable content. You would, at the very least, need an `ipns:` schema too.

The `dweb:` schema dodges this by treating IPFS and IPNS as namespaces within a single `dweb` address scheme

#### Reason 2: This would worsen the filesystem-database-web rift
See [The Noble Goal: Unify the filesystem-database-web rift](#the-noble-goal-unify-the-filesystem-database-web-rift) above.

## The Design Goal: Create Addresses that People will Love Using

From a design perspective, the challenge is to create a schema that makes intuitive sense, maximizes possibilities, and allows people to identify content with addresses that are reliable, powerful, and pleasant to use.

### A Possible Compromise

In [this cryptic comment](https://github.com/ipfs/in-web-browsers/issues/28#issuecomment-281135393), @nicola proposes a compromise. It's a clever way to allow people to use `ipfs:` and `ipns:` addresses without breaking from the `fs:`/`dweb:` address scheme. The protocol-design gymastics involved are a bit confusing. They revolve around the fact that we treat `ipfs` and `ipns` as _namespaces_, not _schemas_. We can just say "`ipfs:/A-HASH`" is equivalent to "`dweb:/ipfs/A-HASH`", allowing browsers to believe that `ipfs` is a schema when actually it's just a namespace within a more fundamental `dweb:` schema. All we have to do to support this is make IPFS treat paths starting with `/ipfs:/` as being equivalent to `/ipfs/` (no colon).

In the end this hack would let you have addresses that look like `ipfs:/QmdyWzsrBvSkPYPU1ScBpwzfCcegzbc6c2hkEBLLJ6VcPV` while also allowing people to address that same content as `dweb:/ipfs/QmdyWzsrBvSkPYPU1ScBpwzfCcegzbc6c2hkEBLLJ6VcPV` or, in a unix/posic contenxt just `/ipfs/QmdyWzsrBvSkPYPU1ScBpwzfCcegzbc6c2hkEBLLJ6VcPV`.

to quote him from an offline conversation, @nicola poses this as the baseline -- we have to beat this in terms of simplicity of use. Calling it an ugly hack isn't good enough. You need to pose a better solution that creates **cleaner, more reliable, or more powerful addresses**.
