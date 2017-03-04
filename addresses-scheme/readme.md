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

### @timthelion's viewpoint (relates only to native POSIX, and not to HTML/the web)

@timthelion does not see the debate of `fs:/...` vs `dweb:/...` vs `ipfs:/...` to be worldshaking. All of these mechanisms would, according to him, work. The only real difference between them, that he can see, is asthetic. He is, however, strongly opposed to `/ipfs/...`. He sees it as mixing namespaces. @jbenet writes of `/ipfs/...` "addressing of data broke when URLs and URIs were defined as a space OUTSIDE unix/posix paths, instead of INSIDE unix/posix paths (unlike say plan9's 9p transparent addressing)". @timthelion, however, takes the opposite view. He does not see the fact of URLs and URIs having their own namespace as being problematic.

The reason why he sees this mixture of namespacing as being problematic is that current POSIX utilities, when asked to open a file, see a string which represents a path to a file. They then take this string, dumbly, without examining it, and pass that string to the system's `open` function. If you add a new layer to the POSIX `/` namespace, which cannot be understood by `open` then every program must decide whether to send that string onto `open` or to send it somewhere else. That decision should be easy, and in the case of URLs it is. Paths NEVER contain `:` unless they are a URL and therefore, it is trivial to figure out what can be sent to `open` and what must be sent elsewhere. Of course, timthelion understands that it is sad that the vast majority of POSIX utilities don't support opening URLs, but he sees this as a problem that can be solved, by adding a few lines of code to each utility, or, more universaly, by adding URL support to the OS's `open` function. He sees, adding a new layer to the `/` namespace as being a move that only complicates this transition and actually makes it harder, and not easier, to re-unite POSIX with the web.

Here is a peice of python code which is able to open both http urls and POSIX files.

````
if filename.startswith( "http://" ) or filename.startswith( "https://" ):
 import urllib.request
 try:
   with urllib.request.urlopen(filename) as webgraph:
     self.json = webgraph.read().decode("utf-8")
 except urllib.error.URLError as e:
    raise OSError(str(e))
else:
 try:
   with open(filename) as fd:
     self.json = fd.read()
 except FileNotFoundError:
   pass
````

Modifying this code in order to support `/ipfs/` paths is not left as an excercise to the reader, read on:

@timthelion wrote a wrapper for the `diff` utility which supports ipfs so as to demonstrate his point. The diff util has two implemenations. The first interprets `/ipfs/..` style paths, and works in the naive case:

````
timothy@yoga ~/c/ipfs-multiaddr> ./multiaddr-diff ../subuser/COPYING.LGPL  /ipfs/QmSRrBvLXvYQRdQ3kZtJ5oJicKMcNQzC3CwH6bJDbEKWYp
127a128,130
>    f) Sacrifice your first born child to the GOD Laurath on the first
>    full moon of the following even numbered year.
>
````

However, it contains a bug, if an `/ipfs/..` folder actually exists on the system. That folder is unnaccsessable to the modified diff util:

````
timothy@yoga ~/c/ipfs-multiaddr> su
Password: 
root@yoga:/home/timothy/current/ipfs-multiaddr# mkdir /ipfs/
root@yoga:/home/timothy/current/ipfs-multiaddr# echo "foo">/ipfs/foo
root@yoga:/home/timothy/current/ipfs-multiaddr# exit
exit
timothy@yoga ~/c/ipfs-multiaddr> ./multiaddr-diff ../subuser/COPYING.LGPL  /ipfs/foo
Error: selected encoding not supported
....
````

Here is the sorce code to the `/ipfs/..` version of the utility:

````
timothy@yoga ~/c/ipfs-multiaddr> cat multiaddr-diff 
#!/bin/bash
get_multiaddr_or_normal_file_getter(){
  if  [[ $1 == /ipfs/* ]] ;
  then
    file_getter="ipfs cat $1"
  else
    file_getter="cat $1"
  fi
  echo $file_getter
}

file1=`get_multiaddr_or_normal_file_getter $1`
file2=`get_multiaddr_or_normal_file_getter $2`

diff <($file1) <($file2)
````

He also wrote a second utility which iterprets paths which start with `dweb:/ipfs/` and sends only those paths on to ipfs.

Like the first version, this version works in the naive case:

````
timothy@yoga ~/c/ipfs-multiaddr> ./url-syntax-diff ../subuser/COPYING.LGPL  dweb:/ipfs/QmSRrBvLXvYQRdQ3kZtJ5oJicKMcNQzC3CwH6bJDbEKWYp
127a128,130
>    f) Sacrifice your first born child to the GOD Laurath on the first
>    full moon of the following even numbered year.
> 
timothy@yoga ~/c/ipfs-multiaddr> 
````

Unlike the first version, it is **also** capable of accessing a real existing `/ipfs/` directory:

````
timothy@yoga ~/c/ipfs-multiaddr> echo "bar" >bar
timothy@yoga ~/c/ipfs-multiaddr> ./url-syntax-diff bar  /ipfs/foo
cat bar
cat /ipfs/foo
1c1
< bar
---
> foo
````

Here is the source code to the second version, so you can play with it.

````
timothy@yoga ~/c/ipfs-multiaddr> cat url-syntax-diff 
#!/bin/bash
get_multiaddr_or_normal_file_getter(){
  if  [[ $1 == dweb:* ]] ;
  then
    prefix="dweb:"
    internal_path=${1#$prefix}
    file_getter="ipfs cat $internal_path"
  else
    file_getter="cat $1"
  fi
  echo $file_getter
}

file1=`get_multiaddr_or_normal_file_getter $1`
file2=`get_multiaddr_or_normal_file_getter $2`

diff <($file1) <($file2)
````

Another example that @timthelion came up with was the case of a hypothetical markdown to pdf utility which supports ipfs. Imagine we have a utilty named `md-to-pdf-with-ipfs-support` and we pass it a markdown file like so:

**atic.md**
````
Stuff I found in my attic
----------------------------------

![An old box of rocks](/ipfs/QmdyWzsrBvSkPYPU1ScBpwzfCcegzbc6c2hkEBLLJ6VcPV)

An old box of rocks.

![A can of oil for water-proofing leather](/ipfs/QmUPC5xbVtu6NxMwFBtmWVjrVM3XffuPtSMLpmDFGfTaKG)
````

````
$ md-to-pdf-with-ipfs-support attic.md > attic.pdf
````

How is this utility supposed to recognise which paths to resolve using `ipfs` and which paths to resolve normally? @flyingzumwalt suggests that prefixing `dweb:` for ipfs paths resolves this ambiguity and @timthelion concures.

````
Stuff I found in my attic
----------------------------------

![An old box of rocks](dweb:/ipfs/QmdyWzsrBvSkPYPU1ScBpwzfCcegzbc6c2hkEBLLJ6VcPV)

An old box of rocks.

![A can of oil for water-proofing leather](dweb:/ipfs/QmUPC5xbVtu6NxMwFBtmWVjrVM3XffuPtSMLpmDFGfTaKG)
````

@timthelion does not see resolving `/ipfs/` paths to be difficult merely for computers. As a human he is confused as well. When he sees `/ipfs` written on his local machine, he imagines that this means that the ipfs filesystem must be mounted in root for that path to be accessable. After reading the [multiaddr specs](https://github.com/multiformats/multiaddr) he had the feeling that this system would create unimaginable clutter on his system.

"""
Today, when I do `ls /` I get:

````
$ ls /
bin/   dev/  home/        lib/    media/  opt/   root/  sbin/  sys/  usr/  vmlinuz@
boot/  etc/  initrd.img@  lib64/  mnt/    proc/  run/   srv/   tmp/  var/
````

With the paths proposed by multiaddr I would instead see:

````
$ ls /
bin/ bitcoin/ boot/ dev/ dns/ dns4/ dns6/ etc/ home/ http/ https/ initrd.img@ ipfs/ lib/ lib64/
 libp2p-circuit-relay/ libp2p-webrtc-direct/ libp2p-webrtc-star/ media/ mnt/ onion/ opt/ p2p/ 
proc/ root/ run/ sbin/ sctp/ srv/ sys/ tmp/ udt/ unix/ usr/ utp/ var/ vmlinuz@
````
[multiaddr-protocols](https://github.com/multiformats/multiaddr/blob/master/protocols.csv)
"""

While this may be a misunderstanding on his part, other users may be confused as well.

@timthelion suggests, that if the ipfs devs insist on mixing special paths into the POSIX `/` namespace, they at least use a subdirectory and not polute all of the filesystem root `/`.

### @timthelion's compromise: place all `multiaddr` filesystems under a special directory `/webfs/` and treat the prefix `/webfs/` as a magic path prefix

If all of the "magic" `multiaddr` filesystems were placed in a subdirectory of root named `/webfs/` then it would be possible for utilities to treat paths starting with `/webfs/` as being magical and non-standard. @timthelion doesn't see this as being ideal, but it is better then having N new magic subdirectories of root `/`. In @timthelion`s oppinion, this would be somewhat analogous to how we sometimes mount flash disks and CDRoms to `/mnt/` or `/media/` but we never mount them in the root directory.

In that case, `ls /` would look like:

````
$ ls /
bin/   dev/  home/        lib/    media/  opt/   root/  sbin/  sys/  usr/  vmlinuz@
boot/  etc/  initrd.img@  lib64/  mnt/    proc/  run/   srv/   tmp/  var/ webfs/
````
