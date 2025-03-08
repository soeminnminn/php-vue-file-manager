import { inject, h, TransitionGroup } from 'vue';
import Notification from './notification.js';

export default {
  name: 'o-notification-container',
  components: {
    TransitionGroup,
    Notification
  },
  props: {
    position: {
      type: String,
      default: 'bottom-center',
      validator: v => !!~['bottom-center', 'bottom-right', 'bottom-left', 'top-center', 'top-right', 'top-left'].indexOf(v),
    },
    gap: {
      type: Number,
      default: 8,
    },
    offsets: { 
      type: [Number, Array],
      default: 16,
    },
    stacked: {
      type: Boolean,
      default: true,
    },
    collapsedSpacing: {
      type: Number,
      default: 12
    },
    maxWidth: {
      type: [String, Number],
      default: '25em'
    },
    transition: String,
  },
  setup() {
    const useNotifications = inject('useNotifications');
    const manager = useNotifications();
    return { manager };
  },
  data() {
    return {
      isCollapsed: true,
    };
  },
  computed: {
    actualOffsets() {
      const o = { x: 16, y: 16 };

      if (this.offsets) {
        if (typeof this.offsets === 'number') {
          o.x = this.offsets;
          o.y = this.offsets;

        } else if (typeof this.offsets === 'object') {
          if (Array.isArray(this.offsets)) {
            if (this.offsets.length == 2) {
              o.x = isNaN(+this.offsets[0]) ? o.x : this.offsets[0];
              o.y = isNaN(+this.offsets[1]) ? o.y : this.offsets[1];
            }

          } else {
            o.x = isNaN(+this.offsets.x) ? o.x : this.offsets.x;
            o.y = isNaN(+this.offsets.y) ? o.y : this.offsets.y;
          }
        }
      }

      return o;
    },
    isTop() {
      return this.position.startsWith('top');
    },
    styles() {
      const offsets = this.actualOffsets;
      const [ posY, posX ] = this.position.split('-').filter(Boolean);
      
      const s = {
        maxWidth: typeof this.maxWidth === 'number' ? `${this.maxWidth}px` : this.maxWidth,
      };

      if (posY == 'top') {
        s.top = `${offsets.y - this.gap}px`;
      } else {
        s.bottom = `${offsets.y}px`;
      }

      if (posX == 'right') {
        s.marginRight = `${offsets.x}px`;
      } else if (posX == 'left') {
        s.marginLeft = `${offsets.x}px`;
      }

      return s;
    },
  },
  watch: {
    'manager.list.length'(value) {
      if (value == 0) {
        setTimeout(() => this.$el.close(), 420);
      } else {
        this.$el.show();
      }

      if (this.stacked) this.$nextTick(() => this.updatePositions());
    },
    isCollapsed() {
      if (this.stacked) this.$nextTick(() => this.updatePositions());
    },
  },
  methods: {
    updatePositions() {
      if (!this.$el) {
        return;
      }

      const direction = this.isTop ? 1 : -1;
      let offset = 0;

      Array.from(this.$el.children)
        .filter((el) => {
          return el.classList.contains('o-notification') && !el.classList.contains('v-leave-active');
        })
        .reverse()
        .forEach((el, i) => {
          const { height } = el.getBoundingClientRect();

          if (this.isTop) {
            el.style.top = '0';
          } else {
            el.style.bottom = '0';
          }

          const y = (this.isCollapsed ? i * this.collapsedSpacing : offset) * direction;
          const scale = this.isCollapsed ? 1 - (i * 0.025) : 1;

          el.style.setProperty('--y', `${y.toFixed(2)}px`);
          el.style.setProperty('--s', scale.toFixed(2));

          offset += height + this.gap;
        });

      this.$el.style.setProperty('height', this.isCollapsed ? 'auto' : `${Math.ceil(offset).toFixed()}px`);
    },

    expand() {
      this.isCollapsed = false;
    },

    collapse() {
      this.isCollapsed = true;
    }
  },
  render() {
    return h('dialog', {
      role: 'dialog',
      class: ['o-notifications-container', `position--${this.position}`],
      'data-o-position': this.position,
      ...(this.stacked && {
        'data-is-stacked': true,
        ...(this.isCollapsed && { 'data-is-collapsed': true }),  
        ...(!this.isCollapsed && { 'aria-expanded': true }),
      }),
      style: this.styles,
      onmouseenter: this.expand,
      onmouseleave: this.collapse,
    }, 
      h(TransitionGroup, { name: this.transition }, {
        default: () => this.manager.list.map((item, i) => h(Notification, {
          key: item.id,
          manager: this.manager,
          notification: item,
          stacked: this.stacked,
          gap: this.gap,
          collapsed: (this.isCollapsed && i !== this.manager.list.length - 1),
          onClose: () => this.manager.close(item),
          onmouseenter: () => this.manager.pause(item),
          onmouseleave: () => this.manager.resume(item),
        }, {
          actions: this.$slots.actions,
          default: this.$slots.default,
        })),
      })
    );
  }
};