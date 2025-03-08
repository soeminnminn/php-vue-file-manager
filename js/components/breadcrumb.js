import { h } from 'vue';

export default {
  name: 'breadcrumb',
  props: {
    appName: {
      type: String,
      default: 'Home'
    },
    currentDir: {
      type: String,
      default: '/'
    }
  },
  data() {
    return {
      parts: [
        { label: this.appName, path: '' },
      ],
    };
  },
  emit: [ 'itemClick' ],
  watch: {
    currentDir(dir) {
      if (!dir || dir == '/') {
        this.parts = [
          { label: this.appName, path: '' }
        ];
      } else {
        const parts = dir.split('/').filter(x => x && x != '.').map((x, i, arr) => {
          return { label: x, path: arr.slice(0, i + 1).join('/') };
        });

        this.parts = [
          { label: this.appName, path: '' }
        ].concat(parts);
      }
    }
  },
  methods: {
    handleItemClick(item, ev) {

    },
  },
  render() {
    return h('div', { class: 'breadcrumb' }, this.parts.map((x, i, arr) => i < arr.length - 1 ? h('a', { href: `./#/${x.path}` }, x.label) : h('span', {}, x.label)));
  }
}