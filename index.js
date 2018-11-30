const elasticsearch = require('elasticsearch');
const Chance = require('chance');
const moment = require('moment');
const turf = {
  bbox: require('@turf/bbox').default,
  booleanWithin: require('@turf/boolean-within').default,
  ...require('@turf/helpers'),
  ...require('@turf/random'),
};

// Create mapping from ISO31661 3-letter codes to 2-letter codes
const countryCodes = Object.assign({},
  ...(
    require('./sample-data/country-codes.json')
    .map(country => ({
      [country['alpha-3']]: country['alpha-2']
    }))
  )
);
// All countries, indexed by ISO31661
const countryPolygons = Object.assign({},
  ...(
    require('./sample-data/countries.geo.json')
    .features
    .map(feature => ({
      // Index by 2-letter code (to play well with Chance.js)
      [countryCodes[feature.properties.ISO_A3]]: feature.geometry
    }))
  )
);

const chance = Chance();
const client = new elasticsearch.Client({
  host: 'localhost:9200',
  // log: 'trace'
});
const index = 'metrics';
const type = 'parcels';

(async () => {
  if (await client.indices.exists({
      index
    })) {
    console.log(`Index '${index}' already exists.`)
    await client.indices.delete({
      index
    })
  } else {
    await client.indices.create({
      index,
      body: {
        mappings: {
          [type]: {
            properties: {
              location: {
                type: "geo_point"
              }
            }
          }
        }
      }
    })
  }

  const sets = 500;
  const maxCount = 2000;
  console.log(`Inserting ${sets} sets of up to ${maxCount} records:`)

  for (let i = 0; i < sets; i++) {
    const setCount = Math.round(maxCount * Math.random());
    const project = `project-${Math.round(Math.random() * 1000)}`

    // Let's generate some data to deviate off of...
    let country, poly;
    while (true) {
      // Some country codes don't have polygon data, keep trying until we find a country with data
      country = chance.country()
      poly = countryPolygons[country];
      if (poly) break;
    }

    // Find random point within country polygon's bounding box, ensure point is in country
    let point;
    while (true) {
      point = turf.randomPosition(turf.bbox(poly))
      if (turf.booleanWithin(turf.point(point), poly)) break;
    }
    const [avgLon, avgLat] = point
    const avgSize = getRandomFromRange(0, 100, 3)

    const avgAge = getRandomFromRange(15, 70, 0)
    const percentMale = Math.random()
    const popularUsage = getRandomFromArray(["residential", "commercial", "individual", "agriculture", "communal"])
    const usagePerc = Math.random()
    const popularHeld = getRandomFromArray(["customary", "statutory"])
    const heldPerc = Math.random()
    const dateSurveyed = moment().subtract(Math.random() * 1000, 'days')

    // Generate a series of insert commands to be sent to ES
    const records = Array(setCount).fill('').map(() => [{
        index: {
          _index: index,
          _type: type
        }
      },
      {
        gender: Math.random() < percentMale ? "M" : "F",
        age: Math.round(wiggle(avgAge, 10)),

        formality: getRandomFromArray(["informal", "formal"]),
        use: Math.random() < usagePerc ? popularUsage : getRandomFromArray(["residential", "commercial", "individual", "agriculture", "communal"]),
        held: Math.random() < heldPerc ? popularHeld : getRandomFromArray(["customary", "statutory"]),

        area: wiggle(avgSize, 50),
        location: {
          lat: wiggle(avgLat, .1),
          lon: wiggle(avgLon, .1),
        },

        project,
        country,
        date: dateSurveyed.subtract(randomPosNegFraction() * 1000000, 'seconds').toISOString()
      }
    ]);

    await client.bulk({
      body: records.reduce(((acc, arr) => acc.concat(arr)), [])
    });
    process.stdout.write(`${setCount}, `);
  }
})()

function getRandomFromRange(from, to, fixed) {
  return (Math.random() * (to - from) + from).toFixed(fixed) * 1;
}

function getRandomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function wiggle(baseNum, swing = 1) {
  return baseNum + (swing * randomPosNegFraction());
}

function randomPosNegFraction() {
  return Math.random() * (Math.random() > .5 ? -1 : 1);
}
