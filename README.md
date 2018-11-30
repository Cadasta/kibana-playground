# Kibana Playground

This codebase is designed to allow a user to quickly startup [Elasticsearch](https://www.elastic.co/products/elasticsearch), [Kibana](https://www.elastic.co/products/kibana), and to populate the infrastructure with fake data.

## Installation

### Requirements

This codebase expects that the user has the following installed:

- [Node 8.10 or greater](https://nodejs.org/en/download/)
- [Docker CLI](https://docs.docker.com/#run-docker-anywhere)

### Setup Infrastructure

#### Start Elasticsearch

From your command line, run the following:

```sh
npm run es
```

After a few minutes, Elasticsearch should be running at http://localhost:9200

#### Start Kibana

From your command line, run the following if you are using Apple OS X:

```sh
npm run kibana-mac
```

otherwise, run:

```sh
npm run kibana
```

After a few minutes, Kibana should be running at http://localhost:5601

### Populate Fake Data

From your command line, run the following:

```sh
node index.js
```
