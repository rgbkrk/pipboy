import {
  connection,
  decoding,
  status,
  constants
} from 'pipboylib';

import {
  Observable
} from 'rx'

const {
  discover,
  createSocket,
  sendPeriodicHeartbeat,
  createConnectionSubject
} = connection

const {
  parseBinaryMap,
  parseBinaryDatabase,
  aggregateBundles,
  generateTreeFromDatabase
} = decoding

const {
  connected
} = status

const {
  channels
} = constants

/*
import React from 'react';
import { render } from 'react-dom';
import { Map, Marker, Popup, TileLayer } from 'react-leaflet';
*/

discover()
  .then(server => createSocket(server.info.address))
  .then(socket => {
    sendPeriodicHeartbeat(socket)
    return createConnectionSubject(socket)
  })
  .then(subject => {
    connected(subject)
      .then(handshake => {
        // Create Canvas for Fallout 4 Map
        const canvas = document.getElementById('localmap')
        const context = canvas.getContext('2d')

        let image;
        let empty;
        let prev;

        const arrow = document.getElementById('arrow')
        arrow.style.left = '50%'
        arrow.style.top = '50%'

        canvas.style.WebkitFilter = 'hue-rotate(0deg)'

        subject.onNext(['RequestLocalMapSnapshot'])
        const localmap = subject
          .filter(x => x.type === channels.LocalMapUpdate)
          .throttle(1000 / 30) // 30 FPS hard limit
          .doOnNext(x => {
            subject.onNext(['RequestLocalMapSnapshot'])
          })
          .map(x => parseBinaryMap(x.payload))
          .distinctUntilChanged()

        const resize = Observable
          .fromEvent(window, 'resize')
          .merge(Observable.just())

        localmap
          .first()
          .combineLatest(resize, x => ({
            x: window.innerWidth / x.width,
            y: window.innerHeight / x.height
          }))
          .subscribe(scale => {
            canvas.style.transform = `scale(${scale.x},${scale.y})`
            canvas.style.transformOrigin = '0 0'
          })

        localmap
          .filter(localmap => {
            if (!empty) {
              empty = new Buffer(localmap.pixels.length)
            }
            return !localmap.pixels.equals(empty)
          })
          .map(localmap => {
            const {
              width,
              height,
              pixels
            } = localmap

            if (!image) {
              image = context.createImageData(width, height)
            }

            const data = image.data;

            for (let i = 0; i < pixels.length; i++) {
              const val = pixels[i]
              if (!prev || val !== prev[i]) {
                const offset = i * 4
                data[offset] = val
                data[offset + 1] = val
                data[offset + 2] = val
                data[offset + 3] = 255
              }
            }

            prev = pixels
            return {
              image,
              localmap
            }
          })
          .subscribe(res => {
            const {
              image,
              localmap
            } = res

            canvas.height = localmap.height
            canvas.width = localmap.width
            context.globalCompositeOperation = 'source-over'

            context.putImageData(image, 0, 0)
            context.globalCompositeOperation = 'multiply'
            context.fillStyle = 'rgb(25, 255, 25)'
            context.fillRect(0, 0, map.width, map.height)
          })

        const database = subject
          .filter(x => x.type === channels.DatabaseUpdate)
          .map(x => parseBinaryDatabase(x.payload))
          .scan(aggregateBundles, {})
          .map(x => generateTreeFromDatabase(x))

        database
          .map(x => x.Map.World.Player)
          .map(x => x.Rotation)
          .distinctUntilChanged()
          .subscribe(rotation => {
            arrow.style.transform = `rotate(${rotation}deg)`
          })
      })
      .catch(err => {
        console.error('Couldn\'t establish connection!', err);
        console.error(err.stack);
      })
  })
  .catch(err => {
    throw err
  })

/*
const position = [51.505, -0.09];
const map = (
  <Map center={position} zoom={13}>
    <TileLayer
      url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
      attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    />
    <Marker position={position}>
      <Popup>
        <span>A pretty CSS3 popup.<br/>Easily customizable.</span>
      </Popup>
    </Marker>
  </Map>
);
render(map, document.getElementById('map-container'));
*/

import L from 'leaflet';

const position = [0, 0];
const map = L.map('map').setView(position, 0);

const tilePath = 'http://oyster.ignimgs.com/ignmedia/wikimaps/fallout-4/commonwealth/{z}/{x}-{y}.jpg'

L.tileLayer(tilePath, {}).addTo(map);
