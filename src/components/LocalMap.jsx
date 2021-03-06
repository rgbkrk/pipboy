import React from 'react'

import { Observable } from 'rx'
import { withStore } from 'fluorine-lib'

import { decoding, constants } from 'pipboylib'
const { parseBinaryMap, generateTreeFromDatabase } = decoding
const { RequestLocalMapSnapshot } = constants.commands

import {
  SERVER_LOCALMAP_UPDATE
} from '../constants/server_types'

import PlayerArrow from './PlayerArrow'
import dispatcher from '../dispatcher'
import Database from '../stores/Database'

const styles = {
  localMap: {
    display: 'block',
    height: '100%',
    width: '100%',
    overflow: 'hidden'
  },
  canvas: {
    background: '#000'
  }
}

@withStore(dispatcher
  .reduce(Database)
  .map(x => generateTreeFromDatabase(x))
  .map(x => x && x.Map.World.Player.Rotation)
  .distinctUntilChanged(),
  'orientation')
@withStore(dispatcher
  .filter(x => x && x.type === SERVER_LOCALMAP_UPDATE)
  .map(x => parseBinaryMap(x.payload))
  .filter(map => {
    return !map.pixels.equals(new Buffer(map.pixels.length))
  }),
  'map')
export default class LocalMap extends React.Component {
  static contextTypes = {
    sendCommand: React.PropTypes.func.isRequired
  }

  constructor(props, context) {
    super(props, context)

    this.state = {
      width: props.map.width,
      height: props.map.height
    }
  }

  componentDidMount() {
    this.updateMap(this.props.map)
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.map !== this.props.map) {
      this.updateMap(nextProps.map)
    }
  }

  updateMap = map => {
    // Get next LocalMap
    this.context.sendCommand('RequestLocalMapSnapshot')

    const {
      width,
      height,
      pixels
    } = map

    const context = this.refs.canvas.getContext('2d')
    const image = context.createImageData(width, height)
    const data = image.data

    for (let i = 0; i < pixels.length; i++) {
      const val = pixels[i]
      const offset = i * 4
      data[offset] = val
      data[offset + 1] = val
      data[offset + 2] = val
      data[offset + 3] = 255
    }

    context.globalCompositeOperation = 'source-over'
    context.putImageData(image, 0, 0)
    context.globalCompositeOperation = 'multiply'
    context.fillStyle = 'rgb(25, 255, 25)'
    context.fillRect(0, 0, width, height)
  }

  render() {
    return (
      <div style={styles.localMap}>
        <canvas
          style={styles.canvas}
          height={this.state.height}
          width={this.state.width}
          ref="canvas"/>
        <PlayerArrow
          orientation={this.props.orientation || 0}
          x={0.5}
          y={0.5}/>
      </div>
    )
  }
}
