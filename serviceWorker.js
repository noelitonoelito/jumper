// identifier for this app.
//   this needs to be consistent across every cache update.
const APP_PREFIX = "jumper"
// version of the off-line cache.
//   change this value every time you want to update cache.
const VERSION = "v0.22.0"
const CACHE_NAME = `${APP_PREFIX}_${VERSION}`
const URLS_TO_CACHE = [
  // use "/" instead of "/index.html"
  `/${APP_PREFIX}/`,
  `/${APP_PREFIX}/main.css`,
  `/${APP_PREFIX}/main.js`,

  `/${APP_PREFIX}/images/game-over.svg`,

  `/${APP_PREFIX}/images/controls/left.svg`,
  `/${APP_PREFIX}/images/controls/play.svg`,
  `/${APP_PREFIX}/images/controls/replay.svg`,
  `/${APP_PREFIX}/images/controls/right.svg`,

  `/${APP_PREFIX}/images/jumpers/bob-icon.svg`,
  `/${APP_PREFIX}/images/jumpers/bob-jumping.svg`,
  `/${APP_PREFIX}/images/jumpers/bob-standing.svg`,
  `/${APP_PREFIX}/images/jumpers/caleb-icon.svg`,
  `/${APP_PREFIX}/images/jumpers/caleb-jumping.svg`,
  `/${APP_PREFIX}/images/jumpers/caleb-standing.svg`,
  `/${APP_PREFIX}/images/jumpers/zobie-icon.svg`,
  `/${APP_PREFIX}/images/jumpers/zobie-jumping.svg`,
  `/${APP_PREFIX}/images/jumpers/zobie-standing.svg`,

  `/${APP_PREFIX}/images/platforms/basic.svg`,

  `/${APP_PREFIX}/images/stages/clouds.svg`,

  `/${APP_PREFIX}/sounds/background-music.mp3`,
  `/${APP_PREFIX}/sounds/click.mp3`,
  `/${APP_PREFIX}/sounds/game-over.mp3`,
  `/${APP_PREFIX}/sounds/jump-1.mp3`,
  `/${APP_PREFIX}/sounds/jump-2.mp3`,
  `/${APP_PREFIX}/sounds/jump-3.mp3`,
  `/${APP_PREFIX}/sounds/jump-4.mp3`
]

const PARTIAL_CONTENT = 206

function cacheResources(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("installing cache: " + CACHE_NAME)
      return cache.addAll(URLS_TO_CACHE)
    })
  )
}

function deleteExpiredCache(event) {
  event.waitUntil(
    caches.keys().then((keys) => {
      // `keys` contains all cache names under your subdomain.
      const cacheToKeep = keys.filter((key) => key.indexOf(`${APP_PREFIX}_`))
      cacheToKeep.push(CACHE_NAME)

      return Promise.all(keys.map((key) => {
        if (cacheToKeep.includes(key)) { return }
        console.log("deleting cache: " + key)
        return caches.delete(key)
      }))
    })
  )
}

// https://samdutton.github.io/samples/service-worker/prefetch-video/
function fromCacheElseFetch(event) {
  console.log("Handling fetch event for", event.request.url)

  if (event.request.headers.get("range")) {
    const startPosition =
      Number(/^bytes\=(\d+)\-$/g.exec(event.request.headers.get("range"))[1])
    console.log("Range request for", event.request.url,
      ", starting position:", startPosition)
    event.respondWith(
      caches.open(CACHE_NAME)
        .then((cache) => cache.match(event.request.url))
        .then(async (res) => {
          if (res) { return res.arrayBuffer() }
          return fetch(event.request).then(res => res.arrayBuffer())
        })
        .then((arrayBuffer) => {
          return new Response(
            arrayBuffer.slice(startPosition),
            {
              status: PARTIAL_CONTENT,
              statusText: "Partial Content",
              headers: [
                ["Content-Range", "bytes " + startPosition + "-" +
                  (arrayBuffer.byteLength - 1) + "/" + arrayBuffer.byteLength]]
            }
          )
        })
    )
  } else {
    console.log("Non-range request for", event.request.url)
    event.respondWith(
      // caches.match() will look for a cache entry in all of the caches
      //   available to the service worker.
      // It's an alternative to first opening a specific named cache and
      //   then matching on that.
      caches.match(event.request).then((response) => {
        if (response) {
          console.log("Found response in cache:", response)
          return response
        }

        console.log("No response found in cache. About to fetch from network...")

        return fetch(event.request)
          .then((response) => {
            console.log("Response from network is:", response)
            return response
          })
          .catch((error) => {
            // 404 errors will NOT trigger an exception.
            console.error("Fetching failed:", error)
            throw error
          })
      })
    )
  }
}

self.addEventListener("install", cacheResources)
self.addEventListener("activate", deleteExpiredCache)
self.addEventListener("fetch", fromCacheElseFetch)