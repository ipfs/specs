DWeb Namespace API
- a minimal version of a typical http server router
- forbid route loops (e.g. /ipns => /ipld => /ipns)

---

where in firefox's architecture is CSP applied?
anyhow, ipfs://$CIDv1b32/path/within and same ipns:// probably sgtm
but do keep in mind what jbenet said about absolute paths

---

- WHATWG URL: https://url.spec.whatwg.org/
- NURI: https://github.com/ipfs/go-ipfs/issues/1678#issuecomment-157478515
- Path characters: https://github.com/ipfs/go-ipfs/issues/1710
- dweb maturity model
  - https://github.com/datatogether/datatogether/pull/7/files
  - https://www.martinfowler.com/articles/richardsonMaturityModel.html
- pfrazee's concerns
  - https://news.ycombinator.com/item?id=14421092
- timbl
  - on URL: https://www.w3.org/People/Berners-Lee/FAQ.html#etc
  - URI Axioms: https://www.w3.org/DesignIssues/Axioms.html
  - how to write specs: https://www.w3.org/1999/09/specification.html
- https://eager.io/blog/the-history-of-the-url-domain-and-protocol/
- plan9
  - https://news.ycombinator.com/item?id=3537259
  - https://hn.algolia.com/?query=plan9&sort=byPopularity&prefix&page=0&dateRange=all&type=story
- internet balkanization http://www.slate.com/blogs/future_tense/2014/02/19/stop_calling_decentralization_of_the_internet_balkanization.html

---

- jbenet's early summary: https://github.com/ipfs/go-ipfs/issues/1678#issuecomment-157478515
- flyingzumwalt's writeup: https://github.com/ipfs/specs/pull/152/files
- lgierth's writeup: https://github.com/ipfs/specs/pull/152#issuecomment-284628862
- iana PR: https://github.com/ipfs/specs/pull/139

---

- wired article: http://www.wired.co.uk/article/is-the-internet-broken-how-to-fix-it
- "facebook is a supernode" - meganode?

- URLs have location and hierarchy at their heart

---

```
22:42+0000 <@lgierth> the /wss scheme is far from ideal but it's what we have right now
22:43+0000 <@lgierth> it should be come /tls/http/ws instead in the future, when /tls and /http are speced
00:46+0000 <Magik6k> I'm not sure it /http should be speced for ws as websockets don't really run on top of http, they just use http for a handshake/protocol upgrade. Other than that they don't have anything to do with http
00:47+0000 <Magik6k> s/sure it/sure if/
00:49+0000 <@stebalien> Magik6k: It still uses HTTP. You're effectivly making an HTTP request and then getting a socket back. Actually, we'd need some way to specify paths in multiaddrs to really make it work.
00:53+0000 <Magik6k> I know, the point is that websockets use http as a part of handshake, so specifying http is kind of redundant
00:54+0000 <Magik6k> One case where it'd make sense is connection reuse from previous http requests (you can't reuse ws connections IIRC)
00:55+0000 <@lgierth> for paths in multiaddrs i see 3 options: a) escape forward-slashes somehow, b) have an additional /http-d or so scheme which would enclose the path in a delimiter and thus safely encapsulate/decapsulate/parse
00:57+0000 <@lgierth> the case of unix sockets is similar, you have e.g. /unix/var/run/foo.sock, but then how do you further encapsulate? need a way to have /unix safely parse as much as it's allowed
00:59+0000 <@lgierth> and for /http, there could be a websocket endpoint only available at /some/path -- option a) would make this /http/some\/path/ws, b) /http-d/$some/path$/ws
00:59+0000 <@lgierth> i forgot option c :/
01:00+0000 <@lgierth> binary representation doesn't have this issue since values length-prefixed, but can't reasonably do that for the human-readable string
01:01+0000 <Magik6k> maybe use a separator which http would normally escape
01:01+0000 <Magik6k> `!` perhaps
01:02+0000 <@lgierth> about /ws vs. /http/ws i realize we should take a good look at whether the coupling of http and websockets prevents us from actually separating this into 2 layers
01:03+0000 <@lgierth> Magik6k: could you write out how that'd look like in an address?
01:03+0000 <Magik6k> ../http/some!path/ws/..
01:22+0000 <@lgierth> ah, option c) take the syntax approach, e.g. /http/:/some/path/:/ws, where we actually invent a third type "delimiter" (in addition to protocol and value)
01:23+0000 <Magik6k> That's not bad
01:25+0000 <@lgierth> or a shorter syntax option: /http{/some/path}/ws
01:25+0000 <@lgierth> so this would be the actual syntax option - where as /:/ is a type option :P
01:26+0000 <@lgierth> it would be interesting to see whether there's some arcane shells that do this
01:46+0000 <deltab> in execline <http://www.skarnet.org/software/execline/>, nestable { and } desugar into a prefix on each argument
01:49+0000 <deltab> Lua <http://www.lua.org/manual/5.3/manual.html#3.1> has variable-length bracketing: [[ matches ]], [===[ matches ]===], etc.
02:01+0000 <@lgierth> mh! interesting! thanks!
02:01+0000 <deltab> CCNx URIs: https://www.ietf.org/proceedings/95/slides/slides-95-icnrg-1.pdf
02:39+0000 <deltab> also found this, about content-centric routing: https://www.christopher-wood.com/docs/conference/pitless17.pdf
```
---

quote juan, to be edited:

> The major reason has to do with unifying FSes, Databases, and the Web
with a singular way of addressing all data. It's about undoing the harm
that URLs brought unto computing systems by fragmenting the ecosystem.
To this day the rift between both worlds prevents simple tooling from
working with both, and has much to do with the nasty complexity of
working with networked data all the modern target platforms. Sorry, this
may sound vague, but it's very specific: addressing of data broke when
URLs and URIs were defined as a space OUTSIDE unix/posix paths, instead
of INSIDE unix/posix paths (unlike say plan9's 9p transparent
addressing). This made sense at the time, but it created a division that
to this day force "the web" and "the OS" to be very distinct platforms.
Things can be much better. Mobile platforms, for one, have done away
with the abstractions in the user facing parts, hiding away the rift
from users, and only forcing developers to deal with it (clearly a
better UX), but problems still exist, and many apps are hard to write
because of it. we'd like to improve things, particularly since "a whole
new world" of things is joining the internet (blockchains, ipfs, other
decentralized web things). It would be nice if there's a nice compatible
way to bridge with the web's expectations (dweb://...) but work towards
fixing things more broadly.

> A minor reason is not having to force people to swallow N shemes
(ipfs:// ipns:// ipld:// and counting), and instead use one that muxes.

 (important note) 
> These goals are secondary in time to getting browser
adoption. Meaning that we CAN do things like recommend ipfs:// ipns://
ipld:// IF browser vendors think that it's unlikely to get adoption this
way now. We can work on unifying the fs-db-web rift later. We're not
dogmatic, we're pragmatic. But we want to make sure we push in the right
places and try to make as much as we can better.

---

- the concepts of strictly self-described and upgrade path
- church of context vs. church of self-described

---

from: https://github.com/ipfs/in-web-browsers/issues/4

This is related to the work of #3: Sorting out an Address Scheme that fits with Browser Security Model.

Also see discussion in #5

## Acceptance Criteria

- [ ] Write a summary of how we want the namespace and address scheme to work, what actual problems it solves, what get’s better etc.. And followup with a compromise like this that could be employed in the meantime.

## Background

From @jbenet:

> ** (important note) These goals are secondary in time to getting browser adoption. Meaning that we CAN do things like recommend ipfs:// ipns:// ipld:// IF browser vendors think that it's unlikely to get adoption this way now. We can work on unifying the fs-db-web rift later. We're not dogmatic, we're pragmatic. But we want to make sure we push in the right places and try to make as much as we can better.**

and

> Note also that we expect dns naming (and similar-- eg blockstack, namecoin, ens) to be a thing for a while-- meaning that we can endeavor to make "the easy path" things like ipns://${domain-name}/path

His background explanation for the fs: approach:
> The major reason has to do with unifying FSes, Databases, and the Web with a singular way of addressing all data. It's about undoing the harm that URLs brought unto computing systems by fragmenting the ecosystem. To this day the rift between both worlds prevents simple tooling from working with both, and has much to do with the nasty complexity of working with networked data all the modern target platforms. Sorry, this may sound vague, but it's very specific: addressing of data broke when URLs and URIs were defined as a space OUTSIDE unix/posix paths, instead of INSIDE unix/posix paths (unlike say plan9's 9p transparent addressing). This made sense at the time, but it created a division that to this day force "the web" and "the OS" to be very distinct platforms. Things can be much better. Mobile platforms, for one, have done away with the abstractions in the user facing parts, hiding away the rift from users, and only forcing developers to deal with it (clearly a better UX), but problems still exist, and many apps are hard to write because of it. we'd like to improve things, particularly since "a whole new world" of things is joining the internet (blockchains, ipfs, other decentralized web things). It would be nice if there's a nice compatible way to bridge with the web's expectations (dweb://...) but work towards fixing things more broadly.

@jbenet:
> we'd like to improve things, particularly since "a whole new world" of things is joining the internet (blockchains, ipfs, other decentralized web things). It would be nice if there's a nice compatible way to bridge with the web's expectations (dweb://...) but work towards fixing things more broadly.

@gozala:
> I think I’ve seen talk or read about this. While I think that’s a very noble goal, I think it would be hard to sell for a very pragmatic crowd like browser vendors. I frequently see standardization process taking specs into least ambitious and most pragmatic direction, I often disagree, but I think often times that’s only way to make progress. Maybe some version of this goal could be articulated in perfectionistic manner and in a more pragmatic one ?

@jbenet:
> A minor reason is not having to force people to swallow N shemes (ipfs:// ipns:// ipld:// and counting), and instead use one that muxes.

@gozala:
> I think it was in the discussion I’ve quoted, but if not I most definitely got opposite feedback when talking to platform engineers about this. I think part of it is due to the fact it is compatible with existing security model on the web.
>
> To be honest I am much more worried about end users (browser users) perspective on having all this new protocols, regardless if they use separate schemes or a “hostname”. I am afraid either way it would be way too much & more familiar it will look the better off you’ll be.
>
> That being said given that /ipns/${id}/path may be referring to resource under /ipfs/${other-id}/other-path/ it ends up being cross-protocol resource handling that maybe one pragmatic reason to go for single protocol, but I still don’t think it’s going to be very strong one.
>
> My impression more and more has being that ipfs/ipns/ipld are internal details of IPFS and less relevant to the "dweb-apps”. Or to put it differently IPFS already has CIDs to encode several pieces of information about the content in a single ID, have you considered maybe encoding the ipfs/ipns/ipld  bits into it as well ? It may make things slightly less readable on one hand but on the other hand could unite everything under one protocol and keep it open for further extensions and require less coordination with embedders.

@gozala
> 👍 I would still encourage to write a summary of how you want it to be, what actual problems it solves, what get’s better etc.. And followup with a compromise like this that could be employed in the meantime.

---


---

from: https://github.com/ipfs/in-web-browsers/issues/6

## Acceptance Scenario

- [ ] Propose an address scheme that fits with Browser Security Model
- [ ] Provide working code that shows the address scheme working, and how it can be supported in the browser
- [ ] (optional) #4 Document the motivations for the more general fs: namespace and address scheme
- [ ] #6 Tackle identifying origins with (or without?) fs:// paths
- [ ] #7 Reconcile IPFS absolute addresses with standard URL resolution

## Background

The proposed use of `ipfs/` at the root of addresses in the `fs:` namespace like`fs://ipfs/{content hash}` conflicts with the single-domain content origin policy that is central to the browser security model.  This brings into question the whole idea of a generic `fs:` namespace rather than `ipfs:`




-----

This is part of the address scheme work described in #3

The underlying requirement:

Firefox, for example, implements https://url.spec.whatwg.org/ not the URL RFC. That's what we need to use if we want our urls to be Web-browser compatible

## Background

From @gozala:
> At least in Electron there is no way to make origin be anything other than a hostname, which means all the IPFS content will have either “fs://ipfs” or “fs://ipns” origin. I have starting messing with Gecko and I think it maybe possible to make origin different from hostname but even that I won’t be surprised if things won’t quite work out as expected due to implicit assumptions that hostname is an origin. Either way I’d encourage rethinking addressing as I suspect you’ll have a pushback from browser vendors, not only due to implementation difficulties but more due to introducing a new model that would work different from the  established one.

### Option: include CID in the origin domain

@gozala (2017-02-01)
> I have followed a rabbit hole of implementing a protocol handler for firefox that would handle fs://ipfs/${cid}/path/with-in such that origin would be fs://ipfs/${cid} but unfortunately my fear got confirmed and it’s undoable without making fundamental changes to the firefox code base & specifically to the parts that deal with content security policy. That is bad because, I expect to be a very hard sell given the implications it could have on millions of Firefox users.

@jbenet

> - Hopefully it can be done with re-routing the data flow to fit what firefox expects.
> - We can always define schemes like  ipfs://${cid}/path/...  ipns://${cid}/path/...   ipld://${cid}/path/... if that's so much easier, just note it will make other things hard. utlimately it's about tradeoffs and what we can get away with.
> - We've been considering changing fs://   to dweb:// which is clearer and more inclusive of other projects. and avoids repeating "fs" so much.  (eg   dweb://ipfs/${cid}/path/...   ---
> - Ultimately, i'm confident we can find a scheme and setup that works for FF, Chrome, other browsers, IPFS, and everyone. It may require changes on our side, or clever re-routing of info (as you've been exploring).

@gozala (2017-02-06):
> It would be invaluable to have those things listed somewhere.


@gozala (2017-02-01)
>
> Along the way I got some feedback from the people intimately familiar with the relevant code paths in firefox:
>
> Only visible way to implement something like that would be to roll out new C++ implemented component along the lines of nsIStandardURL and patch nsScriptSecurityManager component so that for that type of URL origin will be computed differently. Then also change nsNetUtil component  that is actually responsible for validating if resource is with in the policy (for example you can see that for file: protocol different origin checks are performed.

### Option: include public key in the paths

@gozala (2-17-02-06)
> Dat for instance is free of this problem as they just use dat://{public_key}/path/with/in so origin is what they want it to be.

## origin domains must be case-insensitive

@gozala:
> I attempted to try ipfs://${hash} and ipns://${id} as an alternative solution to make things work in Electron. Issue there is that hostnames are case insensitive & default hashes used by ipfs are by default case sensitive (base58 encoded). Presumably non all lower case addresses could be transcoded to use base16 encoding to avoid this issue, but even than it is not going to be ideal as user maybe be given an address encoded with base58 and say posting it as a link won’t work as expected. Not sure what is the best solution here but ideally all content addresses will be valid.

@jbenet:

> What if we resolve through to a CIDv1 encoded in the right base (16 or 32) non-transparently? meaning that we actually resolve through from
>   ```
>   fs://ipfs/${CIDv0 or CIDv1 in any base}/path  ->   ipfs://${CIDv1 in base16 or base32}/path
>   fs://ipns/${CIDv0 or CIDv1 in any base}/path  ->   ipns://${CIDv1 in base16 or base32}/path
>   fs://ipld/${CIDv0 or CIDv1 in any base}/path  ->   ipld://${CIDv1 in base16 or base32}/path
>   ipfs://${CIDv0 or CIDv1 in any base}/path  ->   ipfs://${CIDv1 in base16 or base32}/path
>   ipns://${CIDv0 or CIDv1 in any base}/path  ->   ipns://${CIDv1 in base16 or base32}/path
>   ipld://${CIDv0 or CIDv1 in any base}/path  ->   ipld://${CIDv1 in base16 or base32}/path
>   ```
>
> so that the browser can treat ${CIDv1 in base16 or base32} as the origin hostname?

### a working solution

@gozala (2017-02-01)

> Now good news is with David Diaz’s help and necessary fixes I was able to work out a solution which works as follows:
>
> fs, ipfs and ipns protocol handlers are added added to firefox.
> fs protocol handler essentially just redirects to either ipfs or ipns as follows
> ``` 
> fs://ipfs/${cid}/path/with-in/ -> ipfs://${cid_v1_base16}/path/with-in
> fs:ipfs/${cid}/path/with-in/ -> ipfs://${cid_v1_base16}/path/with-in
> fs:///ipfs/${cid}/path/with-in/ -> ipfs://${cid_v1_base16}/path/with-in
> fs:/ipfs/${cid}/path/with-in/ -> ipfs://${cid_v1_base16}/path/with-in
> fs://ipns/${cid}/path/with-in/ -> ipns://${cid_v1_base16}/path/with-in
> fs:ipns/${cid}/path/with-in/ -> ipns://${cid_v1_base16}/path/with-in
> fs:///ipns/${cid}/path/with-in/ -> ipns://${cid_v1_base16}/path/with-in
> fs:/ipns/${cid}/path/with-in/ -> ipns://${cid_v1_base16}/path/with-in
> ```
> both ipfs and ipns protocol handlers redirect to corresponding base16 encoded CID path
> ```
> ipfs://${cid_v0_base58}/path/with-in -> ipfs://${cid_v1_base16}/path/with-in
> ipfs:/${cid_v0_base58}/path/with-in -> ipfs://${cid_v1_base16}/path/with-in
> ipfs:///${cid_v0_base58}/path/with-in -> ipfs://${cid_v1_base16}/path/with-in
> ipfs:${cid_v0_base58}/path/with-in -> ipfs://${cid_v1_base16}/path/with-in
> 
> ipfs://${cid_v1}/path/with-in -> ipfs://${cid_v1_base16}/path/with-in
> ipfs:/${cid_v1}/path/with-in -> ipfs://${cid_v1_base16}/path/with-in
> ipfs:///${cid_v1}/path/with-in -> ipfs://${cid_v1_base16}/path/with-in
> ipfs:${cid_v1}/path/with-in -> ipfs://${cid_v1_base16}/path/with-in
> ```
> same with ipns
>
> both ipfs and ipns protocol handlers serve content from local node (that is assumed to be running), meaning that firefox will show URLs on the left but will serve content from URLs on the right.
> ```
> ipfs://${cid_v1_base16}/path/with-in => localhost:8080/ipfs/${cid_v0_base58}/path/with-in
> ipns://${cid_v1_base16}/path/with-in => localhost:8080/ipns/${cid_v0_base58}/path/with-in
> ```
> In a consequence to all the redirects everything works under (what I assume to be) 
> desired origin policy where it’s either `ipfs://${cid_v1_base16}/` or `ipfs://${cid_v1_base16}/` respectively.

---
