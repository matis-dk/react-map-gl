// @flow

import { PureComponent, createElement } from 'react';
import { is, isImmutable } from 'immutable';

import MapContext from '../MapContext';
import diff from '../../utils/diff';
import queryRenderedFeatures from '../../utils/queryRenderedFeatures';

type Props = {
  /** Mapbox GL Layer id */
  id: string,

  /** Mapbox GL Layer as Immutable object */
  layer: MapLayer,

  /** The id of an existing layer to insert the new layer before. */
  before?: string,

  /**
   * Called when the layer is clicked.
   * @callback
   * @param {Object} event - The mouse event.
   * @param {[Number, Number]} event.lngLat - The coordinates of the pointer
   * @param {Array} event.features - The features under the pointer,
   * using Mapbox's queryRenderedFeatures API:
   * https://www.mapbox.com/mapbox-gl-js/api/#Map#queryRenderedFeatures
   */
  onClick?: (event: MapMouseEvent) => any,

  /**
   * Called when the layer is hovered over.
   * @callback
   * @param {Object} event - The mouse event.
   * @param {[Number, Number]} event.lngLat - The coordinates of the pointer
   * @param {Array} event.features - The features under the pointer,
   * using Mapbox's queryRenderedFeatures API:
   * https://www.mapbox.com/mapbox-gl-js/api/#Map#queryRenderedFeatures
   */
  onHover?: (event: MapMouseEvent) => any,

  /**
   * Called when the layer feature is entered.
   * @callback
   * @param {Object} event - The mouse event.
   * @param {[Number, Number]} event.lngLat - The coordinates of the pointer
   * @param {Array} event.features - The features under the pointer,
   * using Mapbox's queryRenderedFeatures API:
   * https://www.mapbox.com/mapbox-gl-js/api/#Map#queryRenderedFeatures
   */
  onEnter?: (event: MapMouseEvent) => any,

  /**
   * Called when the layer feature is leaved.
   * @callback
   * @param {Object} event - The mouse event.
   * @param {[Number, Number]} event.lngLat - The coordinates of the pointer
   * @param {Array} event.features - The features under the pointer,
   * using Mapbox's queryRenderedFeatures API:
   * https://www.mapbox.com/mapbox-gl-js/api/#Map#queryRenderedFeatures
   */
  onLeave?: (event: MapMouseEvent) => any,

  /**
   * Radius to detect features around a clicked/hovered point
   */
  radius: number
};

class Layer extends PureComponent<Props> {
  _id: string;

  _map: MapboxMap;

  _onClick: (event: MapMouseEvent) => void;

  _onHover: (event: MapMouseEvent) => void;

  _onEnter: (event: MapMouseEvent) => void;

  _onLeave: (event: MapMouseEvent) => void;

  static displayName = 'Layer';

  static defaultProps = {
    radius: 0
  };

  constructor(props: Props) {
    super(props);
    this._id = props.id || props.layer.get('id', '');

    this._onClick = this._onClick.bind(this);
    this._onHover = this._onHover.bind(this);
    this._onEnter = this._onEnter.bind(this);
    this._onLeave = this._onLeave.bind(this);
  }

  componentDidMount() {
    const map = this._map;
    const { layer, before } = this.props;

    const mapboxLayer: MapboxLayer = layer.toJS();
    if (before && map.getLayer(before)) {
      map.addLayer(mapboxLayer, before);
    } else {
      map.addLayer(mapboxLayer);
    }

    map.on('click', this._id, this._onClick);
    map.on('mousemove', this._id, this._onHover);
    map.on('mouseenter', this._id, this._onEnter);
    map.on('mouseleave', this._id, this._onLeave);
  }

  componentDidUpdate(prevProps: Props) {
    const newLayer = this.props.layer;
    const prevLayer = prevProps.layer;

    if (this.props.before !== prevProps.before) {
      this._map.moveLayer(newLayer.get('id'), this.props.before);
    }

    if (!is(newLayer, prevLayer)) {
      const newPaint = newLayer.get('paint');
      const prevPaint = prevLayer.get('paint');
      if (!is(newPaint, prevPaint)) {
        diff(newPaint, prevPaint).forEach(([key, value]) => {
          const newValue = isImmutable(value) ? value.toJS() : value;
          this._map.setPaintProperty(this._id, key, newValue);
        });
      }

      const newLayout = newLayer.get('layout');
      const prevLayout = prevLayer.get('layout');
      if (!is(newLayout, prevLayout)) {
        diff(newLayout, prevLayout).forEach(([key, value]) => {
          const newValue = isImmutable(value) ? value.toJS() : value;
          this._map.setLayoutProperty(this._id, key, newValue);
        });
      }

      const newFilter = newLayer.get('filter');
      const prevFilter = prevLayer.get('filter');
      if (!newFilter) {
        this._map.setFilter(this._id, undefined);
      } else if (!is(newFilter, prevFilter)) {
        this._map.setFilter(this._id, newFilter.toJS());
      }
    }
  }

  componentWillUnmount() {
    if (!this._map || !this._map.getStyle()) {
      return;
    }

    if (this._map.getLayer(this._id)) {
      this._map.off('click', this._id, this._onClick);
      this._map.off('mousemove', this._id, this._onHover);
      this._map.off('mouseenter', this._id, this._onEnter);
      this._map.off('mouseleave', this._id, this._onLeave);
      this._map.removeLayer(this._id);
    }
  }

  _onClick(event: MapMouseEvent): void {
    if (this.props.onClick) {
      const { onClick } = this.props;
      const position = [event.point.x, event.point.y];
      const features = queryRenderedFeatures(this._map, this._id, position, this.props.radius);
      onClick({ ...event, features });
    }
  }

  _onHover(event: MapMouseEvent): void {
    if (this.props.onHover) {
      const { onHover } = this.props;
      const position = [event.point.x, event.point.y];
      const features = queryRenderedFeatures(this._map, this._id, position, this.props.radius);
      onHover({ ...event, features });
    }
  }

  _onEnter(event: MapMouseEvent): void {
    if (this.props.onEnter) {
      const { onEnter } = this.props;
      const position = [event.point.x, event.point.y];
      const features = queryRenderedFeatures(this._map, this._id, position, this.props.radius);
      onEnter({ ...event, features });
    }
  }

  _onLeave(event: MapMouseEvent) {
    if (this.props.onLeave) {
      const { onLeave } = this.props;
      const position: [number, number] = [event.point.x, event.point.y];
      const features = queryRenderedFeatures(this._map, this._id, position, this.props.radius);
      onLeave({ ...event, features });
    }
  }

  render() {
    return createElement(MapContext.Consumer, {}, (map) => {
      if (map) {
        this._map = map;
      }
      return null;
    });
  }
}

export default Layer;
