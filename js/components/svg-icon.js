import { h } from 'vue';
import * as svgIcons from '../assets/icons.js';

function viewBoxToRect(box) {
  const [x, y, w, h] = box.split(/\s/).filter(Boolean);
  // M0 0L20 0L20 20L0 20L0 0Z
  return `M${x} ${y}L${w} ${y}L${w} ${h}L${x} ${h}L${x} ${y}Z`;
}

function isPathData(d) {
  if (!d || typeof d !== 'string') return false;
  return /^([astvzqmhlce]([\-\+0-9\.,\s]+)?)*z?$/ig.test(d);
}

function isViewBox(box) {
  if (!box || typeof box !== 'string') return false;
  return /^[\d\.]+[,\s]+[\d\.]+[,\s]+[\d\.]+[,\s]+[\d\.]+$/.test(box);
}

const defSvgIconData = {
  viewBox: '0 0 24 24',
  rect: 'M0 0L24 0L24 24L0 24L0 0Z',
  opacity: 1,
  fill: 'currentColor',
  d: null
};

export default {
  name: 'svg-icon',
  setup(props) {
    const icons = svgIcons[props.type] || {};

    const p = {
      ...defSvgIconData
    };

    if (isPathData(props.d)) {
      p.d = props.d;
      
      if (isViewBox(props.viewBox)) {
        p.viewBox = props.viewBox.trim();

      } else if (/^[\d]+$/.test(String(props.size))) {
        p.viewBox = `0 0 ${props.size} ${props.size}`;
      }
      
    } else {
      const i = icons[props.d];
      if (typeof i === 'string') {
        p.d = i;
      } else if (typeof i === 'object') {
        p.d = i.d || i.data;
        p.opacity = i.opacity || defSvgIconData.opacity;
        p.viewBox = i.viewBox || defSvgIconData.viewBox;
        p.fill = i.color || defSvgIconData.fill;
      }
    }
    
    p.rect = viewBoxToRect(p.viewBox);

    if (!isPathData(p.d)) {
      p.d = null;
    }

    return { pathData: p };
  },
  props: {
    type: String,
    viewBox: {
      type: String,
      default: defSvgIconData.viewBox
    },
    d: String,
    size: {
      type: [Number, String],
      default: 24
    },
  },
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: this.pathData.viewBox, fill: 'currentColor', stroke: 'none', preserveAspectRatio: 'none', width: this.size, height: this.size }, [
      h('path', { d: this.pathData.rect, fill: 'none', stroke: 'none' }),
      this.pathData.d && h('path', { d: this.pathData.d, fillOpacity: this.pathData.opacity, fill: this.pathData.fill }),
    ]);
  }
}