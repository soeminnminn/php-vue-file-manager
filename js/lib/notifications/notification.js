import { h } from 'vue';
import NotificationIcon from './notification-icon.js';

export default {
  name: 'o-notification',
  components: {
    NotificationIcon
  },
  props: {
    manager: {
      type: Object,
      required: true,
    },
    notification: {
      type: Object,
      required: true
    },
    gap: {
      type: Number,
      default: 8
    },
    stacked: Boolean,
    collapsed: Boolean,
  },
  emits: ['close'],
  computed: {
    activeIcon() {
      return this.notification.loading ? this.manager.options.loadingIcon : this.notification.icon;
    },
  },
  methods: {
    close() {
      this.$emit('close');
    },
  },
  render() {
    const defaultSlot = typeof this.$slots.default === 'function' ? this.$slots.default : (() => null);
    const actionsSlot = typeof this.$slots.actions === 'function' ? this.$slots.actions : (() => null);

    return h('div', {
      role: 'alert',
      'data-o-type': this.notification.type,
      ...(this.stacked && {
        'data-is-stacked': true,
        ...(this.collapsed && { 'data-is-collapsed': true }),
        ...(!this.collapsed && { 'aria-expanded': true }),
      }),
      class: ['o-notification', `type--${this.notification.type}`, {
        'is--loading': this.notification.loading,
        'is--stacked': this.stacked,
        'is--collapsed': this.stacked && this.collapsed,
      }],
      style: { marginTop: `${this.gap}px` },
    },
      h('div', { class: 'o-notification-body' }, [
        (this.activeIcon && h('div', { class: 'o-notification-icon' },
          h(NotificationIcon, { name: this.activeIcon, size: 24 })
        )),

        h('div', { class: 'o-notification-content' }, [
          h('div', {}, [
            (this.notification.title && h('div', { class: 'o-notification-title' }, this.notification.title)),
            (this.notification.text && h('div', { class: 'o-notification-text' }, this.notification.text)),
          ]),
          defaultSlot(this.notification),
        ]),

        actionsSlot(this.notification),

        (this.notification.closable && h('button', { type: 'button', class: 'o-notification-close', onclick: this.close },
          h(NotificationIcon, { name: 'close', size: 24 })
        )),
      ])
    );
  }
}