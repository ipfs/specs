2 An analysis the State of the Art in Network Stacks
====================================================

This section presents to the reader an analysis of the available protocols and arquitectures for a Network Stack. The goal is to provide the foundations from which to infer the conclusions and understand what are libp2p requirements and its designed arquitecture.

## 2.1 The client-server model

The client-server model indicates that both parties that ends of the channel have different roles, that support different services and/or have different capabilities, or in another words, speak different protocols.

Building client-server applications has been natural tendency for a number of reasons:

- The bandwidth inside a DataCenter is considerably high compared to the one available for clients to connect between each other
- DataCenter resources are considerably cheaper, due to efficient usage and bulk stocking
- Enables easier methods for the developer and system admin to have a fine grained control over the application
- Reduces the number of heteregeneus systems to be handled (although it is still considerably high)
- Systems like NAT make it really hard for client machines to find and talk with each other, forcing a developer to perform very clever hacks to traverse these obstacles.
- Protocols started to be designed with the assumption that a developer will create a client-server application from the start.

We even learned how to hide all of the complexity of a distributed system behind gateways on the Internet, using protocols that were designed to perform a point-to-point operation, such as HTTP, making it opaque for the application to see and understand how the cascade of service calls made for each request.

`libp2p` offers a move towards dialer-listener interactions, from the client-server listener, where it is not implicit which of the entities, dialer or listener, has which capabilities or is enabled to perform which actions. Setting up a connection between two applications today is a multilayered problem to solve, and these connections should not have a purpose bias, instead support to several other protocols to work on top of the established connection. In a client-server model, a server sending data without a prior request from the client is known as a push model, which typically adds more complexity, in a dialer-listener model, both entities can perform requests independently.

## 2.2 Categorizing the network stack protocols by solutions

### 2.2.1 Establishing the phisical Link

- ethernet
- wifi
- bluetooth
- usb

### 2.2.2 Addressing a machine or process

- IPv4
- IPv6
- Hidden Addressing, like SDP

### 2.2.3 Discovering other peers or services

- ARP
- DHCP
- DNS

### 2.2.4 Routing messages through the Network

- RIP(1, 2)
- OSPF
- PPP

### 2.2.5 Transport

- TCP
- UDP
- UDT
- QUIC
- WebRTC DataChannel

### 2.2.6 Agreed semantics for applications to talk to each other

- RMI
- Remoting
- RPC
- HTTP


## 2.3 Current Shortcommings

Although we currently have a panoply of protocols available for our services the communicate, the abundance and the variety of solutions is also its shortfall. It is currently dificult for an application to be able to support and be available through several transports (for e.g. the lack of TCP/UDP stack in browser applications).

There is also no 'presence linking', meaning that isn't a notion for a peer to announce itself in several transports, so that other peer can guarantee that it is always the same peer.
