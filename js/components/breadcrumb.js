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
      resizeObserver: null,
      parts: [],
    };
  },
  watch: {
    currentDir(dir) {
      this.parts = this.splitPath(dir);
      this.$nextTick(this.rearrangeCrumbs);
    }
  },
  methods: {
    splitPath(dir) {
      if (dir && dir != '/')  {
        const parts = dir.split('/').filter(x => x && x != '.').map((x, i, arr) => {
          return { label: x, path: arr.slice(0, i + 1).join('/') };
        });

        return [
          { label: this.appName, path: '' }
        ].concat(parts);
      }

      return [
        { label: this.appName, path: '' }
      ];
    },
    rearrangeCrumbs() {
      if (this.$el) {
        const rect = this.$el.getBoundingClientRect();
        const children = Array.from(this.$el.children);
        const totalWidth = Math.floor(rect.width);

        this.$el.querySelector('.ellipsis').classList.remove('show');
        
        let visableCount = 0;
        let childrenWidth = 0;
        for (let i = children.length - 1; i >= 0; i--) {
          const child = children[i];
          if (child.classList.contains('ellipsis')) continue;
          child.style.display = 'inline-flex';

          const cRect = child.getBoundingClientRect();
          const cW = Math.ceil(cRect.width);

          if (visableCount > 0 && childrenWidth + cW > totalWidth) {
            child.style.display = 'none';

          } else {
            visableCount++;
          }
          childrenWidth += cW;
        }

        if (childrenWidth > totalWidth) {
          this.$el.querySelector('.ellipsis').classList.add('show');
        }
      }
    },
  },
  mounted() {
    this.resizeObserver = new ResizeObserver(() => {
      this.$nextTick(this.rearrangeCrumbs);
    });
    this.resizeObserver.observe(this.$el);
  },
  beforeUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  },
  render() {
    return h('div', { class: 'breadcrumb' }, [
      h('span', { class: 'ellipsis' }),
      ...this.parts.map((x, i, arr) => i < arr.length - 1 ? h('a', { href: `./#/${x.path}` }, x.label) : h('span', {}, x.label))
    ]);
  }
}