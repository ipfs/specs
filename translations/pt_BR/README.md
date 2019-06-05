# Especificações

![](media-artifacts/ipfs-splash.png)

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> Este repositório contém as especificações do protocolo IPFS e dos subsistemas associados.

Algum dia, esperamos transformar essas especificações em RFCs. Por enquanto, elas assumem um alto nível de familiaridade com os conceitos.

## Índice

- [Trabalho em progresso](#work-in-progress)
- [Especificações](#specs)
  - [Arquitetura de alto nível do IPFS](/architecture)
  - [IPLD](https://github.com/ipld/specs)
  - [libp2p](https://github.com/libp2p/specs)
    - [IPRS](https://github.com/libp2p/specs/blob/master/IPRS.md)
  - [bitswap](/bitswap)
  - [API de Arquivos e MFS](/files)
  - [API Pública (CLI, HTTP and Core)](/public-api)
  - [DEX - Importadores e Exportadores](/dex)
  - [keychain](/keychain)
  - [keystore](/keystore)
  - [Repo](/repo)
  - [Protocol Driven Development](https://github.com/ipfs/pdd)
- [Contribuir](#contribute)
- [Licença](#license)

## Trabalho em progresso

**As especificações ainda não estão concluídas. Usamos o seguinte sistema de tags para identificar seu estado:**

- ![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) - essa especificação é um trabalho em andamento, provavelmente nem é completa.
- ![](https://img.shields.io/badge/status-draft-yellow.svg?style=flat-square) - essa especificação é um rascunho e provavelmente mudará substancialmente.
- ![](https://img.shields.io/badge/status-reliable-green.svg?style=flat-square) - acredita-se que esta especificação esteja próxima da final. são apenas pequenas alterações.
- ![](https://img.shields.io/badge/status-stable-brightgreen.svg?style=flat-square) - é provável que essa especificação melhore, mas não mude fundamentalmente.
- ![](https://img.shields.io/badge/status-permanent-blue.svg?style=flat-square) - essa especificação não será alterada.

Nada neste repositório de especificações é `permanent` ainda. As partes mais importantes do IPFS são agora `reliable` ou` stable`. Muitos subsistemas permanecem como `draft`.


Observe que, como em muitos repositórios IPFS, a maior parte do trabalho está acontecendo em [issues](https://github.com/ipfs/specs/issues/) ou em [active pull requests](https://github.com/ipfs/specs/pulls/). Dê uma olhada!

## Especificações

As especificações contidas neste repositório são:

**Protocolo IPFS:**
- [protocol](/architecture) - as especificações top-level e pilha
- [overviews](/overviews) - visões gerais das várias partes do IPFS

**Camada de Rede:**
- [libp2p](https://github.com/libp2p/specs) - A libp2p é uma pilha de rede modular e extensível, criada e usada pelo IPFS, mas que pode ser reutilizada como um projeto independente. Camadas:
   - rede - a especificação de rede
   - roteamento - a especificação da camada de roteamento
     - kademlia - Kademlia DHT
     - relay - o protocolo relay
     - dnssd - mDNS para redes locais
     - snr - super nó de roteamento
     - multirouter - combina vários outros

**Sistemas de Registros e Nomes:**
- [IPRS](https://github.com/libp2p/specs/blob/master/IPRS.md) - InterPlanetary Record System
- [IPNS](/naming) - InterPlanetary Naming System

**Estrutura de dados e formatos:**
- [IPLD](https://github.com/ipld/spec) - InterPlanetary Linked Data.
- [unixfs](/unixfs)
- [multiformats](http://github.com/multiformats/multiformats)
  - [multihash](https://github.com/multiformats/multihash) - formato de hash auto-descritivo.
  - [multiaddr](https://github.com/multiformats/multiaddr) - endereçamento de formato auto-descritivo.
  - [multicodec](https://github.com/multiformats/multicodec) - fluxos de codificação/protocolo auto-descritivo (nota: um arquivo é um fluxo).
  - [multistream](https://github.com/multiformats/multistream) - multistream é um formato - ou protocolo simples - para desambiguação e fluxo de camadas. É extremamente simples.

**Arquivos / Sistema de Arquivos Mutável:**
- [Files Impl and API](/files) - Interface do Virtual File System, como no Unix, no topo do MerkleDAG

**Exchanges:**
- [bitswap](/bitswap) - Exchange inspirada no BitTorrent

**Componentes internos específicos:**
- Serviço de Blocos e Blocos
- Serviço DAG e DAG
- Importação de dados
- [Repo](/repo) - especificação do repositório local do nó do IPFS

**APIs Públicas**
- [Core API](/public-api/core) - interface de programação do IPFS
- [HTTP API](https://github.com/ipfs/http-api-spec) - Especificação da API HTTP IPFS
- [CLI](/public-api/cli) - Interface da Linha de Comando

**Gerenciamento de chaves:**
- [KeyStore](/keystore) - Gerenciamento de chaves no IPFS
- [KeyChain](/keychain) - Distribuição de artefatos criptográficos

**Outros/relacionados:**
- [PDD](https://github.com/ipfs/pdd) - Protocol Driven Development

## Contribua

Sugestões, contribuições e críticas são bem vindas. Embora, antes de fazê-la, por favor, certifique-se de se familiarizar profundamente com o IPFS, com os modelos que ele adota e os princípios que ele segue.

Esteja ciente de que as especificações são realmente difíceis de projetar pelo comitê. Trate este espaço como se fosse a oficina de um artista. Por favor, sugira melhorias, mas por favor, não fique desapontado se dissermos não a alguma coisa. O que deixamos de fora costuma ser mais importante do que aquilo que acrescentamos.

Sinta-se livre para participar. Todos bem-vindos. Abra uma [issue](https://github.com/ipfs/specs/issues)!

Este repositório está incluído no [Código de Conduta](https://github.com/ipfs/community/blob/master/code-of-conduct.md) do IPFS.

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## Licença

TBD. Veja https://github.com/ipfs/specs/issues/137.
