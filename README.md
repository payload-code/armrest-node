# Armrest Node.js Client Library

A Node.js library for creating an Armrest client api.

## Installation

## Install using npm

```bash
npm install @armrest/client
```

## Get Started

**ESM**

```javascript
import Armrest from '@armrest/client'
```

### Create new api

```javascript
const API = new Armrest('http://armrest-api-url')
  .model('Example')

const api = API.Session('api-key')
```

### Creating an Object

```javascript
const example = await api.Example.create({
  test: 'attribute'
})
```

### Updating an Object

```javascript
await example.update({ test: 'changevalue' })
```

### Selecting Objects

Objects can be selected using any attribute.

```javascript
const results = await api.select(api.Example).filterBy({ test: 'value' })
```

Write complex queries using `filter`.

```javascript
const results = api.Example.filter(
    pl.or(
       pl.Example.test.eq('value'),
       pl.Example.test.eq('othervalue')
    )
)
```

