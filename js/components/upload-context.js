import { h } from 'vue';

export default {
  name: 'upload-context',
  props: {
    className: String,
  },
  inject: [ 'uploadFile' ],
  methods: {
    handleDragOver(ev) {
      if (ev.dataTransfer.types.includes('Files')) {
        ev.preventDefault();
        this.$el.classList.add('dragover');
      }
    },
    handleDragEnd(ev) {
      ev.preventDefault();
      this.$el.classList.remove('dragover');
    },
    handleDrop(ev) {
      ev.preventDefault();
      this.$el.classList.remove('dragover');

      let file = null;
      if (ev.dataTransfer.items) {
        const items = [...ev.dataTransfer.items];
        for(const item of items) {
          if (item.kind === "file") {
            file = item.getAsFile();
            break;
          }
        }

      } else {
        const files = [...ev.dataTransfer.files];
        for(file of files) break;
      }

      if (file) {
        this.$nextTick(() => this.uploadFile(file));
      }
    },
  },
  render() {
    const defaultSlot = typeof this.$slots === 'function' ? this.$slots : typeof this.$slots.default === 'function' ? this.$slots.default : (() => null);
    return h('div', { 
      class: [ this.className, 'dropzone' ], 
      ondragover: this.handleDragOver, 
      ondragleave: this.handleDragEnd, 
      ondragend: this.handleDragEnd, 
      ondrop: this.handleDrop,
    }, [
      defaultSlot(),
      h('div', { class: 'dropzone-overlay' }, 
        h('div', { class: 'overlay-content' }, 
          h('span', {}, this.$t('Drop file here to upload.'))
        )
      ),
    ]);
  },
}