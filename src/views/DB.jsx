import React from 'react';
import Inspector from 'react-json-inspector';
import { withStore } from 'fluorine-lib';

import {
  decoding,
} from 'pipboylib';

import Database from '../stores/Database';
import dispatcher from '../dispatcher';

const { generateTreeFromDatabase } = decoding;

const db = dispatcher.reduce(Database).map(x => generateTreeFromDatabase(x));

@withStore(db.filter(x => x), 'db')
@withStore(db
  .filter(x => x && x.Status)
  .map(x => x.Status.EffectColor)
  .map(effectColor => {
    const effectColors = effectColor.map(x => Math.round(x * 255));
    const effect = {
      red: effectColors[0],
      green: effectColors[1],
      blue: effectColors[2],
    };
    return `rgb(${effect.red},${effect.green},${effect.blue})`;
  })
  .distinctUntilChanged(),
  'color')
export default class DB extends React.Component {
  static displayName = 'DB';

  static propTypes = {
    color: React.PropTypes.string,
    db: React.PropTypes.object,
  };

  render() {
    return (
      <Inspector data={ this.props.db }/>
    );
  }
}
