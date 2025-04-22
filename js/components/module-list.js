import { h, defineComponent } from 'vue';
import SvgIcon from './svg-icon.js';
import { contentTypeToIcon } from '../lib/utils.js';

const ThumbnailItem = defineComponent({
  name: 'thumbnail-item',
  components: {
    SvgIcon
  },
  props: {
    icon: {
      type: String,
      default: 'folder'
    },
    item: {
      type: Object,
      default: {}
    },
    index: Number,
    active: Boolean,
  },
  emits: [ 'pointerDown', 'click', 'dblClick', 'contextMenu' ],
  methods: {
    handlePointerDown(ev) {
      this.$emit('pointerDown', { itemIndex: this.index, row: this.item }, ev);
    },
    handleClick(ev) {
      this.$emit('click', { itemIndex: this.index, row: this.item }, ev);
    },
    handleDblClick(ev) {
      this.$emit('dblClick', { itemIndex: this.index, row: this.item }, ev);
    },
    handleContextMenu(ev) {
      this.$emit('contextMenu', { itemIndex: this.index, row: this.item }, ev);
    }
  },
  render() {
    return h('div', { class: ['thumbnail-item', this.item.isDir && 'folder', this.active && 'active' ], 
        onpointerdown: this.handlePointerDown,
        onclick: this.handleClick,
        ondblclick: this.handleDblClick, 
        oncontextmenu: this.handleContextMenu }, [
      !this.item.isDir && h('div', { class: 'thumbnail-item-image' }, 
        this.item.thumbnail && h('img', { src: this.item.thumbnail, alt: this.item.name })
      ),
      h('div', { class: 'thumbnail-item-label' }, [
        h(SvgIcon, { type: 'filesIcons', d: this.icon, size: 24 }),
        this.item.isDir ? 
          h('span', { class: 'list-name' }, this.item.name) : 
          h('a', { href: this.item.path, target: '_blank', class: 'list-name' }, this.item.name)
      ]),
    ]);
  }
});

export default {
  name: 'module-list',
  components: {
    ThumbnailItem,
    SvgIcon
  },
  props: {
    items: {
      type: Array,
      default: []
    },
    lock: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      activeItem: -1,
    };
  },
  emit: [ 'itemClick', 'itemDblClick', 'itemContextMenu' ],
  methods: {
    handleItemClick(props, ev) {
      this.$emit('itemClick', props, ev);
    },
    handleItemDblClick(props, ev) {
      this.$emit('itemDblClick', props, ev);
    },
    handleItemContextMenu(props, ev) {
      this.$emit('itemContextMenu', props, ev);
    },
    handleItemPointerDown(props) {
      this.activeItem = props.itemIndex;
    },
  },
  render() {
    const emptySlot = this.$slots.empty || (() => h('div', { class: 'module-list-empty' }, 
      'Nothing to see here…'
    ));

    const folders = this.items.filter(x => x.isDir);

    return h('div', { class: ['module-list', this.lock && 'lock'] }, this.items.length == 0 ?
      emptySlot() :
      [
        h('div', { class: 'list-group' }, folders.map((item, i) => {
          return h(ThumbnailItem, { key: `thumb-folder-${i}`, icon: 'folder', item, index: i, active: this.activeItem == i,
            onPointerDown: this.handleItemPointerDown,
            onClick: this.handleItemClick,
            onDblClick: this.handleItemDblClick,
            onContextMenu: this.handleItemContextMenu });
        })),
        h('div', { class: 'list-group' }, this.items.filter(x => !x.isDir).map((item, i) => {
          const icon = contentTypeToIcon(item.contentType, item.ext);
          return h(ThumbnailItem, { key: `thumb-${icon}-${i}`, icon, item, index: folders.length + i, active: this.activeItem == folders.length + i,
            onPointerDown: this.handleItemPointerDown,
            onClick: this.handleItemClick,
            onDblClick: this.handleItemDblClick,
            onContextMenu: this.handleItemContextMenu });
        }))
      ]
    );
  }
}