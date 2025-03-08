import { h } from 'vue';

const icons = {
  'default': 'M0 0L24 0L24 24L0 24L0 0Z',
  'close': 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z',
  'loading': 'M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z',
  'done': 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  'info': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-6h2zm0-8h-2V7h2z',
  'success': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z',
  'warning': 'M15.73 3H8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27zM12 17.3c-.72 0-1.3-.58-1.3-1.3s.58-1.3 1.3-1.3 1.3.58 1.3 1.3-.58 1.3-1.3 1.3m1-4.3h-2V7h2z',
  'error': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-2h2zm0-4h-2V7h2z',
};

export default {
  name: 'notification-icon',
  props: {
    name: {
      type: String,
      required: true,
      validator: v => !!~Object.keys(icons).indexOf(v),
    },
    size: {
      type: [Number, String],
      default: 24
    },
  },
  computed: {
    pathData() {
      return icons[this.name] || 'M0 0L24 0L24 24L0 24L0 0Z';
    }
  },
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', role: 'icon', viewBox: '0 0 24 24', fill: 'currentColor', stroke: 'none', preserveAspectRatio: 'none', width: this.size, height: this.size }, 
      h('path', { d: this.pathData })
    );
  }
}