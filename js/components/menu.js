import { h, defineComponent, Teleport } from 'vue';
import SvgIcon from './svg-icon.js';
// import './menu.css';

export const MenuItem = defineComponent({
  name: 'menu-item',
  components: {
    SvgIcon
  },
  props: {
    label: String,
    icon: String,
    checked: Boolean,
    disabled: Boolean,
  },
  emits: ['click'],
  methods: {
    handleClick(ev) {
      this.$emit('click', ev);
    }
  },
  render() {
    return h('li', { class: 'menu-item' },
      h('button', { type: 'button', class: 'menu-item-button', disabled: this.disabled, onClick: this.handleClick }, [
        this.icon && h(SvgIcon, { type: 'toolbarIcons', d: this.icon, size: 24 }),
        h('span', { class: 'menu-item-label' }, this.label),
        this.checked && h('span', { class: 'menu-item-checkmark' }, '✓'),
      ])
    );
  }
});

export const FilePickerMenuItem = defineComponent({
  name: 'file-menu-item',
  components: {
    SvgIcon
  },
  props: {
    label: String,
    icon: String,
    checked: Boolean,
    disabled: Boolean,
    multiple: Boolean,
    accept: String,
  },
  emits: ['click', 'change'],
  methods: {
    handleClick(ev) {
      this.$emit('click', ev);
    },
    handleChange(ev) {
      this.$emit('change', ev);
    },
  },
  render() {
    return h('li', { class: 'menu-item' },
      h('label', { class: 'menu-item-button', disabled: this.disabled, onClick: this.handleClick }, [
        h('input', { type: 'file', name: 'file', disabled: this.disabled, multiple: this.multiple, accept: this.accept, style: { display: 'none' }, onchange: this.handleChange }),
        this.icon && h(SvgIcon, { type: 'toolbarIcons', d: this.icon, size: 24 }),
        h('span', { class: 'menu-item-label' }, this.label),
        this.checked && h('span', { class: 'menu-item-checkmark' }, '✓'),
      ])
    );
  }
});

export const MenuSeparator = defineComponent({
  name: 'menu-separator',
  render() {
    return h('hr', { class: 'menu-separator' });
  }
});

export const MenuContent = defineComponent({
  name: 'menu-content',
  render() {
    const defaultSlot = typeof this.$slots === 'function' ? this.$slots : typeof this.$slots.default === 'function' ? this.$slots.default : (() => null);
    return h('ul', { class: 'menu-content' }, defaultSlot());
  }
});


// https://github.com/johndatserakis/vue-simple-context-menu
export const MenuFlyout = defineComponent({
  name: 'menu-flyout',
  components: {
    MenuContent
  },
  props: {
    open: {
      type: Boolean,
      default: false
    },
  },
  emits: ['show'],
  data() {
    return {
      menuRect: null,
      docMousePos: { x: 0, y: 0 },
    };
  },
  watch: {
    open(value) {
      if (value) {
        this.show();
      } 
    },
  },
  mounted() {
    document.addEventListener('pointerdown', this.handleGlobalDown);
    document.addEventListener('keyup', this.escClose);
  },
  beforeUnmount() {
    document.removeEventListener('pointerdown', this.handleGlobalDown);
    document.removeEventListener('keyup', this.escClose);
  },
  methods: {
    handleGlobalDown(ev) {
      this.docMousePos = {
        x: ev.clientX || ev.touches[0].pageX, 
        y: ev.clientY || ev.touches[0].pageY,
      };

      if (!this.$el.contains(ev.target)) {
        this.hide();
      }
    },
    show() {
      if (!this.$el) return;

      if (!this.menuRect) {
        this.$el.style.visibility = 'hidden';
        this.$el.style.display = 'block';
        this.menuRect = this.$el.getBoundingClientRect();
        this.$el.setAttribute('style', '');
      }

      const pos = this.docMousePos;

      if (this.menuRect.width + pos.x >= window.innerWidth) {
        this.$el.style.left = `${pos.x - this.menuRect.width + 8}px`;
      } else {
        this.$el.style.left = `${pos.x - 8}px`;
      }

      if (this.menuRect.height + pos.y >= window.innerHeight) {
        this.$el.style.top = `${pos.y - this.menuRect.height + 8}px`;
      } else {
        this.$el.style.top = `${pos.y - 8}px`;
      }

      this.$el.style.display = 'block';
      this.$emit('show', true);
    },
    hide() {
      if (this.$el) {
        this.$el.style.display = 'none';
        this.$emit('show', false);
      }
    },
    escClose(ev) {
      if (ev.keyCode === 27) {
        this.hide();
      }
    },
  },
  render() {
    return h('div', { class: 'menu-flyout' },
      h(MenuContent, {}, this.$slots)
    );
  }
});

